let settings = ea.getScriptSettings();
//set default values on first run
if (!settings["Excalidraw Outline Path"]) {
    settings = {
        "Excalidraw Outline Path": {
            value: "Y-图形文件存储/Excalidraw图形",
            description: "Excalidraw.Outline.md和Excalidraw.Markdown.md的相对路径文件夹"
        }
    };
    ea.setScriptSettings(settings);
}
const outlineFileName = `${settings["Excalidraw Outline Path"].value}/Excalidraw.Outline.md`;

let outlineFile = app.vault.getAbstractFileByPath(outlineFileName);

let newLeaf = app.plugins.plugins["obsidian-hover-editor"].spawnPopover(undefined, () => this.app.workspace.setActiveLeaf(newLeaf, false, true));
newLeaf.openFile(outlineFile);
