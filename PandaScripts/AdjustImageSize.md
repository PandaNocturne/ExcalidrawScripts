/*
 * @Author: 熊猫别熬夜 
 * @Date: 2024-01-31 13:00:21 
 * @Last Modified by: 熊猫别熬夜
 * @Last Modified time: 2024-08-21 20:45:40
 */
await ea.addElementsToView();
// 获取选中的元素
const selectedEls = ea.getViewSelectedElements().filter(el => el.type === "image");
const options = ['等高缩放', "等宽缩放", '等比缩放'];
const option = await utils.suggester(options, options, "选择缩放类型");
if (!option) return;

if (option === options[2]) {
    let scaleRatio = await utils.inputPrompt("缩放比例", null, "1");
    if (!scaleRatio) return;

    for (let selectedEl of selectedEls) {
        selectedEl.width = selectedEl.width * scaleRatio; // 应用缩放倍数
        selectedEl.height = selectedEl.height * scaleRatio; // 应用缩放倍数
    }
    // 完成编辑
    ea.copyViewElementsToEAforEditing(selectedEls);
    ea.addElementsToView();
    return;
} else {
    const maxMin = ['Max', 'Min'];
    const inputMaxMin = await utils.suggester(maxMin, maxMin, "选择等比对象？");
    if (!inputMaxMin) return;

    // 获取所有高度和宽度
    let width, height;
    const widths = selectedEls.map(el => el.width);
    const heights = selectedEls.map(el => el.height);

    if (inputMaxMin == 'Max') {
        width = Math.max(...widths);
        height = Math.max(...heights);
    } else if (inputMaxMin == 'Min') {
        width = Math.min(...widths);
        height = Math.min(...heights);
    }

    if (option === options[1]) {
        // 等宽缩放
        for (let selectedEl of selectedEls) {
            let rario = width / selectedEl.width;
            selectedEl.width = width;
            selectedEl.height *= rario;
        }

    } else if (option === options[0]) {
        // 等高缩放
        for (let selectedEl of selectedEls) {
            let rario = height / selectedEl.height;
            selectedEl.width *= rario;
            selectedEl.height = height;
        }

    }

    // 完成编辑
    await ea.copyViewElementsToEAforEditing(selectedEls);
    await ea.addElementsToView();
}

