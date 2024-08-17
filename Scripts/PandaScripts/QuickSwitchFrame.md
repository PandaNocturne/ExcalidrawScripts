const frameElements = ea.getViewElements().filter(el => el.type === "frame");
const choices = frameElements.map(el => el.name);
choices.sort();

let choice = "";
choice = await utils.suggester(choices, choices, "请选择要跳转的大纲");
if (!choice) return;

const selectedElement = frameElements.find(el => el.name === choice);
if (selectedElement) {
    // 执行跳转到选定元素的操作
    api = ea.getExcalidrawAPI();
    api.zoomToFit([selectedElement], 3);
}