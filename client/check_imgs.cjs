const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://www.auraarchive.shop/', {waitUntil: 'networkidle2'});
    await new Promise(r => setTimeout(r, 6000));
    const imgs = await page.$$eval('img', els => els.map(el => [el.src, el.className, el.width, el.height, el.alt]));
    console.log(JSON.stringify(imgs, null, 2));
    await browser.close();
})();
