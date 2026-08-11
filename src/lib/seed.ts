import { id, type MapDocument, type MindmapNode } from "@/src/types/domain";

export function createMapDocument(title = "Untitled Mind Map"): MapDocument {
  const now = Date.now();
  const mapId = id();
  const rootId = id();
  return {
    version: 1,
    mindmap: { id: mapId, title, description: "", layout: "mindmap", theme: "dark", favorite: false, deletedAt: null, createdAt: now, updatedAt: now },
    nodes: [{ id: rootId, mindmapId: mapId, parentId: null, text: title, description: "", notes: "", x: 0, y: 0, width: 190, height: 64, background: "#7057ff", color: "#ffffff", borderColor: "#9b8cff", emoji: "✦", collapsed: false, sortOrder: 0, createdAt: now, updatedAt: now }],
    connections: [], tags: [], assets: [], nodeAssets: [],
  };
}

export function createWelcomeDocument(): MapDocument {
  const doc = createMapDocument("My First Mind Map");
  const root = doc.nodes[0];
  const now = Date.now();
  const make = (text: string, parentId: string, x: number, y: number, emoji: string, background: string, order: number): MindmapNode => ({
    id: id(), mindmapId: doc.mindmap.id, parentId, text, description: "", notes: "", x, y, width: 170, height: 58, background, color: "#f8f8fb", borderColor: background, emoji, collapsed: false, sortOrder: order, createdAt: now, updatedAt: now,
  });
  const ideas = make("Ideas", root.id, 310, -180, "💡", "#234f69", 1);
  const tasks = make("Tasks", root.id, 350, 0, "✓", "#2f5e50", 2);
  const notes = make("Notes", root.id, 310, 180, "✎", "#5a466d", 3);
  doc.nodes.push(ideas, tasks, notes,
    make("Idea 1", ideas.id, 610, -225, "", "#1c2733", 1),
    make("Idea 2", ideas.id, 610, -135, "", "#1c2733", 2),
    make("Research", tasks.id, 650, -45, "", "#1c2d2a", 1),
    make("Build", tasks.id, 650, 45, "", "#1c2d2a", 2));
  doc.nodes.push(make("Tab adds a child", notes.id, 610, 150, "⌨", "#2d2735", 1), make("Enter adds a sibling", notes.id, 610, 230, "↵", "#2d2735", 2));
  return doc;
}
