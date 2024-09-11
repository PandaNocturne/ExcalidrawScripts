let settings = ea.getScriptSettings();
// 加载默认值
if (!settings["saveFormat"]?.value) {
  settings["saveFormat"] = {
    "value": "svg",
    "hidden": true
  };
  ea.setScriptSettings(settings);
};
if (!settings["scale"]?.value) {
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
let timestamp = window.moment().format("YYMMDDHHmmss");

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
let isCopyAsWiki = false;
let isCopy = false;
const fileName = await utils.inputPrompt(
  "文件名",
  "1111",
  `EX-${timestamp}`,
  [
    {
      caption: "Copy to Clipboard",
      action: () => { isCopy = isSend = true; return; }
    },
    {
      caption: "Copy as WiKi",
      action: () => { isCopyAsWiki = isSend = true; return; }
    },
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
saveFormat=(!isCopy) ? saveFormat: "png"; 
settings["scale"].value = scale;
ea.setScriptSettings(settings);

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
      canvas.toBlob(async function (blob) {
        if (isCopy) {
          await copyImageToClipboard(blob); // 复制图像到剪贴板
        } else {
          saveBlobToFile(blob, `${fileName}.png`, isCopyAsWiki);
        }
      });
    };
  });
} else if (saveFormat === "svg") {
  // 保存为SVG文件
  ea.targetView.svg(ea.targetView.getScene(true), undefined, true).then(svg => {
    // 将SVG数据导出到本地文件
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    saveBlobToFile(blob, `${fileName}.svg`, isCopyAsWiki);
  });
}

// 将Blob对象保存为文件
async function saveBlobToFile(blob, fileName, bool = false) {
  // 如果是复制操作，保存到默认路径
  if (bool) {
    // 获取库的基本路径
    const basePath = (app.vault.adapter).getBasePath();
    // 附件路径
    const assetsPath = await app.vault.config.attachmentFolderPath;
    copyToClipboard(`![[${fileName}]]`);
    const filePath = `${assetsPath}/${fileName}`;
    console.log(filePath);
    // const file = new File([blob], filePath, { type: blob.type });
    const arrayBuffer = await blob.arrayBuffer(); // 将Blob转换为ArrayBuffer
    await app.vault.adapter.writeBinary(filePath, arrayBuffer); // 将ArrayBuffer写入本地文件
    return;
  }
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';
  const url = window.URL.createObjectURL(blob);
  a.href = url;

  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}

function copyToClipboard(extrTexts) {
  const txtArea = document.createElement('textarea');
  txtArea.value = extrTexts;
  document.body.appendChild(txtArea);
  txtArea.select();
  if (document.execCommand('copy')) {
    console.log('copy to clipboard.');
    new Notice("Image WiKi Copy to clipboard.");
  } else {
    console.log('fail to copy.');
  }
  document.body.removeChild(txtArea);
}

// 复制图像到剪贴板
async function copyImageToClipboard(blob) {
  try {
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
    new Notice("Image copied to clipboard.");
  } catch (err) {
    console.error('Failed to copy image: ', err);
  }
}