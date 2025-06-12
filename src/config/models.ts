import { ModelsConfig } from '@/types/model-config';

/**
 * 模型配置
 * 部署時可以修改此文件來更新可用的模型列表
 */
export const MODELS_CONFIG: ModelsConfig = {
  version: '1.0.0',
  lastUpdated: '2025-06-12',
  providers: {
    openai: {
      name: 'OpenAI',
      description: 'OpenAI 的 GPT 系列模型',
      apiKeyFormat: 'sk-...',
      models: [
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          description: '最新的 GPT-4 優化版本，速度更快',
          recommended: true,
        },
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
          description: '輕量版 GPT-4o，成本更低',
          recommended: true,
        },
        {
          id: 'gpt-4-turbo',
          name: 'GPT-4 Turbo',
          description: 'GPT-4 的高速版本',
          recommended: false,
        },
        {
          id: 'gpt-4',
          name: 'GPT-4',
          description: '標準 GPT-4 模型',
          recommended: false,
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          description: '經濟實惠的選擇',
          recommended: false,
        },
      ],
    },
    anthropic: {
      name: 'Anthropic',
      description: 'Anthropic 的 Claude 系列模型',
      apiKeyFormat: 'sk-ant-...',
      models: [
        {
          id: 'claude-3-5-sonnet-20241022',
          name: 'Claude 3.5 Sonnet',
          description: '最新的 Claude 3.5 Sonnet，性能卓越',
          recommended: true,
        },
        {
          id: 'claude-3-5-haiku-20241022',
          name: 'Claude 3.5 Haiku',
          description: '快速且經濟的 Claude 3.5 版本',
          recommended: true,
        },
        {
          id: 'claude-3-opus-20240229',
          name: 'Claude 3 Opus',
          description: '最強大的 Claude 3 模型',
          recommended: false,
        },
        {
          id: 'claude-3-sonnet-20240229',
          name: 'Claude 3 Sonnet',
          description: '平衡性能與成本的選擇',
          recommended: false,
        },
        {
          id: 'claude-3-haiku-20240307',
          name: 'Claude 3 Haiku',
          description: '快速且經濟的選擇',
          recommended: false,
        },
      ],
    },
    google: {
      name: 'Google',
      description: 'Google 的 Gemini 系列模型',
      apiKeyFormat: 'AI...',
      models: [
        {
          id: 'gemini-2.5-flash-preview-05-20',
          name: 'Gemini 2.5 Flash Preview 05-20',
          description: '適應性思考、成本效益',
          recommended: true,
        },
        {
          id: 'gemini-2.5-pro-preview-06-05',
          name: 'Gemini 2.5 Pro 預先發布版',
          description: '強化思考和推理、多模態理解、進階程式設計等',
          recommended: true,
        },
        {
          id: 'gemini-2.0-flash',
          name: 'Gemini 2.0 Flash',
          description: '新一代功能、速度、思考和即時串流',
          recommended: false,
        },
        {
          id: 'gemini-2.0-flash-lite',
          name: 'Gemini 2.0 Flash-Lite',
          description: '成本效益高且延遲時間短',
          recommended: false,
        },
        {
          id: 'gemini-1.5-flash',
          name: 'Gemini 1.5 Flash',
          description: '在各種任務中提供快速且多功能的效能',
          recommended: false,
        },
        {
          id: 'gemini-1.5-flash-8b',
          name: 'Gemini 1.5 Flash-8B',
          description: '大量且較不智慧的工作',
          recommended: false,
        },
        {
          id: 'gemini-1.5-pro',
          name: 'Gemini 1.5 Pro',
          description: '需要更多智慧的複雜推論工作',
          recommended: false,
        },
      ],
    },
  },
  customModelSettings: {
    enabled: true,
    description: '允許用戶輸入自訂模型名稱',
    placeholder: '輸入自訂模型名稱（例如：gpt-4-1106-preview）',
    validation: {
      minLength: 3,
      maxLength: 100,
      allowedCharacters: '字母、數字、連字號、底線、點號',
    },
  },
};

/**
 * 獲取模型配置
 * 可以在這裡添加環境變數覆蓋邏輯
 */
export function getModelsConfig(): ModelsConfig {
  // 未來可以在這裡添加環境變數或動態配置邏輯
  // 例如：從環境變數讀取自訂配置 URL
  return MODELS_CONFIG;
}
