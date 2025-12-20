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
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
    });
    const page = await browser.newPage();
    await page.setViewport({
        width: config.render.width,
        height: config.render.height
    });

    // 必要なライブラリとスクリプトの読み込み
    const threeJsContent = fs.readFileSync(require.resolve('three/build/three.min.js'), 'utf8');
    const sceneJsContent = fs.readFileSync(path.join(__dirname, 'scene.js'), 'utf8');

    // HTML コンテンツの作成
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; overflow: hidden; background: #0a0a0a; }
        </style>
      </head>
      <body>
        <script>${threeJsContent}</script>
        <script>
          window.MOUNTAIN_DATA = ${JSON.stringify(data)};
          window.MOUNTAIN_CONFIG = ${JSON.stringify(config)};
          window.getColorForHeight = (x) => {
            const palette = ${JSON.stringify(config.color[seasonTitle])};
            // 簡易的な補間ロジック（coloring.jsから移行したものを想定）
            const n = palette.length;
            const s = x * (n - 1);
            const i = Math.floor(s);
            const t = s - i;
            const hexToRgb = (hex) => {
              const res = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
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
        </script>
        <script>${sceneJsContent}</script>
      </body>
    </html>
  `;

    await page.setContent(html);

    // レンダリング完了を待機 (window.RENDER_DONE が true になるまで)
    await page.waitForFunction('window.RENDER_DONE === true', { timeout: 30000 });

    const tempPath = path.join(process.cwd(), 'temp_mountain.png');
    await page.screenshot({ path: tempPath, type: 'png' });

    await browser.close();
    return tempPath;
}

module.exports = { renderMountain };
