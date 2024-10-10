let settings = ea.getScriptSettings();
//set default values on first run
if (!settings["Eagle Images Path"]) {
    settings = {
        "Eagle Images Path": {
            value: "900【素材】Assets/EagleAssets",
            description: "Obsidian库内存放Eagle的图片的相对路径，比如：900【素材】Assets/EagleAssets"
        }
    };
    ea.setScriptSettings(settings);
}
if (!settings["Eagle→Excalidraw Tag"]) {
    settings["Eagle→Excalidraw Tag"] = {
        "value": "Eagle→Excalidraw",
        "description": "Eagle导入Excalidraw时，Eagle对应项目自动添加的标签"
    };
    ea.setScriptSettings(settings);
};
if (!settings["Don't stop Eagle→Excalidraw"]) {
    settings["Don't stop Eagle→Excalidraw"] = {
        "value": false,
        "description": "直接启动Eagle→Excalidraw模式，不要询问我为什么。"
    };
    ea.setScriptSettings(settings);
};
const path = require('path');
const fs = require("fs");
// let api = ea.getExcalidrawAPI();
let el = ea.targetView.containerEl.querySelectorAll(".excalidraw-wrapper")[0];

// 获取库的基本路径
const basePath = (app.vault.adapter).getBasePath();
// 设置相对路径
const relativePath = settings["Eagle Images Path"].value;
// 对于选中的项目，则通过文件名来创建Eagle的回链并打开
let selectedEls = ea.getViewSelectedElements();

if (selectedEls.length === 1) {
    let selectedEl = selectedEls[0];
    let embeddedFile = ea.targetView.excalidrawData.getFile(selectedEl.fileId);
    if (!embeddedFile) {
        new Notice("Can't find file: " + selectedEl.fileId);

    }
    let abstractPath = path.join(embeddedFile.file.vault.adapter.basePath, embeddedFile.file.path);
    const eagle_id = path.basename(abstractPath, path.extname(abstractPath));
    const EagleLink = `eagle://item/${eagle_id}`;
    // 打开链接
    window.open(EagleLink);
    console.log(EagleLink);

    return;
} else if (selectedEls.length > 1) {
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
    if (!settings["dataTags"]) {
        settings["dataTags"] = {
            "value": ["Excalidraw→Eagle"],
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
    let date = window.moment().format("YYYYMMDDHHmmss");

    let base64 = "";
    // 
    await ea.targetView.svg(ea.targetView.getScene(true),undefined, false,false).then(svg => {
        base64 = `data:image/svg+xml;base64,${btoa(
            unescape(encodeURIComponent(svg.outerHTML)),
        )}`;
    });

    // =========== 配置 =========== //
    const data = {
        "url": base64,
        "name": `EX-${date}`,
        "website": "",
        "tags": settings["dataTags"].value,
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
    settings["dataTags"].value = data.tags;
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
            fm.uid = moment(ctime).format(uidFormat);
        });
        await ea.addElementsToView();
        data.website = `obsidian://advanced-uri?vault=${vaultName}&uid=${adURI}`;
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
    return;
}

if (!(settings["Don't stop Eagle→Excalidraw"].value)) {
    const options = ["✅启动EagleToExcalidraw模式", "❌取消EagleToExcalidraw模式"];
    const option = await utils.suggester(options, options);
    if (!option) return;
    if (option === "❌取消EagleToExcalidraw模式") {
        el.ondrop = null;
        new Notice("❌EagleToExcalidraw模式已取消！");
        return;
    }
}

// 对于从Eagle拖拽过来的文件，以Eagle文件夹名命名，根据后缀名来创建不同的拖拽形式
el.ondrop = async function (event) {
    console.log("ondrop");
    event.preventDefault();
    if (event.dataTransfer.types.includes("Files")) {
        console.log("文件类型判断");
        for (let file of event.dataTransfer.files) {
            let directoryPath = file.path;
            console.log(directoryPath);
            if (!directoryPath) continue;
            console.log(`获取路径：${directoryPath}`);

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
                metadata.tags.push(settings["Eagle→Excalidraw Tag"].value); // 先更新数组
                // 去除重复项
                metadata.tags = [...new Set(metadata.tags)];
                const data = {
                    "id": eagleId,
                    "tags": metadata.tags,
                };
                console.table(data);
                const requestOptions = {
                    method: 'POST',
                    body: JSON.stringify(data),
                    redirect: 'follow'
                };

                fetch("http://localhost:41595/api/item/update", requestOptions)
                    .then(response => response.json())
                    .then(result => console.log(result))
                    .catch(error => console.log('error', error));


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
                    fileName.toLowerCase().endsWith(".webp") ||
                    fileName.toLowerCase().endsWith(".icon") ||
                    fileName.toLowerCase().endsWith(".ico") ||
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
};
new Notice("✅EagleToExcalidraw脚本已启动！");
function convertSvgToPng(base64, scale = 4) {
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
