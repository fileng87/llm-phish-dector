'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModelConfigLoader } from '@/lib/model-config-loader';
import {
  type ModelSelectionConfig,
  apiKeyStorage,
  modelConfigStorage,
} from '@/lib/storage';
import { ModelOption } from '@/types/model-config';
import { Bot, Eye, EyeOff, Key } from 'lucide-react';
import { toast } from 'sonner';

interface ModelConfig {
  provider: string;
  apiKey: string;
}

interface ModelSelectorProps {
  onConfigChange: (config: ModelSelectionConfig) => void;
  availableProviders: string[];
  initialConfig?: ModelSelectionConfig | null;
  providerConfigs: Record<string, ModelConfig>;
  onProviderConfigsChange: (configs: Record<string, ModelConfig>) => void;
  onCustomModelChange?: (isCustom: boolean) => void;
}

export function ModelSelector({
  onConfigChange,
  availableProviders,
  initialConfig,
  providerConfigs,
  onProviderConfigsChange,
  onCustomModelChange,
}: ModelSelectorProps) {
  const [selectedProvider, setSelectedProvider] = React.useState<string>('');
  const [selectedModel, setSelectedModel] = React.useState<string>('');
  const [customModel, setCustomModel] = React.useState<string>('');
  const [temperature, setTemperature] = React.useState<number>(0.7);
  const [useTools, setUseTools] = React.useState<boolean>(false);
  const [showApiKey, setShowApiKey] = React.useState<boolean>(false);
  const [modelOptions, setModelOptions] = React.useState<ModelOption[]>([]);
  const [providerNames, setProviderNames] = React.useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // 載入供應商名稱
  const loadProviderNames = React.useCallback(async () => {
    try {
      const names = await ModelConfigLoader.getProviderNames();
      setProviderNames(names);
    } catch (error) {
      console.error('載入供應商名稱失敗:', {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown',
      });
    }
  }, []);

  // 載入模型選項
  const loadModelOptions = React.useCallback(
    async (providerId: string) => {
      if (!providerId) {
        setModelOptions([]);
        return;
      }

      setLoading(true);
      try {
        const options = await ModelConfigLoader.getModelOptions(providerId);
        setModelOptions(options);

        // 如果沒有初始設定，自動選擇第一個可用的模型
        if (!isInitialized && options.length > 0 && !options[0].isCustom) {
          const firstModel = options[0];
          setSelectedModel(firstModel.id);
          // 預設模型根據支援情況自動設定工具調用
          setUseTools(firstModel.supportsToolCalling || false);
        }
      } catch (error) {
        console.error('載入模型選項失敗:', {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : 'Unknown',
          providerId,
        });
        toast.error('載入模型列表失敗');
        setModelOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [isInitialized]
  );

  // 恢復初始設定
  const restoreInitialConfig = React.useCallback(
    async (config: ModelSelectionConfig) => {
      if (!availableProviders.includes(config.provider)) {
        return false;
      }

      setSelectedProvider(config.provider);
      setTemperature(config.temperature);

      // 載入該供應商的模型選項
      try {
        const options = await ModelConfigLoader.getModelOptions(
          config.provider
        );
        setModelOptions(options);

        // 檢查模型是否在預設選項中
        const modelOption = options.find(
          (option) => option.id === config.model
        );
        if (modelOption) {
          setSelectedModel(config.model);
          setCustomModel('');
          // 預設模型根據支援情況自動設定工具調用
          setUseTools(modelOption.supportsToolCalling || false);
        } else {
          // 如果不在預設選項中，設為自訂模型
          const customOption = options.find((option) => option.isCustom);
          if (customOption) {
            setSelectedModel(customOption.id);
            setCustomModel(config.model);
            // 自訂模型使用配置中的設定，如果沒有則預設為 false
            setUseTools(config.useTools || false);
          }
        }

        return true;
      } catch (error) {
        console.error('恢復模型設定失敗:', error);
        return false;
      }
    },
    [availableProviders]
  );

  // 初始化設定
  React.useEffect(() => {
    const initializeConfig = async () => {
      if (isInitialized) return;

      console.log('ModelSelector 初始化開始:', {
        initialConfig,
        availableProviders,
        availableProvidersLength: availableProviders.length,
      });

      // 先載入供應商名稱
      await loadProviderNames();

      if (initialConfig && availableProviders.length > 0) {
        console.log('嘗試恢復初始設定:', initialConfig);
        const restored = await restoreInitialConfig(initialConfig);
        if (restored) {
          console.log('初始設定恢復成功');
          setIsInitialized(true);
          return;
        } else {
          console.log('初始設定恢復失敗');
        }
      }

      // 如果沒有初始設定或恢復失敗，嘗試載入供應商的預設設定
      if (availableProviders.length > 0) {
        console.log('嘗試載入供應商預設設定');
        const allDefaults = modelConfigStorage.getAllProviderDefaults();
        console.log('所有預設設定:', allDefaults);

        for (const providerId of availableProviders) {
          const defaults = allDefaults[providerId];
          if (defaults) {
            console.log(`使用 ${providerId} 的預設設定:`, defaults);
            const config: ModelSelectionConfig = {
              provider: providerId,
              model: defaults.model,
              temperature: defaults.temperature,
            };
            const restored = await restoreInitialConfig(config);
            if (restored) {
              console.log('預設設定恢復成功');
              setIsInitialized(true);
              return;
            }
          }
        }

        // 如果都沒有，選擇第一個可用的供應商
        console.log('使用第一個可用供應商:', availableProviders[0]);
        setSelectedProvider(availableProviders[0]);
      }

      setIsInitialized(true);
      console.log('ModelSelector 初始化完成');
    };

    // 只有當 availableProviders 有內容時才初始化
    if (availableProviders.length > 0) {
      initializeConfig();
    }
  }, [
    initialConfig,
    availableProviders,
    loadProviderNames,
    restoreInitialConfig,
    isInitialized,
  ]);

  // 當可用供應商變更時，重置選擇如果當前選擇不再可用
  React.useEffect(() => {
    if (selectedProvider && !availableProviders.includes(selectedProvider)) {
      setSelectedProvider('');
      setSelectedModel('');
      setCustomModel('');
    }
  }, [availableProviders, selectedProvider]);

  // 當選擇的供應商改變時，載入模型選項
  React.useEffect(() => {
    if (selectedProvider) {
      loadModelOptions(selectedProvider);
    } else {
      setModelOptions([]);
      setSelectedModel('');
      setCustomModel('');
    }
  }, [selectedProvider, loadModelOptions]);

  // 處理模型選擇變更
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    const isCustom = modelId === '__custom__';

    if (isCustom) {
      setCustomModel('');
      // 自訂模型預設關閉工具調用，讓用戶手動選擇
      setUseTools(false);
    } else {
      // 預設模型根據配置自動啟用工具調用
      const modelOption = modelOptions.find((option) => option.id === modelId);
      if (modelOption && modelOption.supportsToolCalling) {
        setUseTools(true);
      } else {
        setUseTools(false);
      }
    }

    // 通知父組件是否選擇了自訂模型
    onCustomModelChange?.(isCustom);
  };

  // 處理自訂模型輸入
  const handleCustomModelChange = async (value: string) => {
    setCustomModel(value);

    if (value.trim()) {
      const validation = await ModelConfigLoader.validateCustomModel(value);
      if (!validation.valid && validation.error) {
        // 可以選擇是否顯示即時驗證錯誤
        // toast.error(validation.error);
      }
    }
  };

  // 處理 API 金鑰變更
  const handleApiKeyChange = (providerId: string, apiKey: string) => {
    const updatedConfigs = {
      ...providerConfigs,
      [providerId]: {
        ...getProviderConfig(providerId),
        apiKey,
      },
    };
    onProviderConfigsChange(updatedConfigs);

    // 儲存到 localStorage
    apiKeyStorage.set(providerId, apiKey);
  };

  // 獲取供應商配置
  const getProviderConfig = (providerId: string): ModelConfig => {
    const config = providerConfigs[providerId];
    if (config) {
      return config;
    }

    // 從 localStorage 載入 API 金鑰
    const storedApiKey = apiKeyStorage.get(providerId);

    return {
      provider: providerId,
      apiKey: storedApiKey,
    };
  };

  // 切換 API 金鑰顯示
  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };

  // 當配置改變時通知父組件
  React.useEffect(() => {
    if (selectedProvider && selectedModel) {
      const finalModel =
        selectedModel === '__custom__' ? customModel.trim() : selectedModel;

      if (finalModel) {
        onConfigChange({
          provider: selectedProvider,
          model: finalModel,
          temperature: temperature,
          useTools: useTools,
        });
      }
    }
  }, [
    selectedProvider,
    selectedModel,
    customModel,
    temperature,
    useTools,
    onConfigChange,
  ]);

  // 獲取當前選中的模型選項
  const currentModelOption = modelOptions.find(
    (option) => option.id === selectedModel
  );
  const isCustomSelected = selectedModel === '__custom__';
  const finalModelName = isCustomSelected
    ? customModel
    : currentModelOption?.name;

  return (
    <Card className="glass-card h-full">
      <CardContent className="spacing-responsive !py-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-brand animate-pulse-soft" />
            <h3 className="font-semibold text-responsive-subheading">
              模型設定
            </h3>
          </div>
          {finalModelName && (
            <div className="flex items-center space-x-2">
              <Badge
                variant="outline"
                className="glass flex items-center space-x-1 glow-accent"
              >
                <Bot className="h-3 w-3" />
                <span>{finalModelName}</span>
              </Badge>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* 供應商選擇 */}
          <div className="space-y-2">
            <Label>模型供應商</Label>
            <Select
              value={selectedProvider}
              onValueChange={setSelectedProvider}
              disabled={availableProviders.length === 0}
            >
              <SelectTrigger className="glass glass-hover glass-focus">
                <SelectValue placeholder="選擇供應商" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg">
                {availableProviders.map((providerId) => (
                  <SelectItem key={providerId} value={providerId}>
                    {providerNames[providerId] || providerId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API 金鑰設定 */}
          {selectedProvider && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                API 金鑰
              </Label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={`輸入 ${providerNames[selectedProvider] || selectedProvider} API 金鑰`}
                  value={getProviderConfig(selectedProvider).apiKey || ''}
                  onChange={(e) =>
                    handleApiKeyChange(selectedProvider, e.target.value)
                  }
                  className="glass glass-hover glass-focus pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10 rounded-l-none hover:bg-transparent"
                  onClick={toggleApiKeyVisibility}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                API 金鑰僅在您的瀏覽器本地儲存，不會上傳至任何伺服器
              </p>
            </div>
          )}

          {/* 模型選擇 */}
          <div className="space-y-2">
            <Label>模型</Label>
            <Select
              value={selectedModel}
              onValueChange={handleModelChange}
              disabled={!selectedProvider || loading}
            >
              <SelectTrigger className="glass glass-hover glass-focus">
                <SelectValue placeholder={loading ? '載入中...' : '選擇模型'} />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg">
                {modelOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <div className="flex items-center space-x-2">
                      <span>{option.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 溫度參數 */}
          <div className="space-y-2">
            <Label>溫度參數: {temperature}</Label>
            <div className="px-3">
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 gradient-brand-light rounded-lg appearance-none cursor-pointer slider"
                disabled={!selectedProvider}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>保守</span>
                <span>創新</span>
              </div>
            </div>
          </div>
        </div>

        {/* 自訂模型輸入 */}
        {isCustomSelected && (
          <div className="mt-4 space-y-2">
            <div className="linear-separator my-4"></div>
            <Label htmlFor="custom-model">自訂模型名稱</Label>
            <Input
              id="custom-model"
              placeholder="輸入自訂模型名稱（例如：gpt-4-1106-preview）"
              value={customModel}
              onChange={(e) => handleCustomModelChange(e.target.value)}
              className="glass glass-hover glass-focus"
            />
            <p className="text-xs text-muted-foreground">
              請輸入完整的模型名稱。支援字母、數字、連字號、底線和點號。
            </p>
          </div>
        )}

        {/* 模型描述 */}
        {currentModelOption?.description && !isCustomSelected && (
          <div className="mt-4 glass-minimal spacing-responsive-sm rounded-lg">
            <p className="text-sm text-muted-foreground">
              {currentModelOption.description}
            </p>
          </div>
        )}

        {availableProviders.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">
              尚未配置任何模型供應商，請先選擇供應商並輸入 API 金鑰
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
