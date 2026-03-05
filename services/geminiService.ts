import { loadArchiveCategoryTree, type ArchiveCategoryNode } from './archiveCategory';

const flattenCategoryLabels = (nodes: ArchiveCategoryNode[]): string[] => {
  const result: string[] = [];
  const walk = (items: ArchiveCategoryNode[]) => {
    for (const item of items) {
      if (!result.includes(item.name)) result.push(item.name);
      if (item.children?.length) walk(item.children);
    }
  };
  walk(nodes);
  return result;
};

export const buildGeminiSystemPrompt = (categories: string[]) => `
你是一个专业的高校档案馆AI专家。你的任务是对上传的多源数据（文档、音频、视频、手稿等）进行深度解析。

请执行以下三个核心任务：
1. **格式解析与内容提取**：提取文档的元数据、物理属性（如页数、时长、语言）以及**全文摘要或文本记录**。
2. **知识提取与定位**：识别关键实体（人名、地名、机构、事件），并提供它们在文档中的上下文位置（定位）。
3. **结构化输出**：返回严格的 JSON 格式。

具体提取规则：
- **Category**: 必须从数字档案库目录中选择，且仅允许以下分类：${categories.map((item) => `"${item}"`).join('、')}。
- **Entities**: 提取关键知识点，类型包括 Person(人物), Location(地点), Organization(机构), Event(事件), Concept(概念)。
- **Context**: 对于每个实体，摘录其出现的关键句子或时间点，作为“知识定位”依据。
- **TextContent**: 如果是文档，提取主要正文内容；如果是音视频，提供内容逐字稿摘要。

输出语言必须是简体中文。
`;

export const loadDynamicGeminiPrompt = async () => {
  const tree = await loadArchiveCategoryTree();
  const categories = flattenCategoryLabels(tree);
  return buildGeminiSystemPrompt(categories);
};
