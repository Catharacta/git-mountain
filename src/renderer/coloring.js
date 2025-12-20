/**
 * 日付から季節を判定する（北半球・気象学的）
 * @param {Date} date 
 * @returns {string} spring | summer | autumn | winter
 */
function getSeason(date) {
    const month = date.getUTCMonth() + 1; // 1-12
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "autumn";
    return "winter";
}

/**
 * 16進数カラーコードをRGBオブジェクトに変換する
 * @param {string} hex 
 * @returns {Object} {r, g, b}
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
 * @param {Object} rgb 
 * @returns {string} #RRGGBB
 */
function rgbToHex(rgb) {
    return "#" + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1);
}

/**
 * 線形補間
 * @param {number} start 
 * @param {number} end 
 * @param {number} t 0-1
 * @returns {number}
 */
function lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * パレットと正規化された高さから色を計算する
 * @param {string[]} palette 
 * @param {number} x 0-1
 * @returns {string} 16進数カラー
 */
function interpolateColor(palette, x) {
    if (palette.length === 0) return "#000000";
    if (palette.length === 1) return palette[0];

    const n = palette.length;
    const s = x * (n - 1);
    const i = Math.floor(s);
    const t = s - i;

    const c1 = hexToRgb(palette[i]);
    const c2 = hexToRgb(palette[Math.min(i + 1, n - 1)]);

    if (!c1 || !c2) return palette[0];

    return rgbToHex({
        r: Math.round(lerp(c1.r, c2.r, t)),
        g: Math.round(lerp(c1.g, c2.g, t)),
        b: Math.round(lerp(c1.b, c2.b, t))
    });
}

module.exports = { getSeason, interpolateColor };
