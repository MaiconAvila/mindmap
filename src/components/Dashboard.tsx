"use client";
import { useState } from "react";
import { Archive, Clock3, Grid2X2, List, Plus, RotateCcw, Search, Star, Trash2, Upload } from "lucide-react";
import type { MapDocument } from "@/src/types/domain";

export function Dashboard({ documents, onOpen, onCreate, onToggleFavorite, onTrash, onRestore, onDeletePermanent, onImport, onBackup }: { documents: MapDocument[]; onOpen: (doc: MapDocument) => void; onCreate: () => void; onToggleFavorite: (doc: MapDocument) => void; onTrash: (doc: MapDocument) => void; onRestore:(doc:MapDocument)=>void; onDeletePermanent:(doc:MapDocument)=>void; onImport:()=>void; onBackup:()=>void }) {
  const [section,setSection]=useState<"recent"|"favorites"|"all"|"trash">("recent");
  const [query,setQuery]=useState(""); const [list,setList]=useState(false);
  const active = documents.filter(d => !d.mindmap.deletedAt);
  const visible=(section==="trash"?documents.filter(d=>d.mindmap.deletedAt):section==="favorites"?active.filter(d=>d.mindmap.favorite):active).filter(d=>`${d.mindmap.title} ${d.nodes.map(n=>`${n.text} ${n.notes} ${n.description} ${(n.tags??[]).join(" ")}`).join(" ")}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>b.mindmap.updatedAt-a.mindmap.updatedAt);
  return <main className="dashboard">
    <aside className="dash-nav">
      <div className="brand"><span className="brand-mark">L</span><span>Luma</span></div>
      <button className="new-map" onClick={onCreate}><Plus size={17}/> New mind map</button>
      <nav><button className={section==="recent"?"active":""} onClick={()=>setSection("recent")}><Clock3/>Recent<span>{active.length}</span></button><button className={section==="favorites"?"active":""} onClick={()=>setSection("favorites")}><Star/>Favorites<span>{active.filter(d=>d.mindmap.favorite).length}</span></button><button className={section==="all"?"active":""} onClick={()=>setSection("all")}><Archive/>All maps</button><button className={section==="trash"?"active":""} onClick={()=>setSection("trash")}><Trash2/>Trash<span>{documents.filter(d=>d.mindmap.deletedAt).length}</span></button></nav>
      <div className="local-note"><span className="local-dot"/>Stored on this device<small>Private & available offline</small></div>
    </aside>
    <section className="dash-main">
      <header className="dash-header"><div><p className="eyebrow">WORKSPACE</p><h1>Your mind maps</h1><p>Capture thoughts. Shape ideas.</p></div><div className="avatar">MC</div></header>
      <div className="dash-tools"><label className="search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search maps and nodes…" aria-label="Search maps"/><kbd>⌘ F</kbd></label><button className="import-button" onClick={onImport}><Upload/>Import</button><button className="import-button" onClick={onBackup}><Archive/>Backup</button><div className="view-toggle"><button className={!list?"active":""} onClick={()=>setList(false)}><Grid2X2/></button><button className={list?"active":""} onClick={()=>setList(true)}><List/></button></div></div>
      <div className="section-title"><h2>{section[0].toUpperCase()+section.slice(1)}</h2><span>{visible.length} maps</span></div>
      <div className={`map-grid ${list?"list-view":""}`}>
        {section!=="trash"&&<button className="create-card" onClick={onCreate}><span><Plus/></span><strong>New mind map</strong><small>Start with a blank canvas</small></button>}
        {visible.map(doc => <div className="map-card" key={doc.mindmap.id} role="button" onClick={() => section!=="trash"&&onOpen(doc)} onKeyDown={event=>{if((event.key==="Enter"||event.key===" ")&&section!=="trash"){event.preventDefault();onOpen(doc)}}} tabIndex={0}>
          <div className={`map-preview theme-${doc.mindmap.theme}`}><div className="preview-lines"><i/><i/><i/><b/></div><span>{doc.nodes.length} nodes</span></div>
          <div className="map-card-info"><div><h3>{doc.mindmap.title}</h3><p>Edited {relative(doc.mindmap.updatedAt)}</p></div>{section==="trash"?<><button onClick={(e)=>{e.stopPropagation();onRestore(doc)}} aria-label="Restore"><RotateCcw/></button><button className="delete-forever" onClick={(e)=>{e.stopPropagation();onDeletePermanent(doc)}} aria-label="Delete permanently"><Trash2/></button></>:<><button className={doc.mindmap.favorite ? "favorite" : ""} onClick={(e) => { e.stopPropagation(); onToggleFavorite(doc); }} aria-label="Favorite"><Star/></button><button onClick={(e) => { e.stopPropagation(); onTrash(doc); }} aria-label="Move to trash"><Trash2/></button></>}</div>
        </div>)}
        {!visible.length&&section==="trash"&&<div className="empty-state"><Trash2/><h3>Trash is empty</h3><p>Deleted maps will stay here until you remove them permanently.</p></div>}
      </div>
    </section>
  </main>;
}

function relative(value: number) { const m = Math.max(1, Math.round((Date.now() - value) / 60000)); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m/60)}h ago` : `${Math.round(m/1440)}d ago`; }
