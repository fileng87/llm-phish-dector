import {
  AnalysisRequest,
  PhishingDetectionResult,
} from '@/types/phishing-detection';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { JsonOutputParser } from '@langchain/core/output_parsers';

import { ModelConfig, ModelConfigError, ModelFactory } from './model-factory';
import { PhishingAnalysisWorkflow } from './phishing-workflow';
import {
  PHISHING_DETECTION_SYSTEM_PROMPT,
  generateAnalysisPrompt,
} from './prompts';

/**
 * 自定義分析錯誤類型
 */
export class PhishingAnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'PhishingAnalysisError';
  }
}

/**
 * 釣魚郵件偵測器
 */
export class PhishingDetector {
  private model: BaseChatModel;
  private parser: JsonOutputParser;
  private workflow?: PhishingAnalysisWorkflow;
  private supportsToolCalling: boolean;

  constructor(modelConfig: ModelConfig, useTools: boolean = false) {
    try {
      // 驗證配置
      const validation = ModelFactory.validateConfig(modelConfig);
      if (!validation.valid) {
        throw new PhishingAnalysisError(
          validation.error || '配置驗證失敗',
          'INVALID_CONFIG'
        );
      }

      // 創建模型實例
      this.model = ModelFactory.createModel(modelConfig);
      this.supportsToolCalling = useTools && !!this.model.bindTools;

      // 創建 JSON 輸出解析器
      this.parser = new JsonOutputParser();

      // 如果支援工具調用，創建工作流
      if (this.supportsToolCalling) {
        this.workflow = new PhishingAnalysisWorkflow(this.model);
      }
    } catch (error) {
      if (error instanceof PhishingAnalysisError) {
        throw error;
      }
      if (error instanceof ModelConfigError) {
        throw new PhishingAnalysisError(error.message, error.code, error);
      }
      throw new PhishingAnalysisError(
        `偵測器初始化失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        'DETECTOR_INIT_FAILED',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 分析郵件內容
   */
  async analyzeEmail(
    emailContent: string,
    useTools: boolean = false
  ): Promise<PhishingDetectionResult> {
    try {
      // 驗證輸入
      if (!emailContent || emailContent.trim().length === 0) {
        throw new PhishingAnalysisError('郵件內容不能為空', 'EMPTY_CONTENT');
      }

      // 如果支援工具調用且要求使用工具，使用工作流
      if (this.supportsToolCalling && useTools && this.workflow) {
        return await this.workflow.analyze(emailContent);
      }

      // 否則使用傳統方式
      return await this.analyzeWithoutTools(emailContent);
    } catch (error) {
      if (error instanceof PhishingAnalysisError) {
        throw error;
      }

      console.error('郵件分析失敗:', {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorStack: error instanceof Error ? error.stack : undefined,
        errorCode:
          error instanceof PhishingAnalysisError ? error.code : undefined,
      });
      throw new PhishingAnalysisError(
        `分析失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        'ANALYSIS_FAILED',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 不使用工具的傳統分析方式
   */
  private async analyzeWithoutTools(
    emailContent: string
  ): Promise<PhishingDetectionResult> {
    // 準備訊息
    const messages = [
      new SystemMessage(PHISHING_DETECTION_SYSTEM_PROMPT),
      new HumanMessage(generateAnalysisPrompt(emailContent)),
    ];

    // 調用模型
    let response;
    try {
      response = await this.model.invoke(messages);
    } catch (error) {
      throw new PhishingAnalysisError(
        this.parseModelError(error),
        'MODEL_INVOCATION_FAILED',
        error instanceof Error ? error : undefined
      );
    }

    // 解析 JSON 回應
    const rawResult = await this.parseModelResponse(
      response.content.toString()
    );

    // 驗證和格式化結果
    const result = this.validateAndFormatResult(rawResult);

    // 添加時間戳
    result.timestamp = new Date().toISOString();

    return result;
  }

  /**
   * 檢查是否支援工具調用
   */
  get canUseTools(): boolean {
    return this.supportsToolCalling;
  }

  /**
   * 解析模型回應，包含錯誤處理和回退機制
   */
  private async parseModelResponse(
    content: string
  ): Promise<Record<string, unknown>> {
    try {
      // 嘗試直接解析 JSON
      return await this.parser.parse(content);
    } catch (error) {
      console.warn('直接 JSON 解析失敗，嘗試清理內容:', {
        errorMessage: error instanceof Error ? error.message : String(error),
        contentPreview:
          content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      });

      try {
        // 嘗試提取 JSON 部分
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        // 嘗試修復常見的 JSON 格式問題
        const cleanedContent = content
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .replace(/^\s*[\w\s]*?(\{)/g, '$1')
          .replace(/(\})\s*[\w\s]*?$/g, '$1')
          .trim();

        return JSON.parse(cleanedContent);
      } catch (secondError) {
        console.error('JSON 解析完全失敗:', {
          originalError: error instanceof Error ? error.message : String(error),
          cleanupError:
            secondError instanceof Error
              ? secondError.message
              : String(secondError),
          contentPreview:
            content.substring(0, 500) + (content.length > 500 ? '...' : ''),
          contentLength: content.length,
        });

        // 如果 JSON 解析失敗，返回一個基本的結果
        throw new PhishingAnalysisError(
          '模型回應格式無效，無法解析為有效的 JSON 格式',
          'INVALID_JSON_RESPONSE'
        );
      }
    }
  }

  /**
   * 解析模型調用錯誤
   */
  private parseModelError(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // API 相關錯誤
      if (message.includes('401') || message.includes('unauthorized')) {
        return 'API 金鑰無效，請檢查金鑰是否正確';
      }

      if (message.includes('403') || message.includes('forbidden')) {
        return 'API 金鑰權限不足，請檢查金鑰權限';
      }

      if (message.includes('429') || message.includes('rate limit')) {
        return 'API 請求頻率限制，請稍後再試';
      }

      if (message.includes('quota') || message.includes('billing')) {
        return 'API 配額不足，請檢查帳戶餘額';
      }

      // 模型相關錯誤
      if (message.includes('model') && message.includes('not found')) {
        return '指定的模型不存在，請選擇其他模型';
      }

      // 網路相關錯誤
      if (
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('timeout')
      ) {
        return '網路連接失敗，請檢查網路連接後重試';
      }

      // 內容相關錯誤
      if (message.includes('content') && message.includes('policy')) {
        return '郵件內容違反了 AI 服務的使用政策';
      }

      if (message.includes('too long') || message.includes('token')) {
        return '郵件內容過長，請縮短內容後重試';
      }

      return error.message;
    }

    return '模型調用失敗，請稍後重試';
  }

  /**
   * 驗證和格式化分析結果
   */
  private validateAndFormatResult(rawResult: unknown): PhishingDetectionResult {
    // 基本結構驗證
    if (!rawResult || typeof rawResult !== 'object') {
      throw new PhishingAnalysisError(
        '分析結果格式無效',
        'INVALID_RESULT_FORMAT'
      );
    }

    // 驗證必要欄位
    const requiredFields = [
      'isPhishing',
      'confidenceScore',
      'suspiciousPoints',
      'explanation',
      'riskLevel',
    ];
    const missingFields = requiredFields.filter(
      (field) => !(field in rawResult)
    );

    if (missingFields.length > 0) {
      throw new PhishingAnalysisError(
        `分析結果缺少必要欄位: ${missingFields.join(', ')}`,
        'MISSING_REQUIRED_FIELDS'
      );
    }

    try {
      // 類型驗證和格式化
      const resultData = rawResult as Record<string, unknown>;
      const result: PhishingDetectionResult = {
        isPhishing: this.validateBoolean(resultData.isPhishing, 'isPhishing'),
        confidenceScore: this.validateConfidenceScore(
          resultData.confidenceScore
        ),
        suspiciousPoints: this.validateSuspiciousPoints(
          resultData.suspiciousPoints
        ),
        explanation: this.validateExplanation(resultData.explanation),
        riskLevel: this.validateRiskLevel(resultData.riskLevel),
        timestamp: '', // 將在調用處設定
      };

      return result;
    } catch (error) {
      if (error instanceof PhishingAnalysisError) {
        throw error;
      }
      throw new PhishingAnalysisError(
        `結果驗證失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        'RESULT_VALIDATION_FAILED'
      );
    }
  }

  /**
   * 驗證布林值
   */
  private validateBoolean(value: unknown, fieldName: string): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (
        lowerValue === 'true' ||
        lowerValue === '是' ||
        lowerValue === 'yes'
      ) {
        return true;
      }
      if (
        lowerValue === 'false' ||
        lowerValue === '否' ||
        lowerValue === 'no'
      ) {
        return false;
      }
    }
    throw new PhishingAnalysisError(
      `${fieldName} 必須是布林值`,
      'INVALID_BOOLEAN'
    );
  }

  /**
   * 驗證信心分數
   */
  private validateConfidenceScore(score: unknown): number {
    const numScore = Number(score);
    if (isNaN(numScore)) {
      throw new PhishingAnalysisError(
        '信心分數必須是數字',
        'INVALID_CONFIDENCE_SCORE'
      );
    }
    if (numScore < 0 || numScore > 100) {
      throw new PhishingAnalysisError(
        '信心分數必須在 0-100 之間',
        'CONFIDENCE_SCORE_OUT_OF_RANGE'
      );
    }
    return Math.round(Math.max(0, Math.min(100, numScore)));
  }

  /**
   * 驗證可疑點列表
   */
  private validateSuspiciousPoints(points: unknown): string[] {
    if (!Array.isArray(points)) {
      // 如果不是陣列，嘗試轉換
      if (typeof points === 'string') {
        // 嘗試按行分割
        const lines = points
          .split('\n')
          .filter((line) => line.trim().length > 0);
        if (lines.length > 0) {
          return lines.map((line) => line.trim());
        }
        // 如果只有一行，返回單個元素的陣列
        return [points.trim()];
      }
      throw new PhishingAnalysisError(
        '可疑點必須是字串陣列',
        'INVALID_SUSPICIOUS_POINTS'
      );
    }

    const validPoints = points
      .filter((point) => typeof point === 'string' && point.trim().length > 0)
      .map((point) => point.trim())
      .slice(0, 10); // 限制最多 10 個可疑點

    if (validPoints.length === 0) {
      return ['未發現明顯可疑點'];
    }

    return validPoints;
  }

  /**
   * 驗證解釋文字
   */
  private validateExplanation(explanation: unknown): string {
    if (typeof explanation !== 'string') {
      throw new PhishingAnalysisError('解釋必須是字串', 'INVALID_EXPLANATION');
    }

    const trimmed = explanation.trim();
    if (trimmed.length === 0) {
      throw new PhishingAnalysisError('解釋不能為空', 'EMPTY_EXPLANATION');
    }

    if (trimmed.length > 2000) {
      return trimmed.substring(0, 2000) + '...';
    }

    return trimmed;
  }

  /**
   * 驗證風險等級
   */
  private validateRiskLevel(level: unknown): 'low' | 'medium' | 'high' {
    const validLevels = ['low', 'medium', 'high'];

    if (typeof level === 'string') {
      const lowerLevel = level.toLowerCase();
      if (validLevels.includes(lowerLevel)) {
        return lowerLevel as 'low' | 'medium' | 'high';
      }

      // 嘗試中文對應
      if (lowerLevel.includes('低') || lowerLevel.includes('low')) {
        return 'low';
      }
      if (lowerLevel.includes('中') || lowerLevel.includes('medium')) {
        return 'medium';
      }
      if (lowerLevel.includes('高') || lowerLevel.includes('high')) {
        return 'high';
      }
    }

    throw new PhishingAnalysisError(
      '風險等級必須是 low、medium 或 high',
      'INVALID_RISK_LEVEL'
    );
  }

  /**
   * 測試模型連接
   */
  async testConnection(): Promise<boolean> {
    try {
      const model = ModelFactory.createModel(
        this.model.lc_kwargs as ModelConfig
      );
      await model.invoke('test');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 便利函數：直接分析郵件
 * 這個函數封裝了 PhishingDetector 的實例化和調用，
 * 為 Server Action 提供一個乾淨的入口點。
 */
export async function analyzePhishingEmail(
  request: AnalysisRequest
): Promise<PhishingDetectionResult> {
  const modelConfig: ModelConfig = {
    provider: request.modelSettings.provider,
    model: request.modelSettings.model,
    temperature: request.modelSettings.temperature,
    apiKey: request.modelSettings.apiKey,
  };

  const useTools = request.modelSettings.useTools ?? true;
  console.log('=== 分析請求參數 ===');
  console.log('useTools 設定:', useTools);
  console.log('模型提供商:', modelConfig.provider);
  console.log('模型名稱:', modelConfig.model);

  const detector = new PhishingDetector(modelConfig, useTools);
  console.log('模型是否支援工具調用:', detector.canUseTools);

  return await detector.analyzeEmail(request.emailContent, useTools);
}
