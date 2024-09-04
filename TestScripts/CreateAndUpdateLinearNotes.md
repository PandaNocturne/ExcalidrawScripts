let settings = ea.getScriptSettings();
//set default values on first run
if (!settings["Excalidraw Outline Path"]) {
    settings = {
        "Excalidraw OutLine Yaml": {
            value: "---\ncssclasses:\n  - Excalidraw-Markdown\n---\n\n",
            height: "250px",
            description: "设定线型大纲开始区域，主要用于设定Yaml"
        }
    };
    ea.setScriptSettings(settings);
}

// 获取库的基本路径
const basePath = (app.vault.adapter).getBasePath()

// 获取笔记的基本路径和笔记名
const filePath = await ea.targetView.file.path;
const path = require('path');

let mdFileName = filePath.replace('.md', `.markdown.md`);
const mdFileBaseName = path.basename(mdFileName);
let markdownFile = app.vault.getAbstractFileByPath(mdFileName);

if (markdownFile) {
    new Notice(`✅Excalidraw线型文档已存在`, 1000);
} else {
    let confirmCreat = confirm(`❗确认生成线型笔记：\n\n${mdFileBaseName}`);
    if (confirmCreat) {
        let fileAbsPath = `${basePath}/${mdFileName}`;
        const fs = require('fs');
        fs.writeFile(fileAbsPath, "", (err) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log('文件创建成功');
        });
        // file = await app.vault.create(mdFileName,""); // Ob自带的创建有点卡
        new Notice(`✅Excalidraw线型文档已建立`, 1000)
    }
}

