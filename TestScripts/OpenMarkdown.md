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

const markdownFileName = `${settings["Excalidraw Outline Path"].value}/Excalidraw.Markdown.md`;

let mdFileName = await ea.targetView.file.path.replace('.md', `.markdown.md`)
let markdownFile2 = app.vault.getAbstractFileByPath(mdFileName);

let outlineFile = '';
let openFile = null;
if (markdownFile2) openFile = confirm("检测已存在线型笔记，是否打开？");

if (openFile) {
    outlineFile = app.vault.getAbstractFileByPath(mdFileName);
} else {

    outlineFile = app.vault.getAbstractFileByPath(markdownFileName);
}

ea.openFileInNewOrAdjacentLeaf(outlineFile);