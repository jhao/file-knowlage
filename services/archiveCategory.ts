import { listSettings } from './settingsApi';

export type ArchiveCategoryNode = {
  name: string;
  children?: ArchiveCategoryNode[];
};

const DEFAULT_ARCHIVE_TREE: ArchiveCategoryNode[] = [
  { name: '学籍档案', children: [{ name: '本科生学籍' }, { name: '研究生学籍' }] },
  { name: '人事档案', children: [{ name: '教师人事' }, { name: '行政人员人事' }] },
  { name: '科研档案', children: [{ name: '项目档案' }, { name: '成果档案' }] },
  { name: '行政档案', children: [{ name: '制度文件' }, { name: '会议纪要' }] },
];

const normalizeNode = (node: unknown): ArchiveCategoryNode | null => {
  if (typeof node === 'string') {
    const text = node.trim();
    return text ? { name: text, children: [] } : null;
  }

  if (!node || typeof node !== 'object') return null;

  const name = String((node as { name?: string }).name || '').trim();
  const childrenRaw = (node as { children?: unknown[] }).children;
  const children = Array.isArray(childrenRaw)
    ? childrenRaw.map(normalizeNode).filter((item): item is ArchiveCategoryNode => Boolean(item))
    : [];

  if (!name) return null;
  return { name, children };
};

export const normalizeCategoryTree = (tree: unknown): ArchiveCategoryNode[] => {
  if (!Array.isArray(tree)) return DEFAULT_ARCHIVE_TREE;
  const nodes = tree.map(normalizeNode).filter((item): item is ArchiveCategoryNode => Boolean(item));
  return nodes.length ? nodes : DEFAULT_ARCHIVE_TREE;
};

export const loadArchiveCategoryTree = async (): Promise<ArchiveCategoryNode[]> => {
  const settings = await listSettings();
  const raw = settings.find((item) => item.key === 'archive_category_tree')?.value;
  if (!raw) return DEFAULT_ARCHIVE_TREE;

  try {
    return normalizeCategoryTree(JSON.parse(raw));
  } catch {
    return DEFAULT_ARCHIVE_TREE;
  }
};

export const buildCategoryLevels = (tree: ArchiveCategoryNode[], path: string[]): string[][] => {
  const levels: string[][] = [];
  let nodes = tree;

  while (nodes.length) {
    levels.push(nodes.map((item) => item.name));
    const selected = path[levels.length - 1];
    const matched = nodes.find((item) => item.name === selected);
    nodes = matched?.children || [];
    if (!selected || !matched) break;
  }

  return levels;
};

export const findCategoryPath = (tree: ArchiveCategoryNode[], target: string): string[] => {
  const needle = target.trim();
  if (!needle) return [];

  const walk = (nodes: ArchiveCategoryNode[], prefix: string[]): string[] => {
    for (const node of nodes) {
      const next = [...prefix, node.name];
      if (node.name === needle) return next;
      const hit = walk(node.children || [], next);
      if (hit.length) return hit;
    }
    return [];
  };

  return walk(tree, []);
};
