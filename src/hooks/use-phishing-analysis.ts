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

  // 新增：取消控制
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const parseError = (error: unknown): string => {
    if (typeof error === 'string') {
      return error;
    }
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'object' && error !== null) {
      try {
        return JSON.stringify(error);
      } catch {
        return '未知物件錯誤';
      }
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

    // 創建新的 AbortController
    const controller = new AbortController();
    setAbortController(controller);

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      setAnalysisState({ status: 'analyzing', progress: 0 });
      setCurrentStep('analyzing');
      setStepDescription('正在連接 AI 模型...');

      // 檢查是否已被取消
      if (controller.signal.aborted) {
        throw new Error('分析已被取消');
      }

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
        // 檢查返回的結果是否為錯誤結果
        if (response.data.isError) {
          // 這是一個包裝的錯誤結果
          const errorMessage =
            response.data.errorMessage || '分析過程中發生錯誤';

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

          console.error('郵件分析失敗 (包裝錯誤):', {
            errorMessage: errorMessage,
            suspiciousPoints: response.data.suspiciousPoints,
            explanation: response.data.explanation,
            request: {
              emailContentLength: request.emailContent.length,
              provider: request.modelSettings.provider,
              model: request.modelSettings.model,
              temperature: request.modelSettings.temperature,
              apiKeyLength: request.modelSettings.apiKey?.length,
            },
          });
        } else {
          // 這是正常的分析結果
          setCurrentStep('completed');
          setStepDescription('分析完成');
          setAnalysisState({
            status: 'completed',
            result: response.data,
            progress: 100,
          });
        }
      } else {
        // Server Action 本身失敗
        const errorMessage = response.error || '分析失敗，但未回傳具體錯誤';

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

        console.error('郵件分析失敗 (Server Action 錯誤):', {
          error: response.error,
          parsedError: errorMessage,
          request: {
            emailContentLength: request.emailContent.length,
            provider: request.modelSettings.provider,
            model: request.modelSettings.model,
            temperature: request.modelSettings.temperature,
            apiKeyLength: request.modelSettings.apiKey?.length,
          },
        });
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
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : typeof error === 'object'
              ? JSON.stringify(error)
              : error,
        parsedError: errorMessage,
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

  const cancelAnalysis = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setAnalysisState({ status: 'idle' });
    setCurrentStep('');
    setStepDescription('');
    toast.dismiss('analysis');
    toast.info('分析已取消', { duration: 3000 });
  }, [abortController]);

  const resetAnalysis = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setAnalysisState({ status: 'idle' });
    setCurrentStep('');
    setStepDescription('');
    toast.dismiss('analysis');
  }, [abortController]);

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
    cancelAnalysis,
    canCancel: analysisState.status === 'analyzing',
  };
}
