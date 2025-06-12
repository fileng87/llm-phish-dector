'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { ToolConfig, toolConfigStorage } from '@/lib/storage';
import { Eye, EyeOff, Info, Search, Wrench } from 'lucide-react';

interface ToolsConfigDialogProps {
  toolConfigs: Record<string, ToolConfig>;
  onToolConfigsChange: (configs: Record<string, ToolConfig>) => void;
}

const AVAILABLE_TOOLS = [
  {
    id: 'tavily',
    name: 'Tavily Search',
    description: '專為 AI 優化的搜尋引擎，提供精準的網路搜尋結果',
    icon: Search,
    requiresApiKey: true,
    apiKeyLabel: 'Tavily API 金鑰',
    apiKeyPlaceholder: '輸入您的 Tavily API 金鑰',
    helpUrl: 'https://tavily.com/',
  },
];

// 單個工具配置對話框組件
function ToolConfigDialog({
  tool,
  config,
  onConfigChange,
}: {
  tool: (typeof AVAILABLE_TOOLS)[0];
  config: ToolConfig;
  onConfigChange: (field: keyof ToolConfig, value: string | boolean) => void;
}) {
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [apiKeyError, setApiKeyError] = React.useState<string | null>(null);

  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };

  const handleApiKeyChange = (value: string) => {
    if (tool.requiresApiKey && value && !value.startsWith('tvly-')) {
      setApiKeyError('無效的 Tavily API 金鑰格式，應以 "tvly-" 開頭');
    } else {
      setApiKeyError(null);
    }
    onConfigChange('apiKey', value);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="glass">
          <Wrench className="h-3 w-3 mr-2" />
          設定
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-background border border-border shadow-xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <tool.icon className="h-5 w-5" />
            {tool.name} 設定
          </DialogTitle>
          <DialogDescription>{tool.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {tool.requiresApiKey && (
            <div>
              <Label htmlFor={`${tool.id}-apikey`}>{tool.apiKeyLabel}</Label>
              <div className="flex mt-2">
                <Input
                  id={`${tool.id}-apikey`}
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={tool.apiKeyPlaceholder}
                  value={config.apiKey || ''}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  className={`glass glass-hover glass-focus flex-1 ${
                    apiKeyError ? 'border-red-500' : ''
                  }`}
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
              {tool.helpUrl && (
                <p className="text-xs text-muted-foreground mt-1">
                  需要 API 金鑰？請訪問{' '}
                  <a
                    href={tool.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {tool.helpUrl}
                  </a>
                </p>
              )}
              {apiKeyError && (
                <p className="text-sm text-red-500 mt-1">{apiKeyError}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground border-t pt-4">
          <Info className="h-3 w-3" />
          工具配置僅在您的瀏覽器本地儲存，不會上傳至任何伺服器
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ToolsConfigDialog({
  toolConfigs,
  onToolConfigsChange,
}: ToolsConfigDialogProps) {
  const handleConfigChange = (
    toolId: string,
    field: keyof ToolConfig,
    value: string | boolean
  ) => {
    const updatedConfigs = {
      ...toolConfigs,
      [toolId]: {
        ...getConfig(toolId),
        [field]: value,
      },
    };
    onToolConfigsChange(updatedConfigs);

    // 將配置儲存到 localStorage
    toolConfigStorage.set(toolId, updatedConfigs[toolId]);
  };

  const getConfig = (toolId: string): ToolConfig => {
    const config = toolConfigs[toolId];
    if (config) {
      return config;
    }

    // 從 localStorage 載入配置
    const storedConfig = toolConfigStorage.get(toolId);
    if (storedConfig) {
      return storedConfig;
    }

    // 建立預設配置
    const tool = AVAILABLE_TOOLS.find((t) => t.id === toolId);
    return {
      id: toolId,
      name: tool?.name || toolId,
      isEnabled: false,
      apiKey: '',
    };
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="glass h-10 w-10">
          <Search className="h-4 w-4" />
          <span className="sr-only">工具設定</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-background border border-border shadow-xl max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">搜尋工具設定</DialogTitle>
          <DialogDescription>
            配置搜尋工具以增強釣魚郵件偵測的準確性。工具將用於驗證郵件內容的真實性。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {AVAILABLE_TOOLS.map((tool) => {
            const config = getConfig(tool.id);

            return (
              <Card key={tool.id} className="glass glow-hover">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    {/* 左側：工具資訊 */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <tool.icon className="h-6 w-6 text-blue-500" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-lg">
                              {tool.name}
                            </h3>
                            {config.apiKey && config.isEnabled && (
                              <div className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-full text-xs">
                                已啟用
                              </div>
                            )}
                            {config.apiKey && !config.isEnabled && (
                              <div className="px-2 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 rounded-full text-xs">
                                已配置
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 右側：操作按鈕和開關 */}
                    <div className="flex items-center space-x-4">
                      <ToolConfigDialog
                        tool={tool}
                        config={config}
                        onConfigChange={(field, value) =>
                          handleConfigChange(tool.id, field, value)
                        }
                      />

                      <Switch
                        checked={config.isEnabled}
                        onCheckedChange={(checked) =>
                          handleConfigChange(tool.id, 'isEnabled', checked)
                        }
                        disabled={!config.apiKey}
                        className="data-[state=checked]:bg-blue-600 scale-125"
                      />
                    </div>
                  </div>
                </CardHeader>
                {!config.apiKey && (
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Info className="h-4 w-4" />
                      需要配置 API 金鑰才能啟用此工具
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            啟用搜尋工具可以提高釣魚郵件偵測的準確性，但會增加分析時間
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
