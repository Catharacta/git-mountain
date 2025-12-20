const fs = require('fs');
const path = require('path');
const { renderMountainSVG } = require('./svg');

/**
 * 3D シーンを SVG としてレンダリングし、一時ファイルとして保存する
 * @param {Object} data コントリビューションデータ
 * @param {Object} config 設定オブジェクト
 * @param {string} seasonTitle 季節名
 * @param {Function} getColorFn (未使用、互換性のため維持)
 * @returns {Promise<string>} 生成された SVG のパス
 */
async function renderMountain(data, config, seasonTitle, getColorFn) {
  console.log("Rendering 3D mountain as SVG...");

  const svgContent = renderMountainSVG(data, config, seasonTitle);

  const tempPath = path.join(process.cwd(), 'temp_mountain.svg');
  fs.writeFileSync(tempPath, svgContent);

  console.log("SVG generated at:", tempPath);
  return tempPath;
}

module.exports = { renderMountain };
