/// <reference lib="webworker" />
import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import type { MapDocument, MindmapNode, NodeConnection } from "@/src/types/domain";

type SqliteDb = { exec: (options: string | Record<string, unknown>) => unknown; transaction: (callback: () => void) => void };
let db: SqliteDb;
let mode: "sqlite-opfs" | "sqlite-memory" = "sqlite-memory";
let exportDatabase: (() => Uint8Array) | null = null;

const migration = `
CREATE TABLE IF NOT EXISTS mindmaps (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, layout TEXT NOT NULL, theme TEXT, favorite INTEGER DEFAULT 0, deleted_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS nodes (id TEXT PRIMARY KEY, mindmap_id TEXT NOT NULL, parent_id TEXT, data_json TEXT NOT NULL, sort_order REAL, FOREIGN KEY(mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS node_connections (id TEXT PRIMARY KEY, mindmap_id TEXT NOT NULL, data_json TEXT NOT NULL, FOREIGN KEY(mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS map_extras (mindmap_id TEXT PRIMARY KEY, data_json TEXT NOT NULL, FOREIGN KEY(mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_nodes_mindmap_parent ON nodes(mindmap_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_mindmaps_updated ON mindmaps(deleted_at, updated_at DESC);`;

function rows(sql: string, bind?: unknown[]) {
  const result: Record<string, unknown>[] = [];
  db.exec({ sql, bind, rowMode: "object", callback: (row: Record<string, unknown>) => result.push(row) });
  return result;
}

async function initialize() {
  const sqlite3 = await sqlite3InitModule();
  if (sqlite3.oo1.OpfsDb) { db = new sqlite3.oo1.OpfsDb("/luma-mindmaps.sqlite3") as unknown as SqliteDb; mode = "sqlite-opfs"; }
  else db = new sqlite3.oo1.DB("/luma-mindmaps.sqlite3", "ct") as unknown as SqliteDb;
  const pointer=(db as unknown as {pointer?:number}).pointer;
  if(pointer)exportDatabase=()=>sqlite3.capi.sqlite3_js_db_export(pointer);
  db.exec("PRAGMA foreign_keys=ON;" + migration);
  return { mode };
}

function list(): MapDocument[] {
  return rows("SELECT * FROM mindmaps ORDER BY updated_at DESC").map((map) => ({
    version: 1,
    mindmap: { id: String(map.id), title: String(map.title), description: String(map.description ?? ""), layout: map.layout as MapDocument["mindmap"]["layout"], theme: map.theme as MapDocument["mindmap"]["theme"], favorite: Boolean(map.favorite), deletedAt: map.deleted_at == null ? null : Number(map.deleted_at), createdAt: Number(map.created_at), updatedAt: Number(map.updated_at) },
    nodes: rows("SELECT data_json FROM nodes WHERE mindmap_id=? ORDER BY sort_order", [map.id]).map(row => JSON.parse(String(row.data_json)) as MindmapNode),
    connections: rows("SELECT data_json FROM node_connections WHERE mindmap_id=?", [map.id]).map(row => JSON.parse(String(row.data_json)) as NodeConnection),
    ...(() => { const extra = rows("SELECT data_json FROM map_extras WHERE mindmap_id=?", [map.id])[0]; return extra ? JSON.parse(String(extra.data_json)) : { tags: [], assets: [], nodeAssets: [] }; })(),
  }));
}

function save(doc: MapDocument) {
  db.transaction(() => {
    const m = doc.mindmap;
    db.exec({ sql: "INSERT OR REPLACE INTO mindmaps VALUES(?,?,?,?,?,?,?,?,?)", bind: [m.id, m.title, m.description, m.layout, m.theme, m.favorite ? 1 : 0, m.deletedAt, m.createdAt, m.updatedAt] });
    db.exec({ sql: "DELETE FROM nodes WHERE mindmap_id=?", bind: [m.id] });
    doc.nodes.forEach(n => db.exec({ sql: "INSERT INTO nodes VALUES(?,?,?,?,?)", bind: [n.id, n.mindmapId, n.parentId, JSON.stringify(n), n.sortOrder] }));
    db.exec({ sql: "DELETE FROM node_connections WHERE mindmap_id=?", bind: [m.id] });
    doc.connections.forEach(c => db.exec({ sql: "INSERT INTO node_connections VALUES(?,?,?)", bind: [c.id, c.mindmapId, JSON.stringify(c)] }));
    db.exec({ sql: "INSERT OR REPLACE INTO map_extras VALUES(?,?)", bind: [m.id, JSON.stringify({ tags: doc.tags ?? [], assets: doc.assets ?? [], nodeAssets: doc.nodeAssets ?? [] })] });
  });
}

self.onmessage = async (event: MessageEvent<{ id: number; type: string; payload: unknown }>) => {
  const { id, type, payload } = event.data;
  try {
    let value: unknown;
    if (type === "init") value = await initialize();
    else if (type === "list") value = list();
    else if (type === "save") value = save(payload as MapDocument);
    else if (type === "remove") { db.exec({ sql: "DELETE FROM mindmaps WHERE id=?", bind: [payload] }); value = null; }
    else if (type === "clear") { db.exec("DELETE FROM mindmaps; VACUUM;"); value = true; }
    else if (type === "optimize") { db.exec("PRAGMA optimize; VACUUM;"); value = true; }
    else if (type === "stats") { const maps=rows("SELECT COUNT(*) count FROM mindmaps")[0];const nodes=rows("SELECT COUNT(*) count FROM nodes")[0];const pages=rows("PRAGMA page_count")[0];const pageSize=rows("PRAGMA page_size")[0];value={maps:Number(maps.count),nodes:Number(nodes.count),bytes:Number(pages.page_count)*Number(pageSize.page_size),mode}; }
    else if (type === "export-database") value = exportDatabase?.() ?? new Uint8Array();
    else if (type === "get-settings") { const row=rows("SELECT value_json FROM app_settings WHERE key='app'")[0];value=row?JSON.parse(String(row.value_json)):{appearance:"dark",recentColors:{background:[],text:[],border:[],connection:[]}}; }
    else if (type === "save-settings") { const row=rows("SELECT value_json FROM app_settings WHERE key='app'")[0];const current=row?JSON.parse(String(row.value_json)):{};const patch=payload as Record<string,unknown>;const merged={...current,...patch,recentColors:patch.recentColors??current.recentColors};db.exec({sql:"INSERT OR REPLACE INTO app_settings VALUES('app',?)",bind:[JSON.stringify(merged)]});value=true; }
    self.postMessage({ id, ok: true, value });
  } catch (error) { self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) }); }
};
