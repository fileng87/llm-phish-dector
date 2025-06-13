import { PhishingDetectionResult } from '@/types/phishing-detection';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { END, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';

import {
  PHISHING_DETECTION_SYSTEM_PROMPT,
  generateAnalysisPrompt,
} from './prompts';
import { createTavilySearchTool } from './tools';

/**
 * 定義工作流的狀態。
 * 我們只使用一個 `messages` 陣列，這是一個常見且強大的模式。
 */
export interface WorkflowState {
  messages: BaseMessage[];
}

const AGENT_NODE = 'agent';
const TOOLS_NODE = 'tools';

/**
 * 釣魚郵件分析工作流
 *
 * 這個版本恢復了使用 LangGraph 的 ReAct (Reason+Act) Agent 循環。
 * 主要由兩個節點組成：
 * 1. agent: 負責思考、呼叫 LLM 並決定是否使用工具。
 * 2. tools: 負責執行 `agent` 節點請求的工具。
 *
 * 這個循環會持續進行 (agent -> tools -> agent)，直到 `agent` 節點認為資訊充足，
 * 並給出最終答案為止。
 */
export class PhishingAnalysisWorkflow {
  private model: BaseChatModel;
  private parser: JsonOutputParser;

  constructor(model: BaseChatModel) {
    if (!model || !model.bindTools) {
      throw new Error('必須提供一個有效的、支援工具綁定的模型');
    }
    this.model = model;
    this.parser = new JsonOutputParser();
  }

  /**
   * 執行分析流程
   */
  async analyze(
    emailContent: string,
    tavilyApiKey: string
  ): Promise<PhishingDetectionResult> {
    if (!this.model) {
      return this.createErrorResult('模型未初始化，無法進行分析');
    }
    if (!tavilyApiKey) {
      return this.createErrorResult('必須提供 Tavily API 金鑰');
    }

    console.log('🚀 開始分析工作流...');
    let lastMessageCount = 0;

    const model = this.model;
    const tools = [createTavilySearchTool(tavilyApiKey)];
    const modelWithTools = model.bindTools?.(tools);

    if (!modelWithTools) {
      return this.createErrorResult(
        '無法將工具綁定到模型。模型可能不支援 bindTools 方法。'
      );
    }

    const agentNode = async (state: WorkflowState) => {
      const newMessages = state.messages.slice(lastMessageCount);
      const toolMessages = newMessages.filter(
        (msg): msg is ToolMessage => msg instanceof ToolMessage
      );

      if (toolMessages.length > 0) {
        console.log('🛠️ 工具執行結果:');
        toolMessages.forEach((toolMessage) => {
          console.log(`   - 工具: ${toolMessage.name}`);
          console.log(`   - 輸出: ${toolMessage.content}`);
        });
      }
      lastMessageCount = state.messages.length;

      const response = await modelWithTools.invoke(state.messages);
      return { messages: [response] };
    };

    const toolsNode = new ToolNode(tools);

    const shouldContinue = (state: WorkflowState) => {
      const lastMessage = state.messages[state.messages.length - 1];
      if (!(lastMessage instanceof AIMessage)) {
        console.error(
          '預期最後一條訊息是 AIMessage，但收到:',
          typeof lastMessage
        );
        return END; // 結束工作流而不是拋出異常
      }
      if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        console.log('🤖 Agent 請求呼叫工具:');
        lastMessage.tool_calls.forEach((toolCall) => {
          console.log(
            `   - 工具: ${toolCall.name}, 參數: ${JSON.stringify(
              toolCall.args
            )}`
          );
        });
        return TOOLS_NODE;
      }
      return END;
    };

    const workflow = new StateGraph<WorkflowState>({
      channels: {
        messages: {
          value: (x, y) => x.concat(y),
          default: () => [],
        },
      },
    })
      .addNode(AGENT_NODE, agentNode)
      .addNode(TOOLS_NODE, toolsNode)
      .addEdge(START, AGENT_NODE)
      .addConditionalEdges(AGENT_NODE, shouldContinue)
      .addEdge(TOOLS_NODE, AGENT_NODE);

    const compiledWorkflow = workflow.compile();

    const initialState: WorkflowState = {
      messages: [
        new SystemMessage(PHISHING_DETECTION_SYSTEM_PROMPT),
        new HumanMessage(generateAnalysisPrompt(emailContent)),
      ],
    };

    try {
      const finalState = await compiledWorkflow.invoke(initialState, {
        recursionLimit: 15,
      });

      console.log('✅ 工作流完成');
      console.log('消息數量:', finalState.messages.length);
      console.log(
        '最後消息類型:',
        finalState.messages[finalState.messages.length - 1]?.constructor.name
      );

      const lastMessage = finalState.messages[finalState.messages.length - 1];

      if (
        lastMessage &&
        lastMessage.content &&
        typeof lastMessage.content === 'string'
      ) {
        return this.parseResult(lastMessage.content);
      }
      return this.createErrorResult('分析流程結束但未產生有效結果');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '工作流執行失敗';
      console.error('工作流執行錯誤:', error);
      return this.createErrorResult(errorMessage);
    }
  }

  private async parseResult(content: string): Promise<PhishingDetectionResult> {
    try {
      const parsedJson = await this.parser.parse(content);
      return this.validateAndFormatResult(parsedJson);
    } catch {
      const jsonMatch = content.match(/```(json)?\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[2]) {
        try {
          const parsedJson = JSON.parse(jsonMatch[2]);
          return this.validateAndFormatResult(parsedJson);
        } catch {
          return this.createErrorResult('無法解析模型回應的 JSON 內容');
        }
      } else {
        return this.createErrorResult(
          '模型回應格式不正確，找不到有效的 JSON 區塊'
        );
      }
    }
  }

  private validateAndFormatResult(rawResult: unknown): PhishingDetectionResult {
    if (typeof rawResult !== 'object' || rawResult === null) {
      return this.createErrorResult('分析結果格式錯誤，不是有效的物件');
    }

    const result = rawResult as Record<string, unknown>;

    const isPhishing =
      typeof result.isPhishing === 'boolean' ? result.isPhishing : false;
    const confidenceScore =
      typeof result.confidenceScore === 'number'
        ? Math.max(0, Math.min(100, result.confidenceScore))
        : 50;

    const suspiciousPoints = Array.isArray(result.suspiciousPoints)
      ? result.suspiciousPoints
          .map((p) => (typeof p === 'string' ? p.trim() : JSON.stringify(p)))
          .filter(Boolean)
      : [];

    const explanation =
      typeof result.explanation === 'string'
        ? result.explanation.trim()
        : '無詳細解釋';

    const riskLevel =
      typeof result.riskLevel === 'string' &&
      ['low', 'medium', 'high'].includes(result.riskLevel)
        ? (result.riskLevel as 'low' | 'medium' | 'high')
        : 'medium';

    return {
      isPhishing,
      confidenceScore,
      suspiciousPoints,
      explanation,
      riskLevel,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 創建錯誤結果對象
   */
  private createErrorResult(message: string): PhishingDetectionResult {
    return {
      isPhishing: false,
      confidenceScore: 0,
      suspiciousPoints: [`錯誤: ${message}`],
      explanation: `分析過程中發生錯誤: ${message}`,
      riskLevel: 'low',
      timestamp: new Date().toISOString(),
      isError: true,
      errorMessage: message,
    };
  }
}
