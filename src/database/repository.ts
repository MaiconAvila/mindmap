import type { AppSettings, MapDocument } from "@/src/types/domain";
import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from "@/src/lib/editorFeatures";

type WorkerReply = { id: number; ok: boolean; value?: unknown; error?: string };

class LocalDatabase {
  private worker: Worker | null = null;
  private sequence = 0;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (reason: unknown) => void }>();
  private memory = new Map<string, MapDocument>();
  private preferences: AppSettings = DEFAULT_APP_SETTINGS;
  mode: "sqlite-opfs" | "sqlite-memory" | "memory" = "memory";

  async init() {
    if (typeof Worker === "undefined") return;
    try {
      this.worker = new Worker(new URL("../workers/sqlite.worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (event: MessageEvent<WorkerReply>) => {
        const request = this.pending.get(event.data.id); if (!request) return;
        this.pending.delete(event.data.id);
        if (event.data.ok) request.resolve(event.data.value);
        else request.reject(new Error(event.data.error));
      };
      const info = await this.call("init", null) as { mode: "sqlite-opfs" | "sqlite-memory" };
      this.mode = info.mode;
    } catch { this.worker?.terminate(); this.worker = null; this.mode = "memory"; }
  }

  private call(type: string, payload: unknown) {
    if (!this.worker) return Promise.reject(new Error("SQLite worker unavailable"));
    const id = ++this.sequence;
    return new Promise<unknown>((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.worker!.postMessage({ id, type, payload }); });
  }

  async list(): Promise<MapDocument[]> { if (this.worker) return this.call("list", null) as Promise<MapDocument[]>; return [...this.memory.values()]; }
  async save(doc: MapDocument): Promise<void> { this.memory.set(doc.mindmap.id, structuredClone(doc)); if (this.worker) await this.call("save", doc); }
  async remove(id: string): Promise<void> { this.memory.delete(id); if (this.worker) await this.call("remove", id); }
  async stats(): Promise<{maps:number;nodes:number;bytes:number;mode:string}> { if(this.worker)return this.call("stats",null) as Promise<{maps:number;nodes:number;bytes:number;mode:string}>;return{maps:this.memory.size,nodes:[...this.memory.values()].reduce((sum,doc)=>sum+doc.nodes.length,0),bytes:0,mode:"memory"}; }
  async optimize(): Promise<void> { if(this.worker)await this.call("optimize",null); }
  async exportDatabase(): Promise<Uint8Array> { if(this.worker)return this.call("export-database",null) as Promise<Uint8Array>;return new Uint8Array(); }
  async clear():Promise<void>{this.memory.clear();if(this.worker)await this.call("clear",null);}
  async settings(): Promise<AppSettings> {
    if (this.worker) return normalizeAppSettings(await this.call("get-settings", null) as Partial<AppSettings>);
    return this.preferences;
  }
  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    this.preferences = normalizeAppSettings({ ...this.preferences, ...settings, recentColors: settings.recentColors ?? this.preferences.recentColors });
    if (this.worker) await this.call("save-settings", settings);
  }
}

export const localDatabase = new LocalDatabase();
