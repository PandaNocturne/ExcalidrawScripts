
const quickaddApi = this.app.plugins.plugins.quickadd.api;
// const ea = ExcalidrawAutomate;
const path = require("path");
const fs = require("fs");

// 设置quickerInsetNote模板设置
let settings = ea.getScriptSettings();
//set default values on first run
if (!settings["QuickerInsertZKCardPath"]) {
	settings = {
		"QuickerInsertZKCardPath": {
			value: "D-每日生活记录/QuickNotes",
			description: "TimeStampNote的存放路径(相对路径)<br>eg：D-每日生活记录/QuickNotes<br>空值：默认为当前笔记路径"
		},
		"QuickerInsertZKCardTemplate": {
			value: "[QuickNote]-YYYYMMDDHHmmss",
			description: "TimeStampNote默认名称，若为存储路径用/隔开<br>eg：YYYYMM/YYYYMMDDHHMMSS"
		},
		"QuickerInsertZKCardYaml": {
			value: "---\ncssclasses:\n  - Excalidraw-Markdown\n---\n\n",
			height: "250px",
			description: "设定笔记模板"
		},
	};
	ea.setScriptSettings(settings);
}

// 存储路径
const folderPath = settings["QuickerInsertZKCardPath"].value ? settings["QuickerInsertZKCardPath"].value : path.dirname(app.workspace.getActiveFile().path);

console.log(folderPath);

// 调用函数生成时间戳
const timestamp = quickaddApi.date.now(settings["QuickerInsertZKCardTemplate"].value);
console.log(timestamp);

// 创建文件夹路径下的Markdown文件，fname为文件名
const Yaml = settings["QuickerInsertZKCardYaml"].value;

ea.setView("active");
const trashFiles = ea.getViewSelectedElements().filter(el => el.link);

// 获取库所有文件列表
const files = app.vault.getFiles();

if (Object.keys(trashFiles).length) {

	for (let trashFile of trashFiles) {
		filePaths = getFilePath(files, trashFile);
		let isConfirm = await quickaddApi.yesNoPrompt("是否删除本地文件", `${filePaths}`);

		if (isConfirm) {
			// 删除元素
			ea.deleteViewElements(ea.getViewSelectedElements().filter(el => el.id == trashFile.id));

			// ea.clear();
			await ea.addElementsToView(false, true);
			await ea.getExcalidrawAPI().history.clear(); //避免撤消/重做扰乱

			// 删除文件
			if ((app.vault.adapter).exists(filePaths)) {
				(app.vault.adapter).trashLocal(filePaths);
			}
		}

	}
	await ea.addElementsToView(false, true);

	return; // 提前结束函数的执行

} else {
	// 时间戳笔记路径
	const filePath = `${folderPath}/${timestamp}.md`;

	console.log(filePath);
	const fileName = path.basename(filePath).replace(/\.md/, "");
	console.log([filePath, fileName]);

	// 获取Obsidian文件对象
	const rootFolder = app.vault.getRoot();
	console.log(rootFolder);


	if (filePath) {
		let { insertType, inputText } = await openEditPrompt();
		if (!insertType) return;

		// 设定固定Yaml
		let file = await app.fileManager.createNewFile(rootFolder, filePath, "md", inputText ? `${Yaml}\n${inputText}` : `${Yaml}`);

		// 设置Frame样式
		ea.style.strokeColor = "#FFFFFF";
		ea.style.strokeStyle = "solid";
		ea.style.fillStyle = "solid";
		ea.style.backgroundColor = "#ced4da";
		ea.style.roughness = 0;
		// ea.style.roundness = { type: 3 };
		ea.style.strokeWidth = 2;

		let id = await ea.addIFrame(0, 0, 600, 300, 0, file);
		let el = ea.getElement(id);
		el.link = `[[${fileName}]]`;

	} else {
		return;

	};

	await ea.addElementsToView(true, true);
	ea.moveViewElementToZIndex(el.id, 99);

}

function fileListByPath(filePath) {
	// const path = require("path");
	let files = app.vault.getFiles().filter(f => path.dirname(f.path) == filePath);
	let fileNames = files.map((f) => f.path);

	return fileNames;
}

// 打开文本编辑器
async function openEditPrompt(Text = "") {
	// 打开编辑窗口
	let insertType = true;
	let inputText = "";
	inputText = await utils.inputPrompt(
		"输入笔记内容",
		"输入笔记内容，ESC退出输入，Ctrl + Enter",
		Text,
		[
			{
				caption: "取消编辑",
				action: () => {
					insertType = false;
					return;
				}
			},
			{
				caption: "完成编辑",
				action: () => {
					insertType = true;
					return;
				}
			}
		],
		10,
		true
	);
	return { insertType, inputText };
}

// 由文件列表和el元素获取文件路径(相对路径)
function getFilePath(files, el) {
	let files2 = files.filter(f => path.basename(f.path).replace(".md", "").endsWith(el.link.replace(/\[\[/, "").replace(/\|.*]]/, "").replace(/\]\]/, "").replace(".md", "")));
	let filePath = files2.map((f) => f.path)[0];
	console.log(filePath);
	return filePath;
}