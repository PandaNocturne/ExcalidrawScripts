/*
 * @Author: 熊猫别熬夜 
 * @Date: 2024-08-26 12:37:13 
 * @Last Modified by: 熊猫别熬夜
 * @Last Modified time: 2024-08-27 15:13:13
 */
let settings = ea.getScriptSettings();
if (!settings["Remove.bg API Key"]?.value) {
  // 自动打开https://www.remove.bg/zh/api#sample-code网站
  window.open("https://www.remove.bg/zh/api#sample-code", "_blank");
  const key = await utils.inputPrompt("请在 script settings 中设置Remove.bg API Key", "请在https://www.remove.bg/zh/api#sample-code中获取API Key");
  settings = {
    "Remove.bg API Key": {
      value: key || "",
      description: "请在https://www.remove.bg/zh/api#sample-code中获取API Key"
    },
  };
  ea.setScriptSettings(settings);
  return;
}

const fs = require("fs").promises;
const path = require("path");

await ea.addElementsToView();
const imgs = ea.getViewSelectedElements().filter(el => el.type === "image");
if (imgs.length === 0) {
  new Notice("No image found");

  const key = await utils.inputPrompt("Remove.bg API Key", "请在https://www.remove.bg/zh/api#sample-code中获取API Key", settings["Remove.bg API Key"].value);
  if (!key) return;

  settings = {
    "Remove.bg API Key": {
      value: key,
      description: "请在https://www.remove.bg/zh/api#sample-code中获取API Key"
    },
  };
  ea.setScriptSettings(settings);
  return;
}

const inputdata = {
  "filePath": "",
  "size": "auto",
  "type": "auto",
  "key": settings["Remove.bg API Key"].value,
  "format": "auto"
};
// 图片清晰度
const sizelist = ['auto', 'preview', 'regular', 'full'];
// 抠图类型
const typeList = ['auto', 'car', 'product', 'person', 'animal', 'graphic', 'transportation'];
const typeList2 = ['自动识别', '汽车', '物品', '人像', '动物', '图形', '交通'];

// 图片位置
const positionList = ['相邻', '相同', '替换'];
let position = positionList[0];
// 图片背景
let isbg = true;
// 配置按钮
const customControls = (container) => {
  // 添加下拉菜单选择格式
  new ea.obsidian.Setting(container)
    .setName(`大小(Size)`)
    .addDropdown(dropdown => {
      sizelist.forEach((item) => {
        dropdown.addOption(item, item);
      });
      dropdown
        .setValue(sizelist[0])
        .onChange(value => {
          inputdata.size = value;
        });
    });
  new ea.obsidian.Setting(container)
    .setName(`类型(Type)`)
    .addDropdown(dropdown => {
      typeList.forEach((item, index) => {
        dropdown.addOption(item, typeList2[index]);
      });
      dropdown
        .setValue(typeList[0])
        .onChange(value => {
          inputdata.type = typeList[typeList2.indexOf(value)];
        });
    });

  new ea.obsidian.Setting(container)
    .setName(`位置(Position)`)
    .addDropdown(dropdown => {
      positionList.forEach((item) => {
        dropdown.addOption(item, item);
      });
      dropdown
        .setValue(positionList[0])
        .onChange(value => {
          position = value;
        });
    });

  new ea.obsidian.Setting(container)
    .setName(`是否透明背景`)
    .setDesc(`设置为透明背景，否则为白底`)
    .addToggle(toggle => {
      toggle
        .setValue(isbg)
        .onChange(value => {
          isbg = value;
        });
    });
};

let isSend = false;
// 创建自定义提示框
const modal = new ea.obsidian.Modal(app);
modal.contentEl.createEl('h2', { text: 'Remove.bg - 抠图' });
customControls(modal.contentEl);
const confirmButton = modal.contentEl.createEl('button', { text: "Confirm" });
// 添加样式使按钮居右
confirmButton.style.float = 'right';
confirmButton.addEventListener('click', async () => {
  isSend = true;
  await modal.close();
});

// 确保modal关闭后判断isSend的状态
await new Promise(resolve => {
  modal.onClose = () => {
    resolve();
  };
  modal.open();
});

if (!isSend) {
  new Notice("❌removebg cancelled");
  return;
}
inputdata.format = isbg ? 'png' : 'jpg';


const notice = new Notice("🔄removebg doing......", 0); // 0 表示通知将一直显示

for (let img of imgs) {
  const imgPath = await ea.plugin.filesMaster.get(img.fileId).path;
  const file = await app.vault.getAbstractFileByPath(imgPath);
  if (!file) {
    new Notice("Can't find file: " + imgPath);
    continue;
  }
  inputdata.filePath = app.vault.adapter.getFullPath(file.path);
  console.log(inputdata);

  // img转为二进制
  const filePath = inputdata.filePath;
  const fileBuffer = await fs.readFile(filePath);
  const fileBlob = new Blob([fileBuffer]);

  // 保存removebg图
  const timestamp = window.moment().format("YYYYMMDDHHmmss");
  let newFileName = `RemoveBg-${timestamp}${path.extname(filePath)}`;
  console.log(newFileName);

  // 调用removebg API去除背景
  const rbgResultData = await removeBg(fileBlob, inputdata);

  // 图形覆盖
  if (position === positionList[2]) {
    await app.vault.adapter.write(imgPath, Buffer.from(rbgResultData));
    await new Promise((resolve) => setTimeout(resolve, 200));
    await app.commands.executeCommandById("obsidian-excalidraw-plugin:save");
    continue;
  }
  const newFilePath = path.join(path.dirname(imgPath), newFileName);
  await app.vault.adapter.write(newFilePath, Buffer.from(rbgResultData));
  await new Promise((resolve) => setTimeout(resolve, 200));

  // 获取图片在Excalidraw的位置，使removebg图位于它右侧
  let id = await ea.addImage(0, 0, newFileName);
  let el = ea.getElement(id);
  el.width = img.width;
  el.height = img.height;
  el.roundness = img.roundness;
  el.angle = img.angle;
  el.opacity = img.opacity;
  el.link = img.link;
  if (position === positionList[0]) {
    el.x = img.x + img.width + 10;
    el.y = img.y;
  } else if (position === positionList[1]) {
    el.x = img.x;
    el.y = img.y;
  }
  await ea.addElementsToView(false, true);
  await ea.moveViewElementToZIndex(el.id, 99);
}
new Notice("✅removebg done");
notice.hide(); // 操作完成后手动关闭通知

async function removeBg(blob, inputdata) {
  const formData = new FormData();
  formData.append("size", inputdata.size);
  formData.append("type", inputdata.type);
  formData.append("format", inputdata.format);
  formData.append("image_file", blob);
  try {
    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": inputdata.key },
      body: formData,
    });
    if (response.ok) {
      return await response.arrayBuffer();
    } else {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    new Notice(`❌ Error: ${error.message}`);
    notice.hide(); // 操作完成后手动关闭通知
    throw error; // 重新抛出错误以便上层代码处理
  }
};
