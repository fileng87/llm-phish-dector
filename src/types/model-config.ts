// 模型資訊介面
export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  recommended: boolean;
}

// 供應商資訊介面
export interface ProviderInfo {
  name: string;
  description: string;
  apiKeyFormat: string;
  models: ModelInfo[];
}

// 自訂模型設定介面
export interface CustomModelSettings {
  enabled: boolean;
  description: string;
  placeholder: string;
  validation: {
    minLength: number;
    maxLength: number;
    allowedCharacters: string;
  };
}

// 完整的模型配置介面
export interface ModelsConfig {
  version: string;
  lastUpdated: string;
  providers: Record<string, ProviderInfo>;
  customModelSettings: CustomModelSettings;
}

// 模型選擇選項介面
export interface ModelOption {
  id: string;
  name: string;
  description?: string;
  isCustom?: boolean;
  recommended?: boolean;
  pricing?: 'low' | 'medium' | 'high';
}
