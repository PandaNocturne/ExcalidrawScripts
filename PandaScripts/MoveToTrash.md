await ea.addElementsToView();
const imgs = ea.getViewSelectedElements().filter(el => el.type === "image");
if (!imgs.length) {
    new Notice("未选中任何图片");
    return;
}

const qaPlugin = this.app.plugins.plugins.quickadd;
if (!qaPlugin?.api?.checkboxPrompt) {
    new Notice("缺少 QuickAdd：请在「设置 → 社区插件」安装并启用 QuickAdd，本脚本依赖其复选框。");
    return;
}
const quickaddApi = qaPlugin.api;

const items = [];
const labelToImg = new Map();
for (const el of imgs) {
    const master = ea.plugin.filesMaster.get(el.fileId);
    const path = master?.path ?? `(未知 fileId: ${el.fileId})`;
    const name = path.split("/").pop();
    let label = name;
    if (labelToImg.has(label)) label = path;
    if (labelToImg.has(label)) label = `${path} [${el.id}]`;
    items.push(label);
    labelToImg.set(label, el);
}

const selected = await quickaddApi.checkboxPrompt(items, items);
if (!selected?.length) return;

let deleted = 0;
for (const label of selected) {
    const i = labelToImg.get(label);
    if (!i) continue;

    const currentPath = ea.plugin.filesMaster.get(i.fileId)?.path;
    if (!currentPath) {
        new Notice("Can't find file for: " + label);
        continue;
    }
    const file = app.vault.getAbstractFileByPath(currentPath);
    if (!file) {
        new Notice("Can't find file: " + currentPath);
        continue;
    }

    ea.deleteViewElements([i]);
    await app.vault.adapter.trashLocal(file.path);
    deleted++;
}

await ea.addElementsToView(false, true);
await ea.getExcalidrawAPI().history.clear(); //避免撤消/重做扰乱
if (deleted) new Notice(`🗑已删除 ${deleted} 张图片`);
