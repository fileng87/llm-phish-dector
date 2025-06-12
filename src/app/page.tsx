'use client';

import * as React from 'react';

import { EmailAnalyzer } from '@/components/email-analyzer';
import { Header } from '@/components/header';
import { ModelSelector } from '@/components/model-selector';
import {
  type ModelSelectionConfig,
  apiKeyStorage,
  modelConfigStorage,
} from '@/lib/storage';

interface ModelConfig {
  provider: string;
  apiKey: string;
  isEnabled: boolean;
}

export default function Home() {
  const [modelConfig, setModelConfig] =
    React.useState<ModelSelectionConfig | null>(null);

  // 供應商配置狀態
  const [providerConfigs, setProviderConfigs] = React.useState<
    Record<string, ModelConfig>
  >({});

  // 初始化狀態
  const [isInitialized, setIsInitialized] = React.useState(false);

  // 初始化供應商配置和模型設定
  React.useEffect(() => {
    const initializeConfigs = () => {
      // 載入所有 API 金鑰
      const allApiKeys = apiKeyStorage.getAll();

      // 建立供應商配置
      const configs: Record<string, ModelConfig> = {};
      Object.entries(allApiKeys).forEach(([providerId, apiKey]) => {
        configs[providerId] = {
          provider: providerId,
          apiKey,
          isEnabled: true, // 有 API 金鑰的預設為啟用
        };
      });

      setProviderConfigs(configs);

      // 載入上次使用的模型設定
      const lastUsedConfig = modelConfigStorage.getLastUsed();
      if (lastUsedConfig) {
        // 檢查該供應商是否仍然可用
        if (allApiKeys[lastUsedConfig.provider]) {
          setModelConfig(lastUsedConfig);
        }
      }

      setIsInitialized(true);
    };

    initializeConfigs();
  }, []);

  // 獲取已啟用的供應商列表
  const enabledProviders = React.useMemo(() => {
    return Object.entries(providerConfigs)
      .filter(([, config]) => config.isEnabled && config.apiKey)
      .map(([providerId]) => providerId);
  }, [providerConfigs]);

  const handleModelConfigChange = React.useCallback(
    (config: ModelSelectionConfig) => {
      setModelConfig(config);
      // 自動保存上次使用的模型設定
      modelConfigStorage.saveLastUsed(config);
      // 同時保存該供應商的預設設定
      modelConfigStorage.saveProviderDefaults(
        config.provider,
        config.model,
        config.temperature
      );
    },
    []
  );

  const handleProviderConfigsChange = React.useCallback(
    (configs: Record<string, ModelConfig>) => {
      setProviderConfigs(configs);

      // 如果當前選中的供應商被停用或移除，清除模型設定
      if (
        modelConfig &&
        (!configs[modelConfig.provider] ||
          !configs[modelConfig.provider].isEnabled)
      ) {
        setModelConfig(null);
      }
    },
    [modelConfig]
  );

  return (
    <div className="min-h-screen">
      <Header
        providerConfigs={providerConfigs}
        onProviderConfigsChange={handleProviderConfigsChange}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* 介紹區域 */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              智能郵件安全檢測
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              使用先進的大型語言模型技術，快速準確地識別釣魚郵件和惡意內容，
              保護您的數位安全。支援多種 AI 模型，提供詳細的分析報告。
            </p>
          </div>

          {/* 模型選擇器 */}
          {isInitialized && (
            <ModelSelector
              onConfigChange={handleModelConfigChange}
              availableProviders={enabledProviders}
              initialConfig={modelConfig}
            />
          )}

          {/* 主要功能區域 */}
          <EmailAnalyzer modelConfig={modelConfig} />

          {/* 功能特色 */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="text-center p-6 glass rounded-lg">
              <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg mx-auto mb-4 flex items-center justify-center glow">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">AI 智能分析</h3>
              <p className="text-sm text-muted-foreground">
                採用最新的大型語言模型，深度理解郵件內容語義和結構
              </p>
            </div>

            <div className="text-center p-6 glass rounded-lg">
              <div className="h-12 w-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-lg mx-auto mb-4 flex items-center justify-center glow">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">即時檢測</h3>
              <p className="text-sm text-muted-foreground">
                快速分析處理，秒級回應，不影響您的工作效率
              </p>
            </div>

            <div className="text-center p-6 glass rounded-lg">
              <div className="h-12 w-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg mx-auto mb-4 flex items-center justify-center glow">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">隱私保護</h3>
              <p className="text-sm text-muted-foreground">
                所有處理在前端完成，您的郵件內容不會儲存在我們的伺服器
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* 頁腳 */}
      <footer className="border-t glass-card mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              © 2024 LLM 釣魚郵件偵測器. 使用先進的 AI 技術保護您的數位安全.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
