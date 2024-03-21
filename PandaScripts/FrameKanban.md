const fs = require('fs');
const activefile = app.workspace.getActiveFile();
let settings = ea.getScriptSettings();
// 加载默认值
if (!settings["动态Kanban.md的路径"]) {

    settings = {
        "动态Kanban.md的路径": {
            value: "Excalidraw/Excalidraw.Kanban.md",
            description: "用于存放Frame的Kanban文件的存储路径<br>ob的路径，如：Excalidraw/Excalidraw.Kanban.md"
        },
        "Kanban的宽度": {
            value: 340,
            description: "Kanban的宽度，默认值为330"
        },
        "缩略图是否带连接": {
            value: false,
            description: "如带连接，则单击缩略图即可跳转"
        },
    };
    ea.setScriptSettings(settings);
}
const kanbanFilePath = settings["动态Kanban.md的路径"].value;
const KanbanPath = app.vault.getAbstractFileByPath(kanbanFilePath);
const kanbanFullPath = app.vault.adapter.getFullPath(kanbanFilePath);

await ea.addElementsToView();

const frameElements = ea.getViewElements().filter(el => el.type === "frame");
const fileName = app.workspace.getActiveFile().name;
const choices = ["生成Frame卡片(有缩略图)", "生成Frame大纲(无缩略图)", "对Frame进行排序", "打开Kanban文件", "重设Kanban宽度"];

// ! 如果选择了一个或多个frame元素，则不弹出选项框，直接诶生成生成Frame大纲
const selectedTextElements = ea.getViewSelectedElements().filter(el => el.type === "frame");
let choice = "";
if (selectedTextElements.length >= 1) {
    choice = choices[1];
} else {
    choice = await utils.suggester(choices, choices, "是否生成缩略图或者排序");
}

// let choice = "";
// choice = await utils.suggester(choices, choices, "是否生成缩略图或者排序");

if (typeof choice === "undefined") {
    return; // 退出函数或程序
}

// ! 设置看板宽度
let kanbanWidth = settings["Kanban的宽度"].value;
if (choice === choices[4]) {
    kanbanWidth = await utils.inputPrompt("请设置看板宽度", "请设置看板宽度。注意为数值型", kanbanWidth, 1);
    settings["Kanban的宽度"].value = kanbanWidth;
    ea.setScriptSettings(settings);
    choice = choices[1];
}

// ! open打开形式
const comm = str => app.commands.executeCommandById(str);
if (choice === choices[3]) {
    const choices = ["新标签页", "垂直标签页", "水平标签页", "悬浮标签页，需要安装Hover插件"];
    const choice = await utils.suggester(choices, choices, "是否生成缩略图或者排序");
    if (choice === choices[0]) {
        // app.workspace.activeLeaf.openFile(KanbanFullPath);
        app.workspace.getLeaf("tab").openFile(KanbanPath);
        // 2024-03-21_21:09：添加自动锁定
        setTimeout(() => {
            comm("workspace:toggle-pin");
        }, 100);
    } else if (choice === choices[1]) {
        app.workspace.getLeaf('split', 'vertical').openFile(KanbanPath);


        // 2024-03-21_20:57:41 添加自动调整界面布局宽度
        const setPanel = percent => {
            let right = document.querySelector('.workspace-split.mod-vertical.mod-root').lastElementChild;
            right.previousSibling.style.flexGrow = percent;
            right.style.flexGrow = 100 - percent;
        };
        setTimeout(() => {
            setPanel(75); // 50、80
            comm('editor:focus-right');
            comm("workspace:toggle-pin");
        }, 150);
    } else if (choice === choices[2]) {
        app.workspace.getLeaf('split', 'horizontal').openFile(KanbanPath);

    } else if (choice === choices[3]) {
        let newLeaf = app.plugins.plugins["obsidian-hover-editor"].spawnPopover(undefined, () => this.app.workspace.setActiveLeaf(newLeaf, false, true));
        newLeaf.openFile(KanbanPath);

        // 2024-03-21_21:09：添加自动锁定
        setTimeout(() => {
            comm("workspace:toggle-pin");
        }, 100);
    }
    return;
}


// ! 依据看板(kanban)顺序来排序
if (choice === choices[2]) {
    const updatedElements = await processFile(frameElements, kanbanFullPath, fileName);

    let markdownFile = app.vault.getAbstractFileByPath(kanbanFilePath);
    if (markdownFile) app.vault.modify(markdownFile, updatedElements.join("\n"));
    new Notice(`♻FrameKanban已排序`, 3000);

    // ! 给aliaes添加所有Frame的名称
    const allFrameElements = ea.getViewElements().filter(el => el.type === "frame");
    await app.fileManager.processFrontMatter(activefile, fm => {
        fm.aliases = [];
        for (el of allFrameElements) {
            fm.aliases.push(el.name);
        }
    });
    await ea.addElementsToView();

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
        if (choice === choices[0]) {
            if (settings["缩略图是否带连接"].value) {
                frameLink = `- [ ] [[${fileName}#^frame=${el.id}|${el.name}]]<br>[![[${fileName}#^frame=${el.id}]]](${fileName}#^frame=${el.id})`;
            } else {
                frameLink = `- [ ] [[${fileName}#^frame=${el.id}|${el.name}]]<br>![[${fileName}#^frame=${el.id}]]`;
            }
        } else if (choice === choices[1]) {
            frameLink = `- [ ] [[${fileName}#^frame=${el.id}|${el.name}]]`;
        }
        frameLinks.push(frameLink);
    }
}
const kanbanYaml = "---\n\nkanban-plugin: basic\n\n---\n\n";

const kanbanSetting = {
    "kanban-plugin": "basic",
    "lane-width": kanbanWidth,
    "show-checkboxes": false,
    "archive-with-date": false
};

const kanbanEndText = `\n\n%% kanban:settings\n\`\`\`\n${JSON.stringify(kanbanSetting)}\n\`\`\`\n%%`;
const extrTexts = kanbanYaml + `## [[${fileName.replace(".md", "")}]]\n\n` + frameLinks.join("\n") + kanbanEndText;

if (KanbanPath) {
    app.vault.modify(KanbanPath, extrTexts);
} else {
    file = await app.vault.create(kanbanFilePath, extrTexts);
}

if (choice === choices[0]) {
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

        const regex = new RegExp(`\\[\\[${fileName}\\#(\\^frame).*\\]\\]`);;
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
                        lines[i] = lines[i].replace(/(^-\s.*?\[\[.*?\.md#\^\w+=[a-zA-Z0-9-_]+\|?)(.*?)(\]\].*)/, `$1${elText}$3`);
                    }
                }
            }
            ea.copyViewElementsToEAforEditing(allFrameEls);
            ea.addElementsToView();
            updatedElements.push(lines[i]);
        }
        // console.log(updatedElements);
        return updatedElements;
    } catch (error) {
        new Notice("🔴读取文件出现错误！");
        console.error(error);
    }
}
