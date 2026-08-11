import type { LayoutName, MindmapNode } from "@/src/types/domain";

export function autoLayout(nodes: MindmapNode[], layout: LayoutName): MindmapNode[] {
  const children = new Map<string | null, MindmapNode[]>();
  nodes.forEach((node) => children.set(node.parentId, [...(children.get(node.parentId) ?? []), node]));
  const result = nodes.map((node) => ({ ...node }));
  const byId = new Map(result.map((node) => [node.id, node]));
  const root = result.find((node) => !node.parentId);
  if (!root) return result;
  root.x = 0; root.y = 0;
  let leafIndex = 0;
  const place = (node: MindmapNode, depth: number, branchAngle = 0) => {
    const kids = (children.get(node.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
    kids.forEach((kid, index) => {
      const target = byId.get(kid.id)!;
      if (layout === "vertical") { target.x = (leafIndex++ - kids.length / 2) * 230; target.y = depth * 150; }
      else if (layout === "radial") { const angle = branchAngle + (index - (kids.length - 1) / 2) * 0.55; target.x = Math.cos(angle) * depth * 285; target.y = Math.sin(angle) * depth * 285; }
      else { target.x = depth * 285; target.y = (leafIndex++ - nodes.length / 3) * 92; }
      place(target, depth + 1, layout === "radial" ? Math.atan2(target.y, target.x) : branchAngle);
    });
  };
  place(root, 1, 0);
  if (layout === "mindmap") {
    const first = (children.get(root.id) ?? []);
    first.forEach((node, i) => { if (i >= Math.ceil(first.length / 2)) { const branch = new Set([node.id]); let changed = true; while (changed) { changed = false; nodes.forEach(n => { if (n.parentId && branch.has(n.parentId) && !branch.has(n.id)) { branch.add(n.id); changed = true; } }); } branch.forEach(id => { const n = byId.get(id)!; n.x *= -1; }); } });
  }
  return result;
}

