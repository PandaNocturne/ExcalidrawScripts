/*

```javascript
*/
const eaApi = ExcalidrawAutomate;
let settings = ea.getScriptSettings();
if (!settings["notebooksPath"]) settings["notebooksPath"] = { value: false };
if (!settings["notebooksPath"].value) {
    new Notice("🔴请配置相关设置！", 2000);
    settings = {
        "notebooksPath": {
            value: "",
            description: "BookxNotePro的笔记数据目录<br>🔴注意路径符号需要转义"
        },
        "copyBookxnoteImageToObsidian": {
            value: true,
            description: "是否复制Bookxnote的图片到Obsidian库内<br>🔴注意路径符号需要转义<br>🍀注：如果图片本身就存在于库内就可以关闭该选项"
        },
        "notebooksImagesPath": {
            value: "BookxNotesImages",
            description: "Obsidian文件夹，用于存放Bookxnote复制过来的标注图片，请用相对于库的路径"
        },
    };
    ea.setScriptSettings(settings);
} else {
    new Notice("✅BookxnoteproToExcalidraw脚本已启动！");
}

// let api = ea.getExcalidrawAPI();
const fs = require('fs');
// const path = require('path');

// 获取bookxnotePro的笔记数据文件夹
const notebookFolder = `${settings["notebooksPath"].value}/notebooks`;

// 获取notebooksImages的存储路径
const basePath = (app.vault.adapter).getBasePath();
const notebooksImagesPath = `${basePath}/${settings["notebooksImagesPath"].value}`;

// 读取manifest.json数据
const notebooksData = `${notebookFolder}/manifest.json`;

const notebooksJson = JSON.parse(fs.readFileSync(notebooksData, 'utf8'));
// console.log(notebooksJson)

// 添加选择是否匹配颜色
let InsertStyle;
const fillStyles = ["文字", "背景"];
InsertStyle = await utils.suggester(fillStyles, fillStyles, "选择插入卡片颜色的形式，ESC则为白底黑字)");

eaApi.onPasteHook = async function ({ ea,
    payload,
    event,
    excalidrawFile,
    view,
    pointerPosition
}) {
    console.log("onPaste");
    event.preventDefault();
    const backlink = payload.text;
    console.log(payload.text);
    if (payload?.text?.startsWith('bookxnotepro://opennote')) {
        console.log("匹配成功");
        // 清空原本投入的文本
        event.stopPropagation();
        payload.text = "";
        ea.clear();
        ea.style.fillStyle = 'solid';
        ea.style.roughness = 0;
        // ea.style.roundness = { type: 3 }; // 圆角
        ea.style.strokeWidth = 2;
        ea.style.fontFamily = 4;
        ea.style.fontSize = 20;

        // 匹配外部回链对应的信息
        const { nb, book, uuid } = matchBookxnoteProRegex(backlink);
        console.log({ nb, book, uuid });

        // 通过nb找到对应的书本信息
        const notebooks = findNotebooksById(notebooksJson, nb);
        console.log(notebooks);

        // 获取当前书籍的markups.json文件：
        const booknoteMarkupsPath = `${notebookFolder}/${notebooks.entry}/markups.json`;
        console.log(booknoteMarkupsPath);
        const markupsJson = JSON.parse(fs.readFileSync(booknoteMarkupsPath, 'utf8'));
        // console.log(markupsJson)

        // 获取连接的标注信息
        const markupData = findMarkupsByUuid(markupsJson, uuid);
        // console.log(markupData?.originaltext);

        if (markupData?.imgfile) {
            console.log("图片标注");
            const imgfilePath = `${notebookFolder}/${notebooks.entry}/imgfiles/${markupData.imgfile}`;
            let imgName;
            // 复制图片到Obsidian的笔记库
            if (settings["copyBookxnoteImageToObsidian"].value) {
                imgName = `bxn_${markupData.imgfile}`;
                // 检查文件夹是否存在
                if (!fs.existsSync(notebooksImagesPath)) {
                    // 创建文件夹
                    fs.mkdirSync(notebooksImagesPath);
                    new Notice(`图片文件不存在，已创建文件夹：<br>${notebooksImagesPath}`, 3000);

                } else {
                    console.log('文件夹已存在');
                }
                fs.copyFileSync(imgfilePath, `${notebooksImagesPath}/${imgName}`);
                await new Promise((resolve) => setTimeout(resolve, 200)); // 暂停0.2秒，等待复制文件的过程
            } else {
                imgName = `${markupData.imgfile}`;
            }

            let id = await ea.addImage(0, 0, imgName);
            let el = ea.getElement(id);
            el.link = backlink;
            ea.setView("active");
            await ea.addElementsToView(true, false, false);
        } else if (markupData?.originaltext) {
            console.log("文字标注");

            const fillcolor = `#${markupData.fillcolor.slice(2)}`;

            if (InsertStyle == "背景") {
                ea.style.backgroundColor = fillcolor;
                ea.style.strokeColor = "#1e1e1e";
            } else if (InsertStyle == "文字") {
                ea.style.backgroundColor = "#ffffff";
                ea.style.strokeColor = fillcolor;
            } else {
                ea.style.backgroundColor = "transparent";
                ea.style.strokeColor = "#1e1e1e";
            }

            const markupText = processText(markupData.originaltext);
            console.log(markupText);
            let id = await ea.addText(0, 0, `${markupText}`, { width: 600, box: true, wrapAt: 90, textAlign: "left", textVerticalAlign: "middle", box: "box" });
            let el = ea.getElement(id);
            el.link = backlink;
            ea.setView("active");
            await ea.addElementsToView(true, false, false);
        } else {
            new Notice("未匹配到标注信息，请重新标注或者手动插入");
        }

        return false;
    }
    // return true;
};

function matchBookxnoteProRegex(backlink) {
    const regex = /nb=({[0-9a-z\-]+})&book=([0-9a-z\-]+).*&uuid=([0-9a-z\-]+)/;

    const matches = backlink.match(regex);
    if (matches) {
        const nb = matches[1];
        const book = matches[2];
        const uuid = matches[3];
        return { nb, book, uuid };
    } else {
        return null;
    }
}

function findNotebooksById(obj, id) {
    if (obj.notebooks && obj.notebooks.length > 0) {
        for (let i = 0; i < obj.notebooks.length; i++) {
            if (obj.notebooks[i].id === id) {
                return obj.notebooks[i];
            } else {
                const result = findNotebooksById(obj.notebooks[i], id);
                if (result) {
                    return result;
                }
            }
        }
    }
    return null;
}

function findMarkupsByUuid(obj, uuid) {
    if (Array.isArray(obj.markups)) {
        for (let i = 0; i < obj.markups.length; i++) {
            if (obj.markups[i].uuid === uuid) {
                return obj.markups[i];
            }
            const markupData = findMarkupsByUuid(obj.markups[i], uuid);
            if (markupData) {
                return markupData;
            }
        }
    }

    return null;
}

function processText(text) {
    // 替换特殊空格为普通空格
    text = text.replace(/[\ue5d2\u00a0\u2007\u202F\u3000\u314F\u316D\ue5cf]/g, ' ');
    // 将全角字符转换为半角字符
    text = text.replace(/[\uFF01-\uFF5E]/g, function (match) { return String.fromCharCode(match.charCodeAt(0) - 65248); });
    // 替换英文之间的多个空格为一个空格
    text = text.replace(/([a-zA-Z])([\u4e00-\u9fa5])/g, '$1 $2');

    // 删除中文之间的空格
    text = text.replace(/([0-9\.\u4e00-\u9fa5])\s+([0-9\.\u4e00-\u9fa5])/g, '$1$2');
    text = text.replace(/([0-9\.\u4e00-\u9fa5])\s+([0-9\.\u4e00-\u9fa5])/g, '$1$2');
    text = text.replace(/([\u4e00-\u9fa5])\s+/g, '$1');
    text = text.replace(/\s+([\u4e00-\u9fa5])/g, '$1');

    // // 在中英文之间添加空格
    // text = text.replace(/([\u4e00-\u9fa5])([a-zA-Z])/g, '$1 $2');
    // text = text.replace(/([a-zA-Z])([\u4e00-\u9fa5])/g, '$1 $2');

    return text;
}