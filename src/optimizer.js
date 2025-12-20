const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * 画像を WebP に変換し最適化する
 * @param {string} inputPath 入力画像パス
 * @param {string} outputPath 出力画像パス
 * @param {Object} config 設定 (quality 等)
 * @returns {Promise<Object>} info
 */
async function optimizeImage(inputPath, outputPath, config) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const info = await sharp(inputPath)
        .webp({ quality: 75, effort: 6 })
        .toFile(outputPath);

    // 一時ファイルの削除
    if (fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
    }

    return {
        path: outputPath,
        size: info.size
    };
}

module.exports = { optimizeImage };
