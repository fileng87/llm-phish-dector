'use client';

import * as React from 'react';

import { CollapsibleSettings } from '@/components/collapsible-settings';
import { EmailAnalyzer } from '@/components/email-analyzer';
import { HeroSection } from '@/components/hero-section';
import {
  type ModelSelectionConfig,
  type ToolConfig,
  apiKeyStorage,
  modelConfigStorage,
  toolConfigStorage,
} from '@/lib/storage';

interface ModelConfig {
  provider: string;
  apiKey: string;
}

/**
 * 客戶端應用容器組件
 * 包含所有需要客戶端狀態管理的邏輯
 */
export function ClientApp() {
  const [modelConfig, setModelConfig] =
    React.useState<ModelSelectionConfig | null>(null);

  // 供應商配置狀態
  const [providerConfigs, setProviderConfigs] = React.useState<
    Record<string, ModelConfig>
  >({});

  // 工具配置狀態
  const [toolConfigs, setToolConfigs] = React.useState<
    Record<string, ToolConfig>
  >({});

  // 是否為自訂模型
  const [isCustomModel, setIsCustomModel] = React.useState(false);

  // 初始化狀態
  const [isInitialized, setIsInitialized] = React.useState(false);

  // 初始化供應商配置、工具配置和模型設定
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
        };
      });

      setProviderConfigs(configs);

      // 載入工具配置
      const allToolConfigs = toolConfigStorage.getAll();
      setToolConfigs(allToolConfigs);

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

  // 獲取可用的供應商列表（有 API 金鑰的）
  const availableProviders = React.useMemo(() => {
    return Object.entries(providerConfigs)
      .filter(([, config]) => config.apiKey)
      .map(([providerId]) => providerId);
  }, [providerConfigs]);

  // 獲取已啟用的工具列表
  const enabledTools = React.useMemo(() => {
    return Object.entries(toolConfigs)
      .filter(([, config]) => config.isEnabled && config.apiKey)
      .map(([toolId]) => toolId);
  }, [toolConfigs]);

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

      // 如果當前選中的供應商沒有 API 金鑰，清除模型設定
      if (
        modelConfig &&
        (!configs[modelConfig.provider] ||
          !configs[modelConfig.provider].apiKey)
      ) {
        setModelConfig(null);
      }
    },
    [modelConfig]
  );

  const handleToolConfigsChange = React.useCallback(
    (configs: Record<string, ToolConfig>) => {
      setToolConfigs(configs);
    },
    []
  );

  return (
    <>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* 介紹區域 - SSR */}
          <HeroSection />

          {/* 可折疊設定區域 */}
          {isInitialized && (
            <CollapsibleSettings
              modelConfig={modelConfig}
              onModelConfigChange={handleModelConfigChange}
              availableProviders={availableProviders}
              providerConfigs={providerConfigs}
              onProviderConfigsChange={handleProviderConfigsChange}
              toolConfigs={toolConfigs}
              onToolConfigsChange={handleToolConfigsChange}
              enabledTools={enabledTools}
              isCustomModel={isCustomModel}
              onCustomModelChange={setIsCustomModel}
            />
          )}

          {/* 主要功能區域 */}
          <EmailAnalyzer
            modelConfig={modelConfig}
            toolConfigs={toolConfigs}
            enabledTools={enabledTools}
          />
        </div>
      </main>
    </>
  );
}
