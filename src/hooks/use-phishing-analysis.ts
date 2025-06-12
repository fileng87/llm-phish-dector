import { useCallback, useState } from 'react';

import { analyzeEmailContent } from '@/app/actions';
import { AnalysisRequest, AnalysisState } from '@/types/phishing-detection';
import { toast } from 'sonner';

/**
 * 釣魚郵件分析 Hook
 */
export function usePhishingAnalysis() {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: 'idle',
  });

  // 新增：當前步驟狀態
  const [currentStep, setCurrentStep] = useState<string>('');
  const [stepDescription, setStepDescription] = useState<string>('');

  const parseError = (error: unknown): string => {
    if (typeof error === 'string') {
      return error;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return '發生未知錯誤，請稍後重試';
  };

  const analyzeEmail = useCallback(async (request: AnalysisRequest) => {
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

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      setAnalysisState({ status: 'analyzing', progress: 0 });
      setCurrentStep('analyzing');
      setStepDescription('正在連接 AI 模型...');

      // 簡單的進度更新，不模擬假步驟
      progressInterval = setInterval(() => {
        setAnalysisState((prev) => {
          if (prev.status === 'analyzing') {
            const newProgress = Math.min((prev.progress || 0) + 3, 90);
            // 根據進度更新描述
            if (newProgress < 30) {
              setStepDescription('正在連接 AI 模型...');
            } else if (newProgress < 60) {
              setStepDescription('正在分析郵件內容...');
            } else {
              setStepDescription('正在生成分析報告...');
            }
            return {
              ...prev,
              progress: newProgress,
            };
          }
          return prev;
        });
      }, 500);

      const response = await analyzeEmailContent(request);

      if (progressInterval) clearInterval(progressInterval);

      if (response.success && response.data) {
        setCurrentStep('completed');
        setStepDescription('分析完成');
        setAnalysisState({
          status: 'completed',
          result: response.data,
          progress: 100,
        });

        const result = response.data;
        if (result.isPhishing) {
          const riskText =
            result.riskLevel === 'high'
              ? '高'
              : result.riskLevel === 'medium'
                ? '中'
                : '低';
          toast.error(`檢測到釣魚郵件！風險等級：${riskText}`, {
            id: 'analysis',
            duration: 6000,
            description: `信心分數：${result.confidenceScore}%`,
          });
        }
      } else {
        throw new Error(response.error || '分析失敗，但未回傳具體錯誤');
      }
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);

      const errorMessage = parseError(error);

      setCurrentStep('error');
      setStepDescription(`分析失敗：${errorMessage}`);
      setAnalysisState({
        status: 'error',
        error: errorMessage,
      });

      toast.error(`分析失敗：${errorMessage}`, {
        id: 'analysis',
        duration: 6000,
      });

      console.error('郵件分析失敗:', {
        error,
        request: {
          emailContentLength: request.emailContent.length,
          provider: request.modelSettings.provider,
          model: request.modelSettings.model,
          temperature: request.modelSettings.temperature,
          apiKeyLength: request.modelSettings.apiKey?.length,
        },
      });
    }
  }, []);

  const resetAnalysis = useCallback(() => {
    setAnalysisState({ status: 'idle' });
    setCurrentStep('');
    setStepDescription('');
    toast.dismiss('analysis');
  }, []);

  const retryAnalysis = useCallback(
    (request: AnalysisRequest) => {
      resetAnalysis();
      setTimeout(() => analyzeEmail(request), 200);
    },
    [analyzeEmail, resetAnalysis]
  );

  return {
    isAnalyzing: analysisState.status === 'analyzing',
    isCompleted: analysisState.status === 'completed',
    hasError: analysisState.status === 'error',
    result: analysisState.status === 'completed' ? analysisState.result : null,
    error: analysisState.status === 'error' ? analysisState.error : null,
    progress: analysisState.progress,
    currentStep,
    stepDescription,
    analyzeEmail,
    resetAnalysis,
    retryAnalysis,
  };
}
