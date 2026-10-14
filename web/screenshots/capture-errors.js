const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';
const LANGS = ['ta', 'fil'];
const PAGES = ['/', '/assess', '/recommendations', '/followup'];

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const lang of LANGS) {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      locale: lang === 'ta' ? 'ta-IN' : 'fil-PH',
    });
    await context.addInitScript((l) => {
      localStorage.setItem('footcheck-lang', l);
    }, lang);

    for (const path of PAGES) {
      const p = await context.newPage();
      const errors = [];
      const warnings = [];
      p.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
        if (msg.type() === 'warning') warnings.push(msg.text());
      });
      p.on('pageerror', (err) => {
        errors.push(`PAGE_ERROR: ${err.message}`);
      });

      try {
        await p.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 15000 });
        await p.waitForTimeout(1500);
        console.log(`\n=== ${lang} ${path} ===`);
        console.log('ERRORS:', errors.length);
        errors.forEach((e) => console.log('  ', e.substring(0, 200)));
        console.log('WARNINGS:', warnings.length);
        warnings.slice(0, 3).forEach((w) => console.log('  ', w.substring(0, 150)));
      } catch (err) {
        console.log(`ERR: ${lang}-${path}: ${err.message}`);
      }
      await p.close();
    }
    await context.close();
  }

  await browser.close();
})();
