const fs = require('fs');
let settings = ea.getScriptSettings();
// 加载默认值
if (!settings["ExcalidrawFameKanbanPath"]) {

    settings = {
        "ExcalidrawFameKanbanPath": {
            value: "Y-图形文件存储/Excalidraw/ExcalidrawFrameKanban.md",
            description: "用于存放Frame的Kanban文件的存储路径<br>ob的路径，如：Y-图形文件存储/Excalidraw/ExcalidrawFrameKanban.md"
        },
        "FameKanbanLaneWidth": {
            value: 340,
            description: "Kanban的宽度，默认值为330"
        },
    };
    ea.setScriptSettings(settings);
}
const kanbanFilePath = settings["ExcalidrawFameKanbanPath"].value;
const KanbanLaneWidth = settings["FameKanbanLaneWidth"].value;

await ea.addElementsToView(); //to ensure all images are saved into the file
const frameElements = ea.getViewElements().filter(el => el.type === "frame");
const fileName = app.workspace.getActiveFile().name;
const choices = [true, false, "sort", "open"];

const choice = await utils.suggester(choices, choices, "是否生成缩略图或者排序");
if (typeof choice === "undefined") {
    return; // 退出函数或程序
}

// ! open打开形式
if (choice === "open") {
    let KanbanFullPath = app.vault.getAbstractFileByPath(kanbanFilePath);
    const choices = ["tab", "vertical", "horizontal", "hover"];
    const choice = await utils.suggester(choices, choices, "是否生成缩略图或者排序");
    if (choice === "tab") {
        // app.workspace.activeLeaf.openFile(KanbanFullPath);
        app.workspace.getLeaf("tab").openFile(KanbanFullPath);
    } else if (choice === "vertical") {
        app.workspace.getLeaf('split', 'vertical').openFile(KanbanFullPath);

    } else if (choice === "horizontal") {
        app.workspace.getLeaf('split', 'horizontal').openFile(KanbanFullPath);

    } else if (choice === "hover") {
        let newLeaf = app.plugins.plugins["obsidian-hover-editor"].spawnPopover(undefined, () => this.app.workspace.setActiveLeaf(newLeaf, false, true));
        newLeaf.openFile(KanbanFullPath);
    }

    return;
}


// ! 依据看板(kanban)顺序来排序
if (choice === "sort") {
    // 获取库的基本路径
    const basePath = (app.vault.adapter).getBasePath();
    const frameKanbanFullPath = `${basePath}/${kanbanFilePath}`;
    // 处理
    const updatedElements = await processFile(frameElements, frameKanbanFullPath, fileName);
    let markdownFile = app.vault.getAbstractFileByPath(kanbanFilePath);
    if (markdownFile) app.vault.modify(markdownFile, updatedElements.join("\n"));
    new Notice(`♻FrameKanban已排序`, 3000);
    return;
}

// ! 由Excalidraw的Frame生成Kanban
let frameLinks = [];
if (frameElements.length >= 1) {
    frameElements.sort((a, b) => {
        // 根据 fileName 进行排序
        if (a.name < b.name) {
            return -1;
        }
        if (a.name > b.name) {
            return 1;
        }
        return 0;
    });

    for (let el of frameElements) {
        let frameLink;
        // !
        if (choice === true) {
            // frameLink = `- ⏩[[${fileName}#^frame=${el.id}|${el.name}]]<br>![[${fileName}#^frame=${el.id}]]`;
            frameLink = `- ⏩[[${fileName}#^frame=${el.id}|${el.name}]]<br>[![[${fileName}#^frame=${el.id}]]](${fileName}#^frame=${el.id})`;
        } else {
            frameLink = `- ⏩[[${fileName}#^frame=${el.id}|${el.name}]]`;
        }
        frameLinks.push(frameLink);
    }
}
const kanbanYaml = "---\n\nkanban-plugin: basic\n\n---\n\n";

const kanbanSetting = {
    "kanban-plugin": "basic",
    "lane-width": KanbanLaneWidth,
    "show-checkboxes": false,
    "archive-with-date": false
};

const kanbanEndText = `\n\n%% kanban:settings\n\`\`\`\n${JSON.stringify(kanbanSetting)}\n\`\`\`\n%%`;
const extrTexts = kanbanYaml + `## [[${fileName}]]\n\n` + frameLinks.join("\n") + kanbanEndText;

let markdownFile = app.vault.getAbstractFileByPath(kanbanFilePath);

if (markdownFile) {
    app.vault.modify(markdownFile, extrTexts);
} else {
    file = await app.vault.create(kanbanFilePath, extrTexts);
}

if (choice === true) {
    new Notice(`🖼FrameKanban已刷新`, 3000);
} else {
    new Notice(`⏩FrameKanban已刷新`, 3000);
}

return;

// 排序
async function processFile(allFrameEls, frameKanbanFullPath, fileName) {
    try {
        const data = await fs.promises.readFile(frameKanbanFullPath, 'utf8');
        const lines = data.split('\n');
        const updatedElements = [];

        const regex = new RegExp(`${fileName}#`);
        let j = 0;
        for (let i = 0; i < lines.length; i++) {

            if (regex.test(lines[i])) {
                // 匹配对应的Excalidraw链接
                let regex = /^-\s.*?\[\[(.*?\.md)#\^(\w+)=([a-zA-Z0-9-_]+)\|?(.*?)\]\].*/;
                let elLinkStyle = lines[i].match(regex)[2];
                let elID = lines[i].match(regex)[3];
                let elText = lines[i].match(regex)[4] ? lines[i].match(regex)[4] : `未定义名称`;
                console.log(`第${i}行：${elID} ${elLinkStyle} ${elText}`);

                // 满足条件的修改
                if (elLinkStyle !== 'frame') return;
                for (let selectedEl of allFrameEls) {
                    console.log(selectedEl.id);
                    if (selectedEl.id === elID) {
                        j = j + 1;
                        console.log(selectedEl.name);
                        elText = `Frame${j < 10 ? 0 : ""}${j}_${elText.replace(/Frame\d+_/, "")}`;
                        selectedEl.name = elText;
                        ea.addElementsToView();
                        lines[i] = lines[i].replace(/(^-\s.*?\[\[.*?\.md#\^\w+=[a-zA-Z0-9-_]+\|?)(.*?)(\]\].*)/, `$1${elText}$3`);
                    }
                }
            }
            updatedElements.push(lines[i]);
        }
        // console.log(updatedElements);
        return updatedElements;
    } catch (error) {
        new Notice("🔴读取文件出现错误！");
        console.error(error);
    }
}
