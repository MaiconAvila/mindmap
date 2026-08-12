import type { AppSettings, ColorRole, MindmapNode, RecentColors } from "@/src/types/domain";

export const EMPTY_RECENT_COLORS: RecentColors = {
  background: [],
  text: [],
  border: [],
  connection: [],
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  appearance: "dark",
  recentColors: EMPTY_RECENT_COLORS,
};

const COLOR_ROLES: ColorRole[] = ["background", "text", "border", "connection"];
const ALLOWED_RICH_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "h3", "ul", "ol", "li", "a"]);

const normalizeColor = (color: string) => color.trim().toLowerCase();

export function normalizeAppSettings(value?: Partial<AppSettings> | null): AppSettings {
  const appearance = value?.appearance === "light" || value?.appearance === "system" ? value.appearance : "dark";
  const recentColors = { ...EMPTY_RECENT_COLORS };
  for (const role of COLOR_ROLES) {
    const colors = value?.recentColors?.[role];
    recentColors[role] = Array.isArray(colors)
      ? [...new Set(colors.map(normalizeColor).filter(color => /^#[0-9a-f]{6}$/i.test(color)))].slice(0, 3)
      : [];
  }
  return { appearance, recentColors };
}

export function registerRecentColor(recent: RecentColors, role: ColorRole, color: string): RecentColors {
  const normalized = normalizeColor(color);
  if (normalized === "transparent" || !/^#[0-9a-f]{6}$/i.test(normalized)) return recent;
  return {
    ...recent,
    [role]: [normalized, ...recent[role].map(normalizeColor).filter(item => item !== normalized)].slice(0, 3),
  };
}

export function composeColorSwatches(recent: string[], presets: string[], limit = 7): string[] {
  const result: string[] = [];
  for (const color of [...recent, ...presets]) {
    const normalized = normalizeColor(color);
    if (normalized !== "transparent" && /^#[0-9a-f]{6}$/i.test(normalized) && !result.includes(normalized)) result.push(normalized);
    if (result.length === limit) break;
  }
  return result;
}

export function normalizeLinkUrl(input: string): string | null {
  const url = input.trim();
  if (!url) return "";
  return /^(?:https?:\/\/|mailto:|#|\/(?!\/)|\.\.?\/)/i.test(url) ? url : null;
}

const safeAttribute = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export function sanitizeRichText(html: string): string {
  const withoutDangerousBlocks = html
    .replace(/<!--[^]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|svg|math)[^>]*>[^]*?<\/\1\s*>/gi, "");

  return withoutDangerousBlocks.replace(/<(\/)?([a-z0-9]+)([^>]*)>/gi, (_match, closing: string | undefined, rawTag: string, rawAttributes: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_RICH_TAGS.has(tag)) return "";
    if (closing) return tag === "br" ? "" : `</${tag}>`;
    if (tag === "br") return "<br>";
    if (tag === "a") {
      const hrefMatch = rawAttributes.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i);
      const href = hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "";
      const normalized = normalizeLinkUrl(href);
      return normalized ? `<a href="${safeAttribute(normalized)}" rel="noopener noreferrer">` : "<a>";
    }
    if (tag === "p" || tag === "h3") {
      const align = rawAttributes.match(/text-align\s*:\s*(left|center|right)/i)?.[1]?.toLowerCase();
      return align ? `<${tag} style="text-align: ${align}">` : `<${tag}>`;
    }
    return `<${tag}>`;
  });
}

interface CreateNodeOptions {
  reference: MindmapNode;
  kind: "child" | "sibling";
  parentId: string | null;
  siblingCount: number;
  id: string;
  now?: number;
}

export function createNodeFromReference({ reference, kind, parentId, siblingCount, id, now = Date.now() }: CreateNodeOptions): MindmapNode {
  return {
    id,
    mindmapId: reference.mindmapId,
    parentId,
    text: "New idea",
    richText: "",
    elementKind: "node",
    description: "",
    notes: "",
    x: reference.x + (kind === "child" ? Math.max(280, reference.width + 110) : 0),
    y: reference.y + (kind === "child" ? 0 : Math.max(95, reference.height + 37)),
    width: reference.width,
    height: reference.height,
    background: reference.background,
    color: reference.color,
    borderColor: reference.borderColor,
    branchColor: reference.branchColor,
    emoji: reference.emoji,
    icon: reference.icon ?? null,
    fontFamily: reference.fontFamily,
    fontSize: reference.fontSize,
    fontWeight: reference.fontWeight,
    fontStyle: reference.fontStyle,
    textDecoration: reference.textDecoration,
    textAlign: reference.textAlign,
    tags: [],
    collapsed: false,
    sortOrder: siblingCount + 1,
    createdAt: now,
    updatedAt: now,
  };
}
