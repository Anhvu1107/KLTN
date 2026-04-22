const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://www.auraarchive.shop/', {waitUntil: 'networkidle2'});
    await new Promise(r => setTimeout(r, 8000));
    
    const html = await page.evaluate(() => {
        const mascot = document.querySelector('.live2d-mascot');
        return mascot ? mascot.outerHTML : 'NO MASCOT';
    });
    console.log(html);
    
    await browser.close();
})();
