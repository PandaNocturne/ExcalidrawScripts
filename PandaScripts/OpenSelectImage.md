
await ea.addElementsToView(); //to ensure all images are saved into the file
const { exec } = require('child_process');

const img = ea.getViewSelectedElements().filter(el => el.type === "image");
if (img.length === 0) {
  new Notice("No image is selected");
  return;
}

for (i of img) {
  const currentPath = ea.plugin.filesMaster.get(i.fileId).path;
  const file = app.vault.getAbstractFileByPath(currentPath);
  if (!file) {
    new Notice("Can't find file: " + currentPath);
    continue;
  }
  const pathNoExtension = file.path.substring(0, file.path.length - file.extension.length - 1);
  let fileName = file.path;
  let fileBasePath = file.vault.adapter.basePath;
  let filePath = `${fileBasePath}/${fileName}`;

  // 根据操作系统使用默认应用打开文件
  let openCommand;
  if (navigator.platform.includes("Win")) {
    openCommand = `start "" "${filePath}"`;
  } else if (navigator.platform.includes("Mac")) {
    openCommand = `open "" "${filePath}"`;
  } else {
    new Notice("Unsupported platform");
    return;
  }

  // 使用默认应用打开文件
  exec(openCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`打开文件时出错: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`打开文件时出错: ${stderr}`);
      return;
    }
    console.log(`文件已成功打开`);
  });
}