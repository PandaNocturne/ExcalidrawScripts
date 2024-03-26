/*
 * @Author: 熊猫别熬夜 
 * @Date: 2024-03-11 23:41:55 
 * @Last Modified by: 熊猫别熬夜
 * @Last Modified time: 2024-03-26 12:02:13
 */

await ea.addElementsToView();
const { exec } = require('child_process');

// 设置 quickerInsetNote 模板设置
let settings = ea.getScriptSettings();
//set default values on first run
if (!settings["OpenSelectImage"]) {
  settings = {
    "OpenSelectImage": {
      value: "D:\\FastStone Image Viewer\\FSViewer.exe",
      height: "250px",
      description: "其他默认图片编辑软件路径，以换行分隔"
    },
  };
  ea.setScriptSettings(settings);
}

const img = ea.getViewSelectedElements().filter(el => el.type === "image");
if (img.length === 0) {
  new Notice("No image is selected");
  return;
}

let choices = settings["OpenSelectImage"].value.split("\n");
choices.unshift("默认应用", "打开文件夹", "删除图片");
const choice = await utils.suggester(choices.map(i => i.split("\\").at(-1).replace("\.exe", "")), choices, "图片打开的方式");
if (!choice) return;

for (i of img) {
  const currentPath = ea.plugin.filesMaster.get(i.fileId).path;
  const file = app.vault.getAbstractFileByPath(currentPath);
  if (!file) {
    new Notice("Can't find file: " + currentPath);
    continue;
  }

  const filePath = file.path;
  if (choice === choices[0]) {
    // 用默认应用打开
    app.openWithDefaultApp(filePath);
  } else if (choice === choices[1]) {
    // 使用打开当前笔记文件夹
    app.showInFolder(filePath);
  } else if (choice === choices[2]) {
    const isConfirm = confirm(`是否删除 ${filePath}`);
    if (!isConfirm) {
      new Notice("已取消删除");
    } else {
      // 删除元素
      ea.deleteViewElements([i]);
      // 删除文件
      await(app.vault.adapter).trashLocal(filePath);
      new Notice("删除成功");
    }
  } else {
    // 获取库的基本路径
    const fileBasePath = file.vault.adapter.basePath;
    // 获取文件的完整路径
    const fileFullPath = `${fileBasePath}/${filePath}`;
    exec(`"${choice}" "${fileFullPath}"`, (error, stdout, stderr) => {
      if (error) {
        new Notice(`Error opening file: ${error.message}`);
        return;
      }
      if (stderr) {
        new Notice(`Error opening file: ${stderr}`);
        return;
      }
      new Notice(`File opened with ${choice}`);
    });
  }
}
await ea.addElementsToView(false, true);
await ea.getExcalidrawAPI().history.clear(); //避免撤消/重做扰乱
