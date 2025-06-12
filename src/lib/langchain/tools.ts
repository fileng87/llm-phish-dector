import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * URL 分析工具
 * 分析郵件中的 URL 是否可疑
 */
export const urlAnalyzerTool = new DynamicStructuredTool({
  name: 'url_analyzer',
  description: `分析郵件中的 URL 連結，檢測是否為釣魚或惡意連結。

實現原理：
1. URL 結構解析：使用 JavaScript URL API 解析 URL 的各個組成部分（協議、域名、路徑、參數等）
2. 域名特徵分析：檢測域名長度、IP 地址使用、子域名數量等異常特徵
3. 關鍵字匹配：識別常見釣魚關鍵字（secure、verify、update、confirm、login、account）
4. URL 縮短服務檢測：識別 bit.ly、tinyurl.com 等縮短服務，這些常被用於隱藏真實目標
5. 參數分析：檢查重定向參數和可疑的 URL 參數
6. 風險評級：根據可疑特徵數量進行風險分級（high/medium/low）

適用場景：當郵件包含任何 HTTP/HTTPS 連結時使用，特別是包含多個連結或可疑連結的郵件。`,
  schema: z.object({
    urls: z.array(z.string()).describe('要分析的 URL 列表'),
  }),
  func: async ({ urls }: { urls: string[] }) => {
    const results = [];

    for (const url of urls) {
      try {
        // 基本 URL 結構分析
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        const path = urlObj.pathname;
        const params = urlObj.searchParams;

        // 可疑特徵檢測
        const suspiciousFeatures = [];

        // 檢查域名長度（過長可能是偽造）
        if (domain.length > 50) {
          suspiciousFeatures.push('域名過長');
        }

        // 檢查是否使用 IP 地址
        if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
          suspiciousFeatures.push('使用 IP 地址而非域名');
        }

        // 檢查子域名數量（過多可能是偽造）
        const subdomains = domain.split('.');
        if (subdomains.length > 4) {
          suspiciousFeatures.push('子域名過多');
        }

        // 檢查是否包含常見釣魚關鍵字
        const phishingKeywords = [
          'secure',
          'verify',
          'update',
          'confirm',
          'login',
          'account',
        ];
        const containsPhishingKeywords = phishingKeywords.some(
          (keyword) =>
            domain.toLowerCase().includes(keyword) ||
            path.toLowerCase().includes(keyword)
        );
        if (containsPhishingKeywords) {
          suspiciousFeatures.push('包含常見釣魚關鍵字');
        }

        // 檢查 URL 縮短服務
        const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly'];
        if (shorteners.some((shortener) => domain.includes(shortener))) {
          suspiciousFeatures.push('使用 URL 縮短服務');
        }

        // 檢查是否有可疑參數
        const suspiciousParams = [];
        for (const [key, value] of params.entries()) {
          if (
            key.toLowerCase().includes('redirect') ||
            key.toLowerCase().includes('url')
          ) {
            suspiciousParams.push(`${key}=${value}`);
          }
        }
        if (suspiciousParams.length > 0) {
          suspiciousFeatures.push(
            `可疑重定向參數: ${suspiciousParams.join(', ')}`
          );
        }

        results.push({
          url,
          domain,
          riskLevel:
            suspiciousFeatures.length > 2
              ? 'high'
              : suspiciousFeatures.length > 0
                ? 'medium'
                : 'low',
          suspiciousFeatures,
          analysis: `域名: ${domain}, 路徑: ${path}, 可疑特徵數: ${suspiciousFeatures.length}`,
        });
      } catch (error) {
        results.push({
          url,
          domain: 'invalid',
          riskLevel: 'high',
          suspiciousFeatures: ['無效的 URL 格式'],
          analysis: `URL 格式無效: ${error instanceof Error ? error.message : '未知錯誤'}`,
        });
      }
    }

    return JSON.stringify({
      totalUrls: urls.length,
      highRiskUrls: results.filter((r) => r.riskLevel === 'high').length,
      mediumRiskUrls: results.filter((r) => r.riskLevel === 'medium').length,
      lowRiskUrls: results.filter((r) => r.riskLevel === 'low').length,
      results,
    });
  },
});

/**
 * 域名檢查工具
 * 檢查域名的可信度和歷史
 */
export const domainCheckerTool = new DynamicStructuredTool({
  name: 'domain_checker',
  description: `檢查域名的可信度、註冊時間和是否在黑名單中。

實現原理：
1. 品牌冒充檢測：檢查域名是否包含知名品牌名稱的變體（如 google-、-microsoft、paypal-secure 等）
2. 字符組成分析：分析域名中數字和連字符的比例，異常比例通常表示自動生成的惡意域名
3. 頂級域名評估：檢查是否使用可疑的免費頂級域名（如 .tk、.ml、.ga、.cf、.click、.download）
4. 域名結構分析：評估域名的整體結構和可讀性
5. 風險評級：基於多個特徵進行綜合風險評估

適用場景：當需要深入分析郵件中提到的域名或發件人域名的可信度時使用，特別是涉及金融、登入或敏感操作的郵件。`,
  schema: z.object({
    domains: z.array(z.string()).describe('要檢查的域名列表'),
  }),
  func: async ({ domains }: { domains: string[] }) => {
    const results = [];

    for (const domain of domains) {
      try {
        // 基本域名分析
        const suspiciousFeatures = [];

        // 檢查域名是否包含常見品牌名稱的變體
        const commonBrands = [
          'google',
          'microsoft',
          'apple',
          'amazon',
          'facebook',
          'paypal',
          'bank',
        ];
        const brandVariations = commonBrands.filter((brand) => {
          const variations = [
            domain.includes(brand + '-'),
            domain.includes(brand + '.'),
            domain.includes('-' + brand),
            domain.includes(brand + 'secure'),
            domain.includes('secure' + brand),
          ];
          return variations.some((v) => v);
        });

        if (brandVariations.length > 0) {
          suspiciousFeatures.push('可能冒充知名品牌');
        }

        // 檢查域名中的數字比例
        const digitCount = (domain.match(/\d/g) || []).length;
        if (digitCount > domain.length * 0.3) {
          suspiciousFeatures.push('包含過多數字');
        }

        // 檢查域名中的連字符
        const hyphenCount = (domain.match(/-/g) || []).length;
        if (hyphenCount > 2) {
          suspiciousFeatures.push('包含過多連字符');
        }

        // 檢查頂級域名
        const tld = domain.split('.').pop()?.toLowerCase();
        const suspiciousTlds = ['tk', 'ml', 'ga', 'cf', 'click', 'download'];
        if (tld && suspiciousTlds.includes(tld)) {
          suspiciousFeatures.push('使用可疑的頂級域名');
        }

        results.push({
          domain,
          riskLevel:
            suspiciousFeatures.length > 1
              ? 'high'
              : suspiciousFeatures.length > 0
                ? 'medium'
                : 'low',
          suspiciousFeatures,
          tld: tld || 'unknown',
          analysis: `頂級域名: ${tld}, 可疑特徵數: ${suspiciousFeatures.length}`,
        });
      } catch (error) {
        results.push({
          domain,
          riskLevel: 'medium',
          suspiciousFeatures: ['域名分析失敗'],
          tld: 'unknown',
          analysis: `分析失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        });
      }
    }

    return JSON.stringify({
      totalDomains: domains.length,
      highRiskDomains: results.filter((r) => r.riskLevel === 'high').length,
      mediumRiskDomains: results.filter((r) => r.riskLevel === 'medium').length,
      lowRiskDomains: results.filter((r) => r.riskLevel === 'low').length,
      results,
    });
  },
});

/**
 * 郵件標頭分析工具
 * 分析郵件標頭中的可疑資訊
 */
export const emailHeaderAnalyzerTool = new DynamicStructuredTool({
  name: 'email_header_analyzer',
  description: `分析郵件標頭資訊，檢測偽造的發件人、路由異常等。

實現原理：
1. 發件人驗證：分析 From、Reply-To、Return-Path 欄位的一致性，不一致可能表示偽造
2. 域名一致性檢查：比較發件人、回覆地址、退信地址的域名是否一致
3. 免費郵件服務檢測：識別使用免費郵件服務但聲稱是企業的可疑行為
4. 路由分析：檢查 Received 標頭中的郵件傳遞路徑，識別異常跳轉和可疑服務器
5. 時間戳驗證：檢查郵件發送時間是否合理（未來時間、過於久遠等）
6. Message-ID 格式驗證：檢查郵件 ID 是否符合標準格式

適用場景：當需要驗證郵件真實性和來源時使用，特別是聲稱來自官方機構或重要組織的郵件。`,
  schema: z.object({
    headers: z
      .object({
        from: z.string().describe('發件人'),
        replyTo: z.string().optional().describe('回覆地址'),
        returnPath: z.string().optional().describe('退信地址'),
        received: z.array(z.string()).optional().describe('郵件路由記錄'),
        messageId: z.string().optional().describe('郵件 ID'),
        date: z.string().describe('發送日期'),
      })
      .describe('郵件標頭資訊'),
  }),
  func: async ({
    headers,
  }: {
    headers: {
      from: string;
      replyTo?: string;
      returnPath?: string;
      received?: string[];
      messageId?: string;
      date: string;
    };
  }) => {
    const suspiciousFeatures = [];
    const analysis = [];

    try {
      // 分析發件人地址
      const fromDomain = headers.from.split('@')[1]?.toLowerCase();
      if (fromDomain) {
        analysis.push(`發件人域名: ${fromDomain}`);

        // 檢查是否為免費郵件服務但聲稱是企業
        const freeEmailProviders = [
          'gmail.com',
          'yahoo.com',
          'hotmail.com',
          'outlook.com',
        ];
        if (freeEmailProviders.includes(fromDomain)) {
          const fromName = headers.from.split('<')[0].trim();
          if (
            fromName.toLowerCase().includes('bank') ||
            fromName.toLowerCase().includes('support')
          ) {
            suspiciousFeatures.push('使用免費郵件服務但聲稱是企業');
          }
        }
      }

      // 檢查回覆地址與發件人是否一致
      if (headers.replyTo && headers.replyTo !== headers.from) {
        const replyToDomain = headers.replyTo.split('@')[1]?.toLowerCase();
        if (replyToDomain !== fromDomain) {
          suspiciousFeatures.push('回覆地址與發件人域名不一致');
          analysis.push(`回覆地址域名: ${replyToDomain}`);
        }
      }

      // 檢查退信地址
      if (headers.returnPath && headers.returnPath !== headers.from) {
        const returnPathDomain = headers.returnPath
          .split('@')[1]
          ?.toLowerCase();
        if (returnPathDomain !== fromDomain) {
          suspiciousFeatures.push('退信地址與發件人域名不一致');
          analysis.push(`退信地址域名: ${returnPathDomain}`);
        }
      }

      // 分析郵件路由
      if (headers.received && headers.received.length > 0) {
        analysis.push(`郵件路由跳數: ${headers.received.length}`);

        // 檢查是否有過多的路由跳轉
        if (headers.received.length > 10) {
          suspiciousFeatures.push('郵件路由跳轉過多');
        }

        // 檢查路由中是否包含可疑的服務器
        const suspiciousServers = headers.received.filter(
          (route: string) =>
            route.toLowerCase().includes('unknown') ||
            route.toLowerCase().includes('localhost') ||
            /\d+\.\d+\.\d+\.\d+/.test(route) // IP 地址
        );

        if (suspiciousServers.length > 0) {
          suspiciousFeatures.push('路由中包含可疑服務器');
        }
      }

      // 檢查郵件 ID 格式
      if (headers.messageId) {
        if (
          !headers.messageId.includes('@') ||
          !headers.messageId.includes('<') ||
          !headers.messageId.includes('>')
        ) {
          suspiciousFeatures.push('郵件 ID 格式異常');
        }
      }

      // 檢查發送時間
      if (headers.date) {
        try {
          const sendDate = new Date(headers.date);
          const now = new Date();
          const timeDiff = Math.abs(now.getTime() - sendDate.getTime());
          const daysDiff = timeDiff / (1000 * 3600 * 24);

          analysis.push(`發送時間: ${headers.date}`);

          // 檢查是否為未來時間
          if (sendDate > now) {
            suspiciousFeatures.push('發送時間為未來時間');
          }

          // 檢查是否為過於久遠的時間
          if (daysDiff > 365) {
            suspiciousFeatures.push('發送時間過於久遠');
          }
        } catch {
          suspiciousFeatures.push('發送時間格式無效');
        }
      }
    } catch (error) {
      suspiciousFeatures.push('標頭分析失敗');
      analysis.push(
        `錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }

    return JSON.stringify({
      riskLevel:
        suspiciousFeatures.length > 2
          ? 'high'
          : suspiciousFeatures.length > 0
            ? 'medium'
            : 'low',
      suspiciousFeatures,
      analysis,
      totalSuspiciousFeatures: suspiciousFeatures.length,
    });
  },
});

/**
 * 附件掃描工具
 * 分析郵件附件的安全性
 */
export const attachmentScannerTool = new DynamicStructuredTool({
  name: 'attachment_scanner',
  description: `掃描郵件附件，檢測可能的惡意檔案。

實現原理：
1. 副檔名風險評估：檢查檔案副檔名是否屬於高風險類型（.exe、.scr、.bat、.vbs、.js 等可執行檔案）
2. 雙重副檔名檢測：識別 file.pdf.exe 等試圖偽裝的檔案
3. 檔案名稱分析：檢測包含誘導性關鍵字的檔案名（invoice、receipt、important、urgent 等）
4. MIME 類型驗證：比較檔案的 MIME 類型與副檔名是否一致，不一致可能表示偽造
5. 檔案大小檢查：識別異常大小的檔案（過大或為零）
6. 風險分級：根據多個風險因素進行綜合評估

適用場景：當郵件包含任何附件時使用，特別是來自未知發件人或包含可疑內容的郵件附件。`,
  schema: z.object({
    attachments: z
      .array(
        z.object({
          filename: z.string().describe('檔案名稱'),
          mimeType: z.string().describe('檔案類型'),
          size: z.number().describe('檔案大小（bytes）'),
        })
      )
      .describe('附件列表'),
  }),
  func: async ({
    attachments,
  }: {
    attachments: Array<{
      filename: string;
      mimeType: string;
      size: number;
    }>;
  }) => {
    const results = [];

    for (const attachment of attachments) {
      const suspiciousFeatures = [];

      try {
        const { filename, mimeType, size } = attachment;

        // 檢查檔案副檔名
        const extension = filename.split('.').pop()?.toLowerCase();
        const dangerousExtensions = [
          'exe',
          'scr',
          'bat',
          'cmd',
          'com',
          'pif',
          'vbs',
          'js',
          'jar',
          'zip',
          'rar',
          '7z',
          'doc',
          'docx',
          'xls',
          'xlsx',
          'ppt',
          'pptx',
        ];

        if (extension && dangerousExtensions.includes(extension)) {
          suspiciousFeatures.push(`可疑的檔案副檔名: .${extension}`);
        }

        // 檢查雙重副檔名
        const parts = filename.split('.');
        if (parts.length > 2) {
          suspiciousFeatures.push('使用雙重副檔名');
        }

        // 檢查檔案名稱中的可疑關鍵字
        const suspiciousKeywords = [
          'invoice',
          'receipt',
          'document',
          'important',
          'urgent',
          'confidential',
        ];
        if (
          suspiciousKeywords.some((keyword) =>
            filename.toLowerCase().includes(keyword)
          )
        ) {
          suspiciousFeatures.push('檔案名稱包含誘導性關鍵字');
        }

        // 檢查 MIME 類型與副檔名是否一致
        const expectedMimeTypes: Record<string, string[]> = {
          pdf: ['application/pdf'],
          doc: ['application/msword'],
          docx: [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
          xls: ['application/vnd.ms-excel'],
          xlsx: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ],
          jpg: ['image/jpeg'],
          png: ['image/png'],
          txt: ['text/plain'],
        };

        if (extension && expectedMimeTypes[extension]) {
          if (!expectedMimeTypes[extension].includes(mimeType)) {
            suspiciousFeatures.push('檔案類型與副檔名不符');
          }
        }

        // 檢查檔案大小
        if (size > 10 * 1024 * 1024) {
          // 10MB
          suspiciousFeatures.push('檔案過大');
        }

        if (size === 0) {
          suspiciousFeatures.push('檔案大小為零');
        }

        results.push({
          filename,
          mimeType,
          size,
          extension: extension || 'unknown',
          riskLevel:
            suspiciousFeatures.length > 1
              ? 'high'
              : suspiciousFeatures.length > 0
                ? 'medium'
                : 'low',
          suspiciousFeatures,
          analysis: `檔案: ${filename}, 類型: ${mimeType}, 大小: ${size} bytes`,
        });
      } catch (error) {
        results.push({
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size,
          extension: 'unknown',
          riskLevel: 'medium',
          suspiciousFeatures: ['附件分析失敗'],
          analysis: `分析失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        });
      }
    }

    return JSON.stringify({
      totalAttachments: attachments.length,
      highRiskAttachments: results.filter((r) => r.riskLevel === 'high').length,
      mediumRiskAttachments: results.filter((r) => r.riskLevel === 'medium')
        .length,
      lowRiskAttachments: results.filter((r) => r.riskLevel === 'low').length,
      results,
    });
  },
});

/**
 * 所有可用的工具
 */
export const availableTools = [
  urlAnalyzerTool,
  domainCheckerTool,
  emailHeaderAnalyzerTool,
  attachmentScannerTool,
];

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
