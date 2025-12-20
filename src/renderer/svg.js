const { interpolateColor } = require('./coloring');

/**
 * 3Dの山脈をSVGとしてレンダリングする
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

    // 投影設定
    const scale = Math.min(width, height) * 0.8;
    const spacingX = scale / numWeeks;
    const spacingZ = (scale * 0.4) / numDays;
    const maxHeight = config.render.maxHeightUnits * (scale / 100);

    const centerX = width / 2;
    const centerY = height * 0.6;

    /**
     * 3D座標を2D画面座標に変換（等角投影風）
     */
    function project(w, d, h) {
        // 原点を中心に寄せる
        const x = (w - numWeeks / 2) * spacingX;
        const z = (d - numDays / 2) * spacingZ;

        // 投影計算
        const px = centerX + (x - z * 0.8);
        const py = centerY + (x * 0.3 + z * 0.5) - (h * maxHeight);

        return { x: px, y: py };
    }

    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n`;
    svg += `  <rect width="100%" height="100%" fill="#0a0a0a" />\n`;

    // Painter's algorithm: 奥(w=0, d=0側)から順に描画
    // ループ順序を調整して重なりを正しく制御
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

            // 平均的な高さで色を決定
            const avgH = (h00 + h10 + h11 + h01) / 4;
            const color = interpolateColor(palette, avgH);

            // ポリゴンの描画
            svg += `  <polygon points="${p00.x.toFixed(2)},${p00.y.toFixed(2)} ${p10.x.toFixed(2)},${p10.y.toFixed(2)} ${p11.x.toFixed(2)},${p11.y.toFixed(2)} ${p01.x.toFixed(2)},${p01.y.toFixed(2)}" fill="${color}" stroke="${color}" stroke-width="0.5" />\n`;
        }
    }

    svg += `</svg>`;
    return svg;
}

module.exports = { renderMountainSVG };
