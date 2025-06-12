import { getModelsConfig } from '@/config/models';
import { ModelOption, ModelsConfig } from '@/types/model-config';

/**
 * 模型配置載入器
 */
export class ModelConfigLoader {
  private static config: ModelsConfig | null = null;

  /**
   * 載入模型配置
   */
  static async loadConfig(): Promise<ModelsConfig> {
    if (this.config) {
      return this.config;
    }

    // 直接從配置文件載入
    this.config = getModelsConfig();
    return this.config;
  }

  /**
   * 獲取指定供應商的模型選項
   */
  static async getModelOptions(providerId: string): Promise<ModelOption[]> {
    const config = await this.loadConfig();
    const provider = config.providers[providerId];

    if (!provider) {
      return [];
    }

    const options: ModelOption[] = provider.models.map((model) => ({
      id: model.id,
      name: model.name,
      description: model.description,
      recommended: model.recommended,
      isCustom: false,
    }));

    // 如果啟用自訂模型，添加自訂選項
    if (config.customModelSettings.enabled) {
      options.push({
        id: '__custom__',
        name: '自訂模型',
        description: config.customModelSettings.description,
        isCustom: true,
      });
    }

    return options;
  }

  /**
   * 獲取供應商資訊
   */
  static async getProviderInfo(providerId: string) {
    const config = await this.loadConfig();
    return config.providers[providerId] || null;
  }

  /**
   * 獲取自訂模型設定
   */
  static async getCustomModelSettings() {
    const config = await this.loadConfig();
    return config.customModelSettings;
  }

  /**
   * 驗證自訂模型名稱
   */
  static async validateCustomModel(
    modelName: string
  ): Promise<{ valid: boolean; error?: string }> {
    const config = await this.loadConfig();
    const settings = config.customModelSettings;

    if (!settings.enabled) {
      return { valid: false, error: '自訂模型功能未啟用' };
    }

    if (!modelName || modelName.trim().length === 0) {
      return { valid: false, error: '模型名稱不能為空' };
    }

    const trimmedName = modelName.trim();

    if (trimmedName.length < settings.validation.minLength) {
      return {
        valid: false,
        error: `模型名稱至少需要 ${settings.validation.minLength} 個字符`,
      };
    }

    if (trimmedName.length > settings.validation.maxLength) {
      return {
        valid: false,
        error: `模型名稱不能超過 ${settings.validation.maxLength} 個字符`,
      };
    }

    // 簡單的字符驗證（字母、數字、連字號、底線、點號）
    const validPattern = /^[a-zA-Z0-9\-_.]+$/;
    if (!validPattern.test(trimmedName)) {
      return {
        valid: false,
        error: `模型名稱只能包含${settings.validation.allowedCharacters}`,
      };
    }

    return { valid: true };
  }

  /**
   * 重新載入配置（用於更新）
   */
  static async reloadConfig(): Promise<ModelsConfig> {
    this.config = null;
    return this.loadConfig();
  }

  /**
   * 獲取所有供應商名稱映射
   */
  static async getProviderNames(): Promise<Record<string, string>> {
    const config = await this.loadConfig();
    const names: Record<string, string> = {};

    Object.entries(config.providers).forEach(([id, provider]) => {
      names[id] = provider.name;
    });

    return names;
  }
}
