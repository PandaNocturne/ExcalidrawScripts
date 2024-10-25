/*

```javascript
*/

let settings = ea.getScriptSettings();
//set default values on first run
if (!settings["Zotero Library Path"]) settings["Zotero Library Path"] = { value: false };
if (!settings["Zotero Library Path"].value) {
	new Notice("🔴请配置Zotero的Library路径和其他相关设置！", 2000);
	settings = {
		"Zotero Library Path": {
			value: "D:/Zotero/cache/library",
			description: "Zotero Library的路径，比如：D:/Zotero/cache/library"
		},
		"Zotero Images Path": {
			value: "Y-图形文件存储/ZoteroImages",
			description: "Obsidian库内存放Zotero的图片的相对路径，比如：Y-图形文件存储/ZoteroImages"
		},
		"Zotero Annotations Color": {
			value: false,
			description: "是否开启匹配Zotero的颜色选项栏<br>❗注：匹配颜色选项需要修改Zotero的高亮标注模板",
		},
	};
	ea.setScriptSettings(settings);
} else {
	new Notice("✅ZoteroToExcalidraw脚本已启动！");
}

const path = require('path');
const fs = require("fs");

// 获取库的基本路径
const basePath = (app.vault.adapter).getBasePath();
// 📌修改到Zotero的library文件夹
const zotero_library_path = settings["Zotero Library Path"].value;
// 设置相对路径
const relativePath = settings["Zotero Images Path"].value;

// let api = ea.getExcalidrawAPI();
let el = ea.targetView.containerEl.querySelectorAll(".excalidraw-wrapper")[0];

let InsertStyle;
if (settings["Zotero Annotations Color"].value) {
	const fillStyles = ["文字", "背景"];
	InsertStyle = await utils.suggester(fillStyles, fillStyles, "选择插入卡片颜色的形式，ESC则为白底黑字)");
}
const eaApi = ExcalidrawAutomate;

eaApi.onDropHook = async function ({ ea, payload, event, pointerPosition }) {
	console.log("ondrop");
	event.preventDefault();
	var insert_txt = event.dataTransfer.getData("Text");
	const ondropType = event.dataTransfer.files.length;
	console.log(ondropType);

	if (insert_txt.includes("zotero://")) {
		// 格式化文本(去空格、全角转半角)  
		insert_txt = processText(insert_txt);
		// 清空原本投入的文本
		event.stopPropagation();
		console.log("✔Zotero ondrop");
		console.log(pointerPosition);
		await processZoteroData(ea, insert_txt, pointerPosition);
	} else if (ondropType < 1) {
		// 清空原本投入的文本
		event.stopPropagation();
		ea.clear();
		// 格式化文本(去空格、全角转半角)  
		insert_txt = processText(insert_txt);
		console.log("文本格式化");
		let width = insert_txt.length > 30 ? 600 : insert_txt.length * 15;
		const id = await ea.addText(0, 0, `${insert_txt} `, { width: width, box: true, wrapAt: 90, textAlign: "left", textVerticalAlign: "middle", box: "box" });
		let el = ea.getElement(id);
		// 计算中心位置
		el.x = pointerPosition?.x - (el.width / 2);
		el.y = pointerPosition?.y - (el.height / 2);
		el.height = el.height - 100;
		await ea.addElementsToView(false, true, false);
	};
	// if (ea.targetView.draginfoDiv) {
	// 	document.body.removeChild(ea.targetView.draginfoDiv);
	// 	delete ea.targetView.draginfoDiv;
	// };
};

eaApi.onPasteHook = async function ({ ea, payload, event, excalidrawFile, view, pointerPosition }) {
	console.log("onPaste");
	event.preventDefault();
	const inputText = payload.text;

	if (payload?.text?.includes('zotero://')) {
		console.log("匹配成功");
		// 清空原本投入的文本
		event.stopPropagation();
		payload.text = "";
		insert_txt = processText(inputText);
		event.stopPropagation();
		console.log("✔Zotero onPasteHook");
		console.log(pointerPosition);
		await processZoteroData(ea, insert_txt, pointerPosition);
	}
};

async function processZoteroData(ea, insert_txt, pointerPosition) {
	ea.setView("active");
	ea.clear();
	ea.style.strokeStyle = "solid";
	ea.style.fillStyle = 'solid';
	ea.style.roughness = 0;
	ea.style.backgroundColor = "transparent";
	ea.style.strokeColor = "#1e1e1e";
	// ea.style.roundness = { type: 3 }; // 圆角
	ea.style.strokeWidth = 0.5;
	ea.style.fontFamily = 4;
	ea.style.fontSize = 20;

	let zotero_color = match_zotero_color(insert_txt);
	if (zotero_color) {
		if (InsertStyle == "背景") {
			ea.style.backgroundColor = zotero_color;
			ea.style.strokeColor = "#1e1e1e";
		} else if (InsertStyle == "文字") {
			ea.style.backgroundColor = "#ffffff";
			ea.style.strokeColor = zotero_color;
		} else {
			ea.style.backgroundColor = "transparent";
			ea.style.strokeColor = "#1e1e1e";
		}
	} else {
		ea.style.backgroundColor = "transparent";
		ea.style.strokeColor = "#1e1e1e";
	}

	zotero_txt = match_zotero_txt(insert_txt);
	zotero_author = match_zotero_author(insert_txt);
	zotero_link = match_zotero_link(insert_txt);

	if (zotero_author) {
		zotero_author = `(${zotero_author})`;
	} else {
		zotero_author = `(Zotero)`;
	}

	zotero_comment = match_zotero_comment(insert_txt);
	if (zotero_comment) {
		zotero_comment = `\n\n${zotero_comment}`;
	}

	if (zotero_txt) {
		console.log("ZoteroText");
		let id = await ea.addText(
			null,
			null,
			`${zotero_txt}${zotero_comment}`,
			{
				width: 400,
				box: true,
				wrapAt: 99,
				textAlign: "left",
				textVerticalAlign: "middle",
				box: "box"
			}
		);
		let el = ea.getElement(id);
		el.link = `[${zotero_author}](${zotero_link})`;
		// 计算中心位置
		el.x = pointerPosition?.x - (el.width / 2);
		el.y = pointerPosition?.y - (el.height / 2);
		el.height = el.height - 100;
		await ea.addElementsToView(false, true, false);
	} else {
		console.log("ZoteroImage");
		let zotero_image = match_zotero_image(insert_txt);
		let zotero_image_name = `${zotero_image}.png`;
		let Obsidian_image_Path = `${basePath}/${relativePath}/${zotero_image_name}`;
		if (!fs.existsSync(`${basePath}/${relativePath}`)) {
			fs.mkdirSync(path.dirname(`${basePath}/${relativePath}`), { recursive: true });
		}
		let zotero_image_path = `${zotero_library_path}/${zotero_image_name}`;
		fs.copyFileSync(zotero_image_path, Obsidian_image_Path);
		let id = await ea.addImage(null, null, zotero_image_name);
		let el = ea.getElement(id);
		el.link = `[${zotero_author}](${zotero_link})`;
		await new Promise((resolve) => setTimeout(resolve, 200));
		await ea.addElementsToView(true, true, false);
	}
}

function processText(text) {
	// 替换特殊空格为普通空格
	text = text.replace(/[\ue5d2\u00a0\u2007\u202F\u3000\u314F\u316D\ue5cf]/g, ' ');
	// 将全角字符转换为半角字符
	text = text.replace(/[\uFF01-\uFF5E]/g, function (match) { return String.fromCharCode(match.charCodeAt(0) - 65248); });
	// 替换英文之间的多个空格为一个空格
	text = text.replace(/([a-zA-Z])([\u4e00-\u9fa5])/g, '$1 $2');

	// 删除中文之间的空格
	text = text.replace(/([\u4e00-\u9fa5]) +([\u4e00-\u9fa5])/g, '$1$2');
	text = text.replace(/([\u4e00-\u9fa5]) +([\u4e00-\u9fa5])/g, '$1$2');
	text = text.replace(/([\u4e00-\u9fa5]) +/g, '$1');
	text = text.replace(/ +([\u4e00-\u9fa5])/g, '$1');

	// // // 在中英文之间添加空格
	// // text = text.replace(/([\u4e00-\u9fa5])([a-zA-Z])/g, '$1 $2');
	// // text = text.replace(/([a-zA-Z])([\u4e00-\u9fa5])/g, '$1 $2');

	return text;
}

function match_zotero_color(text) {
	const regex = /#[a-zA-Z0-9]{6}/;
	const matches = text.match(regex);
	return matches ? matches[0] : "";
}

function match_zotero_txt(text) {
	const regex = /“(.*)” \(/;
	const matches = text.match(regex);
	return matches ? matches[1] : "";
}

function match_zotero_author(text) {
	const regex = /\(\[(.*\d+)]\(/;
	const matches = text.match(regex);
	return matches ? matches[1] : "";
}

function match_zotero_link(text) {
	const regex = /\[pdf\]\((.*)\)\)/;
	const matches = text.match(regex);
	return matches ? matches[1].replace("page=NaN&", "") : "";
}

function match_zotero_comment(text) {
	const regex = /.*\)\).*\)\)([\s\S]*)/;
	const matches = text.match(regex);
	return matches ? matches[1] : "";
}

function match_zotero_image(text) {
	const regex = /annotation=(\w*)/;
	const matches = text.match(regex);
	return matches ? matches[1] : "";
}
