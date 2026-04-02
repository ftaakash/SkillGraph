import { PrismaClient } from '@prisma/client';
import { scrapeNaukri, scrapeLinkedIn, scrapeGlassdoor, scrapeIndeed } from './scraper';
import { scoreJobMatch } from './matcher';
import { applyToJob } from './applicator';
export async function processOpenClawAgent(userId: string) {
  const prisma = new PrismaClient();
  // 1. Fetch Student Config
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { OpenClawConfig: true, skills: true }
  });

  if (!user || !user.OpenClawConfig || !user.OpenClawConfig.isActive) {
    console.log(`OpenClaw is inactive or undefined for user ${userId}.`);
    return;
  }

  const config = user.OpenClawConfig;
  console.log(`Running OpenClaw for ${user.email}... Target Roles:`, config.targetRoles);

  // 2. Scrape Listings Multi-Platform
  const role = Array.isArray(config.targetRoles) && config.targetRoles.length > 0 ? (config.targetRoles as string[])[0] : 'SDE';
  const city = Array.isArray(config.preferredCities) && config.preferredCities.length > 0 ? (config.preferredCities as string[])[0] : 'Remote';
  
  // Pick a random platform to scrape each time we run, or query all and merge
  const platforms = [scrapeNaukri, scrapeLinkedIn, scrapeGlassdoor, scrapeIndeed];
  const randomScraper = platforms[Math.floor(Math.random() * platforms.length)];
  
  const listings = await randomScraper(role, city);
  console.log(`Found ${listings.length} listings for ${role} in ${city}.`);

  let appliedCount = 0;

  // 3. Match and Apply
  for (const listing of listings) {
    if (appliedCount >= config.dailyLimit) break;

    // Check Blacklist
    const blacklist = config.blacklistedCompanies as string[];
    if (blacklist && blacklist.some(c => listing.company.toLowerCase().includes(c.toLowerCase()))) {
      continue;
    }

    try {
      // Analyze Match
      const matchStatus = await scoreJobMatch(user.skills, `${listing.title} at ${listing.company}`);
      
      if (matchStatus.applyRecommendation && matchStatus.matchScore >= 65) {
        
        // MVP: Just apply with basic credentials (skipping dynamic tailoring PDF generation in this loop to save quota)
        const applyStatus = await applyToJob({
          studentName: user.name,
          studentEmail: user.email,
          studentPhone: 'Not provided',
          jobUrl: listing.url,
          resumePdfPath: 'public/placeholder_resume.pdf' // Placeholder for MVP
        });

        // Record Listing to DB
        const savedListing = await prisma.openClawListing.create({
          data: {
            platform: listing.platform || 'General',
            company: listing.company,
            role: listing.title,
            location: listing.location,
            ctcBand: listing.salary,
            jdText: listing.skills && listing.skills.length > 0 
                      ? 'Required skills: ' + listing.skills.join(', ')
                      : 'Emphasize experience in relevant modern stacks.',
            sourceUrl: listing.url
          }
        });

        // Record Application
        await prisma.openClawApplication.create({
          data: {
            userId: user.id,
            listingId: savedListing.id,
            matchScore: matchStatus.matchScore,
            status: applyStatus.success ? 'Applied' : 'Failed',
            tailoringNotes: matchStatus.tailoringNotes || 'No notes',
            appliedAt: new Date()
          }
        });

        if (applyStatus.success) appliedCount++;
      }
    } catch (apiError) {
      console.error(`AI Analysis/Application error for ${listing.company}:`, apiError);
    }
  }

  console.log(`OpenClaw finished for ${user.email}. Applied to ${appliedCount} jobs.`);
}
