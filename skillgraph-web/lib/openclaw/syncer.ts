import { PrismaClient } from '@prisma/client';
import { chromium } from 'playwright-extra';
const stealth = require('puppeteer-extra-plugin-stealth');
chromium.use(stealth());

export async function syncApplicationStatuses(userId: string) {
  const prisma = new PrismaClient();
  
  // 1. Fetch user config and applied applications
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { 
      OpenClawConfig: true,
      OpenClawApplications: {
        where: { status: 'Applied' },
        include: { Listing: true }
      }
    }
  });

  if (!user || user.OpenClawApplications.length === 0) {
    console.log(`[Syncer] No active applications to sync for user ${userId}.`);
    return;
  }

  console.log(`[Syncer] Syncing status for ${user.OpenClawApplications.length} applications...`);

  const browser = await chromium.launch({ headless: true });

  for (const app of user.OpenClawApplications) {
    if (!app.Listing?.sourceUrl) continue;

    const lowerUrl = app.Listing.sourceUrl.toLowerCase();
    const platform = lowerUrl.includes('linkedin.com') ? 'linkedin' : 
                     lowerUrl.includes('naukri.com') ? 'naukri' : 
                     lowerUrl.includes('indeed.com') ? 'indeed' : 
                     lowerUrl.includes('glassdoor.com') ? 'glassdoor' : 'generic';

    const platformSession = (user.OpenClawConfig?.sessionData as any)?.[platform];

    const context = await browser.newContext({
      storageState: platformSession || undefined
    });

    const page = await context.newPage();
    try {
      console.log(`[Syncer] Checking ${app.Listing.company} - ${app.Listing.role}...`);
      await page.goto(app.Listing.sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      const pageText = await page.innerText('body').catch(() => '');
      let newStatus = app.status;

      // Basic Status Detection Logic
      if (pageText.includes('no longer accepting applications') || pageText.includes('Not accepting applications')) {
        newStatus = 'Closed';
      } else if (pageText.includes('Rejected') || pageText.includes('not selected')) {
        newStatus = 'Rejected';
      } else if (pageText.includes('Shortlisted') || pageText.includes('Interview')) {
        newStatus = 'Shortlisted';
      } else if (pageText.includes('Application viewed') || pageText.includes('Viewed')) {
        newStatus = 'Viewed';
      }

      if (newStatus !== app.status) {
        console.log(`[Syncer] Updating status for ${app.Listing.company}: ${app.status} -> ${newStatus}`);
        await prisma.openClawApplication.update({
          where: { id: app.id },
          data: { status: newStatus }
        });
      }

    } catch (e) {
      console.error(`[Syncer] Failed to sync ${app.Listing.company}:`, e);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(`[Syncer] Finished status sync for ${user.email}.`);
}
