const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  await context.addInitScript(() => {
    localStorage.setItem('footcheck-lang', 'ta');
  });

  const p = await context.newPage();
  const logs = [];
  p.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  p.on('pageerror', (err) => logs.push(`[PAGE_ERROR] ${err.message}`));

  await p.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
  await p.waitForTimeout(3000);

  // Check the main content area (h1 should be "home.welcome" translated)
  const state = await p.evaluate(() => {
    const lang = document.documentElement.lang;
    const headerText = document.querySelector('header')?.textContent?.trim()?.substring(0, 80);
    const h1Text = document.querySelector('h1')?.textContent?.trim()?.substring(0, 80);
    const mainText = document.querySelector('main')?.textContent?.trim()?.substring(0, 150);
    const stored = localStorage.getItem('footcheck-lang');
    return { lang, headerText, h1Text, mainText, stored };
  });
  console.log('State:', JSON.stringify(state, null, 2));

  await browser.close();
})();
