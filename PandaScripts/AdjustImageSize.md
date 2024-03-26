/*
 * @Author: 熊猫别熬夜 
 * @Date: 2024-01-31 13:00:21 
 * @Last Modified by: 熊猫别熬夜
 * @Last Modified time: 2024-03-25 14:41:10
 */

// 获取选中的元素
const selectedEls = ea.getViewSelectedElements().filter(el => el.type === "frame" || "image" || "rectangle" || "ellipse");
const scalingTypes = ['等高缩放', "等宽缩放", '完全相等'];
const inputScalingType = await utils.suggester(scalingTypes, scalingTypes, "选择缩放类型");
if (!inputScalingType) return;

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

if (inputScalingType === "等宽缩放") {
    // 等宽缩放
    for (let selectedEl of selectedEls) {
        let rario = width / selectedEl.width;
        selectedEl.width = width;
        selectedEl.height *= rario;
    }

} else if (inputScalingType === "等高缩放") {
    // 等高缩放
    for (let selectedEl of selectedEls) {
        let rario = height / selectedEl.height;
        selectedEl.width *= rario;
        selectedEl.height = height;
    }

} else if (inputScalingType === "完全相等") {
    // 完全相等
    for (let selectedEl of selectedEls) {
        selectedEl.width = width;
        selectedEl.height = height;
    }
}

// 完成编辑
ea.copyViewElementsToEAforEditing(selectedEls);
ea.addElementsToView();
