'use client';

import * as React from 'react';

import { ModelSelector } from '@/components/model-selector';
import { ToolsConfigCard } from '@/components/tools-config-card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { type ModelSelectionConfig, type ToolConfig } from '@/lib/storage';
import { Bot, Settings, Wrench } from 'lucide-react';

interface ModelConfig {
  provider: string;
  apiKey: string;
}

interface CollapsibleSettingsProps {
  modelConfig: ModelSelectionConfig | null;
  onModelConfigChange: (config: ModelSelectionConfig) => void;
  availableProviders: string[];
  providerConfigs: Record<string, ModelConfig>;
  onProviderConfigsChange: (configs: Record<string, ModelConfig>) => void;
  toolConfigs: Record<string, ToolConfig>;
  onToolConfigsChange: (configs: Record<string, ToolConfig>) => void;
  enabledTools: string[];
  isCustomModel: boolean;
  onCustomModelChange: (isCustom: boolean) => void;
}

export function CollapsibleSettings({
  modelConfig,
  onModelConfigChange,
  availableProviders,
  providerConfigs,
  onProviderConfigsChange,
  toolConfigs,
  onToolConfigsChange,
  enabledTools,
  isCustomModel,
  onCustomModelChange,
}: CollapsibleSettingsProps) {
  // 計算狀態徽章
  const hasModelConfig = Boolean(modelConfig);
  const enabledToolsCount = modelConfig?.useTools ? enabledTools.length : 0;

  return (
    <div className="glass-card glow-hover rounded-xl border border-white/20">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="settings" className="border-none">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center justify-between w-full mr-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-brand/20 text-brand">
                  <Settings className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg">模型與工具設定</h3>
                  <p className="text-sm text-muted-foreground">
                    配置 AI 模型和分析工具
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {hasModelConfig && (
                  <Badge
                    variant="outline"
                    className="glass flex items-center space-x-1 glow-accent"
                  >
                    <Bot className="h-3 w-3" />
                    <span>模型已配置</span>
                  </Badge>
                )}
                {enabledToolsCount > 0 && (
                  <Badge
                    variant="outline"
                    className="glass flex items-center space-x-1 glow-accent"
                  >
                    <Wrench className="h-3 w-3" />
                    <span>{enabledToolsCount} 個工具</span>
                  </Badge>
                )}
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-6 pb-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* 模型設定 */}
              <ModelSelector
                onConfigChange={onModelConfigChange}
                availableProviders={availableProviders}
                initialConfig={modelConfig}
                providerConfigs={providerConfigs}
                onProviderConfigsChange={onProviderConfigsChange}
                onCustomModelChange={onCustomModelChange}
              />

              {/* 工具設定 */}
              <ToolsConfigCard
                toolConfigs={toolConfigs}
                onToolConfigsChange={onToolConfigsChange}
                enabledTools={enabledTools}
                toolCallingEnabled={modelConfig?.useTools || false}
                isCustomModel={isCustomModel}
                onToolCallingChange={(enabled) => {
                  if (modelConfig) {
                    const updatedConfig = { ...modelConfig, useTools: enabled };
                    onModelConfigChange(updatedConfig);
                  }
                }}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
