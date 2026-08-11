"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Asset, MindmapNode, NodeAsset, NodeConnection } from "@/src/types/domain";
import { assetStore } from "@/src/database/assetStore";
import { NodeIcon } from "./NodeIcon";

const safeRichText=(html:string)=>html.replace(/<(script|style|iframe|object)[^>]*>[\s\S]*?<\/\1>/gi,"").replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi,"").replace(/(href\s*=\s*["'])\s*javascript:/gi,"$1#");

interface Props {
  nodes: MindmapNode[];
  assets: Asset[];
  nodeAssets: NodeAsset[];
  connections: NodeConnection[];
  selected: string[];
  editingId: string | null;
  zoom: number;
  pan: { x: number; y: number };
  onPan: (pan: { x: number; y: number }) => void;
  onZoom: (zoom: number) => void;
  onSelect: (ids: string[]) => void;
  onMove: (id: string, x: number, y: number) => void;
  onEdit: (id: string | null) => void;
  onText: (id: string, text: string) => void;
  onToggle: (id: string) => void;
  onCanvasMenu: (x: number, y: number) => void;
  onNodeMenu: (nodeId: string, x: number, y: number) => void;
  onImage: (nodeId: string, file: File) => void;
  onReparent: (nodeId: string, parentId: string) => void;
  grid: boolean;
  onOpenImage: (asset: Asset, binding: NodeAsset) => void;
  onCanvasImage:(file:File,x:number,y:number)=>void;
  laser: boolean;
}

function NodeImage({ binding, asset, onOpen }: { binding: NodeAsset; asset: Asset; onOpen:()=>void }) {
  const [src, setSrc] = useState("");
  useEffect(() => { let current = ""; assetStore.url(asset).then(url => { current = url; setSrc(url); }).catch(()=>undefined); return () => { if (current) URL.revokeObjectURL(current); }; }, [asset]);
  if (!src) return <span className="node-image-loading"/>;
  return <img className={`node-image position-${binding.position}`} src={src} alt={asset.fileName} style={{ width: binding.width || 160, height: binding.height || 92, objectFit: binding.objectFit,objectPosition:`${binding.cropX??50}% ${binding.cropY??50}%` }} loading="lazy" draggable={false} onDoubleClick={e=>{e.stopPropagation();onOpen()}}/>;
}

const MapNode = memo(function MapNode({ node, selected, editing, images, onPointerDown, onSelect, onEdit, onText, onToggle, onImage, onMenu, onOpenImage }: {
  node: MindmapNode; selected: boolean; editing: boolean;
  images: { binding: NodeAsset; asset: Asset }[];
  onPointerDown: (event: React.PointerEvent) => void; onSelect: (event: React.MouseEvent) => void;
  onEdit: () => void; onText: (text: string) => void; onToggle: () => void; onImage: (file: File) => void; onMenu: (event: React.MouseEvent) => void;onOpenImage:(asset:Asset,binding:NodeAsset)=>void;
}) {
  const textStyle: React.CSSProperties={fontFamily:node.fontFamily==="serif"?"Georgia, serif":node.fontFamily==="mono"?"var(--font-mono), monospace":"var(--font-sans), sans-serif",fontSize:node.fontSize??12,fontWeight:node.fontWeight??590,fontStyle:node.fontStyle??"normal",textDecoration:node.textDecoration??"none",textAlign:node.textAlign??"left"};
  const hasRichText=Boolean(node.richText?.replace(/<[^>]*>|&nbsp;/g,"").trim());const textless=!node.text.trim()&&!hasRichText;const kind=node.elementKind??"node";const mediaWidth=images.reduce((width,image)=>Math.max(width,image.binding.width+(textless?0:20)),0);
  return <div className={`map-node kind-${kind} ${textless&&images.length?"image-only":""} ${selected ? "selected" : ""}`} style={{ transform: `translate(${node.x}px, ${node.y}px)`, width: Math.max(node.width,mediaWidth), minHeight: node.height, background: node.background, color: node.color, borderColor: node.borderColor }} onPointerDown={onPointerDown} onClick={onSelect} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();onEdit()}}} onDoubleClick={onEdit} onContextMenu={onMenu} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();e.stopPropagation();const file=e.dataTransfer.files[0];if(file)onImage(file)}} role="treeitem" tabIndex={0} aria-selected={selected}>
    {images.filter(image=>image.binding.position!=="bottom").map(image=><NodeImage key={image.binding.id} {...image} onOpen={()=>onOpenImage(image.asset,image.binding)}/>)}
    {kind!=="image"&&<div className="node-content">
      <NodeIcon name={node.icon}/>
      {node.emoji && <span className="node-emoji">{node.emoji}</span>}
      {editing ? <textarea ref={element=>element?.focus()} className="node-input" style={textStyle} value={node.text} onChange={(e) => onText(e.target.value)} onBlur={onEdit} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onEdit(); } else if (e.key === "Escape") { e.preventDefault(); onEdit(); } }} aria-label="Node title" rows={Math.max(1,node.text.split("\n").length)} /> : node.text&&<span className="node-label" style={textStyle}>{node.text}</span>}
      {hasRichText&&<div className="node-rich-text" dangerouslySetInnerHTML={{__html:safeRichText(node.richText??"")}}/>}
    </div>}
    {images.filter(image=>image.binding.position==="bottom").map(image=><NodeImage key={image.binding.id} {...image} onOpen={()=>onOpenImage(image.asset,image.binding)}/>)}
    {kind==="node"&&<button className="node-collapse" onClick={(e) => { e.stopPropagation(); onToggle(); }} aria-label={node.collapsed ? "Expand branch" : "Collapse branch"}>{node.collapsed ? <ChevronRight size={12}/> : <ChevronDown size={12}/>}</button>}
  </div>;
});

export function MindCanvas(props: Props) {
  const [dragging, setDragging] = useState<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [panning, setPanning] = useState<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [marquee, setMarquee] = useState<{ sx: number; sy: number; x: number; y: number; left:number; top:number } | null>(null);
  const [laserPosition,setLaserPosition]=useState<{x:number;y:number}|null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const visible = useMemo(() => {
    const hidden = new Set<string>(); let changed = true;
    while (changed) { changed = false; props.nodes.forEach(n => { if (n.parentId && (hidden.has(n.parentId) || props.nodes.find(p => p.id === n.parentId)?.collapsed) && !hidden.has(n.id)) { hidden.add(n.id); changed = true; } }); }
    return props.nodes.filter(n => !hidden.has(n.id));
  }, [props.nodes]);
  const byId = useMemo(() => new Map(props.nodes.map(n => [n.id, n])), [props.nodes]);
  const assetsById = useMemo(() => new Map(props.assets.map(asset => [asset.id, asset])), [props.assets]);

  const pointerMove = useCallback((event: React.PointerEvent) => {
    if(props.laser&&ref.current){const rect=ref.current.getBoundingClientRect();setLaserPosition({x:event.clientX-rect.left,y:event.clientY-rect.top});return;}
    if (dragging) props.onMove(dragging.id, dragging.ox + (event.clientX - dragging.sx) / props.zoom, dragging.oy + (event.clientY - dragging.sy) / props.zoom);
    if (panning) props.onPan({ x: panning.ox + event.clientX - panning.sx, y: panning.oy + event.clientY - panning.sy });
    if (marquee) setMarquee({...marquee,x:event.clientX,y:event.clientY});
  }, [dragging, panning, marquee, props]);
  const pointerUp = (event: React.PointerEvent) => {
    if (dragging && Math.hypot(event.clientX-dragging.sx,event.clientY-dragging.sy)>12 && ref.current) {
      const rect=ref.current.getBoundingClientRect();const x=(event.clientX-rect.left-props.pan.x)/props.zoom;const y=(event.clientY-rect.top-props.pan.y)/props.zoom;
      const target=[...props.nodes].reverse().find(node=>node.id!==dragging.id&&x>=node.x&&x<=node.x+node.width&&y>=node.y&&y<=node.y+node.height);
      if(target)props.onReparent(dragging.id,target.id);
    }
    if(marquee&&ref.current){const rect=ref.current.getBoundingClientRect();const left=(Math.min(marquee.sx,marquee.x)-rect.left-props.pan.x)/props.zoom;const top=(Math.min(marquee.sy,marquee.y)-rect.top-props.pan.y)/props.zoom;const right=(Math.max(marquee.sx,marquee.x)-rect.left-props.pan.x)/props.zoom;const bottom=(Math.max(marquee.sy,marquee.y)-rect.top-props.pan.y)/props.zoom;props.onSelect(props.nodes.filter(n=>n.x+n.width>=left&&n.x<=right&&n.y+n.height>=top&&n.y<=bottom).map(n=>n.id));}
    setDragging(null);setPanning(null);setMarquee(null);
  };

  return <div ref={ref} className={`canvas ${props.laser?"laser-mode":""}`} role="tree" tabIndex={0} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerLeave={() => { setDragging(null); setPanning(null); setMarquee(null);setLaserPosition(null); }} onPointerDown={(e) => { if(props.laser)return;if (e.target === e.currentTarget) { props.onSelect([]); if(e.shiftKey){const rect=e.currentTarget.getBoundingClientRect();setMarquee({sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY,left:rect.left,top:rect.top})}else setPanning({ sx: e.clientX, sy: e.clientY, ox: props.pan.x, oy: props.pan.y }); } }} onWheel={(e) => { e.preventDefault(); props.onZoom(Math.min(1.8, Math.max(.35, props.zoom - e.deltaY * .001))); }} onContextMenu={(e) => { e.preventDefault(); props.onCanvasMenu(e.clientX, e.clientY); }} onDragOver={e=>e.preventDefault()} onDrop={e=>{if(e.target!==e.currentTarget)return;e.preventDefault();const file=e.dataTransfer.files[0];if(file&&ref.current){const rect=ref.current.getBoundingClientRect();props.onCanvasImage(file,(e.clientX-rect.left-props.pan.x)/props.zoom,(e.clientY-rect.top-props.pan.y)/props.zoom)}}} aria-label="Infinite mind map canvas">
    {props.grid&&<div className="canvas-grid" style={{ backgroundPosition: `${props.pan.x}px ${props.pan.y}px`, backgroundSize: `${24 * props.zoom}px ${24 * props.zoom}px` }} />}
    {marquee&&<div className="marquee" style={{left:Math.min(marquee.sx,marquee.x)-marquee.left,top:Math.min(marquee.sy,marquee.y)-marquee.top,width:Math.abs(marquee.x-marquee.sx),height:Math.abs(marquee.y-marquee.sy)}}/>}
    {props.laser&&laserPosition&&<div className="laser-pointer" style={{left:laserPosition.x,top:laserPosition.y}}/>}
    <div className="map-layer" style={{ transform: `translate(${props.pan.x}px, ${props.pan.y}px) scale(${props.zoom})` }}>
      <svg className="edges" aria-hidden="true">
        {visible.filter(n => n.parentId && byId.has(n.parentId)).map(n => { const p = byId.get(n.parentId!)!; const left = n.x < p.x; const x1 = p.x + (left ? 0 : p.width); const y1 = p.y + p.height / 2; const x2 = n.x + (left ? n.width : 0); const y2 = n.y + n.height / 2; const bend = Math.abs(x2 - x1) * .52; return <path key={n.id} style={{stroke:n.branchColor??"#45576a"}} d={`M ${x1} ${y1} C ${x1 + (left ? -bend : bend)} ${y1}, ${x2 + (left ? bend : -bend)} ${y2}, ${x2} ${y2}`} />; })}
        {props.connections.map(c=>{const s=byId.get(c.sourceId),t=byId.get(c.targetId);if(!s||!t)return null;const x1=s.x+s.width/2,y1=s.y+s.height/2,x2=t.x+t.width/2,y2=t.y+t.height/2;const d=c.style==="bezier"?`M ${x1} ${y1} C ${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}`:c.style==="elbow"?`M ${x1} ${y1} L ${(x1+x2)/2} ${y1} L ${(x1+x2)/2} ${y2} L ${x2} ${y2}`:`M ${x1} ${y1} L ${x2} ${y2}`;return <path className="independent-edge" key={c.id} style={{stroke:c.color}} d={d}/>})}
      </svg>
      {visible.map(node => <MapNode key={node.id} node={node} selected={props.selected.includes(node.id)} editing={props.editingId === node.id} images={props.nodeAssets.filter(binding=>binding.nodeId===node.id).map(binding=>({binding,asset:assetsById.get(binding.assetId)})).filter((value): value is {binding:NodeAsset;asset:Asset}=>Boolean(value.asset))}
        onPointerDown={(e) => { if(props.laser)return;e.stopPropagation(); setDragging({ id: node.id, sx: e.clientX, sy: e.clientY, ox: node.x, oy: node.y }); }}
        onSelect={(e) => props.onSelect(e.shiftKey ? [...new Set([...props.selected, node.id])] : [node.id])}
        onEdit={() => props.onEdit(props.editingId === node.id ? null : node.id)} onText={(text) => props.onText(node.id, text)} onToggle={() => props.onToggle(node.id)} onImage={file=>props.onImage(node.id,file)} onMenu={e=>{e.preventDefault();e.stopPropagation();props.onSelect([node.id]);props.onNodeMenu(node.id,e.clientX,e.clientY)}} onOpenImage={props.onOpenImage} />)}
    </div>
  </div>;
}
