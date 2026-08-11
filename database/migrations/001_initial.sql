PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS mindmaps (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '', layout TEXT NOT NULL, theme TEXT NOT NULL, favorite INTEGER DEFAULT 0, deleted_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS nodes (id TEXT PRIMARY KEY, mindmap_id TEXT NOT NULL, parent_id TEXT, text TEXT NOT NULL, description TEXT DEFAULT '', notes TEXT DEFAULT '', position_x REAL NOT NULL, position_y REAL NOT NULL, width REAL, height REAL, color TEXT, background_color TEXT, border_color TEXT, emoji TEXT, collapsed INTEGER DEFAULT 0, sort_order REAL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY(mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE, FOREIGN KEY(parent_id) REFERENCES nodes(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS node_connections (id TEXT PRIMARY KEY, mindmap_id TEXT NOT NULL, source_id TEXT NOT NULL, target_id TEXT NOT NULL, label TEXT, color TEXT, style TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY(mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, color TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS node_tags (node_id TEXT NOT NULL, tag_id TEXT NOT NULL, PRIMARY KEY(node_id, tag_id), FOREIGN KEY(node_id) REFERENCES nodes(id) ON DELETE CASCADE, FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS themes (id TEXT PRIMARY KEY, name TEXT NOT NULL, data_json TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY, mindmap_id TEXT NOT NULL, operation_type TEXT NOT NULL, payload_json TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, mindmap_id TEXT, type TEXT NOT NULL, file_name TEXT, mime_type TEXT NOT NULL, storage_path TEXT NOT NULL, file_size INTEGER, width INTEGER, height INTEGER, hash TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS node_assets (id TEXT PRIMARY KEY, node_id TEXT NOT NULL, asset_id TEXT NOT NULL, position TEXT DEFAULT 'top', sort_order REAL, width REAL, height REAL, object_fit TEXT DEFAULT 'contain', crop_x REAL, crop_y REAL, crop_width REAL, crop_height REAL, caption TEXT, created_at INTEGER NOT NULL, FOREIGN KEY(node_id) REFERENCES nodes(id) ON DELETE CASCADE, FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_nodes_mindmap_parent ON nodes(mindmap_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_mindmaps_updated ON mindmaps(deleted_at, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_connections_map ON node_connections(mindmap_id);
CREATE INDEX IF NOT EXISTS idx_assets_hash ON assets(hash);

