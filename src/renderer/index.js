const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Puppeteer を使用して 3D シーンをレンダリングし、画像を保存する
 * @param {Object} data コントリビューションデータ
 * @param {Object} config 設定オブジェクト
 * @param {string} seasonTitle 季節名 (spring, summer, autumn, winter)
 * @param {Function} getColorFn 高さから色を取得する関数
 * @returns {Promise<string>} 生成された画像のパス
 */
async function renderMountain(data, config, seasonTitle, getColorFn) {
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--use-gl=egl',
      '--ignore-gpu-blocklist',
      '--disable-dev-shm-usage',
      '--enable-webgl',
      '--hide-scrollbars',
      '--mute-audio'
    ],
    headless: "new"
  });
  const page = await browser.newPage();

  // ブラウザのログを表示するように設定
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));

  await page.setViewport({
    width: config.render.width,
    height: config.render.height
  });

  // HTML コンテンツの作成 (最小限)
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; overflow: hidden; background: #0a0a0a; }
        </style>
      </head>
      <body>
      </body>
    </html>
  `;

  await page.setContent(html);

  // データをページにインジェクション
  await page.evaluate((data, config, seasonTitle) => {
    window.MOUNTAIN_DATA = data;
    window.MOUNTAIN_CONFIG = config;
    window.getColorForHeight = (x) => {
      const palette = config.color[seasonTitle];
      const n = palette.length;
      const s = x * (n - 1);
      const i = Math.floor(s);
      const t = s - i;
      const hexToRgb = (hex) => {
        const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return res ? { r: parseInt(res[1], 16), g: parseInt(res[2], 16), b: parseInt(res[3], 16) } : null;
      };
      const rgbToHex = (rgb) => "#" + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1);
      const lerp = (a, b, t) => a + (b - a) * t;
      const c1 = hexToRgb(palette[i]);
      const c2 = hexToRgb(palette[Math.min(i + 1, n - 1)]);
      return rgbToHex({
        r: Math.round(lerp(c1.r, c2.r, t)),
        g: Math.round(lerp(c1.g, c2.g, t)),
        b: Math.round(lerp(c1.b, c2.b, t))
      });
    };
  }, data, config, seasonTitle);

  // ライブラリとスクリプトを順次読み込み (Puppeteer がロード完了を待機する)
  console.log("Loading Three.js from local node_modules...");
  const threePath = path.join(process.cwd(), 'node_modules', 'three', 'build', 'three.min.js');
  if (!fs.existsSync(threePath)) {
    throw new Error(`Three.js not found at ${threePath}`);
  }
  await page.addScriptTag({ path: threePath });

  console.log("Loading scene.js...");
  await page.addScriptTag({ path: path.join(__dirname, 'scene.js') });

  // レンダリング完了を待機
  try {
    await page.waitForFunction('window.RENDER_DONE === true', { timeout: 30000 });
  } catch (e) {
    console.error("Timeout waiting for RENDER_DONE. Checking page state...");
    const metrics = await page.metrics();
    console.log("Page Metrics:", metrics);
    throw e;
  }

  const tempPath = path.join(process.cwd(), 'temp_mountain.png');
  await page.screenshot({ path: tempPath, type: 'png' });

  await browser.close();
  return tempPath;
}

module.exports = { renderMountain };
