const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';
const outputDir = '/Users/river/WorkBuddy AI/hackathon/web/screenshots';
const fs = require('fs');
fs.mkdirSync(outputDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });

  // 1. Profile page screenshot
  const p1 = await context.newPage();
  await p1.goto(`${BASE}/profile`, { waitUntil: 'networkidle', timeout: 15000 });
  await p1.waitForTimeout(1500);
  await p1.screenshot({ path: `${outputDir}/en-profile.png`, fullPage: true });
  console.log('OK: en-profile.png');
  await p1.close();

  // 2. Assess intro screenshot
  const p2 = await context.newPage();
  await p2.goto(`${BASE}/assess`, { waitUntil: 'networkidle', timeout: 15000 });
  await p2.waitForTimeout(1500);
  await p2.screenshot({ path: `${outputDir}/en-assess-intro.png`, fullPage: true });
  console.log('OK: en-assess-intro.png');

  // 3. Click "Start Assessment" and capture first question
  const startBtn = await p2.locator('button:has-text("Start Assessment")');
  if (await startBtn.count() > 0) {
    await startBtn.click();
    await p2.waitForTimeout(800);
    await p2.screenshot({ path: `${outputDir}/en-assess-q1.png`, fullPage: true });
    console.log('OK: en-assess-q1.png');

    // Click first option to advance
    const firstOption = await p2.locator('button.border-gray-200, button[class*="border-gray-200"]').first();
    if (await firstOption.count() > 0) {
      await firstOption.click();
      await p2.waitForTimeout(500);
    }

    // Screenshot question 2
    await p2.waitForTimeout(500);
    await p2.screenshot({ path: `${outputDir}/en-assess-q2.png`, fullPage: true });
    console.log('OK: en-assess-q2.png');
  }
  await p2.close();

  // 4. Recommendations page
  const p3 = await context.newPage();
  await p3.goto(`${BASE}/recommendations`, { waitUntil: 'networkidle', timeout: 15000 });
  await p3.waitForTimeout(1500);
  await p3.screenshot({ path: `${outputDir}/en-recommendations.png`, fullPage: true });
  console.log('OK: en-recommendations.png');
  await p3.close();

  // 5. Followup page
  const p4 = await context.newPage();
  await p4.goto(`${BASE}/followup`, { waitUntil: 'networkidle', timeout: 15000 });
  await p4.waitForTimeout(1500);
  await p4.screenshot({ path: `${outputDir}/en-followup.png`, fullPage: true });
  console.log('OK: en-followup.png');
  await p4.close();

  await browser.close();
  console.log('Done.');
})();
