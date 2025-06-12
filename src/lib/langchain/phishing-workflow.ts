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
    | 'continue_analysis'
    | 'final_analysis'
    | 'completed';
  currentStepDescription?: string;
  toolCallCount?: number; // 追蹤工具調用次數
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
        toolCallCount: null,
      },
    });

    // 添加節點
    workflow.addNode('initial_analysis', this.initialAnalysis.bind(this));

    if (useTools) {
      workflow.addNode('tool_calling', this.toolCalling.bind(this));
      workflow.addNode('continue_analysis', this.continueAnalysis.bind(this));
      workflow.addNode('final_analysis', this.finalAnalysis.bind(this));
    }

    // 設定邊
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    workflow.addEdge(START, 'initial_analysis' as any);

    if (useTools) {
      // 初始分析後的決策
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

      // 工具調用後進入繼續分析節點
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      workflow.addEdge('tool_calling' as any, 'continue_analysis' as any);

      // 繼續分析後的決策：是否需要更多工具或進入最終分析
      workflow.addConditionalEdges(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'continue_analysis' as any,
        this.shouldContinueWithTools.bind(this),
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          continue_tools: 'tool_calling' as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          finish_analysis: 'final_analysis' as any,
        }
      );

      // 最終分析結束
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
    console.log('\n🎯 開始初始分析...');
    console.log(`⚙️  工作流 useTools 設定: ${state.useTools}`);
    console.log(`📧 郵件內容長度: ${state.emailContent.length} 字符`);
    console.log(`📝 郵件內容預覽: ${state.emailContent.substring(0, 150)}...`);

    const messages = [
      new SystemMessage(PHISHING_DETECTION_SYSTEM_PROMPT),
      new HumanMessage(generateAnalysisPrompt(state.emailContent)),
    ];

    try {
      console.log('\n🧠 向 AI 發送初始分析請求...');
      const response = await this.modelWithTools.invoke(messages);

      console.log('📨 模型回應詳情:');
      console.log(`   類型: ${response.constructor.name}`);
      console.log(`   內容長度: ${response.content.toString().length} 字符`);
      console.log(
        `   內容預覽: ${response.content.toString().substring(0, 200)}...`
      );

      // 檢查是否有工具調用
      if (
        state.useTools &&
        response.tool_calls &&
        response.tool_calls.length > 0
      ) {
        console.log(
          `\n🛠️  檢測到 ${response.tool_calls.length} 個工具調用需求:`
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response.tool_calls.forEach((toolCall: any, index: number) => {
          console.log(`   ${index + 1}. ${toolCall.name}`);
          console.log(`      參數: ${JSON.stringify(toolCall.args, null, 2)}`);
        });
        console.log('🚀 準備執行工具調用階段');

        return {
          messages: [...messages, response],
          currentStep: 'tool_calling',
          currentStepDescription: `正在執行 ${response.tool_calls.length} 個分析工具`,
          toolCallCount: (state.toolCallCount || 0) + 1,
        };
      } else {
        console.log('\n📋 無工具調用需求，直接完成分析');
        console.log(
          `🔍 工具調用狀態: ${response.tool_calls ? '存在但為空' : '不存在'}`
        );
        console.log('🎯 開始解析最終結果');

        // 直接解析結果
        const result = await this.parseResult(response.content.toString());
        console.log('✅ 初始分析完成');

        return {
          messages: [...messages, response],
          finalResult: result,
          currentStep: 'completed',
          currentStepDescription: '分析完成',
        };
      }
    } catch (error) {
      console.log('\n❌ 初始分析執行失敗:');
      console.log('🐛 錯誤詳情:', error);
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
    console.log('🔧 開始執行工具調用...');
    console.log(`📊 當前工具調用輪次: ${state.toolCallCount || 0}`);

    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    const toolResults: Record<string, unknown> = { ...state.toolResults };
    const toolMessages: ToolMessage[] = [];

    if (lastMessage.tool_calls) {
      console.log(`🛠️  準備執行 ${lastMessage.tool_calls.length} 個工具:`);
      lastMessage.tool_calls.forEach((toolCall, index) => {
        console.log(
          `   ${index + 1}. ${toolCall.name} - 參數:`,
          JSON.stringify(toolCall.args, null, 2)
        );
      });

      for (const toolCall of lastMessage.tool_calls) {
        const startTime = Date.now();
        console.log(`\n🚀 執行工具: ${toolCall.name}`);
        console.log(`📝 工具參數:`, JSON.stringify(toolCall.args, null, 2));

        try {
          const tool = getToolByName(toolCall.name);
          if (tool) {
            console.log(`⏱️  工具開始執行時間: ${new Date().toISOString()}`);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await (tool as any).invoke(toolCall.args);
            const executionTime = Date.now() - startTime;

            toolResults[toolCall.name] = result;

            console.log(`✅ 工具 ${toolCall.name} 執行成功`);
            console.log(`⏱️  執行時間: ${executionTime}ms`);
            console.log(
              `📄 結果長度: ${typeof result === 'string' ? result.length : JSON.stringify(result).length} 字符`
            );

            // 解析並顯示結果摘要
            try {
              const parsedResult =
                typeof result === 'string' ? JSON.parse(result) : result;
              if (parsedResult && typeof parsedResult === 'object') {
                console.log(`📈 結果摘要:`);
                Object.keys(parsedResult).forEach((key) => {
                  const value = parsedResult[key];
                  if (Array.isArray(value)) {
                    console.log(`   ${key}: ${value.length} 項目`);
                  } else if (typeof value === 'object') {
                    console.log(
                      `   ${key}: 物件 (${Object.keys(value).length} 屬性)`
                    );
                  } else {
                    console.log(`   ${key}: ${value}`);
                  }
                });
              }
            } catch {
              console.log(
                `📄 原始結果預覽: ${result.toString().substring(0, 200)}...`
              );
            }

            toolMessages.push(
              new ToolMessage({
                content: result,
                tool_call_id: toolCall.id || toolCall.name,
              })
            );
          } else {
            console.log(`❌ 找不到工具: ${toolCall.name}`);
            const errorMessage = `工具 ${toolCall.name} 不存在`;
            toolMessages.push(
              new ToolMessage({
                content: errorMessage,
                tool_call_id: toolCall.id || toolCall.name,
              })
            );
          }
        } catch (error) {
          const executionTime = Date.now() - startTime;
          console.log(`❌ 工具 ${toolCall.name} 執行失敗:`);
          console.log(`⏱️  執行時間: ${executionTime}ms`);
          console.log(`🐛 錯誤詳情:`, error);

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

    console.log('\n🏁 工具調用完成，準備進行繼續分析');
    console.log(`📊 累計工具結果數量: ${Object.keys(toolResults).length}`);
    console.log(`📝 工具結果清單: ${Object.keys(toolResults).join(', ')}`);

    return {
      messages: [...state.messages, ...toolMessages],
      toolResults,
      currentStep: 'continue_analysis',
      currentStepDescription: '正在評估是否需要更多工具分析',
    };
  }

  /**
   * 繼續分析步驟 - 決定是否需要更多工具調用
   */
  private async continueAnalysis(
    state: WorkflowState
  ): Promise<Partial<WorkflowState>> {
    console.log('\n🤔 開始繼續分析評估...');
    console.log(`📊 當前工具調用次數: ${state.toolCallCount || 0}`);
    console.log(
      `🗂️  已收集的工具結果: ${Object.keys(state.toolResults).length} 個`
    );
    console.log(`📝 工具結果詳情:`);
    Object.entries(state.toolResults).forEach(([toolName, result]) => {
      const resultLength =
        typeof result === 'string'
          ? result.length
          : JSON.stringify(result).length;
      console.log(`   - ${toolName}: ${resultLength} 字符`);
    });

    // 創建一個提示詞，讓 AI 決定是否需要更多工具
    const continuePrompt = `
基於目前已收集的資訊，請評估是否需要使用更多工具進行深入分析。

已執行的工具結果：
${Object.entries(state.toolResults)
  .map(
    ([toolName, result]) =>
      `### ${toolName}\n${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}`
  )
  .join('\n\n')}

請考慮以下因素：
1. 是否還有未分析的連結、域名或附件？
2. 是否需要更多資訊來驗證郵件的真實性？
3. 當前的分析結果是否足夠做出準確判斷？

如果需要使用更多工具，請調用相應的工具。
如果已收集足夠資訊，請回應 "ANALYSIS_COMPLETE" 表示可以進行最終分析。
`;

    const messages = [...state.messages, new HumanMessage(continuePrompt)];

    try {
      console.log('\n🧠 向 AI 發送繼續分析請求...');
      const response = await this.modelWithTools.invoke(messages);

      console.log('📨 AI 回應內容預覽:');
      console.log(response.content.toString().substring(0, 300) + '...');
      console.log(`📏 回應總長度: ${response.content.toString().length} 字符`);

      // 檢查是否有新的工具調用
      if (response.tool_calls && response.tool_calls.length > 0) {
        console.log(`\n🔄 AI 決定需要更多工具分析！`);
        console.log(`🛠️  檢測到 ${response.tool_calls.length} 個新工具調用:`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response.tool_calls.forEach((toolCall: any, index: number) => {
          console.log(`   ${index + 1}. ${toolCall.name}`);
        });
        console.log(
          `📈 即將進入第 ${(state.toolCallCount || 0) + 1} 輪工具調用`
        );

        return {
          messages: [...messages, response],
          currentStep: 'tool_calling',
          currentStepDescription: `正在執行額外的 ${response.tool_calls.length} 個分析工具`,
          toolCallCount: (state.toolCallCount || 0) + 1,
        };
      } else {
        console.log('\n✅ AI 決定分析完成，準備進行最終評估');
        console.log('🎯 進入最終分析階段');
        return {
          messages: [...messages, response],
          currentStep: 'final_analysis',
          currentStepDescription: '正在整合所有分析結果',
        };
      }
    } catch (error) {
      console.log('\n❌ 繼續分析失敗，直接進入最終分析:');
      console.log('🐛 錯誤詳情:', error);
      return {
        currentStep: 'final_analysis',
        currentStepDescription: '正在整合分析結果',
      };
    }
  }

  /**
   * 最終分析步驟
   */
  private async finalAnalysis(
    state: WorkflowState
  ): Promise<Partial<WorkflowState>> {
    console.log('\n🎯 開始最終分析步驟...');

    // 檢查是否有有效的工具結果
    const hasValidToolResults = Object.keys(state.toolResults).length > 0;
    console.log(`🗂️  工具結果檢查: ${hasValidToolResults ? '有效' : '無效'}`);
    console.log(`📊 工具結果數量: ${Object.keys(state.toolResults).length}`);

    if (!hasValidToolResults) {
      console.log('⚠️  沒有工具結果，跳過最終分析步驟');
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
    console.log('\n🔄 進行完整的最終分析...');
    console.log('📝 工具結果摘要:');
    Object.entries(state.toolResults).forEach(([toolName, result]) => {
      const resultLength =
        typeof result === 'string'
          ? result.length
          : JSON.stringify(result).length;
      console.log(`   - ${toolName}: ${resultLength} 字符`);
    });

    const toolAnalysisPrompt = generateToolAnalysisPrompt(state.toolResults);
    console.log(`📏 最終分析提示詞長度: ${toolAnalysisPrompt.length} 字符`);

    const finalMessages = [
      ...state.messages,
      new HumanMessage(toolAnalysisPrompt),
    ];

    try {
      console.log('\n🧠 向 AI 發送最終分析請求...');
      const response = await this.modelWithTools.invoke(finalMessages);

      console.log('📨 最終分析回應:');
      console.log(`   內容長度: ${response.content.toString().length} 字符`);
      console.log(
        `   內容預覽: ${response.content.toString().substring(0, 200)}...`
      );

      console.log('🎯 開始解析最終結果...');
      const result = await this.parseResult(response.content.toString());

      console.log('✅ 最終分析完成！');
      console.log(`📊 分析結果摘要:`);
      console.log(`   是否釣魚: ${result.isPhishing}`);
      console.log(`   信心分數: ${result.confidenceScore}`);
      console.log(`   風險等級: ${result.riskLevel}`);
      console.log(`   可疑點數量: ${result.suspiciousPoints.length}`);

      return {
        messages: [...finalMessages, response],
        finalResult: result,
        currentStep: 'completed',
        currentStepDescription: '分析完成',
      };
    } catch (error) {
      console.log('\n❌ 最終分析執行失敗:');
      console.log('🐛 錯誤詳情:', error);
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
   * 判斷是否需要繼續使用工具
   */
  private shouldContinueWithTools(state: WorkflowState): string {
    // 設定最大工具調用次數限制，避免無限循環
    const maxToolCalls = 5;
    const currentToolCalls = state.toolCallCount || 0;

    if (currentToolCalls >= maxToolCalls) {
      console.log(`已達到最大工具調用次數限制 (${maxToolCalls})，結束分析`);
      return 'finish_analysis';
    }

    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

    // 檢查是否有新的工具調用
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      console.log('檢測到新的工具調用需求，繼續分析');
      return 'continue_tools';
    }

    // 檢查回應內容是否包含完成標記
    const content = lastMessage.content.toString().toLowerCase();
    if (content.includes('analysis_complete') || content.includes('分析完成')) {
      console.log('AI 表示分析完成，進入最終分析');
      return 'finish_analysis';
    }

    // 預設情況下結束分析
    console.log('無更多工具調用需求，進入最終分析');
    return 'finish_analysis';
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
      toolCallCount: 0,
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
