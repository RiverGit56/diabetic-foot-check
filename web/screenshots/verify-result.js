const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';
const outputDir = '/Users/river/WorkBuddy AI/hackathon/web/screenshots';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const p = await context.newPage();

  const errors = [];
  p.on('pageerror', (err) => errors.push(err.message));
  p.on('console', (msg) => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });

  await p.goto(`${BASE}/assess`, { waitUntil: 'networkidle', timeout: 15000 });
  await p.waitForTimeout(1500);

  // Click Start
  await p.locator('button:has-text("Start Assessment")').click();
  await p.waitForTimeout(800);

  // Loop: answer up to 25 questions (with conditional branching)
  for (let i = 0; i < 25; i++) {
    await p.waitForTimeout(600);

    // Check if we're on the result page (look for "View Recommendations" button)
    const viewRecsBtn = p.locator('a:has-text("View Recommendations"), button:has-text("View Recommendations")');
    if (await viewRecsBtn.count() > 0) {
      console.log('Reached result page at iteration', i);
      break;
    }

    // Find the option buttons (not the back/next buttons)
    const optionButtons = p.locator('button.rounded-xl.border.px-4.py-3\\.5, button.rounded-xl.border.px-4.py-3');
    const count = await optionButtons.count();

    if (count === 0) {
      // Maybe there's a "Next" button to click (for multi-select)
      const nextBtn = p.locator('button:has-text("Next")');
      if (await nextBtn.count() > 0 && await nextBtn.first().isEnabled()) {
        await nextBtn.first().click();
        await p.waitForTimeout(500);
        continue;
      }
      break;
    }

    // Click the 2nd option (index 1) for moderate answers
    if (count > 1) {
      await optionButtons.nth(1).click();
    } else {
      await optionButtons.first().click();
    }
  }

  // Wait for the analyzing/result phase
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `${outputDir}/en-assess-result.png`, fullPage: true });
  console.log('OK: en-assess-result.png');
  console.log('Errors:', errors.length);
  errors.forEach((e) => console.log('  -', e.substring(0, 150)));
  await browser.close();
  console.log('Done.');
})();
