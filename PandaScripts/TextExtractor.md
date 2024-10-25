await ea.addElementsToView(); //to ensure all images are saved into the file
const api = ea.getExcalidrawAPI();
// const modalForm = app.plugins.plugins.modalforms.api;
const fs = require('fs');
const path = require('path');
const Activefile = app.workspace.getActiveFile();
const { exec } = require('child_process');
const fileName = app.workspace.getActiveFile().name;

let settings = ea.getScriptSettings();
//set default values on first run
if (!settings["ocrModel2"]) {
	settings = {
		"ocrModel2": {
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

// 获取库的基本路径
const basePath = (app.vault.adapter).getBasePath();
// ! frame 类型
const selectedFrameElements = ea.getViewSelectedElements().filter(el => el.type === "frame");
if (selectedFrameElements.length === 1) {
	const el = selectedFrameElements[0];
	let exText = el.name;
	const { insertType, ocrTextEdit } = await openEditPrompt(exText, 1);
	const frameLink = `[[${fileName}#^frame=${el.id}|${ocrTextEdit}]]`;

	if (insertType == "copyText") {
		copyToClipboard(frameLink);
		new Notice(`已复制Frame${ocrTextEdit}的链接`, 2000);
	} else if (insertType) {
		copyToClipboard(frameLink);
		new Notice(`完成修改并复制链接`, 500);
		el.name = ocrTextEdit;
	} else {
		el.name = ocrTextEdit;
	}
	ea.copyViewElementsToEAforEditing(selectedFrameElements);
	await ea.addElementsToView(false, true);

} else if ((selectedFrameElements.length > 1)) {
	let frameLinks = [];
	for (el of selectedFrameElements) {
		const frameLink = `[[${fileName}#^frame=${el.id}|${el.name}]]`;
		frameLinks.push(frameLink);
	}
	copyToClipboard(frameLinks.join("\n"));
	ea.copyViewElementsToEAforEditing(selectedFrameElements);
	await ea.addElementsToView(false, true);
	new Notice(`已复制${frameLinks}链接`, 2000);
}


if (selectedFrameElements.length >= 1) {
	// ! 给aliaes添加所有Frame的名称
	const allFrameElements = ea.getViewElements().filter(el => el.type === "frame");
	await app.fileManager.processFrontMatter(Activefile, fm => {
		fm.aliases = [];
		for (el of allFrameElements) {
			fm.aliases.push(el.name);
		}
	});
	await ea.addElementsToView();
	return;
}

// ! text 类型
const selectedTextElements = ea.getViewSelectedElements().filter(el => el.type === "text");

if (selectedTextElements.length === 1) {
	ea.copyViewElementsToEAforEditing(selectedTextElements);
	const el = ea.getElements()[0];
	let exText = el.rawText;
	const { insertType, ocrTextEdit } = await openEditPrompt(exText);

	if (insertType == "copyText") {
		copyToClipboard(ocrTextEdit);
		new Notice(`已复制文本`, 1000);
	} else if (insertType) {
		copyToClipboard(ocrTextEdit);
		new Notice(`完成修改`, 500);
	}

	el.originalText = el.rawText = el.text = ocrTextEdit;
	// 文本全部居左，居中
	// el.textAlign = "left";
	// el.textVerticalAlign = "middle";
	ea.refreshTextElementSize(el.id);
	await ea.addElementsToView(false, false);
	if (el.containerId) {
		const containers = ea.getViewElements().filter(e => e.id === el.containerId);
		api.updateContainerSize(containers);
		ea.selectElementsInView(containers);
	}
	return;
}

// ! 图片 OCR 或文本编辑
const els = ea.getViewSelectedElements().filter(el => el.type === "text" || el.type === "image" || el.type === "embeddable");
if (els.length >= 1) {
	// 是否为批处理
	const nums = els.filter(el => el.type == "image" || el.type === "text").length;
	let batchRecognition = false;

	// 多文本则进行批处理
	if (nums > 1) {
		new Notice(`检测到${nums}张图片\n进行批量识别`, 500);
		batchRecognition = true;
	}

	// 图片计数
	let n = 0;

	// 汇集所有文本集合
	let allText = [];
	// 获取库所有文件列表
	const files = app.vault.getFiles();

	for (let el of els) {
		if (el.type == "image") {
			const currentPath = ea.plugin.filesMaster.get(el.fileId).path;
			const file = app.vault.getAbstractFileByPath(currentPath);

			// 获取图片路径
			const imagePath = app.vault.adapter.getFullPath(file.path);
			console.log(`获取图片路径：${imagePath}`);

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
			} else if (settings["ocrModel2"].value == "Paddleocr") {
				new Notice(`图片OCR中......`);
				// 其次执行Paddleocr，如果报错则会保留ocrText的值
				const scriptPath = `${basePath}/${settings["PaddleocrPath"].value}`;
				console.log(scriptPath);
				await runPythonScript(scriptPath, imagePath)
					.then(output => {
						// 在这里处理Python脚本的输出
						console.log(output);
						let paddlleocrJson = JSON.parse(output);
						let paddlleocrText = paddlleocrJson.data.map(item => item.text);
						ocrText = paddlleocrText.join("\n");
						new Notice(`第${n}张片已完成OCR`, 500);
					})
					.catch(error => {
						new Notice(`Paddleocr识别失败，跳过执行`);
						ocrText = "";
						console.error(error);
					});

			} else if (settings["ocrModel2"].value == "TextExtractor") {
				new Notice(`图片OCR中......`);
				const text = await getTextExtractor().extractText(file);
				new Notice(`第${n}张片已完成OCR`, 500);
				ocrText = processText(text);
			}

			if (!batchRecognition) {
				const { insertType, ocrTextEdit } = await openEditPrompt(ocrText);
				// 不管复制还是修改，都会保存
				ocrText = ocrTextEdit;
				if (insertType == "copyText") {
					copyToClipboard(ocrTextEdit);
					new Notice(`已复制：图片文本`, 1000);
				} else if (insertType) {
					new Notice(`完成修改`, 500);
				}
			}
			// 更新数据源，存储在元素中
			el.customData["ocrText"] = ocrText;
			// 收集提取的信息
			allText.push(ocrText);

		} else if (el.type == "text") {
			let exText = el.rawText;
			console.log(exText);
			allText.push(exText);
		} else if (el.type == "embeddable" && el.link.endsWith("]]")) {
			let filePaths = getFilePath(files, el);
			// 读取文件内容
			let markdownText = getMarkdownText(filePaths);
			console.log(markdownText);
			allText.push(markdownText);

			copyToClipboard(markdownText);
			new Notice(`复制文本`, 3000);
		}
		await ea.addElementsToView(false, true);
	}
	await ea.addElementsToView(false, true);

	if (batchRecognition) {
		// 如果批量识别则直接进行复制文本
		const output = allText.join("\n\n");
		console.log(output);
		new Notice(`✅已完成批量OCR`, 3000);
		copyToClipboard(output);
		new Notice(`📋复制所有文本到剪切板`, 3000);
	}

}

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

// 打开文本编辑器
async function openEditPrompt(ocrText, n = 10) {
	// 打开编辑窗口
	let insertType = "";
	let ocrTextEdit = await utils.inputPrompt(
		"编辑文本",
		"可以自行修改文字保存在图片的属性中，输入一个空格会重新识别，注意清空并不会清除数据",
		ocrText,
		[

			{
				caption: "修改",
				action: () => {
					insertType = "insertImage";
					return;
				}
			},
			{
				caption: "复制",
				action: () => {
					insertType = "copyText";
					return;
				}
			},
		],
		n,
		true
	);

	if (!ocrTextEdit) {
		ocrTextEdit = ocrText;
	} else if (ocrTextEdit == " ") {
		ocrTextEdit = "";
	}

	return { insertType, ocrTextEdit };

}

// 复制内容到剪切板
function copyToClipboard(extrTexts) {
	const txtArea = document.createElement('textarea');
	txtArea.value = extrTexts;
	document.body.appendChild(txtArea);
	txtArea.select();
	if (document.execCommand('copy')) {
		console.log('copy to clipboard.');
	} else {
		console.log('fail to copy.');
	}
	document.body.removeChild(txtArea);
}

// 读取 Json 数据文件转为对象
function readJsonData(jsonPath, data) {
	if (!fs.existsSync(jsonPath)) {
		console.log('文件不存在');
		fs.writeFileSync(jsonPath, JSON.stringify(data));
	} else {
		console.log('文件已存在');
	}
	const existingDataString = fs.readFileSync(jsonPath, 'utf8');
	let jsonData = JSON.parse(existingDataString);
	return jsonData;
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
