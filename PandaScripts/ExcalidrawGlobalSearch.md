await ea.addElementsToView(); //to ensure all images are saved into the file
// 因为插件的代码是异步的，所以需要等待所有图片都加载完成

const quickAddApi = app.plugins.plugins.quickadd.api;
const fs = require('fs');
const path = require('path');
const activeFile = app.workspace.getActiveFile();
const { exec } = require('child_process');


let settings = ea.getScriptSettings();
//set default values on first run
if (!settings["ocrModel"]) {
    settings = {
        "ocrModel": {
            value: "Paddleocr",
            valueset: ["Paddleocr", "TextExtractor", "无"],
            description: "选择 OCR 模型，有本地的 Paddleocr(需要本地文件)、Obsidian 的 Text Extractor 插件 API",
        },
        "PaddleocrPath": {
            value: ".obsidian/paddlleocr/PaddleocrToJson.py",
            description: "选择 paddlleocr 文件夹路径下的 PaddleocrToJson.py 文件"
        },
    };
    ea.setScriptSettings(settings);
}

const textEls = ea.getViewElements().filter(el => el.type === "text" && el.rawText.length >= 4);
const fileEls = ea.getViewElements().filter(el => el.type === "embeddable");
const imageEls = ea.getViewElements().filter(el => el.type === "image");
const nums = imageEls.filter(el => el.customData && el.customData["ocrText"]).length;
const zoom = [2, 1, 2, 3];
const icon = ["✒", "💬", "🖼", "📝"];

// 获取库的基本路径
const basePath = (app.vault.adapter).getBasePath();

// 搜索来源
const choices = [`${icon[0]}全局搜索(${textEls.length + imageEls.length})`, `${icon[1]}文本数据(${textEls.length})`, `${icon[2]}图片(OCR)(${imageEls.length}/${nums})`, `${icon[3]}嵌入文档(❌还没做)`,];
const choice = await utils.suggester(choices, choices);



// 图片的OCR并不会记录在Yaml区而是记录在自定义数据中
const imageOCR = async (imageEls) => {
    // 图片计数
    let n = 0;
    // 汇集所有文本集合
    const allImageText = [];
    const allImageEls = [];
    for (let el of imageEls) {
        const currentPath = ea.plugin.filesMaster.get(el.fileId).path;
        const file = app.vault.getAbstractFileByPath(currentPath);
        // 获取图片路径
        const imagePath = app.vault.adapter.getFullPath(file.path);
        // console.log(`获取图片路径：${imagePath}`);

        // !初始化
        let ocrText = ""; n++;
        if (!el.customData) {
            el.customData = {
                ocrText: ""
            };
        }

        if (el.customData["ocrText"]) {
            // console.log(`图片已存在OCR文本`);
            ocrText = el.customData["ocrText"];
        } else if (settings["ocrModel"].value === "Paddleocr") {
            // new Notice(`图片OCR中......`);
            // 执行Paddleocr，如果报错则会保留ocrText的值
            const scriptPath = `${basePath}/${settings["PaddleocrPath"].value}`;
            console.log(scriptPath);
            await runPythonScript(scriptPath, imagePath)
                .then(output => {
                    // 在这里处理Python脚本的输出
                    console.log(output);
                    let paddlleocrJson = JSON.parse(output);
                    let paddlleocrText = paddlleocrJson.data.map(item => item.text);
                    ocrText = paddlleocrText.join("\n");
                    new Notice(`第${n}张片已完成OCR`, 2000);
                })
                .catch(error => {
                    new Notice(`Paddleocr识别失败，跳过`);
                    ocrText = "◻◻◻◻◻◻";
                    console.error(error);
                });
        } else if (settings["ocrModel"].value === "TextExtractor") {
            const text = await getTextExtractor().extractText(file);
            new Notice(`第${n}张片已完成OCR`, 500);
            ocrText = processText(text);
        }
        // 更新数据源，存储在元素中
        el.customData["ocrText"] = ocrText;
        // 收集提取的信息
        allImageText.push(ocrText);
        allImageEls.push(el);
        await ea.addElementsToView(false, false);
    }
    ea.copyViewElementsToEAforEditing(imageEls);
    await ea.addElementsToView(false, true);
    return { allImageText, allImageEls };
};

if (choice === choices[0]) {
    new Notice(`全局搜索中......存在${nums}个未OCR图片`);
    let allElText = [];
    let allElements = [];
    const { allImageText, allImageEls } = await imageOCR(imageEls);
    allElText = [...(textEls.map(el => `✒${el.rawText}`)), ...(allImageText.map(txt => `${icon[2]}${txt.replace(/\n+/g, "◼")}`))];
    allElements = [...textEls, ...allImageEls];

    // 2024-03-31_02:50：按y轴排序，这样有点耗性能，强迫证使我弄了这个
    allElements.sort((a, b) => a.y - b.y);
    let sortedAllElText = [];
    for (let i = 0; i < allElements.length; i++) {
        const element = allElements[i];
        if (element.type === 'text') {
            sortedAllElText.push(`${icon[1]}${element.rawText}`);
        } else if (element.type === 'image') {
            const imageText = element.customData["ocrText"];
            sortedAllElText.push(`${icon[2]}${imageText.replace(/\n+/g, "◼")}`);
        }
    }
    allElText = sortedAllElText;

    // 因为Excalidraw的utils.suggester建议框有数量限制，这里选用QuickAdd的api
    const selectedElement = await quickAddApi.suggester(allElText.map(txt => `${txt}` + `\n`.repeat(2)), allElements);

    if (selectedElement) {
        // 执行跳转到选定元素的操作
        api = ea.getExcalidrawAPI();
        api.zoomToFit([selectedElement], zoom[0]);
    }
    return;
}
// 文本搜索
if (choice === choices[1]) {
    const selectedElement = await quickAddApi.suggester(textEls.map(el => el.rawText).map(txt => `✒${txt}` + `\n`.repeat(2)), textEls);
    if (selectedElement) {
        // 执行跳转到选定元素的操作
        api = ea.getExcalidrawAPI();
        api.zoomToFit([selectedElement], zoom[1]);
    }
    return;
}

// 图片搜索
if (choice === choices[2]) {
    console.log(`检测到${nums}张图片，进行批量OCR识别`);
    const { allImageText, allImageEls } = await imageOCR(imageEls);
    const selectedElement = await quickAddApi.suggester(allImageText.map(txt => `${icon[2]}${txt.replace(/\n+/g, "◼")}` + `\n`.repeat(2)), allImageEls);
    if (selectedElement) {
        // 执行跳转到选定元素的操作
        api = ea.getExcalidrawAPI();
        api.zoomToFit([selectedElement], zoom[2]);
    }
    return;
}


// // ! 图片 OCR 或文本编辑
// const els = ea.getViewElements().filter(el => el.type === "text" || el.type === "image" || el.type === "embeddable");
// if (els.length >= 1) {
//     // 是否为批处理
//     const nums = els.filter(el => el.type == "image" || el.type === "text").length;
//     let batchRecognition = false;

//     // 多文本则进行批处理
//     if (nums > 1) {
//         new Notice(`检测到${nums}张图片\n进行批量识别`, 500);
//         batchRecognition = true;
//     }

//     // 图片计数
//     let n = 0;

//     // 汇集所有文本集合
//     let allText = [];
//     // 获取库所有文件列表
//     const files = app.vault.getFiles();

//     for (let el of els) {
//         if (el.type == "image") {
//             let data = {
//                 filePath: "",
//                 fileId: "",
//                 ocrText: "",
//             };
//             const currentPath = ea.plugin.filesMaster.get(el.fileId).path;
//             const file = app.vault.getAbstractFileByPath(currentPath);


//             // 获取图片路径
//             const imagePath = app.vault.adapter.getFullPath(file.path);
//             console.log(`获取图片路径：${imagePath}`);

//             const jsonPath = path.join(textCachePath, `${el.fileId}.json`);

//             // 判断是否进行存储Json数据
//             let jsonData = {};
//             if (settings["TextCache"].value) {
//                 jsonData = readJsonData(jsonPath, data);
//                 console.log(jsonData.valueOf());
//             } else {
//                 jsonData = {};
//             }

//             // 初始化ocr文本
//             let ocrText = "";
//             let ocrText_yaml = "";
//             n++;

//             await app.fileManager.processFrontMatter(activeFile, fm => {
//                 ocrText_yaml = fm[`ocrText`]?.[`${el.fileId}`];
//             });

//             if (ocrText_yaml) {
//                 ocrText = JSON.parse(ocrText_yaml);
//             } else if (jsonData.ocrText) {
//                 new Notice(`图片已存在OCR文本`, 500);
//                 ocrText = jsonData.ocrText;
//             } else if (settings["ocrModel2"].value == "Paddleocr") {
//                 new Notice(`图片OCR中......`);
//                 // 其次执行Paddleocr，如果报错则会保留ocrText的值
//                 const scriptPath = `${basePath}/${settings["PaddleocrPath"].value}`;
//                 console.log(scriptPath);
//                 await runPythonScript(scriptPath, imagePath)
//                     .then(output => {
//                         // 在这里处理Python脚本的输出
//                         console.log(output);
//                         let paddlleocrJson = JSON.parse(output);
//                         let paddlleocrText = paddlleocrJson.data.map(item => item.text);
//                         ocrText = paddlleocrText.join("\n");
//                         new Notice(`第${n}张片已完成OCR`, 500);

//                     })
//                     .catch(error => {
//                         new Notice(`Paddleocr识别失败，采用TextExtractor`);
//                         console.error(error);
//                     });

//             } else if (settings["ocrModel2"].value == "TextExtractor") {
//                 new Notice(`图片OCR中......`);
//                 const text = await getTextExtractor().extractText(file);
//                 new Notice(`第${n}张片已完成OCR`, 500);
//                 ocrText = processText(text);
//             }

//             if (!batchRecognition) {
//                 const { insertType, ocrTextEdit } = await openEditPrompt(ocrText);
//                 // 不管复制还是修改，都会保存
//                 ocrText = ocrTextEdit;
//                 if (insertType == "copyText") {
//                     copyToClipboard(ocrTextEdit);
//                     new Notice(`已复制：图片文本`, 1000);
//                 } else if (insertType) {
//                     new Notice(`完成修改`, 500);
//                 }
//             }

//             // 更新数据源
//             data.filePath = file.path;
//             data.fileId = el.fileId;
//             data.ocrText = ocrText;

//             // 缓存数据
//             if (settings["TextCache"].value) {
//                 // 保存数据到Json文件中
//                 fs.writeFileSync(jsonPath, JSON.stringify(data));
//             }
//             // 收集提取的信息
//             allText.push(ocrText);

//         } else if (el.type == "text") {
//             let exText = el.rawText;
//             console.log(exText);
//             allText.push(exText);
//         } else if (el.type == "embeddable" && el.link.endsWith("]]")) {
//             let filePaths = getFilePath(files, el);
//             // 读取文件内容
//             let markdownText = getMarkdownText(filePaths);
//             console.log(markdownText);
//             allText.push(markdownText);

//             copyToClipboard(markdownText);
//             new Notice(`复制文本`, 3000);
//         }
//         await ea.addElementsToView(false, true);
//     }
//     await ea.addElementsToView(false, true);

//     if (batchRecognition) {
//         // 如果批量识别则直接进行复制文本
//         const output = allText.join("\n\n");
//         console.log(output);
//         new Notice(`✅已完成批量OCR`, 3000);
//         copyToClipboard(output);
//         new Notice(`📋复制所有文本到剪切板`, 3000);
//     }

// }


// 调用 Text Extractor 的 API
function getTextExtractor() {
    return app.plugins.plugins['text-extractor'].api;
}

// 格式化文本
function processText(text) {
    // 替换特殊空格为普通空格
    text = text.replace(/[\ue5d2\u00a0\u2007\u202F\u3000\u314F\u316D\ue5cf]/g, ' ');
    // 将全角字符转换为半角字符
    text = text.replace(/[\uFF01-\uFF5E]/g, function (match) { return String.fromCharCode(match.charCodeAt(0) - 65248); });
    // 替换英文之间的多个空格为一个空格
    text = text.replace(/([a-zA-Z])([\u4e00-\u9fa5])/g, '$1 $2');

    // 删除中文之间的空格
    text = text.replace(/([0-9\.\u4e00-\u9fa5])\s+([0-9\.\u4e00-\u9fa5])/g, '$1$2');
    text = text.replace(/([0-9\.\u4e00-\u9fa5])\s+([0-9\.\u4e00-\u9fa5])/g, '$1$2');
    text = text.replace(/([\u4e00-\u9fa5])\s+/g, '$1');
    text = text.replace(/\s+([\u4e00-\u9fa5])/g, '$1');

    // 在中英文之间添加空格
    text = text.replace(/([\u4e00-\u9fa5])([a-zA-Z])/g, '$1 $2');
    text = text.replace(/([a-zA-Z])([\u4e00-\u9fa5])/g, '$1 $2');

    return text;
}

// 获取文件路径下的 md 中的文本(排除 Yaml)
function getMarkdownText(filePath) {
    // 获取文件的完整路径
    const fileFullPath = app.vault.adapter.getFullPath(filePath);

    // 读取文件内容
    const fileContent = fs.readFileSync(fileFullPath, 'utf8');

    // 排除首行YAML区域
    const markdownText = fileContent.replace(/---[\s\S]*?---\n*/, '').replace(/\n\n/, "\n");

    return markdownText;

}

// 由文件列表和 el 元素获取文件路径(相对路径)
function getFilePath(files, el) {
    let files2 = files.filter(f => path.basename(f.path).replace(".md", "").endsWith(el.link.replace(/\[\[/, "").replace(/\|.\*]]/, "").replace(/\]\]/, "").replace(".md", "")));
    let filePath = files2.map((f) => f.path)[0];
    console.log(filePath);
    return filePath;
}

// 运行本地 Python 文件
function runPythonScript(scriptPath, args) {
    return new Promise((resolve, reject) => {
        const command = `python "${scriptPath}" "${args}"`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`执行命令时发生错误: ${error.message}`);
                reject(error);
            }
            if (stderr) {
                console.error(`命令执行返回错误: ${stderr}`);
                reject(stderr);
            }
            resolve(stdout.trim());
        });
    });
}
