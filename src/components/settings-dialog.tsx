'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { apiKeyStorage } from '@/lib/storage';
import { Eye, EyeOff, Settings } from 'lucide-react';

interface ModelConfig {
  provider: string;
  apiKey: string;
  isEnabled: boolean;
}

interface SettingsDialogProps {
  providerConfigs: Record<string, ModelConfig>;
  onProviderConfigsChange: (configs: Record<string, ModelConfig>) => void;
}

const DEFAULT_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
  },
  {
    id: 'google',
    name: 'Google',
  },
];

export function SettingsDialog({
  providerConfigs,
  onProviderConfigsChange,
}: SettingsDialogProps) {
  const [showApiKey, setShowApiKey] = React.useState<Record<string, boolean>>(
    {}
  );
  const [editingProvider, setEditingProvider] = React.useState<string | null>(
    null
  );

  const handleConfigChange = (
    providerId: string,
    field: keyof ModelConfig,
    value: string | boolean
  ) => {
    const updatedConfigs = {
      ...providerConfigs,
      [providerId]: {
        ...getConfig(providerId),
        [field]: value,
      },
    };
    onProviderConfigsChange(updatedConfigs);

    // 將 API 金鑰儲存到 localStorage
    if (field === 'apiKey' && typeof value === 'string') {
      apiKeyStorage.set(providerId, value);
    }
  };

  const getConfig = (providerId: string): ModelConfig => {
    const config = providerConfigs[providerId];
    if (config) {
      return config;
    }

    // 從 localStorage 載入 API 金鑰
    const storedApiKey = apiKeyStorage.get(providerId);

    return {
      provider: providerId,
      apiKey: storedApiKey,
      isEnabled: false,
    };
  };

  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKey((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="glass glow-hover h-10 w-10"
        >
          <Settings className="h-4 w-4" />
          <span className="sr-only">設定</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            模型供應商設定
          </DialogTitle>
          <DialogDescription>
            配置不同的語言模型供應商 API 金鑰，啟用後即可在主畫面選用。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {DEFAULT_PROVIDERS.map((provider) => {
            const config = getConfig(provider.id);
            const isEditing = editingProvider === provider.id;
            const showKey = showApiKey[provider.id];

            return (
              <div key={provider.id} className="glass rounded-lg p-4">
                <div className="flex items-center justify-between">
                  {/* 左側：供應商資訊 */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-lg">
                          {provider.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* 右側：操作按鈕和開關 */}
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant={isEditing ? 'default' : 'outline'}
                      onClick={() =>
                        setEditingProvider(isEditing ? null : provider.id)
                      }
                      className="glass"
                    >
                      <Settings className="h-3 w-3 mr-2" />
                      {isEditing ? '完成' : '設定'}
                    </Button>

                    <Switch
                      checked={config.isEnabled}
                      onCheckedChange={(checked) =>
                        handleConfigChange(provider.id, 'isEnabled', checked)
                      }
                      disabled={!config.apiKey}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                </div>

                {/* 展開的設定區域 */}
                {isEditing && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`${provider.id}-apikey`}>
                          API 金鑰
                        </Label>
                        <div className="flex mt-1">
                          <Input
                            id={`${provider.id}-apikey`}
                            type={showKey ? 'text' : 'password'}
                            placeholder="輸入 API 金鑰"
                            value={config.apiKey}
                            onChange={(e) =>
                              handleConfigChange(
                                provider.id,
                                'apiKey',
                                e.target.value
                              )
                            }
                            className="glass flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="ml-2 h-10 w-10"
                            onClick={() => toggleApiKeyVisibility(provider.id)}
                          >
                            {showKey ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        設定 API
                        金鑰後，您可以在主畫面選擇使用此供應商的模型進行分析。
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-sm text-muted-foreground text-center border-t pt-4">
          💡 提示：API 金鑰僅在您的瀏覽器本地儲存，不會上傳至任何伺服器
        </div>
      </DialogContent>
    </Dialog>
  );
}
