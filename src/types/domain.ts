export type LayoutName = "mindmap" | "tree-right" | "vertical" | "radial";
export type ThemeName = "dark" | "midnight" | "ocean" | "forest" | "purple" | "mono";
export type NodeIconName = "lightbulb" | "star" | "check" | "warning" | "book" | "code" | "target" | "flag" | "heart" | "bookmark" | "calendar" | "briefcase";
export type ColorRole = "background" | "text" | "border" | "connection";
export type RecentColors = Record<ColorRole, string[]>;
export interface AppSettings {
  appearance: "dark" | "light" | "system";
  recentColors: RecentColors;
}

export interface Mindmap {
  id: string;
  title: string;
  description: string;
  layout: LayoutName;
  theme: ThemeName;
  favorite: boolean;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface MindmapNode {
  id: string;
  mindmapId: string;
  parentId: string | null;
  text: string;
  richText?: string;
  elementKind?: "node" | "text" | "image";
  description: string;
  notes: string;
  x: number;
  y: number;
  width: number;
  height: number;
  background: string;
  color: string;
  borderColor: string;
  branchColor?: string;
  emoji: string;
  icon?: NodeIconName | null;
  fontFamily?: "sans" | "serif" | "mono";
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  textAlign?: "left" | "center" | "right";
  url?: string;
  status?: "none" | "todo" | "doing" | "done";
  priority?: "none" | "low" | "medium" | "high";
  tags?: string[];
  collapsed: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface NodeConnection {
  id: string;
  mindmapId: string;
  sourceId: string;
  targetId: string;
  label: string;
  color: string;
  style: "bezier" | "straight" | "elbow";
  createdAt: number;
  updatedAt: number;
}

export interface Asset {
  id: string;
  mindmapId: string;
  type: "image";
  fileName: string;
  mimeType: string;
  storagePath: string;
  fileSize: number;
  width: number;
  height: number;
  hash: string;
  createdAt: number;
  updatedAt: number;
}

export interface NodeAsset {
  id: string;
  nodeId: string;
  assetId: string;
  position: "top" | "bottom" | "left" | "right" | "background";
  width: number;
  height: number;
  objectFit: "contain" | "cover" | "fill";
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  caption: string;
  createdAt: number;
}

export interface MapDocument {
  version: 1;
  mindmap: Mindmap;
  nodes: MindmapNode[];
  connections: NodeConnection[];
  tags: string[];
  assets: Asset[];
  nodeAssets: NodeAsset[];
}

export const id = () => crypto.randomUUID();
