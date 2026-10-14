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

  // First, simulate a completed assessment by injecting some answers
  await context.addInitScript(() => {
    // Pre-populate some history
    const now = Date.now();
    const history = [
      {
        timestamp: now - 30 * 24 * 60 * 60 * 1000,
        riskLevel: 'low',
        totalScore: 4,
        maxScore: 50,
        categoryScores: [
          { category: 'neuropathy', score: 0, maxScore: 8, percentage: 0 },
          { category: 'skin', score: 1, maxScore: 7, percentage: 14 },
          { category: 'wound', score: 0, maxScore: 4, percentage: 0 },
          { category: 'circulation', score: 0, maxScore: 6, percentage: 0 },
          { category: 'selfcare', score: 2, maxScore: 8, percentage: 25 },
          { category: 'history', score: 1, maxScore: 7, percentage: 14 },
        ],
        emergencyFlags: [],
      },
      {
        timestamp: now - 60 * 24 * 60 * 60 * 1000,
        riskLevel: 'moderate',
        totalScore: 18,
        maxScore: 50,
        categoryScores: [
          { category: 'neuropathy', score: 5, maxScore: 8, percentage: 63 },
          { category: 'skin', score: 2, maxScore: 7, percentage: 29 },
          { category: 'wound', score: 0, maxScore: 4, percentage: 0 },
          { category: 'circulation', score: 4, maxScore: 6, percentage: 67 },
          { category: 'selfcare', score: 3, maxScore: 8, percentage: 38 },
          { category: 'history', score: 4, maxScore: 7, percentage: 57 },
        ],
        emergencyFlags: [],
      },
      {
        timestamp: now - 90 * 24 * 60 * 60 * 1000,
        riskLevel: 'low',
        totalScore: 3,
        maxScore: 50,
        categoryScores: [
          { category: 'neuropathy', score: 0, maxScore: 8, percentage: 0 },
          { category: 'skin', score: 0, maxScore: 7, percentage: 0 },
          { category: 'wound', score: 0, maxScore: 4, percentage: 0 },
          { category: 'circulation', score: 0, maxScore: 6, percentage: 0 },
          { category: 'selfcare', score: 1, maxScore: 8, percentage: 13 },
          { category: 'history', score: 2, maxScore: 7, percentage: 29 },
        ],
        emergencyFlags: [],
      },
    ];
    localStorage.setItem('footcheck-history', JSON.stringify(history));
    // Pre-populate some checkins
    const checkins = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      checkins.push({ date: d.toISOString(), noticed: false });
    }
    localStorage.setItem('footcheck-checkins', JSON.stringify(checkins));
  });

  // 1. Home page with real data
  const p1 = await context.newPage();
  await p1.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 15000 });
  await p1.waitForTimeout(1500);
  await p1.screenshot({ path: `${outputDir}/en-home-upgraded.png`, fullPage: true });
  console.log('OK: en-home-upgraded.png');
  await p1.close();

  // 2. Followup with history
  const p2 = await context.newPage();
  await p2.goto(`${BASE}/followup`, { waitUntil: 'networkidle', timeout: 15000 });
  await p2.waitForTimeout(1500);
  await p2.screenshot({ path: `${outputDir}/en-followup-upgraded.png`, fullPage: true });
  console.log('OK: en-followup-upgraded.png');
  await p2.close();

  // 3. Recommendations with history
  const p3 = await context.newPage();
  await p3.goto(`${BASE}/recommendations`, { waitUntil: 'networkidle', timeout: 15000 });
  await p3.waitForTimeout(1500);
  await p3.screenshot({ path: `${outputDir}/en-recommendations-upgraded.png`, fullPage: true });
  console.log('OK: en-recommendations-upgraded.png');
  await p3.close();

  // 4. Now do a complete assessment to see the result page
  // Use a fresh context without pre-populated history
  const c2 = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const p4 = await c2.newPage();

  // Listen for console errors
  const errors = [];
  p4.on('pageerror', (err) => errors.push(err.message));
  p4.on('console', (msg) => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });

  await p4.goto(`${BASE}/assess`, { waitUntil: 'networkidle', timeout: 15000 });
  await p4.waitForTimeout(1500);

  // Click Start
  await p4.locator('button:has-text("Start Assessment")').click();
  await p4.waitForTimeout(800);

  // Screenshot the first question
  await p4.screenshot({ path: `${outputDir}/en-assess-flow-q1.png`, fullPage: true });
  console.log('OK: en-assess-flow-q1.png');

  // Answer all 16 questions (clicking the highest-risk option for each to trigger a high-risk result)
  // We'll click the second or third option (higher risk) to get a "moderate" or "high" result
  for (let i = 0; i < 16; i++) {
    // Wait for question to load
    await p4.waitForTimeout(700);

    // Find the question buttons (not the back/next buttons)
    const optionButtons = p4.locator('button.rounded-xl.border.px-4.py-3\\.5, button.rounded-xl.border.px-4.py-3');
    const count = await optionButtons.count();
    if (count === 0) {
      // Maybe we're on a results page or in a transition
      break;
    }

    // Pick the 2nd option (index 1) for most questions to get a moderate result
    // But for specific questions, pick high-risk options
    let chosenIndex = 1;

    // If we see the wound question (w1) and w1 is "Yes", the next question is w2 — but we'll let it branch
    // For this demo, just pick the 2nd option for all
    if (i < 13) {
      chosenIndex = 1; // Generally moderate answers
    } else {
      chosenIndex = 1; // moderate
    }

    if (chosenIndex < count) {
      await optionButtons.nth(chosenIndex).click();
    } else {
      await optionButtons.first().click();
    }
    await p4.waitForTimeout(400);
  }

  // Wait for results
  await p4.waitForTimeout(2000);
  await p4.screenshot({ path: `${outputDir}/en-assess-result.png`, fullPage: true });
  console.log('OK: en-assess-result.png');
  console.log('Errors during flow:', errors.length);
  errors.forEach((e) => console.log('  -', e.substring(0, 120)));
  await p4.close();
  await c2.close();

  await browser.close();
  console.log('Done.');
})();
