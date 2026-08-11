import { AlertTriangle, BookOpen, Bookmark, Briefcase, Calendar, CheckCircle2, Code2, Flag, Heart, Lightbulb, Star, Target, type LucideIcon } from "lucide-react";
import type { NodeIconName } from "@/src/types/domain";

export const NODE_ICON_OPTIONS: { name: NodeIconName; label: string; Icon: LucideIcon }[] = [
  { name: "lightbulb", label: "Idea", Icon: Lightbulb }, { name: "star", label: "Star", Icon: Star },
  { name: "check", label: "Done", Icon: CheckCircle2 }, { name: "warning", label: "Warning", Icon: AlertTriangle },
  { name: "book", label: "Book", Icon: BookOpen }, { name: "code", label: "Code", Icon: Code2 },
  { name: "target", label: "Target", Icon: Target }, { name: "flag", label: "Flag", Icon: Flag },
  { name: "heart", label: "Heart", Icon: Heart }, { name: "bookmark", label: "Bookmark", Icon: Bookmark },
  { name: "calendar", label: "Calendar", Icon: Calendar }, { name: "briefcase", label: "Work", Icon: Briefcase },
];

export function NodeIcon({ name, size = 15 }: { name?: NodeIconName | null; size?: number }) {
  const entry = NODE_ICON_OPTIONS.find(option => option.name === name);
  if (!entry) return null;
  return <entry.Icon size={size} aria-hidden="true" />;
}
