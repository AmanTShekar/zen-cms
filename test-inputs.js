const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Fake login since it's a CMS
  await page.goto('http://localhost:5175/login');
  try {
    const email = await page.locator('input[type="email"]');
    if (await email.count() > 0) {
      await email.fill('admin@zenith.com');
      await page.locator('input[type="password"]').fill('password');
      await page.locator('button[type="submit"]').click();
      await page.waitForNavigation();
    }
  } catch (e) {
    console.log("No login needed or failed");
  }

  await page.goto('http://localhost:5175/collections/pages/6a1c9e106c27f33d7b556030', { waitUntil: 'domcontentloaded' });
  
  // wait for editor to load
  await page.waitForTimeout(5000);

  // screenshot
  await page.screenshot({ path: 'test-screenshot.png', fullPage: true });
  
  const html = await page.content();
  const fs = require('fs');
  fs.writeFileSync('page-source.html', html);

  const inputs = await page.locator('input[type="text"]');
  const count = await inputs.count();
  console.log('Found ' + count + ' inputs');
  
  await browser.close();
})();
