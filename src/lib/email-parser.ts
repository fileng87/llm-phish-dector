import PostalMime from 'postal-mime';

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
 * 郵件解析錯誤
 */
export class EmailParseError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'EmailParseError';
  }
}

/**
 * 解析郵件文件
 */
export async function parseEmailFile(file: File): Promise<ParsedEmailContent> {
  try {
    // 驗證文件類型
    if (!isValidEmailFile(file)) {
      throw new EmailParseError(
        '不支援的文件格式。請上傳 .eml、.msg 或純文字郵件文件',
        'INVALID_FILE_TYPE'
      );
    }

    // 驗證文件大小 (限制 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new EmailParseError(
        '文件過大，請上傳小於 10MB 的郵件文件',
        'FILE_TOO_LARGE'
      );
    }

    // 讀取文件內容
    const fileContent = await readFileContent(file);

    // 使用 postal-mime 解析郵件
    const parsedEmail = await PostalMime.parse(fileContent);

    // 格式化解析結果
    return formatParsedEmail(parsedEmail);
  } catch (error) {
    if (error instanceof EmailParseError) {
      throw error;
    }

    console.error('郵件解析失敗:', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    throw new EmailParseError(
      `郵件解析失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
      'PARSE_FAILED'
    );
  }
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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (reader.result) {
        resolve(reader.result);
      } else {
        reject(new Error('無法讀取文件內容'));
      }
    };

    reader.onerror = () => {
      reject(new Error('文件讀取失敗'));
    };

    // 嘗試以文字格式讀取，如果失敗則以二進制格式讀取
    try {
      reader.readAsText(file, 'utf-8');
    } catch {
      reader.readAsArrayBuffer(file);
    }
  });
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
    sections.push('=== 純文字內容 ===');
    sections.push(data.textContent);
    sections.push('');
  }

  if (data.htmlContent && data.htmlContent !== data.textContent) {
    sections.push('=== HTML 內容 ===');
    sections.push(data.htmlContent);
    sections.push('');
  }

  // 附件資訊
  if (data.attachments.length > 0) {
    sections.push('=== 附件資訊 ===');
    data.attachments.forEach((attachment, index) => {
      sections.push(`附件 ${index + 1}:`);
      sections.push(`  檔案名稱: ${attachment.filename || '未知'}`);
      sections.push(`  檔案類型: ${attachment.mimeType || '未知'}`);
      sections.push(`  檔案大小: ${attachment.content?.byteLength || 0} bytes`);
    });
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * 檢測郵件是否包含加密內容
 */
export function detectEncryptedContent(content: string): {
  isEncrypted: boolean;
  encryptionType: string | null;
  warning: string | null;
} {
  const encryptionPatterns = [
    {
      pattern: /-----BEGIN PGP MESSAGE-----/i,
      type: 'PGP',
      warning: '此郵件包含 PGP 加密內容，需要先解密才能進行完整分析',
    },
    {
      pattern: /-----BEGIN ENCRYPTED MESSAGE-----/i,
      type: 'Generic',
      warning: '此郵件包含加密內容，可能無法進行完整分析',
    },
    {
      pattern: /Content-Type:.*application\/pkcs7-mime/i,
      type: 'S/MIME',
      warning: '此郵件使用 S/MIME 加密，需要先解密才能進行完整分析',
    },
    {
      pattern: /Content-Type:.*application\/x-pkcs7-mime/i,
      type: 'S/MIME',
      warning: '此郵件使用 S/MIME 加密，需要先解密才能進行完整分析',
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
