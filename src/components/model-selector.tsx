'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import { ModelConfigLoader } from '@/lib/model-config-loader';
import { type ModelSelectionConfig, modelConfigStorage } from '@/lib/storage';
import { ModelOption } from '@/types/model-config';
import { Bot, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface ModelSelectorProps {
  onConfigChange: (config: ModelSelectionConfig) => void;
  availableProviders: string[];
  initialConfig?: ModelSelectionConfig | null;
}

export function ModelSelector({
  onConfigChange,
  availableProviders,
  initialConfig,
}: ModelSelectorProps) {
  const [selectedProvider, setSelectedProvider] = React.useState<string>('');
  const [selectedModel, setSelectedModel] = React.useState<string>('');
  const [customModel, setCustomModel] = React.useState<string>('');
  const [temperature, setTemperature] = React.useState<number>(0.7);
  const [useTools, setUseTools] = React.useState<boolean>(false);
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
          // 根據模型配置自動設定工具調用
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
          // 預設模型根據配置自動設定工具調用
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
    if (modelId === '__custom__') {
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
    <Card className="glass-card glow-hover mb-6">
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
                <Zap className="h-3 w-3" />
                <span>{finalModelName}</span>
              </Badge>
            </div>
          )}
        </div>

        <div className="grid-responsive gap-4">
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

          {/* 預設模型的工具調用狀態顯示 */}
          {!isCustomSelected && currentModelOption && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    工具調用功能
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {currentModelOption.supportsToolCalling
                      ? '此模型支援深度技術分析，已自動啟用'
                      : '此模型不支援工具調用功能'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {currentModelOption.supportsToolCalling ? (
                    <Badge
                      variant="default"
                      className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 font-medium"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      已啟用
                    </Badge>
                  ) : (
                    <>
                      <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                      <Badge
                        variant="secondary"
                        className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                      >
                        不支援
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 工具調用設定 - 只在自訂模型時顯示 */}
          {isCustomSelected && (
            <div className="space-y-3">
              <div className="p-4 border border-blue-200 dark:border-blue-800/30 rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label
                      htmlFor="use-tools"
                      className="flex items-center gap-2 text-base font-medium"
                    >
                      <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      啟用工具調用功能
                    </Label>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      讓自訂模型使用深度技術分析工具進行更準確的釣魚郵件檢測
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="use-tools"
                      checked={useTools}
                      onCheckedChange={setUseTools}
                      disabled={!selectedProvider}
                      className="scale-125 data-[state=checked]:bg-green-500"
                    />
                  </div>
                </div>
                {!useTools && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className="h-4 w-4 border-2 border-amber-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                        <div className="h-1.5 w-1.5 bg-amber-500 rounded-full"></div>
                      </div>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        建議啟用工具調用功能以獲得更準確的分析結果
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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
              尚未配置任何模型供應商，請先到設定中配置 API 金鑰並啟用供應商
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
