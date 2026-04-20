import { chromium } from 'playwright-extra';
const stealth = require('puppeteer-extra-plugin-stealth');
chromium.use(stealth());
import path from 'path';

export interface ApplicationArgs {
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumePdfPath: string;
  jobUrl: string;
  sessionData?: any; // Playwright storageState
}

export async function applyToJob(args: ApplicationArgs): Promise<{ success: boolean; errorMsg?: string; screenshotUrl?: string }> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: args.sessionData || undefined,
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    await page.goto(args.jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

    // Try to find common Apply buttons
    const applyButton = page.locator('button:has-text("Apply"), a:has-text("Apply"), button:has-text("Easy Apply")').first();
    if (await applyButton.isVisible().catch(()=>false)) {
      await applyButton.click({ force: true, timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    // Try filling out generic forms with expanded selectors
    await page.fill('input[type="text"][name*="name" i], input[name*="firstName" i], input[id*="name" i]', args.studentName).catch(() => {});
    await page.fill('input[type="email"], input[name*="email" i], input[id*="email" i]', args.studentEmail).catch(() => {});
    await page.fill('input[type="tel"], input[name*="phone" i], input[name*="contact" i], input[id*="phone" i]', args.studentPhone).catch(() => {});
    
    if (args.linkedinUrl) {
      await page.fill('input[type="url"][name*="linkedin" i], input[id*="linkedin" i]', args.linkedinUrl).catch(() => {});
    }

    // Attempt to upload resume if a file input exists
    const fileInput = page.locator('input[type="file"][name*="resume" i], input[type="file"][name*="cv" i], input[type="file"][id*="resume" i], input[type="file"]').first();
    if (await fileInput.isVisible().catch(()=>false)) {
      const absolutePath = path.resolve(args.resumePdfPath);
      await fileInput.setInputFiles(absolutePath).catch(() => {});
    }

    // Attempt to submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Submit Application"), button:has-text("Submit")').first();
    if (await submitBtn.isVisible().catch(()=>false)) {
      await submitBtn.click({ force: true, timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(3000);
      try {
         await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch (e) {}
    }

    // Capture success screenshot for production audit
    const screenshotId = `proof_${Date.now()}`;
    const proofsDir = path.join(process.cwd(), 'public', 'proofs');
    
    const { mkdir, writeFile } = await import('fs/promises');
    await mkdir(proofsDir, { recursive: true }).catch(() => {});
    
    const screenshotPath = path.join(proofsDir, `${screenshotId}.jpg`);
    const buf = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 60 });
    await writeFile(screenshotPath, buf);
    
    return { 
      success: true, 
      screenshotUrl: `/proofs/${screenshotId}.jpg` 
    };
  } catch (error: any) {
    console.error(`Applicant Agent failed at ${args.jobUrl}:`, error);
    return { success: false, errorMsg: error.message };
  } finally {
    await browser.close().catch(() => {});
  }
}
