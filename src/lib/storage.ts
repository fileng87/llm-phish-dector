/**
 * 安全的 localStorage 工具函數
 * 處理 SSR 環境中 localStorage 不存在的問題
 */

/**
 * 安全地獲取 localStorage 項目
 */
export function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * 安全地設定 localStorage 項目
 */
export function setStorageItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * 安全地移除 localStorage 項目
 */
export function removeStorageItem(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * 檢查 localStorage 是否可用
 */
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * API 金鑰相關的 localStorage 操作
 */
export const apiKeyStorage = {
  /**
   * 獲取 API 金鑰
   */
  get(providerId: string): string {
    return getStorageItem(`apiKey_${providerId}`) || '';
  },

  /**
   * 設定 API 金鑰
   */
  set(providerId: string, apiKey: string): boolean {
    if (apiKey && apiKey.trim()) {
      return setStorageItem(`apiKey_${providerId}`, apiKey.trim());
    } else {
      return removeStorageItem(`apiKey_${providerId}`);
    }
  },

  /**
   * 移除 API 金鑰
   */
  remove(providerId: string): boolean {
    return removeStorageItem(`apiKey_${providerId}`);
  },

  /**
   * 獲取所有已儲存的 API 金鑰
   */
  getAll(): Record<string, string> {
    if (!isStorageAvailable()) {
      return {};
    }

    const keys: Record<string, string> = {};
    const prefix = 'apiKey_';

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const providerId = key.substring(prefix.length);
          const apiKey = localStorage.getItem(key);
          if (apiKey) {
            keys[providerId] = apiKey;
          }
        }
      }
    } catch {
      return {};
    }

    return keys;
  },
};

/**
 * 模型設定相關的 localStorage 操作
 */
export interface ModelSelectionConfig {
  provider: string;
  model: string;
  temperature: number;
  useTools?: boolean; // 是否使用工具調用
}

/**
 * 工具配置介面
 */
export interface ToolConfig {
  id: string;
  name: string;
  isEnabled: boolean;
  apiKey?: string;
  settings?: Record<string, unknown>;
}

/**
 * 工具配置相關的 localStorage 操作
 */
export const toolConfigStorage = {
  /**
   * 獲取工具配置
   */
  get(toolId: string): ToolConfig | null {
    try {
      const configJson = getStorageItem(`toolConfig_${toolId}`);
      if (!configJson) {
        return null;
      }

      const config = JSON.parse(configJson) as ToolConfig;

      // 驗證配置格式
      if (
        typeof config.id === 'string' &&
        typeof config.name === 'string' &&
        typeof config.isEnabled === 'boolean'
      ) {
        return config;
      }

      return null;
    } catch {
      return null;
    }
  },

  /**
   * 設定工具配置
   */
  set(toolId: string, config: ToolConfig): boolean {
    try {
      const configJson = JSON.stringify(config);
      return setStorageItem(`toolConfig_${toolId}`, configJson);
    } catch {
      return false;
    }
  },

  /**
   * 移除工具配置
   */
  remove(toolId: string): boolean {
    return removeStorageItem(`toolConfig_${toolId}`);
  },

  /**
   * 獲取所有工具配置
   */
  getAll(): Record<string, ToolConfig> {
    if (!isStorageAvailable()) {
      return {};
    }

    const configs: Record<string, ToolConfig> = {};
    const prefix = 'toolConfig_';

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const toolId = key.substring(prefix.length);
          const config = this.get(toolId);
          if (config) {
            configs[toolId] = config;
          }
        }
      }
    } catch {
      return {};
    }

    return configs;
  },

  /**
   * 設定工具的啟用狀態
   */
  setEnabled(toolId: string, enabled: boolean): boolean {
    const config = this.get(toolId);
    if (config) {
      config.isEnabled = enabled;
      return this.set(toolId, config);
    }
    return false;
  },

  /**
   * 設定工具的 API 金鑰
   */
  setApiKey(toolId: string, apiKey: string): boolean {
    let config = this.get(toolId);
    if (!config) {
      // 如果配置不存在，建立預設配置
      config = {
        id: toolId,
        name: toolId,
        isEnabled: false,
        apiKey: '',
      };
    }

    config.apiKey = apiKey.trim();
    config.isEnabled = !!apiKey.trim(); // 有 API 金鑰時自動啟用

    return this.set(toolId, config);
  },
};

export const modelConfigStorage = {
  /**
   * 儲存上次使用的模型設定
   */
  saveLastUsed(config: ModelSelectionConfig): boolean {
    try {
      const configJson = JSON.stringify(config);
      return setStorageItem('lastUsedModelConfig', configJson);
    } catch {
      return false;
    }
  },

  /**
   * 獲取上次使用的模型設定
   */
  getLastUsed(): ModelSelectionConfig | null {
    try {
      const configJson = getStorageItem('lastUsedModelConfig');
      if (!configJson) {
        return null;
      }

      const config = JSON.parse(configJson) as ModelSelectionConfig;

      // 驗證設定格式
      if (
        typeof config.provider === 'string' &&
        typeof config.model === 'string' &&
        typeof config.temperature === 'number' &&
        config.temperature >= 0 &&
        config.temperature <= 2
      ) {
        return config;
      }

      return null;
    } catch {
      return null;
    }
  },

  /**
   * 清除上次使用的模型設定
   */
  clearLastUsed(): boolean {
    return removeStorageItem('lastUsedModelConfig');
  },

  /**
   * 儲存供應商的預設模型設定
   */
  saveProviderDefaults(
    providerId: string,
    model: string,
    temperature: number
  ): boolean {
    try {
      const config = { model, temperature };
      const configJson = JSON.stringify(config);
      return setStorageItem(`providerDefaults_${providerId}`, configJson);
    } catch {
      return false;
    }
  },

  /**
   * 獲取供應商的預設模型設定
   */
  getProviderDefaults(
    providerId: string
  ): { model: string; temperature: number } | null {
    try {
      const configJson = getStorageItem(`providerDefaults_${providerId}`);
      if (!configJson) {
        return null;
      }

      const config = JSON.parse(configJson);

      if (
        typeof config.model === 'string' &&
        typeof config.temperature === 'number' &&
        config.temperature >= 0 &&
        config.temperature <= 2
      ) {
        return config;
      }

      return null;
    } catch {
      return null;
    }
  },

  /**
   * 獲取所有供應商的預設設定
   */
  getAllProviderDefaults(): Record<
    string,
    { model: string; temperature: number }
  > {
    if (!isStorageAvailable()) {
      return {};
    }

    const defaults: Record<string, { model: string; temperature: number }> = {};
    const prefix = 'providerDefaults_';

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const providerId = key.substring(prefix.length);
          const config = this.getProviderDefaults(providerId);
          if (config) {
            defaults[providerId] = config;
          }
        }
      }
    } catch {
      return {};
    }

    return defaults;
  },
};
