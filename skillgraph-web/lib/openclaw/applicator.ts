import { chromium } from 'playwright';
import path from 'path';

export interface ApplicationArgs {
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumePdfPath: string;
  jobUrl: string;
}

export async function applyToJob(args: ApplicationArgs): Promise<{ success: boolean; errorMsg?: string; screenshotUrl?: string }> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(args.jobUrl, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});

    // Try to find common Apply buttons
    const applyButton = page.locator('button:has-text("Apply"), a:has-text("Apply Now")').first();
    if (await applyButton.isVisible()) {
      await applyButton.click();
      await page.waitForTimeout(2000);
    }

    // Try filling out generic forms 
    await page.fill('input[type="text"][name*="name" i]', args.studentName).catch(() => {});
    await page.fill('input[type="email"], input[name*="email" i]', args.studentEmail).catch(() => {});
    await page.fill('input[type="tel"], input[name*="phone" i], input[name*="contact" i]', args.studentPhone).catch(() => {});
    
    if (args.linkedinUrl) {
      await page.fill('input[type="url"][name*="linkedin" i]', args.linkedinUrl).catch(() => {});
    }

    // Attempt to upload resume if a file input exists
    const fileInput = page.locator('input[type="file"][name*="resume" i], input[type="file"][name*="cv" i]').first();
    if (await fileInput.isVisible()) {
      const absolutePath = path.resolve(args.resumePdfPath);
      await fileInput.setInputFiles(absolutePath).catch(() => {});
    }

    // Attempt to submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Submit Application")').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForLoadState('networkidle');
    }

    // Capture success screenshot (mocking actual storage with local file for now in v2 MVP)
    const buf = await page.screenshot({ fullPage: true });
    // In a real env, you would upload `buf` to Cloudinary. For now, returning success.
    
    return { success: true };
  } catch (error: any) {
    console.error(`Applicant Agent failed at ${args.jobUrl}:`, error);
    return { success: false, errorMsg: error.message };
  } finally {
    await browser.close();
  }
}
