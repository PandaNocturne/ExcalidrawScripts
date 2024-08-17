/*
```javascript
*/
console.log("add mermaid")

let { insertType, inputText } = await openEditPrompt();
if (!insertType) return;
if (!inputText) return;

let {elements, files} = await ExcalidrawLib.mermaidToExcalidraw(inputText, undefined, true)
if (elements && elements.length) {
    elements[0].fileId = Object.keys(files)[0]
    ea.elementsDict[elements[0].id] = elements[0]
    await ea.addElementsToView(true, false, false);
    await ea.targetView.forceSave(true);
}

// 打开文本编辑器
async function openEditPrompt(Text = "") {
    // 打开编辑窗口
    let insertType = true;
    let inputText = "";
    inputText = await utils.inputPrompt(
        "输入Mermaid内容",
        "输入Mermaid内容，ESC退出输入，Ctrl + Enter完成编辑",
        Text,
        [
            {
                caption: "取消编辑",
                action: () => {
                    insertType = false;
                    return;
                }
            },
            {
                caption: "完成编辑",
                action: () => {
                    insertType = true;
                    return;
                }
            }
        ],
        10,
        true
    );
    return { insertType, inputText };
}