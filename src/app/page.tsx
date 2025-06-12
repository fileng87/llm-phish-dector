'use client';

import * as React from 'react';

import { EmailAnalyzer } from '@/components/email-analyzer';
import { Header } from '@/components/header';
import { ModelSelector } from '@/components/model-selector';
import { Card, CardContent } from '@/components/ui/card';
import {
  type ModelSelectionConfig,
  apiKeyStorage,
  modelConfigStorage,
} from '@/lib/storage';
import { Globe, Shield, Zap } from 'lucide-react';

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
              智慧釣魚郵件偵測器
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              運用先進的語言模型技術，快速識別可疑郵件內容，保護您的數位安全
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <Card className="glass-card glow-hover text-center p-6">
              <CardContent className="pt-0">
                <div className="gradient-brand h-12 w-12 rounded-lg mx-auto mb-4 flex items-center justify-center glow animate-float">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">智慧分析</h3>
                <p className="text-sm text-muted-foreground">
                  採用最新的AI技術深度分析郵件內容，識別各種釣魚手法
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card glow-hover text-center p-6">
              <CardContent className="pt-0">
                <div className="gradient-success h-12 w-12 rounded-lg mx-auto mb-4 flex items-center justify-center glow-success animate-float">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">快速檢測</h3>
                <p className="text-sm text-muted-foreground">
                  幾秒鐘內完成分析，即時提供詳細的風險評估報告
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card glow-hover text-center p-6">
              <CardContent className="pt-0">
                <div className="gradient-warning h-12 w-12 rounded-lg mx-auto mb-4 flex items-center justify-center glow-warning animate-float">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">隱私保護</h3>
                <p className="text-sm text-muted-foreground">
                  API 金鑰僅在您的瀏覽器本地儲存，不會上傳至任何伺服器
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* 頁腳 */}
      <footer className="w-full border-t glass backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              © 2025 LLM 釣魚郵件偵測器. 使用先進的 AI 技術保護您的數位安全.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
