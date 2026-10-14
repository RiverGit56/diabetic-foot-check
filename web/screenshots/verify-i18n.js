const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';
const LANGS = ['ta', 'fil'];
// Known translation markers: ta tagline = "நீரிழிவு கால் சோதனை உதவியாளர்", fil tagline = "Katuwang sa Pagsusuri ng Paa para sa Diyabetis"
const TAGLINE_MARKERS = { ta: 'நீரிழிவு', fil: 'Diyabetis' };
const PAGES = [
  { path: '/', name: 'home' },
  { path: '/assess', name: 'assess' },
  { path: '/recommendations', name: 'recommendations' },
  { path: '/followup', name: 'followup' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const outputDir = '/Users/river/WorkBuddy AI/hackathon/web/screenshots';
  const fs = require('fs');
  fs.mkdirSync(outputDir, { recursive: true });

  for (const lang of LANGS) {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      locale: lang === 'ta' ? 'ta-IN' : 'fil-PH',
    });
    await context.addInitScript((l) => {
      localStorage.setItem('footcheck-lang', l);
    }, lang);

    for (const page of PAGES) {
      const p = await context.newPage();
      try {
        await p.goto(`${BASE}${page.path}`, { waitUntil: 'networkidle', timeout: 15000 });
        // Wait for the translated tagline to appear in the header (proves re-render happened)
        await p.waitForFunction(
          (marker) => {
            const h = document.querySelector('header');
            return h && h.textContent.includes(marker);
          },
          TAGLINE_MARKERS[lang],
          { timeout: 10000 }
        );
        await p.waitForTimeout(300);

        const fname = `${lang}-${page.name}.png`;
        await p.screenshot({ path: `${outputDir}/${fname}`, fullPage: true });
        console.log(`OK: ${fname}`);
      } catch (err) {
        console.log(`ERR: ${lang}-${page.name}: ${err.message}`);
        // Still take a screenshot for debugging
        await p.screenshot({ path: `${outputDir}/DEBUG-${lang}-${page.name}.png`, fullPage: true });
      }
      await p.close();
    }
    await context.close();
  }

  await browser.close();
  console.log('Done.');
})();
