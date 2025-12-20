const { interpolateColor } = require('./coloring');

/**
 * 16進数カラーコードをRGBオブジェクトに変換する
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * RGBオブジェクトを16進数カラーコードに変換する
 */
function rgbToHex(rgb) {
    return "#" + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1);
}

/**
 * 色の明るさを調整する
 * @param {string} hex 
 * @param {number} factor 0-1 (0で黒、1でそのまま、2で白に近づく)
 * @returns {string}
 */
function adjustBrightness(hex, factor) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return rgbToHex({
        r: Math.min(255, Math.round(rgb.r * factor)),
        g: Math.min(255, Math.round(rgb.g * factor)),
        b: Math.min(255, Math.round(rgb.b * factor))
    });
}

/**
 * 3Dの山脈をSVGとしてレンダリングする（シェーディング付き）
 * @param {Object} data コントリビューションデータ
 * @param {Object} config 設定オブジェクト
 * @param {string} seasonTitle 季節名
 * @returns {string} SVG文字列
 */
function renderMountainSVG(data, config, seasonTitle) {
    const weeks = data.weeks;
    const numWeeks = weeks.length;
    const numDays = 7;
    const palette = config.color[seasonTitle];

    const width = config.render.width;
    const height = config.render.height;

    // 投影設定の微調整
    const scale = Math.min(width, height) * 0.9;
    const spacingX = scale / numWeeks;
    const spacingZ = (scale * 0.45) / numDays;
    const maxHeight = config.render.maxHeightUnits * (scale / 80); // 高さを少し強調

    const centerX = width * 0.5;
    const centerY = height * 0.65; // 少し下に配置して空きを作る

    /**
     * 3D座標を2D画面座標に変換
     */
    function project(w, d, h) {
        const x = (w - numWeeks / 2) * spacingX;
        const z = (d - numDays / 2) * spacingZ;

        // より等角的なバランスに
        const px = centerX + (x - z * 0.9);
        const py = centerY + (x * 0.25 + z * 0.5) - (h * maxHeight);

        return { x: px, y: py };
    }

    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n`;
    svg += `  <defs>\n`;
    svg += `    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">\n`;
    svg += `      <feGaussianBlur in="SourceAlpha" stdDeviation="2" />\n`;
    svg += `      <feOffset dx="1" dy="1" result="offsetblur" />\n`;
    svg += `      <feComponentTransfer>\n`;
    svg += `        <feFuncA type="linear" slope="0.3" />\n`;
    svg += `      </feComponentTransfer>\n`;
    svg += `      <feMerge> \n`;
    svg += `        <feMergeNode />\n`;
    svg += `        <feMergeNode in="SourceGraphic" />\n`;
    svg += `      </feMerge>\n`;
    svg += `    </filter>\n`;
    svg += `  </defs>\n`;
    svg += `  <rect width="100%" height="100%" fill="#0a0a0a" />\n`;

    // 地面のベース
    const b00 = project(0, 0, 0);
    const b10 = project(numWeeks - 1, 0, 0);
    const b11 = project(numWeeks - 1, numDays - 1, 0);
    const b01 = project(0, numDays - 1, 0);
    svg += `  <polygon points="${b00.x},${b00.y} ${b10.x},${b10.y} ${b11.x},${b11.y} ${b01.x},${b01.y}" fill="#151515" />\n`;

    // 山脈の描画
    for (let w = 0; w < numWeeks - 1; w++) {
        for (let d = 0; d < numDays - 1; d++) {
            const h00 = (weeks[w].contributionDays[d] || { normalized: 0 }).normalized;
            const h10 = (weeks[w + 1].contributionDays[d] || { normalized: 0 }).normalized;
            const h01 = (weeks[w].contributionDays[d + 1] || { normalized: 0 }).normalized;
            const h11 = (weeks[w + 1].contributionDays[d + 1] || { normalized: 0 }).normalized;

            const p00 = project(w, d, h00);
            const p10 = project(w + 1, d, h10);
            const p11 = project(w + 1, d + 1, h11);
            const p01 = project(w, d + 1, h01);

            // 擬似ライティングの計算
            // 右奥からの光を想定。ポリゴンの「傾き」で明るさを変える
            // 高低差による法線ベクトルの近似
            const slopeW = (h10 - h00); // 横方向の傾き
            const slopeD = (h01 - h00); // 縦方向の傾き

            // 明るさ係数: 基本1.0, 
            // slopeW がマイナス（左上がり）なら明るく、プラス（右上がり）なら暗く
            // slopeD がプラス（奥上がり）なら明るく、マイナス（前上がり）なら暗く
            let brightness = 1.0 + (slopeD * 0.5) - (slopeW * 0.3);
            brightness = Math.max(0.4, Math.min(1.6, brightness));

            const avgH = (h00 + h10 + h11 + h01) / 4;
            const baseColor = interpolateColor(palette, avgH);
            const finalColor = adjustBrightness(baseColor, brightness);

            svg += `  <polygon points="${p00.x.toFixed(2)},${p00.y.toFixed(2)} ${p10.x.toFixed(2)},${p10.y.toFixed(2)} ${p11.x.toFixed(2)},${p11.y.toFixed(2)} ${p01.x.toFixed(2)},${p01.y.toFixed(2)}" fill="${finalColor}" stroke="${finalColor}" stroke-width="0.3" />\n`;
        }
    }

    svg += `</svg>`;
    return svg;
}

module.exports = { renderMountainSVG };
