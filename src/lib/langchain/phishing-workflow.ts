import { PhishingDetectionResult } from '@/types/phishing-detection';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { ToolMessage } from '@langchain/core/messages';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { Runnable } from '@langchain/core/runnables';
import { END, START, StateGraph } from '@langchain/langgraph';

import {
  PHISHING_DETECTION_SYSTEM_PROMPT,
  generateAnalysisPrompt,
  generateToolAnalysisPrompt,
} from './prompts';
import { availableTools, getToolByName } from './tools';

/**
 * 工作流狀態介面
 */
interface WorkflowState {
  emailContent: string;
  messages: Array<SystemMessage | HumanMessage | AIMessage | ToolMessage>;
  toolResults: Record<string, unknown>;
  finalResult?: PhishingDetectionResult;
  useTools: boolean;
  currentStep:
    | 'initial_analysis'
    | 'tool_calling'
    | 'final_analysis'
    | 'completed';
  currentStepDescription?: string;
}

/**
 * 釣魚郵件分析工作流
 */
export class PhishingAnalysisWorkflow {
  private model: BaseChatModel;
  private modelWithTools: Runnable;
  private parser: JsonOutputParser;
  private workflow: StateGraph<WorkflowState>;

  constructor(model: BaseChatModel, useTools: boolean = false) {
    this.model = model;
    this.parser = new JsonOutputParser();

    // 如果支援工具調用，綁定工具到模型
    if (useTools && this.model.bindTools) {
      this.modelWithTools = this.model.bindTools(availableTools);
    } else {
      this.modelWithTools = this.model;
    }

    this.workflow = this.createWorkflow(useTools);
  }

  /**
   * 創建工作流圖
   */
  private createWorkflow(useTools: boolean): StateGraph<WorkflowState> {
    const workflow = new StateGraph<WorkflowState>({
      channels: {
        emailContent: null,
        messages: null,
        toolResults: null,
        finalResult: null,
        useTools: null,
        currentStep: null,
      },
    });

    // 添加節點
    workflow.addNode('initial_analysis', this.initialAnalysis.bind(this));

    if (useTools) {
      workflow.addNode('tool_calling', this.toolCalling.bind(this));
      workflow.addNode('final_analysis', this.finalAnalysis.bind(this));
    }

    // 設定邊
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    workflow.addEdge(START, 'initial_analysis' as any);

    if (useTools) {
      workflow.addConditionalEdges(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'initial_analysis' as any,
        this.shouldUseTool.bind(this),
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          use_tools: 'tool_calling' as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          no_tools: 'final_analysis' as any,
        }
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      workflow.addEdge('tool_calling' as any, 'final_analysis' as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      workflow.addEdge('final_analysis' as any, END);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      workflow.addEdge('initial_analysis' as any, END);
    }

    return workflow;
  }

  /**
   * 初始分析步驟
   */
  private async initialAnalysis(
    state: WorkflowState
  ): Promise<Partial<WorkflowState>> {
    console.log('開始初始分析...');
    console.log('工作流 useTools 設定:', state.useTools);

    const messages = [
      new SystemMessage(PHISHING_DETECTION_SYSTEM_PROMPT),
      new HumanMessage(generateAnalysisPrompt(state.emailContent)),
    ];

    try {
      const response = await this.modelWithTools.invoke(messages);
      console.log('模型回應類型:', response.constructor.name);
      console.log('模型回應內容長度:', response.content.toString().length);

      // 檢查是否有工具調用
      if (
        state.useTools &&
        response.tool_calls &&
        response.tool_calls.length > 0
      ) {
        console.log(`✅ 檢測到 ${response.tool_calls.length} 個工具調用`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response.tool_calls.forEach((toolCall: any, index: number) => {
          console.log(`工具 ${index + 1}: ${toolCall.name}`, toolCall.args);
        });
        return {
          messages: [...messages, response],
          currentStep: 'tool_calling',
          currentStepDescription: `正在執行 ${response.tool_calls.length} 個分析工具`,
        };
      } else {
        console.log('❌ 無工具調用，直接完成分析');
        console.log('response.tool_calls:', response.tool_calls);
        // 直接解析結果
        const result = await this.parseResult(response.content.toString());
        return {
          messages: [...messages, response],
          finalResult: result,
          currentStep: 'completed',
          currentStepDescription: '分析完成',
        };
      }
    } catch (error) {
      throw new Error(
        `初始分析失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 工具調用步驟
   */
  private async toolCalling(
    state: WorkflowState
  ): Promise<Partial<WorkflowState>> {
    console.log('開始執行工具調用...');

    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    const toolResults: Record<string, unknown> = { ...state.toolResults };
    const toolMessages: ToolMessage[] = [];

    if (lastMessage.tool_calls) {
      for (const toolCall of lastMessage.tool_calls) {
        console.log(`執行工具: ${toolCall.name}`);
        try {
          const tool = getToolByName(toolCall.name);
          if (tool) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await (tool as any).invoke(toolCall.args);
            toolResults[toolCall.name] = result;
            console.log(`工具 ${toolCall.name} 執行成功`);

            toolMessages.push(
              new ToolMessage({
                content: result,
                tool_call_id: toolCall.id || toolCall.name,
              })
            );
          }
        } catch (error) {
          console.log(`工具 ${toolCall.name} 執行失敗:`, error);
          const errorMessage = `工具 ${toolCall.name} 執行失敗: ${error instanceof Error ? error.message : '未知錯誤'}`;
          toolMessages.push(
            new ToolMessage({
              content: errorMessage,
              tool_call_id: toolCall.id || toolCall.name,
            })
          );
        }
      }
    }

    console.log('工具調用完成，準備進行最終分析');
    return {
      messages: [...state.messages, ...toolMessages],
      toolResults,
      currentStep: 'final_analysis',
      currentStepDescription: '正在整合工具分析結果',
    };
  }

  /**
   * 最終分析步驟
   */
  private async finalAnalysis(
    state: WorkflowState
  ): Promise<Partial<WorkflowState>> {
    // 檢查是否有有效的工具結果
    const hasValidToolResults = Object.keys(state.toolResults).length > 0;

    if (!hasValidToolResults) {
      console.log('沒有工具結果，跳過最終分析步驟');
      // 如果沒有工具結果，直接返回初始分析的結果
      // 從 messages 中找到最後一個 AI 回應
      const lastAIMessage = state.messages
        .filter((msg) => msg._getType() === 'ai')
        .pop();

      if (lastAIMessage) {
        try {
          const result = await this.parseResult(
            lastAIMessage.content.toString()
          );
          return {
            finalResult: result,
            currentStep: 'completed',
            currentStepDescription: '分析完成',
          };
        } catch (error) {
          console.log('解析初始分析結果失敗:', error);
        }
      }

      // 如果無法解析初始結果，返回基本結果
      return {
        finalResult: {
          isPhishing: true,
          confidenceScore: 50,
          suspiciousPoints: ['無法完成完整分析'],
          explanation: '由於技術問題，無法提供詳細分析。建議手動檢查郵件內容。',
          riskLevel: 'medium',
          timestamp: new Date().toISOString(),
        },
        currentStep: 'completed',
        currentStepDescription: '分析完成',
      };
    }

    // 有工具結果時，進行正常的最終分析
    const toolAnalysisPrompt = generateToolAnalysisPrompt(state.toolResults);
    const finalMessages = [
      ...state.messages,
      new HumanMessage(toolAnalysisPrompt),
    ];

    try {
      const response = await this.modelWithTools.invoke(finalMessages);
      const result = await this.parseResult(response.content.toString());

      return {
        messages: [...finalMessages, response],
        finalResult: result,
        currentStep: 'completed',
        currentStepDescription: '分析完成',
      };
    } catch (error) {
      throw new Error(
        `最終分析失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 判斷是否需要使用工具
   */
  private shouldUseTool(state: WorkflowState): string {
    if (!state.useTools) {
      return 'no_tools';
    }

    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      return 'use_tools';
    }

    return 'no_tools';
  }

  /**
   * 解析分析結果
   */
  private async parseResult(content: string): Promise<PhishingDetectionResult> {
    console.log('=== 開始解析模型回應 ===');
    console.log('原始回應內容:', content);
    console.log('回應長度:', content.length);

    try {
      // 嘗試直接解析 JSON
      console.log('嘗試直接解析 JSON...');
      const rawResult = await this.parser.parse(content);
      console.log('直接解析成功:', rawResult);
      return this.validateAndFormatResult(rawResult);
    } catch (directParseError) {
      console.log('直接解析失敗:', directParseError);

      // 如果解析失敗，嘗試提取 JSON 部分
      try {
        console.log('嘗試提取 JSON 部分...');
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('找到 JSON 匹配:', jsonMatch[0]);
          const rawResult = JSON.parse(jsonMatch[0]);
          console.log('JSON 解析成功:', rawResult);
          return this.validateAndFormatResult(rawResult);
        } else {
          console.log('未找到 JSON 格式內容');
        }
      } catch (extractParseError) {
        console.log('JSON 提取解析失敗:', extractParseError);
      }

      // 如果都失敗，返回基本結果
      console.log('所有解析嘗試失敗，返回 fallback 結果');
      return {
        isPhishing: true,
        confidenceScore: 50,
        suspiciousPoints: ['模型回應格式無效，無法完整解析'],
        explanation:
          '由於模型回應格式問題，無法提供詳細分析。建議手動檢查郵件內容。',
        riskLevel: 'medium',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 驗證和格式化結果
   */
  private validateAndFormatResult(rawResult: unknown): PhishingDetectionResult {
    const data = rawResult as Record<string, unknown>;
    const result: PhishingDetectionResult = {
      isPhishing: Boolean(data.isPhishing),
      confidenceScore: Math.max(
        0,
        Math.min(100, Number(data.confidenceScore) || 0)
      ),
      suspiciousPoints: Array.isArray(data.suspiciousPoints)
        ? data.suspiciousPoints.slice(0, 10)
        : [],
      explanation: String(data.explanation || '無詳細說明'),
      riskLevel: ['low', 'medium', 'high'].includes(data.riskLevel as string)
        ? (data.riskLevel as 'low' | 'medium' | 'high')
        : 'medium',
      timestamp: new Date().toISOString(),
    };

    return result;
  }

  /**
   * 執行分析工作流
   */
  async analyze(
    emailContent: string,
    useTools: boolean = false
  ): Promise<PhishingDetectionResult> {
    const initialState: WorkflowState = {
      emailContent,
      messages: [],
      toolResults: {},
      useTools,
      currentStep: 'initial_analysis',
    };

    try {
      const compiledWorkflow = this.workflow.compile();
      const finalState = await compiledWorkflow.invoke(initialState);

      if (finalState.finalResult) {
        return finalState.finalResult;
      } else {
        throw new Error('工作流執行完成但未產生結果');
      }
    } catch (error) {
      throw new Error(
        `工作流執行失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }
}
