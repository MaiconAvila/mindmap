import { id, type Asset } from "@/src/types/domain";

const memory = new Map<string, Blob>();

async function digest(file: Blob) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, "0")).join("");
}

async function dimensions(file: Blob) {
  try { const bitmap = await createImageBitmap(file); const value = { width: bitmap.width, height: bitmap.height }; bitmap.close(); return value; }
  catch { return { width: 0, height: 0 }; }
}

export const assetStore = {
  async write(file: File, mindmapId: string, existing: Asset[]) {
    if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) throw new Error("Use an image smaller than 20 MB.");
    const hash = await digest(file);
    const duplicate = existing.find(asset => asset.hash === hash);
    if (duplicate) return duplicate;
    const assetId = id(); const storagePath = `assets/${assetId}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    if (navigator.storage?.getDirectory) {
      const root = await navigator.storage.getDirectory(); const directory = await root.getDirectoryHandle("assets", { create: true });
      const handle = await directory.getFileHandle(storagePath.slice(7), { create: true }); const writable = await handle.createWritable(); await writable.write(file); await writable.close();
    } else memory.set(storagePath, file);
    const size = await dimensions(file); const now = Date.now();
    return { id: assetId, mindmapId, type: "image" as const, fileName: file.name, mimeType: file.type, storagePath, fileSize: file.size, ...size, hash, createdAt: now, updatedAt: now };
  },
  async url(asset: Asset) {
    const blob=await this.blob(asset);return blob?URL.createObjectURL(blob):"";
  },
  async blob(asset: Asset):Promise<Blob|null> {
    if (navigator.storage?.getDirectory) { const root = await navigator.storage.getDirectory(); const directory = await root.getDirectoryHandle("assets"); const handle = await directory.getFileHandle(asset.storagePath.slice(7)); return handle.getFile(); }
    return memory.get(asset.storagePath)??null;
  },
  async remove(asset: Asset) {
    try { if (navigator.storage?.getDirectory) { const root = await navigator.storage.getDirectory(); const directory = await root.getDirectoryHandle("assets"); await directory.removeEntry(asset.storagePath.slice(7)); } else memory.delete(asset.storagePath); } catch { /* already removed */ }
  },
  async cleanUnused(usedPaths:Set<string>){let removed=0;if(navigator.storage?.getDirectory){try{const root=await navigator.storage.getDirectory();const directory=await root.getDirectoryHandle("assets");const iterable=directory as FileSystemDirectoryHandle&{entries():AsyncIterableIterator<[string,FileSystemHandle]>};for await(const[name]of iterable.entries()){if(!usedPaths.has(`assets/${name}`)){await directory.removeEntry(name);removed++}}}catch{/* no asset directory */}}else{for(const path of memory.keys())if(!usedPaths.has(path)){memory.delete(path);removed++}}return removed}
};
