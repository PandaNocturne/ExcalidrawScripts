let settings = ea.getScriptSettings();
// 加载默认值
if (!settings["saveFormat"]) {
  settings["saveFormat"] = {
    "value": "svg",
    "hidden": true
  };
  ea.setScriptSettings(settings);
};
if (!settings["scale"]) {
  settings["scale"] = {
    "value": 4,
    "hidden": true
  };
  ea.setScriptSettings(settings);
};

// 获取选中元素否则为全部元素
let selectedEls = ea.getViewSelectedElements();
const allEls = ea.getViewElements();

if (selectedEls.length === 0) {
  selectedEls = allEls;
  ea.selectElementsInView(selectedEls);
}

// 如果选中元素中包含frame，则自动选择内部元素
var frameEls = [];
for (let el of selectedEls) {
  if (el.type === "frame") {
    for (let i of allEls) {
      if (i.frameId === el.id) {
        frameEls.push(i);
      }
    }
  }
}
ea.selectElementsInView([...selectedEls, ...frameEls]);

// 获取笔记的基本路径
let timestamp = window.moment().format("YYYYMMDDHHmmss");

let base64 = "";
let saveFormat = settings["saveFormat"].value;
let scale = settings["scale"].value;
// 配置按钮
const customControls = (container) => {
  // 添加下拉菜单选择格式
  new ea.obsidian.Setting(container)
    .setName(`文件格式`)
    .setDesc(`选择导出的文件格式`)
    .addDropdown(dropdown => {
      dropdown
        .addOption('svg', 'SVG')
        .addOption('png', 'PNG')
        .setValue(saveFormat) // 默认值为SVG
        .onChange(value => {
          saveFormat = value; // 更新data对象中的格式属性
        });
    });
  // 添加数值框用于调整scale，带有上下调整数字的按钮
  new ea.obsidian.Setting(container)
    .setName(`缩放比例`)
    .setDesc(`该选项只对PNG格式生效，调整缩放比例，取值范围为(0,10]`)
    .addText(text => {
      text
        .setValue(scale.toFixed(3).replace(/\.?0+$/, '')) // 默认值，最多保留3位小数
        .onChange(value => {
          let newValue = parseFloat(value);
          if (!isNaN(newValue) && newValue > 0 && newValue <= 10) {
            scale = newValue; // 更新scale值
          } else {
            // text.setValue(scale.toFixed(3).replace(/\.?0+$/, '')); // 恢复为有效值
          }
        });

      // 设置输入框宽度
      text.inputEl.style.width = '3rem';

      // 添加上下调整数字的按钮
      const incrementButton = document.createElement('button');
      incrementButton.textContent = '+';
      incrementButton.addEventListener('click', () => {
        let step = scale > 1 ? 1 : 0.1;
        let newValue = Math.min(scale + step, 10);
        scale = parseFloat(newValue.toFixed(3)); // 更新scale值并保留最多3位小数
        text.setValue(scale.toFixed(3).replace(/\.?0+$/, '')); // 更新数值框
      });

      const decrementButton = document.createElement('button');
      decrementButton.textContent = '-';
      decrementButton.addEventListener('click', () => {
        let step = scale > 1 ? 1 : 0.1;
        let newValue = Math.max(scale - step, 0.1);
        scale = parseFloat(newValue.toFixed(3)); // 更新scale值并保留最多3位小数
        text.setValue(scale.toFixed(3).replace(/\.?0+$/, '')); // 更新数值框
      });
      text.inputEl.parentElement.appendChild(decrementButton);
      text.inputEl.parentElement.appendChild(incrementButton);
    });
};

let isSend = false;
const fileName = await utils.inputPrompt(
  "文件名",
  "1111",
  `EX-${timestamp}`,
  [
    {
      caption: "Confirm",
      action: () => { isSend = true; return; }
    },
  ],
  1,
  false,
  customControls
);
if (!isSend) return;

settings["saveFormat"].value = saveFormat;
settings["scale"].value = scale;


if (saveFormat === "png") {
  ea.targetView.svg(ea.targetView.getScene(true), undefined, true).then(svg => {
    let base64 = `data:image/svg+xml;base64,${btoa(
      unescape(encodeURIComponent(svg.outerHTML.replaceAll("&nbsp;", " "))),
    )}`;

    // 将SVG转换为PNG
    const img = new Image();
    img.src = base64;
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      // 将PNG数据导出到本地文件
      canvas.toBlob(function (blob) {
        saveBlobToFile(blob, `${fileName}.png`);
      });
    };
  });
} else if (saveFormat === "svg") {
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