/*
 * @Author: 熊猫别熬夜 
 * @Date: 2024-04-01 21:32:26 
 * @Last Modified by: 熊猫别熬夜
 * @Last Modified time: 2024-04-26 16:52:18
 */

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
const date = window.moment().format("YYYY-MM-DD_HHmmss");
const fileName = `${basename.replace("\.excalidraw", "")}-${date}`;

const choices = ["保存为PNG格式", "保存为SVG格式"];
const choice = await utils.suggester(choices, choices, "请选择要保存的格式");
if (!choice) return;
if (choice === choices[0]) {
  ea.targetView.svg(ea.targetView.getScene(true), undefined, true).then(svg => {
    let base64 = `data:image/svg+xml;base64,${btoa(
      unescape(encodeURIComponent(svg.outerHTML.replaceAll("&nbsp;", " "))),
    )}`;

    // 将SVG转换为PNG
    const img = new Image();
    img.src = base64;
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      // 将PNG数据导出到本地文件
      canvas.toBlob(function (blob) {
        saveBlobToFile(blob, `${fileName}.png`);
      });
    };
  });
} else if (choice === choices[1]) {
  // 保存为SVG文件
  ea.targetView.svg(ea.targetView.getScene(true), undefined, true).then(svg => {
    // 将SVG数据导出到本地文件
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    saveBlobToFile(blob, `${fileName}.svg`);
  });
}


// 将Blob对象保存为文件
function saveBlobToFile(blob, fileName) {
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';
  const url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}