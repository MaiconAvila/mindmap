import { describe, expect, it } from "vitest";
import type { MindmapNode, RecentColors } from "@/src/types/domain";
import { composeColorSwatches, createNodeFromReference, normalizeLinkUrl, registerRecentColor, sanitizeRichText } from "@/src/lib/editorFeatures";

const recent: RecentColors = { background: [], text: [], border: [], connection: [] };

describe("recent colors", () => {
  it("promotes, deduplicates, limits and composes colors", () => {
    let colors = registerRecentColor(recent, "background", "#AABBCC");
    colors = registerRecentColor(colors, "background", "#112233");
    colors = registerRecentColor(colors, "background", "#aabbcc");
    colors = registerRecentColor(colors, "background", "#445566");
    colors = registerRecentColor(colors, "background", "#778899");
    expect(colors.background).toEqual(["#778899", "#445566", "#aabbcc"]);
    expect(composeColorSwatches(colors.background, ["#aabbcc", "#ffffff"], 4)).toEqual(["#778899", "#445566", "#aabbcc", "#ffffff"]);
    expect(registerRecentColor(colors, "background", "transparent")).toBe(colors);
  });
});

describe("node style inheritance", () => {
  it("copies every visual field and clears content and metadata", () => {
    const parent: MindmapNode = {
      id: "parent", mindmapId: "map", parentId: null, text: "Parent", richText: "<p>Secret</p>", description: "Description", notes: "Notes",
      x: 20, y: 30, width: 240, height: 90, background: "#112233", color: "#ffffff", borderColor: "#445566", branchColor: "#778899",
      emoji: "💡", icon: "star", fontFamily: "serif", fontSize: 18, fontWeight: 700, fontStyle: "italic", textDecoration: "underline", textAlign: "center",
      url: "https://example.com", status: "done", priority: "high", tags: ["private"], collapsed: true, sortOrder: 1, createdAt: 1, updatedAt: 1,
    };
    const child = createNodeFromReference({ reference: parent, kind: "child", parentId: parent.id, siblingCount: 2, id: "child", now: 10 });
    expect(child).toMatchObject({
      id: "child", parentId: "parent", text: "New idea", richText: "", description: "", notes: "", elementKind: "node",
      width: 240, height: 90, background: "#112233", color: "#ffffff", borderColor: "#445566", branchColor: "#778899",
      emoji: "💡", icon: "star", fontFamily: "serif", fontSize: 18, fontWeight: 700, fontStyle: "italic", textDecoration: "underline", textAlign: "center",
      tags: [], collapsed: false, sortOrder: 3, createdAt: 10, updatedAt: 10,
    });
    expect(child).not.toHaveProperty("url");
    expect(child).not.toHaveProperty("status");
    expect(child).not.toHaveProperty("priority");
  });
});

describe("rich text safety", () => {
  it("keeps supported formatting and strips executable content", () => {
    const html = '<p onclick="bad()" style="text-align:center;color:red">Hello <strong>world</strong><script>alert(1)</script><a href="javascript:bad()">bad</a><a href="/safe">safe</a></p>';
    expect(sanitizeRichText(html)).toBe('<p style="text-align: center">Hello <strong>world</strong><a>bad</a><a href="/safe" rel="noopener noreferrer">safe</a></p>');
  });

  it("accepts only the supported link forms", () => {
    expect(normalizeLinkUrl("https://example.com")).toBe("https://example.com");
    expect(normalizeLinkUrl("../relative")).toBe("../relative");
    expect(normalizeLinkUrl("#topic")).toBe("#topic");
    expect(normalizeLinkUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeLinkUrl("//example.com")).toBeNull();
  });
});
