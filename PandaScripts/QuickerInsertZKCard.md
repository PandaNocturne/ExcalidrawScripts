
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
			value: "200【日记】Daily/230_QuickNotes",
			description: "TimeStampNote的存放路径(相对路径)<br>eg：D-每日生活记录/QuickNotes<br>空值：默认为当前笔记路径"
		},
		"QuickerInsertZKCardTemplate": {
			value: "YYYY/YYYY-MM/[QuickNote]-YYYYMMDDHHmmss",
			description: "TimeStampNote默认名称，若为存储路径用/隔开<br>eg：YYYYMM/YYYYMMDDHHMMSS"
		},
		"QuickerInsertZKCardYaml": {
			value: "",
			height: "250px",
			description: "设定笔记模板"
		},
		"QuickerInsertZKCardImagePath": {
			value: "Y-图形文件存储/Excalidraw图形/Icons",
			description: "配置图标的文件夹",
		},
		"Default Insert Type": {
			value: "Box",
			valueset: ["Card", "Frame", "Link", "Image", "Box", "无"],
			description: "Card(图标类型卡片)、Frame(嵌入式Frame)、Link(笔记链接)、Image(SVG图片)<br>无：ESC或回车退出，其他类型则直接创建",
		}
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


// 设置默认值
let fileAlistName = "";
let InsertType = settings["Default Insert Type"].value;

listFiles = fileListByPath(settings["QuickerInsertZKCardImagePath"].value);
listFiles.sort((a, b) => a.localeCompare(b));
let listFileNames = [];
for (i of listFiles) {
	listFileNames.push(path.basename(i));
}
console.log(listFileNames);

let insertImageName = listFileNames[0];
console.log(insertImageName);

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

			// 删除文件
			if ((app.vault.adapter).exists(filePaths)) {
				(app.vault.adapter).trashLocal(filePaths);
			}
		}

	}
	await ea.addElementsToView(false, true);
	await ea.getExcalidrawAPI().history.clear(); //避免撤消/重做扰乱
	return; // 提前结束函数的执行

}

// 配置按钮
const customControls = (container) => {
	new ea.obsidian.Setting(container)
		.setName(`插入笔记图标`)
		.addDropdown(dropdown => {
			listFileNames.forEach(fileName => dropdown.addOption(fileName, fileName));
			dropdown
				.setValue(insertImageName)
				.onChange(value => {
					insertImageName = value;
				});
		});
};

// 输入框
fileAlistName = await utils.inputPrompt(
	"时间戳笔记别名",
	"输入文件名别名，则生成YYYY-MM-DD_别名.md到根目录，时间戳笔记则按配置来。",
	"",
	[
		{
			caption: "Card",
			action: () => { InsertType = "Card"; return; }
		},
		{
			caption: "DrawIO",
			action: () => { InsertType = "DrawIO"; return; }
		},
		{
			caption: "Link",
			action: () => { InsertType = "Link"; return; }
		},
		{
			caption: "Embed",
			action: () => { InsertType = "Embed"; return; }
		},
		{
			caption: "Image",
			action: () => { InsertType = "Image"; return; }
		},
		{
			caption: "Box",
			action: () => { InsertType = "Box"; return; }
		}
	],
	1,
	false,
	customControls
);

// 时间戳笔记路径
const timestamp2 = quickaddApi.date.now("YYYY-MM-DD");
const filePath = fileAlistName ? `${timestamp2}_${fileAlistName}` : `${folderPath}/${timestamp}`;

console.log(filePath);

const fileName = path.basename(filePath).replace(/\.md/, "");
if (!fileName) return;
console.log([filePath, fileName]);

// 获取Obsidian文件对象
const rootFolder = app.vault.getRoot();
console.log(rootFolder);


// 设置默认输入文本
// let inputText = "";

// 添加Markdown文件为图片到当前文件
if (InsertType == "Card") {
	let { insertType, inputText } = await openEditPrompt();
	if (!insertType) return;
	await app.fileManager.createNewFile(rootFolder, filePath, "md", inputText ? `${Yaml}\n${inputText}` : `${Yaml}`);
	let id = await ea.addImage(0, 0, insertImageName);
	let el = ea.getElement(id);
	el.link = `[[${fileName}]]`;
	el.width = 50;
	el.height = 50;
} else if (InsertType == "DrawIO") {

	const file = await app.vault.create(filePath + ".svg", `<?xml version="1.0" encoding="UTF-8"?>
	<!-- Do not edit this file with editors other than draw.io -->
	<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
	<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="121px" height="61px" viewBox="-0.5 -0.5 121 61" content="&lt;mxfile host=&quot;Electron&quot; modified=&quot;2024-03-26T18:36:31.558Z&quot; agent=&quot;Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) draw.io/22.1.2 Chrome/114.0.5735.289 Electron/25.9.4 Safari/537.36&quot; version=&quot;22.1.2&quot; etag=&quot;6jUmPoDIbaMuVkNrG8wL&quot; type=&quot;device&quot;&gt;&#10;  &lt;diagram id=&quot;kOIW-Le-9488fyQj6XGg&quot; name=&quot;第 1 页&quot;&gt;&#10;    &lt;mxGraphModel dx=&quot;1044&quot; dy=&quot;631&quot; grid=&quot;1&quot; gridSize=&quot;10&quot; guides=&quot;1&quot; tooltips=&quot;1&quot; connect=&quot;1&quot; arrows=&quot;1&quot; fold=&quot;1&quot; page=&quot;1&quot; pageScale=&quot;1&quot; pageWidth=&quot;1169&quot; pageHeight=&quot;827&quot; math=&quot;0&quot; shadow=&quot;0&quot;&gt;&#10;      &lt;root&gt;&#10;        &lt;mxCell id=&quot;0&quot; /&gt;&#10;        &lt;mxCell id=&quot;1&quot; parent=&quot;0&quot; /&gt;&#10;        &lt;mxCell id=&quot;icEzPTEzaMPsEqdaMNKT-1&quot; value=&quot;&quot; style=&quot;rounded=0;whiteSpace=wrap;html=1;&quot; vertex=&quot;1&quot; parent=&quot;1&quot;&gt;&#10;          &lt;mxGeometry x=&quot;440&quot; y=&quot;200&quot; width=&quot;120&quot; height=&quot;60&quot; as=&quot;geometry&quot; /&gt;&#10;        &lt;/mxCell&gt;&#10;      &lt;/root&gt;&#10;    &lt;/mxGraphModel&gt;&#10;  &lt;/diagram&gt;&#10;&lt;/mxfile&gt;&#10;"><defs/><g><rect x="0" y="0" width="120" height="60" fill="rgb(255, 255, 255)" stroke="rgb(0, 0, 0)" pointer-events="all"/></g></svg>`);
	let id = await ea.addImage(0, 0, file);
	let el = ea.getElement(id);
	el.link = `[[${fileName + ".svg"}]]`;
	el.width = 400;
	el.height = 200;
	await ea.addElementsToView(false, true);
	// 用默认应用打开
	app.openWithDefaultApp(filePath + ".svg");

} else if (InsertType == "Link") {
	let { insertType, inputText } = await openEditPrompt();
	if (!insertType) return;
	await app.fileManager.createNewFile(rootFolder, filePath, "md", inputText ? `${Yaml}\n${inputText}` : `${Yaml}`);
	let id = await ea.addText(0, 0, fileAlistName ? `[[${fileName}|${fileAlistName}]]` : `[[${fileName}|📝]]`);

	let el = ea.getElement(id);
	el.link = `[[${fileName}]]`;
	el.fontSize = 80;


} else if (InsertType == "Embed") {
	let { insertType, inputText } = await openEditPrompt();
	if (!insertType) return;

	// 设定固定Yaml
	let file = await app.fileManager.createNewFile(rootFolder, filePath, "md", inputText ? `${Yaml}\n${inputText}` : `${Yaml}`);

	// 设置Frame样式
	ea.style.strokeColor = "#1e1e1e";
	ea.style.strokeStyle = "solid";
	ea.style.fillStyle = "solid";
	ea.style.backgroundColor = "#FFFFFF";
	ea.style.roughness = 0;
	// ea.style.roundness = { type: 3 };
	ea.style.strokeWidth = 1;

	let id = await ea.addIFrame(0, 0, 400, 200, 0, file);
	let el = ea.getElement(id);
	el.link = `[[${fileName}]]`;


} else if (InsertType == "Image") {
	let { insertType, inputText } = await openEditPrompt();
	if (!insertType) return;

	// 插入图片建议不用Yaml
	let file = await app.fileManager.createNewFile(rootFolder, filePath, "md", inputText ? `${Yaml}\n${inputText}` : "");

	let id = await ea.addImage(0, 0, file);
	let el = ea.getElement(id);
	el.link = `[[${fileName}]]`;

} else if (InsertType == "Box") {
	let { insertType, inputText } = await openEditPrompt();
	if (!insertType) return;

	ea.style.backgroundColor = "transparent";
	ea.style.strokeColor = "#1e1e1e";
	ea.style.fillStyle = 'solid';
	ea.style.roughness = 0;
	// ea.style.roundness = { type: 3 }; // 圆角
	ea.style.strokeWidth = 2;
	ea.style.fontFamily = 4;
	ea.style.fontSize = 20;

	let id = await ea.addText(0, 0, inputText,
		{
			width: 500,
			box: true,
			wrapAt: 90,
			textAlign: "left",
			textVerticalAlign: "middle",
			box: "box"
		});

	let el = ea.getElement(id);

} else {
	return;

};

await ea.addElementsToView(true, true);
ea.moveViewElementToZIndex(el.id, 99);

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