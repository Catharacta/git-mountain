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
 * 3Dの山脈をSVGとしてレンダリングする
 */
function renderMountainSVG(data, config, seasonTitle) {
    const weeks = data.weeks;
    const numWeeks = weeks.length;
    const numDays = 7;
    const palette = config.color[seasonTitle];

    const width = config.render.width;
    const height = config.render.height;

    const scale = Math.min(width, height) * 0.9;
    const spacingX = scale / numWeeks;
    const spacingZ = (scale * 0.45) / numDays;
    const maxHeight = config.render.maxHeightUnits * (scale / 80);

    const centerX = width * 0.5;
    const centerY = height * 0.65;

    function project(w, d, h) {
        const x = (w - numWeeks / 2) * spacingX;
        const z = (d - numDays / 2) * spacingZ;
        const px = centerX + (x - z * 0.9);
        const py = centerY + (x * 0.25 + z * 0.5) - (h * maxHeight);
        return { x: px, y: py };
    }

    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n`;
    svg += `  <rect width="100%" height="100%" fill="#0a0a0a" />\n`;

    // 1. 地面
    const b00 = project(0, 0, 0);
    const b10 = project(numWeeks - 1, 0, 0);
    const b11 = project(numWeeks - 1, numDays - 1, 0);
    const b01 = project(0, numDays - 1, 0);
    svg += `  <polygon points="${b00.x},${b00.y} ${b10.x},${b10.y} ${b11.x},${b11.y} ${b01.x},${b01.y}" fill="#111111" />\n`;

    // 2. 側面（壁）の描画 - 山が端で浮かないようにする
    function drawWall(p1, p2, p2h, p1h, color) {
        svg += `  <polygon points="${p1.x},${p1.y} ${p2.x},${p2.y} ${p2h.x},${p2h.y} ${p1h.x},${p1h.y}" fill="${color}" stroke="none" />\n`;
    }

    // 各辺について壁を立てる
    const sideColor = adjustBrightness(palette[0], 0.4);

    // Front wall (d = numDays - 1)
    for (let w = 0; w < numWeeks - 1; w++) {
        const h1 = (weeks[w].contributionDays[numDays - 1] || { normalized: 0 }).normalized;
        const h2 = (weeks[w + 1].contributionDays[numDays - 1] || { normalized: 0 }).normalized;
        if (h1 > 0 || h2 > 0) {
            drawWall(project(w, numDays - 1, 0), project(w + 1, numDays - 1, 0), project(w + 1, numDays - 1, h2), project(w, numDays - 1, h1), sideColor);
        }
    }
    // Right wall (w = numWeeks - 1)
    for (let d = 0; d < numDays - 1; d++) {
        const h1 = (weeks[numWeeks - 1].contributionDays[d] || { normalized: 0 }).normalized;
        const h2 = (weeks[numWeeks - 1].contributionDays[d + 1] || { normalized: 0 }).normalized;
        if (h1 > 0 || h2 > 0) {
            drawWall(project(numWeeks - 1, d, 0), project(numWeeks - 1, d + 1, 0), project(numWeeks - 1, d + 1, h2), project(numWeeks - 1, d, h1), adjustBrightness(sideColor, 0.8));
        }
    }

    // 3. 山脈のメインメッシュ
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

            const slopeW = (h10 - h00);
            const slopeD = (h01 - h00);

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
