import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';

export interface ModelConfig {
  provider: string;
  model: string;
  temperature: number;
  apiKey: string;
}

/**
 * 自定義錯誤類型
 */
export class ModelConfigError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'ModelConfigError';
  }
}

export class ModelConnectionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ModelConnectionError';
  }
}

/**
 * 模型工廠 - 根據配置創建對應的語言模型實例
 */
export class ModelFactory {
  static createModel(config: ModelConfig): BaseChatModel {
    const { provider, model, temperature, apiKey } = config;

    try {
      switch (provider) {
        case 'openai':
          return new ChatOpenAI({
            modelName: model,
            temperature,
            openAIApiKey: apiKey,
            streaming: false,
            timeout: 60000, // 60秒超時
            maxRetries: 2,
          });

        case 'anthropic':
          return new ChatAnthropic({
            modelName: model,
            temperature,
            anthropicApiKey: apiKey,
            streaming: false,
            maxRetries: 2,
          });

        case 'google':
          return new ChatGoogleGenerativeAI({
            model: model,
            temperature,
            apiKey,
            streaming: false,
            maxRetries: 2,
          });

        default:
          throw new ModelConfigError(
            `不支援的模型供應商: ${provider}`,
            'UNSUPPORTED_PROVIDER'
          );
      }
    } catch (error) {
      if (error instanceof ModelConfigError) {
        throw error;
      }

      // 處理模型創建時的其他錯誤
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new ModelConfigError('API 金鑰格式無效', 'INVALID_API_KEY');
        }
        if (error.message.includes('model')) {
          throw new ModelConfigError(
            `模型 "${model}" 不存在或不可用`,
            'INVALID_MODEL'
          );
        }
      }

      throw new ModelConfigError(
        `模型創建失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        'MODEL_CREATION_FAILED'
      );
    }
  }

  /**
   * 驗證模型配置是否有效
   */
  static validateConfig(config: ModelConfig): {
    valid: boolean;
    error?: string;
  } {
    const { provider, model, apiKey, temperature } = config;

    if (!provider || typeof provider !== 'string') {
      return { valid: false, error: '供應商不能為空' };
    }

    if (!model || typeof model !== 'string' || model.trim().length === 0) {
      return { valid: false, error: '模型名稱不能為空' };
    }

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return { valid: false, error: 'API 金鑰不能為空' };
    }

    if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
      return { valid: false, error: '溫度參數必須在 0-2 之間' };
    }

    // 驗證供應商是否支援
    const supportedProviders = ['openai', 'anthropic', 'google'];
    if (!supportedProviders.includes(provider)) {
      return { valid: false, error: `不支援的供應商: ${provider}` };
    }

    // 驗證 API 金鑰格式
    const apiKeyValidation = this.validateApiKeyFormat(provider, apiKey);
    if (!apiKeyValidation.valid) {
      return apiKeyValidation;
    }

    return { valid: true };
  }

  /**
   * 驗證 API 金鑰格式
   */
  private static validateApiKeyFormat(
    provider: string,
    apiKey: string
  ): { valid: boolean; error?: string } {
    switch (provider) {
      case 'openai':
        if (!apiKey.startsWith('sk-')) {
          return { valid: false, error: 'OpenAI API 金鑰應以 "sk-" 開頭' };
        }
        break;
      case 'anthropic':
        if (!apiKey.startsWith('sk-ant-')) {
          return {
            valid: false,
            error: 'Anthropic API 金鑰應以 "sk-ant-" 開頭',
          };
        }
        break;
      case 'google':
        if (apiKey.length < 10) {
          return { valid: false, error: 'Google API 金鑰長度不足' };
        }
        break;
    }
    return { valid: true };
  }

  /**
   * 測試模型連接
   */
  static async testConnection(
    config: ModelConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 驗證配置
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const model = this.createModel(config);

      // 發送簡單的測試訊息
      const response = await model.invoke([
        {
          role: 'user',
          content: "請回覆 'OK' 來確認連接正常。",
        },
      ]);

      const content = response.content.toString().toLowerCase();
      const success =
        content.includes('ok') ||
        content.includes('確認') ||
        content.includes('正常');

      return { success };
    } catch (error) {
      console.error('模型連接測試失敗:', {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown',
        provider: config.provider,
        model: config.model,
      });

      return { success: false, error: this.parseConnectionError(error) };
    }
  }

  /**
   * 解析連接錯誤並返回使用者友善的錯誤訊息
   */
  private static parseConnectionError(error: unknown): string {
    if (
      error instanceof ModelConfigError ||
      error instanceof ModelConnectionError
    ) {
      return error.message;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // API 金鑰相關錯誤
      if (
        message.includes('401') ||
        message.includes('unauthorized') ||
        message.includes('invalid api key')
      ) {
        return 'API 金鑰無效或已過期';
      }

      if (message.includes('403') || message.includes('forbidden')) {
        return 'API 金鑰權限不足，請檢查金鑰權限設定';
      }

      // 配額和限制錯誤
      if (
        message.includes('429') ||
        message.includes('rate limit') ||
        message.includes('quota')
      ) {
        return 'API 請求頻率限制或配額不足，請稍後再試';
      }

      // 模型相關錯誤
      if (
        message.includes('model') &&
        (message.includes('not found') || message.includes('does not exist'))
      ) {
        return '指定的模型不存在或不可用';
      }

      // 網路相關錯誤
      if (
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('timeout')
      ) {
        return '網路連接失敗，請檢查網路連接';
      }

      if (message.includes('cors')) {
        return '跨域請求被阻止，請檢查 API 設定';
      }

      // 服務器錯誤
      if (
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503')
      ) {
        return '服務器暫時不可用，請稍後再試';
      }

      // JSON 解析錯誤
      if (message.includes('json') || message.includes('parse')) {
        return '服務器回應格式錯誤';
      }

      // 返回原始錯誤訊息（如果不太長）
      if (error.message.length < 100) {
        return error.message;
      }
    }

    return '連接失敗，請檢查網路和 API 設定';
  }

  /**
   * 獲取供應商的預設模型
   */
  static getDefaultModel(provider: string): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4o-mini';
      case 'anthropic':
        return 'claude-3-5-haiku-20241022';
      case 'google':
        return 'gemini-2.5-flash-preview-05-20';
      default:
        return 'gpt-4o-mini';
    }
  }
}
