await ea.addElementsToView();
const api = ea.getExcalidrawAPI();

// ! text 类型
const textEls = ea.getViewSelectedElements().filter(el => el.type === "text");

if (textEls.length === 0) return;

// 选择类型
const options = ['Max Size', "Min Size", 'Custom Size'];
const option = await utils.suggester(options, options, "选择缩放类型");
if (!option) return;

// 获取最大最小值字体大小
const fontSizes = textEls.map(el => el.fontSize);
const maxSize = Math.max(...fontSizes);
const minSize = Math.min(...fontSizes);

// 根据选项更新选项
let selecSize = 0;
if (option === options[0]) {
  selecSize = maxSize;
} else if (option === options[1]) {
  selecSize = minSize;
} else if (option === options[2]) {
  selecSize = await utils.inputPrompt("缩放比例" + "[" + String(Math.round(minSize)) + "~" + String(Math.round(maxSize) + "]"), null, null);
  if (!selecSize) return;
}

// 更新字体
for (el of textEls) {
  el.fontSize = selecSize;
  ea.copyViewElementsToEAforEditing([el]);

  ea.refreshTextElementSize(el.id);
  if (el.containerId) {
    const containers = ea.getViewElements().filter(e => e.id === el.containerId);
    api.updateContainerSize(containers);
    ea.selectElementsInView(containers);
  }
}

// 保存
await ea.addElementsToView(false, true);
