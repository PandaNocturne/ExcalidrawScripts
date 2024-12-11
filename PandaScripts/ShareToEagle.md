/*
 * @Author: 熊猫别熬夜 
 * @Date: 2024-08-19 00:32:03 
 * @Last Modified by: 熊猫别熬夜
 * @Last Modified time: 2024-12-11 21:58:11
 */
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
let saveFormat = settings["saveFormat"].value;
let scale = settings["scale"].value;
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
    .setDesc(`调整导出PNG的缩放比例，取值范围为(0,10]`)
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

  new ea.obsidian.Setting(container)
    .setName(`Ob链接`)
    .setDesc(`启用或禁用Ob链接，需要Advanced URI插件`)
    .addToggle(toggle => {
      toggle
        .setValue(returnLinkEnabled) // 默认值为true
        .onChange(value => {
          returnLinkEnabled = value; // 更新data对象中的属性
        });
    });
};

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

settings["saveFormat"].value = saveFormat;
settings["scale"].value = scale;
if (saveFormat === "png") {
  data.url = await convertSvgToPng(base64, scale);
}

if (returnLinkEnabled) {
  const vaultName = app.vault.getName();
  const activeFile = app.workspace.getActiveFile();
  const ctime = await app.vault.getAbstractFileByPath(activeFile.path).stat["ctime"];
  const uidFormat = "YYYYMMDDhhmmssSSS";
  let adURI = "";
  await app.fileManager.processFrontMatter(activeFile, fm => {
    adURI = fm.uid ? fm.uid : moment(ctime).format(uidFormat);
    fm.uid = adURI;
  });
  await ea.addElementsToView();
  data.website = `obsidian://adv-uri?vault=${vaultName}&uid=${adURI}`;
}


const requestOptions = {
  method: 'POST',
  body: JSON.stringify(data),
  redirect: 'follow'
};

fetch("http://localhost:41595/api/item/addFromURL", requestOptions)
  .then(response => response.json())
  .then(result => {
    console.log(result);
    new Notice("📤已成功发送到Eagle！"); // 成功后显示通知
  })
  .catch(error => console.log('error', error));

function convertSvgToPng(base64, scale = 3) {
  return new Promise((resolve, reject) => {
    new Notice("正在转换SVG为PNG...");
    const img = new Image();
    img.src = base64;
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(function (blob) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = function () {
          resolve(reader.result); // 返回base64数据
        };
        reader.onerror = reject;
      });
    };
    img.onerror = reject;
  });
}

