'use client';

import * as React from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToolConfig, toolConfigStorage } from '@/lib/storage';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Search,
  Wrench,
} from 'lucide-react';

interface ToolsConfigCardProps {
  toolConfigs: Record<string, ToolConfig>;
  onToolConfigsChange: (configs: Record<string, ToolConfig>) => void;
  enabledTools: string[];
  toolCallingEnabled: boolean;
  isCustomModel: boolean;
  onToolCallingChange?: (enabled: boolean) => void;
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

export function ToolsConfigCard({
  toolConfigs,
  onToolConfigsChange,
  enabledTools,
  toolCallingEnabled,
  isCustomModel,
  onToolCallingChange,
}: ToolsConfigCardProps) {
  const [showApiKeys, setShowApiKeys] = React.useState<Record<string, boolean>>(
    {}
  );
  const [apiKeyErrors, setApiKeyErrors] = React.useState<
    Record<string, string>
  >({});

  const handleConfigChange = (
    toolId: string,
    field: keyof ToolConfig,
    value: string | boolean
  ) => {
    // 如果工具調用未啟用，不允許啟用工具
    if (field === 'isEnabled' && value === true && !toolCallingEnabled) {
      return;
    }

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

  const toggleApiKeyVisibility = (toolId: string) => {
    setShowApiKeys((prev) => ({
      ...prev,
      [toolId]: !prev[toolId],
    }));
  };

  const handleApiKeyChange = (toolId: string, value: string) => {
    const tool = AVAILABLE_TOOLS.find((t) => t.id === toolId);
    if (tool?.requiresApiKey && value && !value.startsWith('tvly-')) {
      setApiKeyErrors((prev) => ({
        ...prev,
        [toolId]: '無效的 Tavily API 金鑰格式，應以 "tvly-" 開頭',
      }));
    } else {
      setApiKeyErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[toolId];
        return newErrors;
      });
    }
    handleConfigChange(toolId, 'apiKey', value);
  };

  const enabledToolsCount = toolCallingEnabled ? enabledTools.length : 0;

  return (
    <Card className="glass-card h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wrench className="h-5 w-5 text-brand animate-pulse-soft" />
            <h3 className="font-semibold text-responsive-subheading">
              工具設定
            </h3>
          </div>
          {enabledToolsCount > 0 && (
            <Badge
              variant="outline"
              className="glass flex items-center space-x-1 glow-accent"
            >
              <Search className="h-3 w-3" />
              <span>{enabledToolsCount} 個工具已啟用</span>
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 工具調用狀態區域 - 簡化版 */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-white/20 bg-white/5">
          <div className="flex items-center space-x-3">
            <div
              className={`p-1.5 rounded-full ${toolCallingEnabled ? 'bg-green-500/20' : 'bg-gray-500/20'}`}
            >
              {toolCallingEnabled ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-gray-500" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">工具調用功能</span>
                {!isCustomModel && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    自動啟用
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {toolCallingEnabled
                  ? '已啟用，可使用分析工具增強檢測準確性'
                  : isCustomModel
                    ? '請手動啟用以使用分析工具'
                    : '請選擇支援工具調用的模型'}
              </p>
            </div>
          </div>

          {/* 只有自訂模型才顯示開關 */}
          {isCustomModel && (
            <Switch
              checked={toolCallingEnabled}
              onCheckedChange={onToolCallingChange}
              className="data-[state=checked]:bg-green-500"
            />
          )}
        </div>

        {/* 工具列表 */}
        <div
          className={
            !toolCallingEnabled ? 'opacity-50 pointer-events-none' : ''
          }
        >
          <Accordion type="multiple" className="w-full">
            {AVAILABLE_TOOLS.map((tool, index) => {
              const config = getConfig(tool.id);
              const IconComponent = tool.icon;
              const isEnabled = toolCallingEnabled ? config.isEnabled : false;
              const hasApiKey = Boolean(config.apiKey);
              const showApiKey = showApiKeys[tool.id] || false;
              const apiKeyError = apiKeyErrors[tool.id];

              return (
                <AccordionItem
                  key={tool.id}
                  value={tool.id}
                  className={
                    index < AVAILABLE_TOOLS.length - 1
                      ? 'border-b border-white/10'
                      : ''
                  }
                >
                  <div className="relative">
                    <AccordionTrigger className="flex w-full items-center justify-between rounded-lg p-4 pr-16 text-left transition-colors hover:bg-white/5 hover:no-underline">
                      <div className="flex flex-1 items-center space-x-3">
                        <div
                          className={`p-2 rounded-lg ${isEnabled ? 'bg-brand/20 text-brand' : 'bg-muted text-muted-foreground'}`}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-sm">{tool.name}</h4>
                            <div
                              className={`h-2 w-2 rounded-full ${
                                isEnabled && hasApiKey
                                  ? 'bg-green-500'
                                  : hasApiKey
                                    ? 'bg-amber-500'
                                    : 'bg-gray-400'
                              }`}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {tool.description}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <div
                      className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Switch
                        id={`switch-${tool.id}`}
                        checked={isEnabled}
                        onCheckedChange={(checked) =>
                          handleConfigChange(tool.id, 'isEnabled', checked)
                        }
                        disabled={!toolCallingEnabled || !hasApiKey}
                        aria-label={`${tool.name} 開關`}
                      />
                    </div>
                  </div>
                  <AccordionContent className="pt-2 pb-4 px-4">
                    <div className="space-y-4 border-t border-white/10 pt-4">
                      {tool.requiresApiKey && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor={`${tool.id}-apikey`}
                              className="text-sm font-medium"
                            >
                              {tool.apiKeyLabel}
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              {isEnabled && hasApiKey
                                ? '已啟用並配置'
                                : hasApiKey
                                  ? '已配置但未啟用'
                                  : '需要配置 API 金鑰'}
                            </span>
                          </div>

                          <div className="relative">
                            <Input
                              id={`${tool.id}-apikey`}
                              type={showApiKey ? 'text' : 'password'}
                              placeholder={tool.apiKeyPlaceholder}
                              value={config.apiKey || ''}
                              onChange={(e) =>
                                handleApiKeyChange(tool.id, e.target.value)
                              }
                              className={`glass glass-hover glass-focus pr-10 ${
                                apiKeyError ? 'border-red-500' : ''
                              }`}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full w-10 rounded-l-none hover:bg-transparent"
                              onClick={() => toggleApiKeyVisibility(tool.id)}
                            >
                              {showApiKey ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              )}
                            </Button>
                          </div>

                          {tool.helpUrl && (
                            <p className="text-xs text-muted-foreground">
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
                            <p className="text-sm text-red-500">
                              {apiKeyError}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}
