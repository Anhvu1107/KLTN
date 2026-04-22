const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    console.log('Navigating...');
    await page.goto('https://www.auraarchive.shop/', {waitUntil: 'networkidle2'});
    console.log('Loaded.');
    await new Promise(r => setTimeout(r, 4000));
    
    console.log('Clicking mascot...');
    await page.evaluate(() => {
        const btn = document.querySelector('.live2d-mascot__canvas');
        if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 8000));
    
    const snap = await page.evaluate(() => {
        const img = document.querySelector('.live2d-snapshot img');
        return img ? img.src.substring(0, 50) + '...' + img.src.length : 'NO IMG';
    });
    console.log('SNAPSHOT_IMG:', snap);
    
    await browser.close();
})();
