/*
 * Собирает PDF прайс-листа из tools/price.html (данные — assets/js/data.js).
 * Запуск из корня проекта:  node tools/make-price.js
 * Нужен Playwright (npm i -D playwright, затем npx playwright install chromium).
 */
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.join(root, 'tools', 'price.html'), { waitUntil: 'networkidle' });
  await page.pdf({
    path: path.join(root, 'assets', 'svetlaya-dacha-price.pdf'),
    format: 'A4',
    printBackground: true,
    scale: 0.92,
    pageRanges: '1',
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await browser.close();
  console.log('Готово: assets/svetlaya-dacha-price.pdf');
})();
