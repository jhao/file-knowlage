import { GoogleGenAI, Type } from "@google/genai";
import { ArchiveCategory, SecurityLevel, ArchiveMetadata, KnowledgeEntity } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PROMPT_SYSTEM_INSTRUCTION = `
你是一个专业的高校档案馆AI专家。你的任务是对上传的多源数据（文档、音频、视频、手稿等）进行深度解析。

请执行以下三个核心任务：
1. **格式解析与内容提取**：提取文档的元数据、物理属性（如页数、时长、语言）以及**全文摘要或文本记录**。
2. **知识提取与定位**：识别关键实体（人名、地名、机构、事件），并提供它们在文档中的上下文位置（定位）。
3. **结构化输出**：返回严格的 JSON 格式。

具体提取规则：
- **Category**: 必须归类为 "学籍档案", "人事档案", "科研档案", "行政档案", "会议纪要", "多媒体档案", "手稿", "教材", "新闻稿" 之一。
- **Entities**: 提取关键知识点，类型包括 Person(人物), Location(地点), Organization(机构), Event(事件), Concept(概念)。
- **Context**: 对于每个实体，摘录其出现的关键句子或时间点，作为“知识定位”依据。
- **TextContent**: 如果是文档，提取主要正文内容；如果是音视频，提供内容逐字稿摘要。

输出语言必须是简体中文。
`;

export const parseDocumentWithGemini = async (
  base64Data: string,
  mimeType: string
): Promise<{ metadata: ArchiveMetadata; entities: KnowledgeEntity[] }> => {
  try {
    // Using gemini-3-flash-preview as it covers basic text and multimodal tasks efficiently
    const modelId = "gemini-3-flash-preview"; 

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: "请对该文件进行全量解析，提取元数据、全文内容及知识实体。",
          },
        ],
      },
      config: {
        systemInstruction: PROMPT_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            metadata: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                category: { type: Type.STRING, enum: Object.values(ArchiveCategory) },
                date: { type: Type.STRING },
                authors: { type: Type.ARRAY, items: { type: Type.STRING } },
                department: { type: Type.STRING },
                summary: { type: Type.STRING },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                securityLevel: { type: Type.STRING, enum: Object.values(SecurityLevel) },
                confidenceScore: { type: Type.INTEGER },
                textContent: { type: Type.STRING, description: "Extracted full text or transcript" },
                fileProperties: {
                    type: Type.OBJECT,
                    properties: {
                        pageCount: { type: Type.INTEGER },
                        duration: { type: Type.STRING },
                        language: { type: Type.STRING },
                        originalFormat: { type: Type.STRING }
                    }
                }
              },
              required: ["title", "category", "date", "summary", "confidenceScore", "securityLevel"]
            },
            entities: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ['Person', 'Location', 'Organization', 'Event', 'Concept'] },
                        context: { type: Type.STRING },
                        confidence: { type: Type.NUMBER }
                    },
                    required: ["name", "type", "context"]
                }
            }
          },
          required: ["metadata", "entities"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const parsedResult = JSON.parse(text);
    return {
        metadata: parsedResult.metadata,
        entities: parsedResult.entities || []
    };

  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    return {
      metadata: {
        title: "解析失败",
        category: ArchiveCategory.UNKNOWN,
        date: new Date().toISOString().split('T')[0],
        authors: [],
        department: "未知",
        summary: "自动解析失败，请人工核实。",
        keywords: ["错误"],
        securityLevel: SecurityLevel.INTERNAL,
        confidenceScore: 0,
        textContent: "无法提取文本。",
      },
      entities: []
    };
  }
};