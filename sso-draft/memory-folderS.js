/*
    memory-folderS.js   -   a fake shared folder that lives in memory,  for the tests.
    It answers the same few calls as a real folder from  showDirectoryPicker:
        getDirectoryHandle(name, {create}),  getFileHandle(name, {create}),  entries(),  removeEntry(name)
        file handle:  getFile() -> { size, text() },   createWritable() -> { write(text), close() }
    makeMemoryFolder() -> a root.   root.__hostile  is the same files,  for a test to edit behind the app's back.
*/
function makeMemoryFolder(name) {
    function notFound() { const e = new Error('not found'); e.name = 'NotFoundError'; return e; }
    function dir(label) {
        const files = new Map(), dirs = new Map();
        return {
            kind: 'directory', name: label, __files: files, __dirs: dirs,
            async getDirectoryHandle(n, o) {
                if (!dirs.has(n)) { if (!(o && o.create)) throw notFound(); dirs.set(n, dir(n)); }
                return dirs.get(n);
            },
            async getFileHandle(n, o) {
                if (!files.has(n)) { if (!(o && o.create)) throw notFound(); files.set(n, ''); }
                return {
                    kind: 'file', name: n,
                    async getFile() { const t = files.get(n); return { size: new TextEncoder().encode(t).length, text: async function () { return t; } }; },
                    async createWritable() { let buf = ''; return { async write(x) { buf += x; }, async close() { files.set(n, buf); } }; },
                };
            },
            async removeEntry(n) { files.delete(n); dirs.delete(n); },
            async *entries() {
                for (const k of Array.from(files.keys())) yield [k, await this.getFileHandle(k)];
                for (const [k, d] of dirs) yield [k, d];
            },
        };
    }
    return dir(name || 'Shared');
}
