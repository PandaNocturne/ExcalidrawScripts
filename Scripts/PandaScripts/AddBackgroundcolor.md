
const api = ea.getExcalidrawAPI();
let padding = 5;

const elements = ea.getViewSelectedElements();

const box = ea.getBoundingBox(elements);
color = ea
    .getExcalidrawAPI()
    .getAppState()
    .currentItemStrokeColor;

ea.style.strokeColor = 'transparent';
ea.style.strokeStyle = "solid";
ea.style.backgroundColor = "#ffec99";

ea.style.fillStyle = 'solid';
ea.style.roughness = 0;
ea.style.strokeWidth = 0;

let id = await ea.addRect(
    box.topX - padding,
    box.topY - padding,
    box.width + 2 * padding,
    box.height + 2 * padding
);
let el = ea.getElement(id);

ea.copyViewElementsToEAforEditing(elements);
ea.addToGroup([id].concat(elements.map((el) => el.id)));

await ea.addElementsToView(false, false);
// await ea.moveViewElementToZIndex(el.id, 90);


// 加高亮区
// const api = ea.getExcalidrawAPI();
// const selectedEl = ea.getViewSelectedElement();
// ids = [selectedEl.id]
// let canvas = document.getElementsByTagName("canvas")[0];
// const ctx = canvas.getContext("2d");

// ctx.save()
// ctx.font = ExcalidrawLib.getFontString(selectedEl)
// let text_lines = selectedEl.text.split("\n")
// let max_width = 0
// for (j = 0; j < text_lines.length; j++) {
//     let text_splited = text_lines[j].split("==")
//     selectedEl.originalText = selectedEl.rawText = selectedEl.text = selectedEl.text.replaceAll("==", "")

//     let sum = 0
//     for (var i = 0; i < text_splited.length; i++) {
//         const width = ctx.measureText(text_splited[i]).width;

//         if (i % 2 != 0) {
//             ea.style.strokeColor = 'transparent';
//             ea.style.strokeStyle = "solid";
//             ea.style.backgroundColor = "#ffec99";

//             ea.style.fillStyle = 'solid';
//             ea.style.roughness = 0;
//             ea.style.strokeWidth = 0;
//             let height = selectedEl.height / text_lines.length
//             id = ea.addRect(selectedEl.x + sum - 2, selectedEl.y + j * height, width + 4, height)
//             ids.push(id)
//         }
//         sum += width;
//     }

//     if (sum > max_width) {
//         max_width = sum
//     }
// }
// ctx.restore()
// ea.copyViewElementsToEAforEditing([selectedEl]);
// ea.addToGroup(ids)
// ea.addElementsToView();