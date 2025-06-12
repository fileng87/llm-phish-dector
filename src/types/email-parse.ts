/**
 * 郵件解析相關的類型定義
 */

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
 * 郵件解析結果
 */
export interface EmailParseResult {
  content: string;
  isEncrypted: boolean;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
}
