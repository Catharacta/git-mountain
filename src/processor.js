/**
 * データの正規化とスケーリングを行う
 * @param {Object} calendar 取得したカレンダーデータ
 * @param {string} mode 'linear' | 'log'
 * @returns {Object} 処理後のデータ
 */
function processContributions(calendar, mode = 'linear') {
    const flatDays = calendar.weeks.flatMap(w => w.contributionDays);
    const counts = flatDays.map(d => d.contributionCount);
    const maxCount = Math.max(...counts, 0);

    const processedDays = flatDays.map(day => {
        let normalized = 0;
        if (maxCount > 0) {
            if (mode === 'log') {
                const alpha = 10; // 感度パラメータ
                normalized = Math.log(1 + alpha * day.contributionCount) / Math.log(1 + alpha * maxCount);
            } else {
                normalized = day.contributionCount / maxCount;
            }
        }
        return {
            ...day,
            normalized
        };
    });

    // 週ごとの構造に戻す（必要に応じて）
    const processedWeeks = [];
    let currentWeek = [];
    processedDays.forEach((day, index) => {
        currentWeek.push(day);
        if (day.weekday === 6 || index === processedDays.length - 1) {
            processedWeeks.push({ contributionDays: currentWeek });
            currentWeek = [];
        }
    });

    return {
        maxCount,
        weeks: processedWeeks,
        totalContributions: calendar.totalContributions
    };
}

module.exports = { processContributions };
