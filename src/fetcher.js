const { graphql } = require("@octokit/graphql");

/**
 * GitHub GraphQL API を使用してコントリビューションデータを取得する
 * @param {string} login ユーザー名
 * @param {string} from 開始日 (ISO8601)
 * @param {string} to 終了日 (ISO8601)
 * @param {string} token GitHub トークン
 * @returns {Promise<Object>} コントリビューションデータのオブジェクト
 */
async function fetchContributions(login, from, to, token) {
  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
                weekday
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await graphql(query, {
      login,
      from,
      to,
      headers: {
        authorization: `token ${token}`,
      },
    });

    return response.user.contributionsCollection.contributionCalendar;
  } catch (error) {
    console.error("Error fetching contributions:", error);
    throw error;
  }
}

module.exports = { fetchContributions };
