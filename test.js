const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto("https://www.remove.bg/");

  page.on("dialog", async (d) => {
    d.accept("https://transfer.sh/X0Vro/image.jpeg");
  });

  await page.click('a[class="text-muted select-photo-url-btn"]');
  await delay(7500);
  const stories = await page.$$eval("a.btn-primary", (anchors) => {
    return anchors.map((anchor) => anchor.getAttribute("href")).slice(0, 10);
  });
  console.log(stories);
  await page.close();

  // await browser.close();
})();

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
