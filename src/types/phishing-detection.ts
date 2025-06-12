// 釣魚郵件偵測結果類型定義
export interface PhishingDetectionResult {
  isPhishing: boolean; // 是否為釣魚郵件
  confidenceScore: number; // 信心分數 (0-100)
  suspiciousPoints: string[]; // 可疑點列表
  explanation: string; // 詳細解釋
  riskLevel: 'low' | 'medium' | 'high'; // 風險等級
  timestamp: string; // 分析時間戳
}

// 使用者輸入格式
export interface AnalysisRequest {
  emailContent: string; // 郵件內容
  modelSettings: {
    provider: string; // 模型提供商
    model: string; // 模型名稱
    temperature: number; // 溫度參數
    apiKey: string; // API 金鑰
    useTools?: boolean; // 是否使用工具調用
  };
}

// JSON Schema 用於結構化輸出
export const PHISHING_DETECTION_SCHEMA = {
  type: 'object',
  properties: {
    isPhishing: {
      type: 'boolean',
      description: '判斷是否為釣魚郵件',
    },
    confidenceScore: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      description: '信心分數，範圍 0-100',
    },
    suspiciousPoints: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: '發現的可疑點列表',
    },
    explanation: {
      type: 'string',
      description: '詳細的分析解釋',
    },
    riskLevel: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
      description: '風險等級評估',
    },
  },
  required: [
    'isPhishing',
    'confidenceScore',
    'suspiciousPoints',
    'explanation',
    'riskLevel',
  ],
  additionalProperties: false,
} as const;

// 分析狀態
export interface AnalysisState {
  status: 'idle' | 'analyzing' | 'completed' | 'error';
  result?: PhishingDetectionResult;
  error?: string;
  progress?: number;
}
