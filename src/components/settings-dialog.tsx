'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
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
import { Eye, EyeOff, Info, Settings } from 'lucide-react';

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

// 單個供應商設定對話框組件
function ProviderConfigDialog({
  provider,
  config,
  onConfigChange,
}: {
  provider: { id: string; name: string };
  config: ModelConfig;
  onConfigChange: (field: keyof ModelConfig, value: string | boolean) => void;
}) {
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="glass">
          <Settings className="h-3 w-3 mr-2" />
          設定
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-background border border-border shadow-xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {provider.name} 設定
          </DialogTitle>
          <DialogDescription>
            配置 {provider.name} 的 API 金鑰以啟用此供應商。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor={`${provider.id}-apikey`}>API 金鑰</Label>
            <div className="flex mt-2">
              <Input
                id={`${provider.id}-apikey`}
                type={showApiKey ? 'text' : 'password'}
                placeholder="輸入 API 金鑰"
                value={config.apiKey}
                onChange={(e) => onConfigChange('apiKey', e.target.value)}
                className="glass glass-hover glass-focus flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-2 h-10 w-10 glass"
                onClick={toggleApiKeyVisibility}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground border-t pt-4">
          <Info className="h-3 w-3" />
          API 金鑰僅在您的瀏覽器本地儲存，不會上傳至任何伺服器
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SettingsDialog({
  providerConfigs,
  onProviderConfigsChange,
}: SettingsDialogProps) {
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="glass h-10 w-10">
          <Settings className="h-4 w-4" />
          <span className="sr-only">設定</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-background border border-border shadow-xl max-w-3xl">
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

            return (
              <Card key={provider.id} className="glass glow-hover">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    {/* 左側：供應商資訊 */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-lg text-responsive-subheading">
                            {provider.name}
                          </h3>
                          {config.apiKey && (
                            <div className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-full text-xs">
                              已配置
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 右側：操作按鈕和開關 */}
                    <div className="flex items-center space-x-4">
                      <ProviderConfigDialog
                        provider={provider}
                        config={config}
                        onConfigChange={(field, value) =>
                          handleConfigChange(provider.id, field, value)
                        }
                      />

                      <Switch
                        checked={config.isEnabled}
                        onCheckedChange={(checked) =>
                          handleConfigChange(provider.id, 'isEnabled', checked)
                        }
                        disabled={!config.apiKey}
                        className="data-[state=checked]:bg-blue-600 scale-125"
                      />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
