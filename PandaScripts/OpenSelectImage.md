/*
 * @Author: 熊猫别熬夜 
 * @Date: 2024-03-11 23:41:55 
 * @Last Modified by: 熊猫别熬夜
 * @Last Modified time: 2024-03-28 23:34:32
 */

await ea.addElementsToView();
const { exec } = require('child_process');

// 设置 quickerInsetNote 模板设置
let settings = ea.getScriptSettings();
//set default values on first run
if (!settings["OpenSelectImage"]?.value) {
  settings = {
    "OpenSelectImage": {
      value: "D:\\FastStone Image Viewer\\FSViewer.exe\nD:\\Drawio\\draw.io\\draw.io.exe",
      height: "250px",
      description: "其他默认图片编辑软件的系统绝对路径，以换行分隔"
    },
  };
  ea.setScriptSettings(settings);
}

let choices = settings["OpenSelectImage"].value.split("\n").map(i => i.trim());
const choices0 = ["🖼默认应用", "🗑删除图片", "⚙修改设置", "📂打开文件夹", "🎭图片重命名"];

const img = ea.getViewSelectedElements().filter(el => el.type === "image");

// 若无选择图片
if (img.length === 0) {
  let input = await utils.inputPrompt("设置外部软件，绝对路径", "其他默认图片编辑软件的系统绝对路径，以换行分隔", settings["OpenSelectImage"].value, null, 10);
  if (!input) return;
  settings["OpenSelectImage"].value = input;
  ea.setScriptSettings(settings);
  return;
}
const allChoices = [...choices0, ...choices];
const choice = await utils.suggester([...choices0, ...choices.map(i => "⚡" + i.split("\\").at(-1).replace("\.exe", ""))], allChoices, "图片打开的方式");
if (!choice) return;

if (choice === choices[2]) {
  let input = await utils.inputPrompt("设置外部软件，绝对路径", "其他默认图片编辑软件的系统绝对路径，以换行分隔", settings["OpenSelectImage"].value, null, 10);
  if (!input) return;
  settings["OpenSelectImage"].value = input;
  ea.setScriptSettings(settings);
  choice = choices[1];
  return;
}


for (i of img) {
  const currentPath = ea.plugin.filesMaster.get(i.fileId).path;
  const file = app.vault.getAbstractFileByPath(currentPath);
  if (!file) {
    new Notice("Can't find file: " + currentPath);
    continue;
  }

  const filePath = file.path;
  if (choice === allChoices[0]) {
    // 用默认应用打开
    app.openWithDefaultApp(filePath);
  } else if (choice === allChoices[1]) {
    // const quickaddApi = this.app.plugins.plugins.quickadd.api;
    // const isConfirm = await quickaddApi.yesNoPrompt("是否删除本地文件", filePath);
    const isConfirm = true;
    if (!isConfirm) {
      new Notice("已取消删除");
    } else {
      // 删除元素
      ea.deleteViewElements([i]);
      // 删除文件
      await(app.vault.adapter).trashLocal(filePath);
      new Notice("🗑删除成功");
    }
  } else if (choice === allChoices[3]) {
    // 使用打开当前笔记文件夹
    app.showInFolder(filePath);
  } else if (choice === allChoices[4]) {
    // 图片重命名
    const pathNoExtension = file.path.substring(0, file.path.length - file.extension.length - 1);
    const newPath = await utils.inputPrompt("移动或重命名图片", "file path", pathNoExtension);
    if (newPath && newPath !== pathNoExtension) {
      await app.fileManager.renameFile(file, `${newPath}.${file.extension}`);
      new Notice("✅图片已重命名");
    }
  } else {
    // 获取库的基本路径
    const fileBasePath = file.vault.adapter.basePath;
    // 获取文件的完整路径
    const fileFullPath = `${fileBasePath}/${filePath}`;
    exec(`"${choice}" "${fileFullPath}"`, (error, stdout, stderr) => {
      new Notice(`File opened with ${choice}`);
    });
  }
}
await ea.addElementsToView(false, true);
await ea.getExcalidrawAPI().history.clear(); //避免撤消/重做扰乱
