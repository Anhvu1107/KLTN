import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log('LOG:', msg.text());
  });
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  console.log('Loading page...');
  await page.goto('https://www.auraarchive.shop/', { waitUntil: 'networkidle' });
  
  await page.waitForTimeout(4000);

  try {
    await page.click('.live2d-mascot', { timeout: 2000 });
    console.log('Clicked mascot');
    await page.waitForTimeout(4000);
  } catch(e) {}

  await browser.close();
})();
