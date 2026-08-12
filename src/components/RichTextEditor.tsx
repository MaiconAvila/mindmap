"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { AlignCenter, AlignLeft, Bold, Italic, Link2, Link2Off, List, ListOrdered, Pilcrow, Underline } from "lucide-react";
import { normalizeLinkUrl, sanitizeRichText } from "@/src/lib/editorFeatures";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function RichTextEditor({ value, onChange }: Props) {
  const linkInputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    content: sanitizeRichText(value),
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        heading: { levels: [3] },
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: false,
          HTMLAttributes: { rel: "noopener noreferrer" },
          protocols: ["http", "https", "mailto"],
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right"] }),
      Placeholder.configure({ placeholder: "Write formatted text…" }),
    ],
    editorProps: {
      attributes: { class: "rich-text-area", "aria-label": "Rich text", role: "textbox", "aria-multiline": "true" },
      transformPastedHTML: sanitizeRichText,
    },
    onUpdate: ({ editor: current }) => {
      onChangeRef.current(current.isEmpty ? "" : sanitizeRichText(current.getHTML()));
    },
  }, []);

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => current ? ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
      heading: current.isActive("heading", { level: 3 }),
      alignLeft: current.isActive({ textAlign: "left" }),
      alignCenter: current.isActive({ textAlign: "center" }),
      link: current.isActive("link"),
    }) : null,
  });

  useEffect(() => {
    if (linkOpen) linkInputRef.current?.focus();
  }, [linkOpen]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const openLinkEditor = () => {
    if (!editor) return;
    setLinkValue(editor.getAttributes("link").href ?? "");
    setLinkError("");
    setLinkOpen(true);
  };

  const applyLink = () => {
    if (!editor) return;
    const normalized = normalizeLinkUrl(linkValue);
    if (normalized === null) {
      setLinkError("Use http(s), mailto, /path, ./path or #anchor.");
      return;
    }
    if (!normalized) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: normalized }).run();
    setLinkOpen(false);
    setLinkError("");
  };

  return <div className="rich-field">
    <span>Rich text</span>
    <div className="rich-toolbar" role="toolbar" aria-label="Rich text formatting">
      <ToolbarButton label="Bold" active={state?.bold} disabled={!editor} onRun={() => editor?.chain().focus().toggleBold().run()}><Bold/></ToolbarButton>
      <ToolbarButton label="Italic" active={state?.italic} disabled={!editor} onRun={() => editor?.chain().focus().toggleItalic().run()}><Italic/></ToolbarButton>
      <ToolbarButton label="Underline" active={state?.underline} disabled={!editor} onRun={() => editor?.chain().focus().toggleUnderline().run()}><Underline/></ToolbarButton>
      <ToolbarButton label="Bulleted list" active={state?.bulletList} disabled={!editor} onRun={() => editor?.chain().focus().toggleBulletList().run()}><List/></ToolbarButton>
      <ToolbarButton label="Numbered list" active={state?.orderedList} disabled={!editor} onRun={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered/></ToolbarButton>
      <ToolbarButton label="Heading" active={state?.heading} disabled={!editor} onRun={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Pilcrow/></ToolbarButton>
      <ToolbarButton label="Align left" active={state?.alignLeft} disabled={!editor} onRun={() => editor?.chain().focus().setTextAlign("left").run()}><AlignLeft/></ToolbarButton>
      <ToolbarButton label="Align center" active={state?.alignCenter} disabled={!editor} onRun={() => editor?.chain().focus().setTextAlign("center").run()}><AlignCenter/></ToolbarButton>
      <ToolbarButton label="Add or edit link" active={state?.link} disabled={!editor} onRun={openLinkEditor}><Link2/></ToolbarButton>
      <ToolbarButton label="Remove link" disabled={!editor || !state?.link} onRun={() => editor?.chain().focus().extendMarkRange("link").unsetLink().run()}><Link2Off/></ToolbarButton>
    </div>
    {linkOpen && <div className="rich-link-editor">
      <input ref={linkInputRef} value={linkValue} onChange={event => { setLinkValue(event.target.value); setLinkError(""); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); applyLink(); } else if (event.key === "Escape") { setLinkOpen(false); editor?.commands.focus(); } }} placeholder="https://example.com" aria-label="Link URL" aria-invalid={Boolean(linkError)}/>
      <button type="button" onClick={applyLink}>Apply</button>
      <button type="button" onClick={() => { setLinkOpen(false); editor?.commands.focus(); }}>Cancel</button>
      {linkError && <small role="alert">{linkError}</small>}
    </div>}
    <EditorContent editor={editor}/>
  </div>;
}

function ToolbarButton({ label, active = false, disabled = false, onRun, children }: { label: string; active?: boolean; disabled?: boolean; onRun: () => void; children: React.ReactNode }) {
  return <button type="button" className={active ? "active" : ""} aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={onRun}>{children}</button>;
}
