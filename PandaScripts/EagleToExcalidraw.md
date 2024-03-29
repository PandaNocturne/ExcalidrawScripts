let settings = ea.getScriptSettings();
//set default values on first run
if (!settings["Eagle Images Path"]) {
    settings = {
        "Eagle Images Path": {
            value: "Y-图形文件存储/EagleImages",
            description: "Obsidian库内存放Eagle的图片的相对路径，比如：Y-图形文件存储/EagleImages"
        }
    };
    ea.setScriptSettings(settings);
}

const path = require('path');
const fs = require("fs");
let api = ea.getExcalidrawAPI();
let el = ea.targetView.containerEl.querySelectorAll(".excalidraw-wrapper")[0];

// 获取库的基本路径
const basePath = (app.vault.adapter).getBasePath();
// 设置相对路径
const relativePath = settings["Eagle Images Path"].value;

// 对于选中的项目，则通过文件名来创建Eagle的回链并打开

let selectedEls = ea.getViewSelectedElements();

for (selectedEl of selectedEls) {
    let embeddedFile = ea.targetView.excalidrawData.getFile(selectedEl.fileId);
    if (!embeddedFile) {
        new Notice("Can't find file: " + selectedEl.fileId);
        continue;
    }
    let abstractPath = path.join(embeddedFile.file.vault.adapter.basePath, embeddedFile.file.path);
    const eagle_id = path.basename(abstractPath, path.extname(abstractPath));
    let EagleLink = `eagle://item/${eagle_id}`;
    // 打开链接
    window.open(EagleLink);
}

new Notice("EagleToExcalidraw脚本已启动！");
// 对于从Eagle拖拽过来的文件，以Eagle文件夹名命名，根据后缀名来创建不同的拖拽形式
el.ondrop = async function (event) {
    console.log("ondrop");
    event.preventDefault();
    if (event.dataTransfer.types.includes("Files")) {
        console.log("文件类型判断");
        for (let file of event.dataTransfer.files) {
            let directoryPath = file.path;
            console.log(directoryPath);
            if (directoryPath) {
                console.log("获取路径");
                // 清空插入的环境变量
                event.stopPropagation();
                ea.clear();
                ea.style.strokeStyle = "solid";
                ea.style.fillStyle = 'solid';
                ea.style.roughness = 0;
                // ea.style.roundness = { type: 3 };
                ea.style.strokeWidth = 1;
                ea.style.fontFamily = 4;
                ea.style.fontSize = 20;

                // 判断是否为Eagle文件，不是这不执行
                let folderPathName = path.basename(path.dirname(directoryPath));
                console.log(folderPathName);

                console.log(folderPathName);
                if (!folderPathName.match(".info")) {
                    console.log("不为Eagle文件夹文件");
                    continue;
                }
                console.log("为Eagle文件夹文件");

                let fileName = path.basename(directoryPath);
                if (folderPathName && fileName) {
                    let eagleId = folderPathName.replace('.info', '');
                    console.log(eagleId);
                    console.log(`folder: ${folderPathName};file_name:${fileName};eagle_id:${eagleId}`);

                    // 获取原文件名，不带后缀
                    let insertFilename = fileName.split(".").slice(0, -1).join(".");

                    // 获取文件名后缀
                    const fileExtension = fileName.split('.').pop();

                    // 将图片文件移动到指定文件夹
                    let sourcePath = directoryPath;

                    // 📌定义附件保存的地址
                    let destinationName = `${eagleId}.${fileExtension}`;
                    let destinationPath = `${basePath}/${relativePath}/${destinationName}`;
                    console.log(destinationPath);
                    // 读取metadata.json文件
                    let Eaglefolder = path.dirname(directoryPath);
                    const metadataPath = `${Eaglefolder}/metadata.json`; // 替换为实际的文件路径
                    // 缩略图的路径
                    let ThumbnailImage = `${Eaglefolder}/${insertFilename}_thumbnail.png`;

                    fs.copyFileSync(sourcePath, destinationPath);
                    await new Promise((resolve) => setTimeout(resolve, 300)); // 暂停一会儿

                    // 让默认插入文本为文件名
                    let insert_txt = fileName;

                    // new Notice("插入Eagle素材：" + file_name);

                    const metadataContent = fs.readFileSync(metadataPath, 'utf8');
                    // 解析为JSON对象
                    const metadata = JSON.parse(metadataContent);

                    // 设置不同文件类型的导入方式ea.addText为文本、ea.addImage为图片
                    if (
                        //   对网页统一用内部链接的形式
                        fileName.toLowerCase().endsWith(".html") ||
                        fileName.toLowerCase().endsWith(".mhtml") ||
                        fileName.toLowerCase().endsWith(".htm")
                    ) {
                        let id = await ea.addText(0, 0, `[[${destinationName}|${insert_txt}]]`, { width: 300, box: true, wrapAt: 100, textAlign: "center", textVerticalAlign: "middle", box: "box" });

                        await ea.addElementsToView(true, false, false);

                        if (ea.targetView.draginfoDiv) {
                            document.body.removeChild(ea.targetView.draginfoDiv);
                            delete ea.targetView.draginfoDiv;
                        }

                    } else if (
                        //   对图片统一用导入图片后附加链接的形式
                        fileName.toLowerCase().endsWith(".png") ||
                        fileName.toLowerCase().endsWith(".jpg") ||
                        fileName.toLowerCase().endsWith(".jpeg") ||
                        fileName.toLowerCase().endsWith(".icon") ||
                        fileName.toLowerCase().endsWith(".svg")
                    ) {
                        let id = await ea.addImage(0, 0, destinationName);
                        let el = ea.getElement(id);

                        if (metadata.url) {
                            // 将el.link的值设置为metadata.json中的url
                            // el.link = metadata.url;
                            el.link = `[${insertFilename}](${metadata.url})`;
                        } else {
                            // 将el.link的值设置为Eagle的回链
                            el.link = `eagle://item/${eagleId}`;
                        }

                        await ea.addElementsToView(true, false, false);

                        if (ea.targetView.draginfoDiv) {
                            document.body.removeChild(ea.targetView.draginfoDiv);
                            delete ea.targetView.draginfoDiv;
                        }

                    } else if (fileName.toLowerCase().endsWith(".url")) {
                        // 对url文件采用文本加入json的连接形式
                        link = metadata.url;
                        let id = await ea.addText(0, 0, `🌐[${insert_txt.replace(".url", "")}](${link})`, { width: 400, box: true, wrapAt: 100, textAlign: "center", textVerticalAlign: "middle", box: "box" });

                        let el = ea.getElement(id);
                        // 将el.link的值设置为Eagle的回链
                        el.link = `eagle://item/${eagleId}`;
                        await ea.addElementsToView(true, false, false);
                        if (ea.targetView.draginfoDiv) {
                            document.body.removeChild(ea.targetView.draginfoDiv);
                            delete ea.targetView.draginfoDiv;
                        }
                    } else if (
                        //   针对Office三件套
                        fileName.toLowerCase().endsWith(".pptx") ||
                        fileName.toLowerCase().endsWith(".ppt") ||
                        fileName.toLowerCase().endsWith(".xlsx") ||
                        fileName.toLowerCase().endsWith(".xls") ||
                        fileName.toLowerCase().endsWith(".docx") ||
                        fileName.toLowerCase().endsWith(".doc") ||
                        fileName.toLowerCase().endsWith(".xmind") ||
                        fileName.toLowerCase().endsWith(".pdf")
                    ) {
                        let InsertPDFImage = confirm("是否插入附件缩略图？");
                        let id = "";
                        if (InsertPDFImage) {
                            let destinationPath = `${basePath}/${relativePath}/${eagleId}.png`;
                            fs.copyFileSync(ThumbnailImage, destinationPath);
                            await new Promise((resolve) => setTimeout(resolve, 200)); // 暂停一会儿
                            id = await ea.addImage(0, 0, `${eagleId}.png`);

                        } else {
                            id = await ea.addText(0, 0, `[[${destinationName}|${insert_txt}]]`, { width: 400, box: true, wrapAt: 100, textAlign: "center", textVerticalAlign: "middle", box: "box" });
                        }
                        let el = ea.getElement(id);
                        el.link = `[[${destinationName}|${insert_txt}]]`;

                        await ea.addElementsToView(true, false, false);
                        if (ea.targetView.draginfoDiv) {
                            document.body.removeChild(ea.targetView.draginfoDiv);
                            delete ea.targetView.draginfoDiv;
                        }

                    } else if (
                        //   对gif、mp4等动态进行设置(可根据需要的格式自行添加)
                        fileName.toLowerCase().endsWith(".gif") ||
                        fileName.toLowerCase().endsWith(".mp4")
                    ) {
                        // 清空插入的环境变量
                        event.stopPropagation();
                        ea.clear();
                        ea.style.strokeStyle = "solid";
                        ea.style.strokeColor = "transparent";
                        ea.style.backgroundColor = "transparent";
                        ea.style.fillStyle = 'solid';
                        ea.style.roughness = 0;
                        ea.style.strokeWidth = 1;
                        ea.style.fontFamily = 4;

                        let eagleGifFile = app.vault.getAbstractFileByPath(`${relativePath}/${destinationName}`);
                        let id = await await ea.addIFrame(0, 0, 500, 280, 0, eagleGifFile);
                        let el = ea.getElement(id);

                        // ea.style.fillStyle = "solid";
                        el.link = `[[${destinationName}]]`;

                        await ea.addElementsToView(true, false, false);
                        if (ea.targetView.draginfoDiv) {
                            document.body.removeChild(ea.targetView.draginfoDiv);
                            delete ea.targetView.draginfoDiv;
                        }
                    } else if (
                        //   对mp3等音频进行设置(可根据需要的格式自行添加)
                        fileName.toLowerCase().endsWith(".mp3") ||
                        fileName.toLowerCase().endsWith(".WAV")
                    ) {
                        // 清空插入的环境变量
                        event.stopPropagation();
                        ea.clear();
                        ea.style.strokeStyle = "solid";
                        ea.style.strokeColor = "transparent";
                        ea.style.backgroundColor = "transparent";
                        ea.style.fillStyle = 'solid';
                        ea.style.roughness = 0;
                        ea.style.strokeWidth = 1;
                        ea.style.fontFamily = 4;

                        let eagleGifFile = app.vault.getAbstractFileByPath(`${relativePath}/${destinationName}`);
                        let id = await await ea.addIFrame(0, 0, 400, 80, 0, eagleGifFile);
                        let el = ea.getElement(id);

                        // ea.style.fillStyle = "solid";
                        el.link = `[[${destinationName}]]`;

                        await ea.addElementsToView(true, false, false);
                        if (ea.targetView.draginfoDiv) {
                            document.body.removeChild(ea.targetView.draginfoDiv);
                            delete ea.targetView.draginfoDiv;
                        }
                    } else {
                        // 其余统一插入eagle连接
                        let id = await ea.addText(0, 0, `[[${destinationName}|${insert_txt}]]`, { width: 400, box: true, wrapAt: 100, textAlign: "center", textVerticalAlign: "middle", box: "box" });
                        let el = ea.getElement(id);
                        // 将el.link的值设置为Eagle的回链
                        el.link = `eagle://item/${eagleId}`;
                        await ea.addElementsToView(true, false, false);
                        if (ea.targetView.draginfoDiv) {
                            document.body.removeChild(ea.targetView.draginfoDiv);
                            delete ea.targetView.draginfoDiv;
                        }
                    }
                }
            }
        }
    }
};

