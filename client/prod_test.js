import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--ignore-gpu-blocklist',
      '--disable-gpu-sandbox',
    ]
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log('LOG:', msg.text()));

  console.log('Navigating to production...');
  await page.goto('https://www.auraarchive.shop/', { waitUntil: 'networkidle' });
  
  await page.waitForTimeout(6000);
  
  console.log('Clicking mascot...');
  try {
    await page.click('.live2d-mascot', { timeout: 2000 });
    await page.waitForTimeout(5000); // Wait for modal
  } catch(e) {
    console.log('Failed to click mascot', e);
  }

  await page.screenshot({ path: 'prod_miku_test.png' });
  console.log('Saved screenshot.');
  await browser.close();
})();
