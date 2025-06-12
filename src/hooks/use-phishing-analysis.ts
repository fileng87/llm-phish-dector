import { useCallback, useState } from 'react';

import {
  ModelConfigError,
  ModelConnectionError,
} from '@/lib/langchain/model-factory';
import {
  PhishingAnalysisError,
  analyzePhishingEmail,
} from '@/lib/langchain/phishing-detector';
import { AnalysisRequest, AnalysisState } from '@/types/phishing-detection';
import { toast } from 'sonner';

/**
 * 釣魚郵件分析 Hook
 */
export function usePhishingAnalysis() {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: 'idle',
  });

  /**
   * 解析錯誤並返回使用者友善的訊息
   */
  const parseError = (error: unknown): string => {
    if (error instanceof PhishingAnalysisError) {
      return error.message;
    }

    if (error instanceof ModelConfigError) {
      return `模型配置錯誤: ${error.message}`;
    }

    if (error instanceof ModelConnectionError) {
      return `連接錯誤: ${error.message}`;
    }

    if (error instanceof Error) {
      // 處理常見的網路和 API 錯誤
      const message = error.message.toLowerCase();

      if (message.includes('network') || message.includes('fetch')) {
        return '網路連接失敗，請檢查網路連接後重試';
      }

      if (message.includes('timeout')) {
        return '請求超時，請稍後重試';
      }

      if (message.includes('cors')) {
        return '跨域請求被阻止，請檢查瀏覽器設定';
      }

      return error.message;
    }

    return '發生未知錯誤，請稍後重試';
  };

  /**
   * 獲取錯誤的嚴重程度
   */
  const getErrorSeverity = (error: unknown): 'warning' | 'error' => {
    if (error instanceof PhishingAnalysisError) {
      // 某些錯誤可能是警告而不是嚴重錯誤
      if (
        error.code === 'INVALID_JSON_RESPONSE' ||
        error.code === 'CONTENT_TOO_LONG'
      ) {
        return 'warning';
      }
    }

    if (error instanceof ModelConfigError) {
      return 'warning';
    }

    return 'error';
  };

  /**
   * 開始分析郵件
   */
  const analyzeEmail = useCallback(async (request: AnalysisRequest) => {
    // 驗證輸入
    if (!request.emailContent?.trim()) {
      const errorMessage = '請輸入郵件內容';
      setAnalysisState({
        status: 'error',
        error: errorMessage,
      });
      toast.error(errorMessage);
      return;
    }

    if (
      !request.modelSettings?.provider ||
      !request.modelSettings?.model ||
      !request.modelSettings?.apiKey
    ) {
      const errorMessage = '請先配置模型設定';
      setAnalysisState({
        status: 'error',
        error: errorMessage,
      });
      toast.error(errorMessage);
      return;
    }

    // 檢查郵件內容長度
    if (request.emailContent.trim().length > 50000) {
      const errorMessage = '郵件內容過長，請限制在 50,000 字符以內';
      setAnalysisState({
        status: 'error',
        error: errorMessage,
      });
      toast.error(errorMessage);
      return;
    }

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      // 設定分析中狀態
      setAnalysisState({
        status: 'analyzing',
        progress: 0,
      });

      // 顯示開始分析的通知
      toast.loading('開始分析郵件...', { id: 'analysis' });

      // 模擬進度更新
      progressInterval = setInterval(() => {
        setAnalysisState((prev) => {
          if (prev.status === 'analyzing') {
            return {
              ...prev,
              progress: Math.min((prev.progress || 0) + 8, 85),
            };
          }
          return prev;
        });
      }, 300);

      // 執行分析
      const result = await analyzePhishingEmail(request);

      // 清除進度更新
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      // 設定完成狀態
      setAnalysisState({
        status: 'completed',
        result,
        progress: 100,
      });

      // 顯示分析結果通知
      if (result.isPhishing) {
        const riskText =
          result.riskLevel === 'high'
            ? '高'
            : result.riskLevel === 'medium'
              ? '中'
              : '低';
        toast.error(`⚠️ 檢測到釣魚郵件！風險等級：${riskText}`, {
          id: 'analysis',
          duration: 6000,
          description: `信心分數：${result.confidenceScore}%`,
        });
      } else {
        toast.success('✅ 郵件安全，未檢測到釣魚風險', {
          id: 'analysis',
          duration: 4000,
          description: `信心分數：${result.confidenceScore}%`,
        });
      }
    } catch (error) {
      // 清除進度更新
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      const errorMessage = parseError(error);
      const severity = getErrorSeverity(error);

      setAnalysisState({
        status: 'error',
        error: errorMessage,
      });

      // 根據錯誤嚴重程度顯示不同的通知
      if (severity === 'warning') {
        toast.warning(`分析遇到問題：${errorMessage}`, {
          id: 'analysis',
          duration: 5000,
        });
      } else {
        toast.error(`分析失敗：${errorMessage}`, {
          id: 'analysis',
          duration: 6000,
        });
      }

      // 記錄詳細錯誤信息用於調試
      console.error('郵件分析失敗:', {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorStack: error instanceof Error ? error.stack : undefined,
        errorCode:
          error instanceof PhishingAnalysisError ? error.code : undefined,
        request: {
          emailContentLength: request.emailContent.length,
          provider: request.modelSettings.provider,
          model: request.modelSettings.model,
          temperature: request.modelSettings.temperature,
          apiKeyLength: request.modelSettings.apiKey.length,
        },
      });
    }
  }, []);

  /**
   * 重置分析狀態
   */
  const resetAnalysis = useCallback(() => {
    setAnalysisState({
      status: 'idle',
    });
    toast.dismiss('analysis');
  }, []);

  /**
   * 重新分析
   */
  const retryAnalysis = useCallback(
    (request: AnalysisRequest) => {
      resetAnalysis();
      // 短暫延遲後重新開始分析
      setTimeout(() => analyzeEmail(request), 200);
    },
    [analyzeEmail, resetAnalysis]
  );

  /**
   * 取消分析
   */
  const cancelAnalysis = useCallback(() => {
    if (analysisState.status === 'analyzing') {
      setAnalysisState({
        status: 'idle',
      });
      toast.dismiss('analysis');
      toast.info('分析已取消');
    }
  }, [analysisState.status]);

  return {
    analysisState,
    analyzeEmail,
    resetAnalysis,
    retryAnalysis,
    cancelAnalysis,
    isAnalyzing: analysisState.status === 'analyzing',
    isCompleted: analysisState.status === 'completed',
    hasError: analysisState.status === 'error',
    result: analysisState.result,
    error: analysisState.error,
    progress: analysisState.progress || 0,
  };
}
