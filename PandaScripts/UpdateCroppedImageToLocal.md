await ea.addElementsToView();
const imgs = ea.getViewSelectedElements().filter(el => el.type === "image");

const quickaddApi = this.app.plugins.plugins.quickadd.api;
const isConfirm = await quickaddApi.yesNoPrompt("图片裁剪确认", `确定要裁剪并覆盖本地的 ${imgs.length} 张图片吗？`);
if (!isConfirm) return;

for (const i of imgs) {
    const currentPath = ea.plugin.filesMaster.get(i.fileId).path;
    const file = app.vault.getAbstractFileByPath(currentPath);
    if (!file) {
        new Notice("Can't find file: " + currentPath);
        continue;
    }
    const filePath = file.path;

    // 读取图片为ArrayBuffer
    const arrayBuffer = await app.vault.readBinary(file);

    // 创建Image对象以便裁剪
    const blob = new Blob([arrayBuffer]);
    const imageUrl = URL.createObjectURL(blob);
    const image = await new Promise((resolve, reject) => {
        const imgEl = new Image();
        imgEl.onload = () => resolve(imgEl);
        imgEl.onerror = reject;
        imgEl.src = imageUrl;
    });

    // 获取crop参数
    const crop = i.crop;
    if (!crop) {
        new Notice("未找到crop属性，跳过: " + filePath);
        continue;
    }

    // 创建canvas进行裁剪
    const canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
        image,
        crop.x, crop.y, crop.width, crop.height, // 源图像裁剪区域
        0, 0, crop.width, crop.height            // 画到canvas的区域
    );

    // 导出裁剪后的图片为Blob
    const croppedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

    // 将Blob转为ArrayBuffer
    const croppedArrayBuffer = await croppedBlob.arrayBuffer();

    // 覆盖原文件
    await app.vault.modifyBinary(file, croppedArrayBuffer);

    // 直接删除crop属性
    delete i.crop;

    // new Notice("✂️已裁剪图片 " + filePath);
}
await ea.copyViewElementsToEAforEditing(imgs);
await ea.addElementsToView(false, false);
// await ea.getExcalidrawAPI().history.clear(); //避免撤消/重做扰乱
app.commands.executeCommandById("obsidian-excalidraw-plugin:save");
new Notice("✅已裁剪所有选中图片");

