const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { fetchContributions } = require('../src/fetcher');
const { processContributions } = require('../src/processor');
const { getSeason } = require('../src/renderer/coloring');
const { renderMountain } = require('../src/renderer/index');
const { optimizeImage } = require('../src/optimizer');

async function main() {
    try {
        // 1. 設定の読み込み
        const configPath = path.join(process.cwd(), '.github', 'mountain-config.yml');
        const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            throw new Error("GITHUB_TOKEN is not set");
        }

        const login = config.user;

        // 期間の計算
        let from, to;
        const now = new Date();
        to = now.toISOString();

        if (config.period.mode === 'past_year') {
            const lastYear = new Date();
            lastYear.setFullYear(now.getFullYear() - 1);
            from = lastYear.toISOString();
        } else if (config.period.mode === 'last_n_days') {
            const lastDays = new Date();
            lastDays.setDate(now.getDate() - config.period.last_n_days);
            from = lastDays.toISOString();
        } else {
            from = new Date(config.period.custom.from).toISOString();
            to = new Date(config.period.custom.to).toISOString();
        }

        console.log(`Fetching contributions for ${login} from ${from} to ${to}...`);

        // 2. データ取得
        const rawData = await fetchContributions(login, from, to, token);

        // 3. データ処理
        const processedData = processContributions(rawData, config.render.scale);

        // 4. 季節の判定
        const season = getSeason(now);
        console.log(`Current season: ${season}`);

        // 5. レンダリング
        console.log("Rendering 3D mountain...");
        const tempPath = await renderMountain(processedData, config, season);

        // 6. 画像最適化
        const outputPath = path.join(process.cwd(), config.output.path);
        console.log(`Optimizing and saving to ${outputPath}...`);
        const result = await optimizeImage(tempPath, outputPath, config);

        console.log(`Success! Image generated at ${result.path} (${(result.size / 1024).toFixed(2)} KiB)`);

    } catch (error) {
        console.error("Critical Error:", error);
        process.exit(1);
    }
}

main();
