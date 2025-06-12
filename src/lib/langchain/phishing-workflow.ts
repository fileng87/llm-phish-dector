import { PhishingDetectionResult } from '@/types/phishing-detection';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { Runnable } from '@langchain/core/runnables';
import { END, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';

import {
  PHISHING_DETECTION_SYSTEM_PROMPT,
  generateAnalysisPrompt,
} from './prompts';
import { availableTools } from './tools';

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
  private modelWithTools: Runnable;
  private parser: JsonOutputParser;

  constructor(model: BaseChatModel) {
    if (!model || !model.bindTools) {
      throw new Error('必須提供一個有效的、支援工具綁定的模型');
    }
    // 綁定工具到模型，讓模型知道有哪些工具可用
    this.modelWithTools = model.bindTools(availableTools);
    this.parser = new JsonOutputParser();
  }

  /**
   * 創建並返回已編譯的工作流圖。
   */
  public getWorkflow() {
    // 1. 初始化 StateGraph，並定義狀態的結構
    const workflow = new StateGraph<WorkflowState>({
      channels: {
        messages: {
          value: (x, y) => x.concat(y),
          default: () => [],
        },
      },
    });

    // 2. 定義節點
    workflow.addNode(AGENT_NODE, async (state: WorkflowState) => {
      const response = await this.modelWithTools.invoke(state.messages);
      return { messages: [response] };
    });
    workflow.addNode(TOOLS_NODE, new ToolNode(availableTools));

    // 3. 定義邊 (Edges)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    workflow.addEdge(START, AGENT_NODE as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    workflow.addConditionalEdges(AGENT_NODE as any, (state: WorkflowState) => {
      const lastMessage = state.messages[state.messages.length - 1];
      if (!(lastMessage instanceof AIMessage)) {
        throw new Error('預期最後一條訊息是 AIMessage');
      }

      if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        return TOOLS_NODE;
      }
      return END;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    workflow.addEdge(TOOLS_NODE as any, AGENT_NODE as any);

    // 4. 編譯工作流
    return workflow.compile();
  }

  /**
   * 執行分析流程
   */
  async analyze(emailContent: string): Promise<PhishingDetectionResult> {
    console.log('🚀 開始分析工作流...');
    const compiledWorkflow = this.getWorkflow();

    const initialState: WorkflowState = {
      messages: [
        new SystemMessage(PHISHING_DETECTION_SYSTEM_PROMPT),
        new HumanMessage(generateAnalysisPrompt(emailContent)),
      ],
    };

    const finalState = await compiledWorkflow.invoke(initialState, {
      recursionLimit: 25,
    });

    const lastMessage = finalState.messages[finalState.messages.length - 1];

    if (
      lastMessage &&
      lastMessage.content &&
      typeof lastMessage.content === 'string'
    ) {
      return this.parseResult(lastMessage.content);
    } else {
      throw new Error('分析流程結束但未產生有效結果');
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
          throw new Error('無法解析模型回應的 JSON 內容');
        }
      } else {
        throw new Error('模型回應格式不正確，找不到有效的 JSON 區塊');
      }
    }
  }

  private validateAndFormatResult(rawResult: unknown): PhishingDetectionResult {
    if (typeof rawResult !== 'object' || rawResult === null) {
      throw new Error('分析結果格式錯誤，不是有效的物件');
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
}
