// 获取选中元素否则为全部元素
let elements = ea.getViewSelectedElements();
const allEls = ea.getViewElements();

if (elements.length === 0) {
    elements = allEls;
    ea.selectElementsInView(elements);
}

// 如果选中元素中包含frame，则自动选择内部元素
var frameEls = [];
for (let el of elements) {
    if (el.type === "frame") {
        for (let i of allEls) {
            if (i.frameId === el.id) {
                frameEls.push(i);
            }
        }
    }
}
ea.selectElementsInView([...elements, ...frameEls]);

// 获取笔记的基本路径
const basename = app.workspace.getActiveFile().basename;
let date = window.moment().format("YYYYMMDDHHmmss");

let base64 = "";
await ea.targetView.svg(ea.targetView.getScene(true), undefined, true).then(svg => {
    base64 = `data:image/svg+xml;base64,${btoa(
        unescape(encodeURIComponent(svg.outerHTML)),
    )}`;
});

// =========== 配置 =========== //
const data = {
    "url": base64,
    "name": `EX-${date}`,
    "website": "",
    "tags": ["Excalidraw→Eagle"],
    "annotation": "",
    "folderId": "" // 图片将会添加到指定文件夹的Eagle的FolderID
};
let returnLinkEnabled = true;
// 配置按钮
const customControls = (container) => {
    new ea.obsidian.Setting(container)
        .setName(`SVG名称`)
        .addText(text => {
            text
                .setValue(data.name)
                .onChange(value => {
                    data.name = value;
                });
        });
    new ea.obsidian.Setting(container)
        .setName(`Eagle标签`)
        .setDesc(`用英文逗号(,)分隔标签`) // 添加描述
        .addText(text => {
            text
                .setValue(data.tags.join(',')) // 数组转逗号分隔的字符串
                .onChange(value => {
                    data.tags = value.split(','); // 逗号分隔的字符串转数组
                });
        });
    new ea.obsidian.Setting(container)
        .setName(`返回链接`)
        .setDesc(`启用或禁用Ob链接，需要Advanced URI插件`)
        .addToggle(toggle => {
            toggle
                .setValue(returnLinkEnabled) // 默认值为true
                .onChange(value => {
                    returnLinkEnabled = value; // 更新data对象中的属性

                });
        });

};

if (returnLinkEnabled) {
    const vaultName = app.vault.getName();
    const activeFile = app.workspace.getActiveFile();
    const ctime = await app.vault.getAbstractFileByPath(activeFile.path).stat["ctime"];
    const uidFormat = "YYYYMMDDhhmmssSSS";
    let adURI = "";
    await app.fileManager.processFrontMatter(activeFile, fm => {
        adURI = fm.uid ? fm.uid : moment(ctime).format(uidFormat);
        fm.uid = moment(ctime).format(uidFormat);
    });
    await ea.addElementsToView();
    data.website = `obsidian://advanced-uri?vault=${vaultName}&uid=${adURI}`;
}

let isSend = false;
data.annotation = await utils.inputPrompt(
    "导入Eagle的注释",
    "发送至Eagle的SVG的注释",
    "",
    [
        {
            caption: "Confirm",
            action: () => { isSend = true; return; }
        },
    ],
    5,
    false,
    customControls
);
if (!isSend) return;


const requestOptions = {
    method: 'POST',
    body: JSON.stringify(data),
    redirect: 'follow'
};

let response;
fetch("http://localhost:41595/api/item/addFromURL", requestOptions)
    .then(response => response.json())
    .then(result => console.log(result))
    .catch(error => console.log('error', error));

