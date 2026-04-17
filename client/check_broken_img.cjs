const puppeteer = require('puppeteer'); 
(async () => { 
  const browser = await puppeteer.launch(); 
  const page = await browser.newPage(); 
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  
  await page.goto('https://www.auraarchive.shop/', {waitUntil: 'networkidle2'}); 
  await new Promise(r => setTimeout(r, 6000)); 
  
  const img = await page.$('.live2d-snapshot img'); 
  if (img) { 
    const src = await page.evaluate(el => el.src, img); 
    console.log('IMG_SRC_LENGTH:', src.length); 
    console.log('IMG_SRC_START:', src.substring(0, 100)); 
  } else { 
    console.log('NO_IMG_FOUND'); 
  } 
  await browser.close(); 
})();
