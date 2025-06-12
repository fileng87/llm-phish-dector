import { DuckDuckGoSearch } from '@langchain/community/tools/duckduckgo_search';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { TavilySearch } from '@langchain/tavily';
import { z } from 'zod';

/**
 * DuckDuckGo 網路搜尋工具
 * 搜尋相關資訊以驗證郵件內容的真實性
 */
export const duckDuckGoSearchTool = new DynamicStructuredTool({
  name: 'duckduckgo_search',
  description: `使用 DuckDuckGo 搜尋引擎查找相關資訊，驗證郵件內容的真實性。

實現原理：
1. 關鍵字提取：從郵件內容中提取關鍵資訊（公司名稱、產品名稱、事件描述等）
2. 搜尋查詢：使用 DuckDuckGo API 進行網路搜尋，獲取最新的相關資訊
3. 結果分析：分析搜尋結果中的標題、摘要和來源網站
4. 真實性驗證：比對搜尋結果與郵件內容，識別不一致或虛假資訊
5. 新聞驗證：檢查是否有官方新聞或公告證實郵件中的聲明
6. 詐騙警報：搜尋是否有相關的詐騙警報或安全通知

適用場景：
- 郵件聲稱來自知名公司或組織時，驗證其真實性
- 郵件提及特定事件、促銷活動或緊急通知時
- 郵件包含可疑的公司名稱或產品資訊時
- 需要驗證郵件中提到的新聞事件或公告時
- 搜尋是否有相關的詐騙警報或釣魚攻擊報告
- 驗證郵件中提到的緊急事件或安全通知的真實性

使用建議：
- 搜尋郵件中提到的公司名稱 + "scam" 或 "phishing"
- 搜尋特定的促銷活動或事件名稱
- 搜尋郵件中的聯絡資訊或網站
- 搜尋相關的官方公告或新聞`,
  schema: z.object({
    query: z.string().describe('搜尋查詢關鍵字'),
    maxResults: z
      .number()
      .optional()
      .default(5)
      .describe('最大搜尋結果數量（預設5）'),
  }),
  func: async ({
    query,
    maxResults = 5,
  }: {
    query: string;
    maxResults?: number;
  }) => {
    try {
      // 創建 DuckDuckGo 搜尋實例
      const search = new DuckDuckGoSearch({ maxResults });

      // 執行搜尋
      const searchResults = await search.invoke(query);

      // 解析搜尋結果
      let results;
      try {
        // DuckDuckGoSearch 可能回傳一個包含 "No good DuckDuckGo Search results found" 的字串
        if (
          typeof searchResults === 'string' &&
          searchResults.includes('No good DuckDuckGo Search results found')
        ) {
          results = [];
        } else {
          results = JSON.parse(searchResults);
        }
      } catch {
        // 如果結果不是 JSON 格式，且不是空字串，直接使用字串結果
        results = searchResults && searchResults.trim() ? searchResults : [];
      }

      // 分析搜尋結果
      const analysis = {
        query,
        totalResults: Array.isArray(results) ? results.length : 1,
        searchResults: results,
        analysis: `搜尋查詢: "${query}" 完成`,
        timestamp: new Date().toISOString(),
      };

      // 如果是陣列結果，提供更詳細的分析
      if (Array.isArray(results)) {
        const sources = results.map((result: unknown) => {
          if (
            typeof result === 'object' &&
            result !== null &&
            'link' in result
          ) {
            try {
              const url = new URL(result.link as string);
              return url.hostname;
            } catch {
              return 'unknown';
            }
          }
          return 'unknown';
        });

        analysis.analysis = `找到 ${results.length} 個搜尋結果，來源包括: ${[...new Set(sources)].join(', ')}`;
      }

      return JSON.stringify(analysis);
    } catch (error) {
      console.error('DuckDuckGo Search Tool 發生嚴重錯誤:', error);
      return JSON.stringify({
        query,
        error: true,
        message: `搜尋失敗: ${
          error instanceof Error ? error.message : '未知錯誤'
        }`,
        details:
          error instanceof Error && error.stack
            ? error.stack
            : JSON.stringify(error),
        analysis: '無法完成網路搜尋，可能是網路連線問題或搜尋服務暫時不可用',
        timestamp: new Date().toISOString(),
      });
    }
  },
});

/**
 * 創建並返回一個配置好的 Tavily 搜尋工具。
 * 這個工具使用 Tavily Search API，它是一個專為 LLM 設計的搜尋引擎，
 * 提供更乾淨、與 AI 更相關的搜尋結果。
 *
 * @param apiKey - 用於 Tavily API 的金鑰。
 * @returns 配置好的 Tavily 搜尋工具實例。
 */
export function createTavilySearchTool(apiKey: string): TavilySearch {
  // 技巧：TavilySearch 工具預設從 process.env 讀取金鑰。
  // 為了支持從前端動態傳入，我們在此處臨時設定它。
  const originalApiKey = process.env.TAVILY_API_KEY;
  process.env.TAVILY_API_KEY = apiKey;

  try {
    const tool = new TavilySearch({ maxResults: 5 });

    // 恢復原始的環境變數，確保金鑰不會在伺服器端殘留
    if (originalApiKey) {
      process.env.TAVILY_API_KEY = originalApiKey;
    } else {
      delete process.env.TAVILY_API_KEY;
    }

    // 讓工具使用預設的描述
    // tool.description = ... (移除覆寫)

    return tool;
  } catch (error) {
    // 如果在工具創建過程中出錯，也要確保恢復環境變數
    if (originalApiKey) {
      process.env.TAVILY_API_KEY = originalApiKey;
    } else {
      delete process.env.TAVILY_API_KEY;
    }
    throw error;
  }
}

/**
 * 所有可用的工具
 */
export const availableTools = [duckDuckGoSearchTool];

/**
 * 根據名稱獲取工具
 */
export function getToolByName(name: string) {
  return availableTools.find((tool) => tool.name === name);
}

/**
 * 獲取所有工具名稱
 */
export function getAllToolNames(): string[] {
  return availableTools.map((tool) => tool.name);
}
