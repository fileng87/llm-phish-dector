'use server';

import { analyzePhishingEmail } from '@/lib/langchain/phishing-detector';
import { AnalysisRequest } from '@/types/phishing-detection';
import PostalMime from 'postal-mime';

export async function analyzeEmailContent(request: AnalysisRequest) {
  try {
    const result = await analyzePhishingEmail(request);
    return { success: true, data: result };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Analysis failed in Server Action:', error);
    return { success: false, error: errorMessage };
  }
}

// 新增：支援進度回報的分析函數
export async function analyzeEmailWithProgress(
  request: AnalysisRequest,
  onProgress?: (step: string, description: string) => void
) {
  try {
    // 開始分析
    onProgress?.('initializing', '正在初始化分析...');

    const result = await analyzePhishingEmail(request);

    // 完成分析
    onProgress?.('completed', '分析完成');

    return { success: true, data: result };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Analysis failed in Server Action:', error);

    onProgress?.('error', `分析失敗: ${errorMessage}`);

    return { success: false, error: errorMessage };
  }
}

/**
 * 郵件解析結果介面
 */
export interface ParsedEmailContent {
  subject: string;
  from: string;
  to: string;
  date: string;
  textContent: string;
  htmlContent: string;
  fullContent: string; // 用於分析的完整內容
}

/**
 * 解析郵件文件 (Server Action)
 */
export async function parseEmailFile(formData: FormData): Promise<{
  success: boolean;
  data?: ParsedEmailContent;
  error?: string;
}> {
  'use server';

  try {
    const file = formData.get('file') as File;

    if (!file) {
      return {
        success: false,
        error: '未找到文件',
      };
    }

    // 驗證文件類型
    if (!isValidEmailFile(file)) {
      return {
        success: false,
        error: '不支援的文件格式。請上傳 .eml、.msg 或純文字郵件文件',
      };
    }

    // 驗證文件大小 (限制 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        error: '文件過大，請上傳小於 10MB 的郵件文件',
      };
    }

    // 讀取文件內容
    const fileContent = await readFileContent(file);

    // 使用 postal-mime 解析郵件
    const parsedEmail = await PostalMime.parse(fileContent);

    // 格式化解析結果
    const result = formatParsedEmail(parsedEmail);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('郵件解析失敗:', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : '郵件解析失敗',
    };
  }
}

/**
 * 檢測加密內容 (Server Action)
 */
export async function detectEncryptedContent(content: string): Promise<{
  isEncrypted: boolean;
  encryptionType: string | null;
  warning: string | null;
}> {
  'use server';

  const encryptionPatterns = [
    {
      pattern: /-----BEGIN PGP MESSAGE-----/i,
      type: 'PGP',
      warning: '此郵件包含 PGP 加密內容，可能無法完整分析',
    },
    {
      pattern: /-----BEGIN ENCRYPTED MESSAGE-----/i,
      type: 'Generic',
      warning: '此郵件包含加密內容，可能無法完整分析',
    },
    {
      pattern: /Content-Type:\s*application\/pkcs7-mime/i,
      type: 'S/MIME',
      warning: '此郵件使用 S/MIME 加密，可能無法完整分析',
    },
    {
      pattern: /Content-Transfer-Encoding:\s*base64/i,
      type: 'Base64',
      warning: '此郵件包含 Base64 編碼內容，已嘗試解碼分析',
    },
  ];

  for (const { pattern, type, warning } of encryptionPatterns) {
    if (pattern.test(content)) {
      return {
        isEncrypted: true,
        encryptionType: type,
        warning,
      };
    }
  }

  return {
    isEncrypted: false,
    encryptionType: null,
    warning: null,
  };
}

/**
 * 檢查是否為有效的郵件文件
 */
function isValidEmailFile(file: File): boolean {
  const validExtensions = ['.eml', '.msg', '.txt', '.mbox'];
  const validMimeTypes = [
    'message/rfc822',
    'text/plain',
    'application/octet-stream',
    'application/vnd.ms-outlook',
  ];

  const fileName = file.name.toLowerCase();
  const hasValidExtension = validExtensions.some((ext) =>
    fileName.endsWith(ext)
  );
  const hasValidMimeType =
    validMimeTypes.includes(file.type) || file.type === '';

  return hasValidExtension || hasValidMimeType;
}

/**
 * 讀取文件內容
 */
async function readFileContent(file: File): Promise<string | ArrayBuffer> {
  const arrayBuffer = await file.arrayBuffer();

  // 嘗試以 UTF-8 解碼
  try {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(arrayBuffer);
  } catch {
    // 如果 UTF-8 解碼失敗，返回 ArrayBuffer
    return arrayBuffer;
  }
}

/**
 * 格式化解析後的郵件內容
 */
function formatParsedEmail(
  parsedEmail: Record<string, unknown>
): ParsedEmailContent {
  // 處理發件人資訊
  const fromInfo =
    (parsedEmail.from as { name?: string; address?: string }) || {};
  const fromString = fromInfo.name
    ? `${fromInfo.name} <${fromInfo.address}>`
    : fromInfo.address || '未知發件人';

  // 處理收件人資訊
  const toList =
    (parsedEmail.to as Array<{ name?: string; address?: string }>) || [];
  const toString =
    toList
      .map((recipient) =>
        recipient.name
          ? `${recipient.name} <${recipient.address}>`
          : recipient.address
      )
      .join(', ') || '未知收件人';

  // 處理日期
  const dateString = (parsedEmail.date as string) || '未知日期';

  // 處理主題
  const subject = (parsedEmail.subject as string) || '無主題';

  // 處理內容
  const textContent = (parsedEmail.text as string) || '';
  const htmlContent = (parsedEmail.html as string) || '';

  // 生成用於分析的完整內容
  const fullContent = generateFullContent({
    subject,
    from: fromString,
    to: toString,
    date: dateString,
    textContent,
    htmlContent,
    attachments:
      (parsedEmail.attachments as Array<{
        filename?: string;
        mimeType?: string;
        content?: { byteLength?: number };
      }>) || [],
  });

  return {
    subject,
    from: fromString,
    to: toString,
    date: dateString,
    textContent,
    htmlContent,
    fullContent,
  };
}

/**
 * 生成用於分析的完整郵件內容
 */
function generateFullContent(data: {
  subject: string;
  from: string;
  to: string;
  date: string;
  textContent: string;
  htmlContent: string;
  attachments: Array<{
    filename?: string;
    mimeType?: string;
    content?: { byteLength?: number };
  }>;
}): string {
  const sections = [];

  // 郵件標頭資訊
  sections.push('=== 郵件標頭資訊 ===');
  sections.push(`主題: ${data.subject}`);
  sections.push(`發件人: ${data.from}`);
  sections.push(`收件人: ${data.to}`);
  sections.push(`日期: ${data.date}`);
  sections.push('');

  // 郵件內容
  if (data.textContent) {
    sections.push('=== 郵件內容 (純文字) ===');
    sections.push(data.textContent);
    sections.push('');
  }

  if (data.htmlContent && data.htmlContent !== data.textContent) {
    sections.push('=== 郵件內容 (HTML) ===');
    sections.push(data.htmlContent);
    sections.push('');
  }

  // 附件資訊
  if (data.attachments.length > 0) {
    sections.push('=== 附件資訊 ===');
    data.attachments.forEach((attachment, index) => {
      sections.push(
        `附件 ${index + 1}: ${attachment.filename || '未知檔名'} (${attachment.mimeType || '未知類型'}, ${attachment.content?.byteLength || 0} bytes)`
      );
    });
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * 解析貼上的郵件文字內容 (Server Action)
 */
export async function parseEmailFromText(content: string): Promise<{
  success: boolean;
  data?: ParsedEmailContent;
  error?: string;
}> {
  'use server';

  if (!content.trim()) {
    return {
      success: false,
      error: '郵件內容不能為空',
    };
  }

  try {
    // 首先嘗試使用 postal-mime 解析
    try {
      const parsedEmail = await PostalMime.parse(content);
      const result = formatParsedEmail(parsedEmail);

      return {
        success: true,
        data: result,
      };
    } catch (postalError) {
      console.log('postal-mime 解析失敗，嘗試簡單解析:', postalError);

      // 如果 postal-mime 解析失敗，回退到簡單的文字解析
      const simpleResult = parseEmailFromTextSimple(content);

      if (simpleResult) {
        return {
          success: true,
          data: simpleResult,
        };
      } else {
        // 如果簡單解析也失敗，返回原始內容
        return {
          success: true,
          data: {
            subject: '無主題',
            from: '未知發件人',
            to: '未知收件人',
            date: '未知日期',
            textContent: content,
            htmlContent: '',
            fullContent: content,
          },
        };
      }
    }
  } catch (error) {
    console.error('郵件文字解析失敗:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '郵件解析失敗',
    };
  }
}

/**
 * 簡單的文字解析（回退方案）
 */
function parseEmailFromTextSimple(content: string): ParsedEmailContent | null {
  try {
    // 嘗試解析郵件標頭
    const lines = content.split('\n');
    let subject = '';
    let from = '';
    let to = '';
    let date = '';
    let bodyStartIndex = 0;

    // 查找郵件標頭
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.toLowerCase().startsWith('subject:')) {
        subject = line.substring(8).trim();
      } else if (line.toLowerCase().startsWith('from:')) {
        from = line.substring(5).trim();
      } else if (line.toLowerCase().startsWith('to:')) {
        to = line.substring(3).trim();
      } else if (line.toLowerCase().startsWith('date:')) {
        date = line.substring(5).trim();
      } else if (line === '' && i > 0) {
        // 空行通常表示標頭結束，郵件正文開始
        bodyStartIndex = i + 1;
        break;
      }
    }

    // 如果找到了至少一個標頭，則認為是郵件格式
    if (subject || from || to || date) {
      const textContent = lines.slice(bodyStartIndex).join('\n').trim();

      // 使用與上傳檔案相同的格式化邏輯
      const fullContent = generateFullContent({
        subject: subject || '無主題',
        from: from || '未知發件人',
        to: to || '未知收件人',
        date: date || '未知日期',
        textContent,
        htmlContent: '',
        attachments: [],
      });

      return {
        subject: subject || '無主題',
        from: from || '未知發件人',
        to: to || '未知收件人',
        date: date || '未知日期',
        textContent,
        htmlContent: '',
        fullContent,
      };
    }
  } catch (error) {
    console.log('簡單解析失敗:', error);
  }

  return null;
}
