/*
![](https://raw.githubusercontent.com/zsviczian/obsidian-excalidraw-plugin/master/images/scripts-font-family.jpg)

Sets font family of the text block (Virgil, Helvetica, Cascadia, localFont). Useful if you want to set a keyboard shortcut for selecting font family.

This script is adapted from Set Font Family script.

See documentation for more details about Set Font Family script:
https://zsviczian.github.io/obsidian-excalidraw-plugin/ExcalidrawScriptsEngine.html

```javascript
*/
// 设置quickerInsetNote模板设置
let settings = ea.getScriptSettings();
//set default values on first run
if (!settings["fontFamilyFolderPath"]) {
	settings = {
		"fontFamilyFolderPath": {
			value: "Excalidraw/fonts",
		}
	};
	ea.setScriptSettings(settings);
}

// ... 现有代码 ...
const fs = require('fs');
const path = require('path');

// 获取库的基本路径
const basePath = (app.vault.adapter).getBasePath();
// 自定义字体文件路径
const customFontsPath = settings["fontFamilyFolderPath"].value;

// 获取指定路径下的所有字体文件，包括子文件夹
const getAllFonts = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllFonts(file));
        } else if (/\.(ttf|woff|woff2)$/i.test(file)) {
            results.push(path.basename(file));
        }
    });
    return results;
};

// 用户自定义字体，这里的名称是字体的文件名（支持ttf,woff,woff2）
const customFonts = getAllFonts(path.join(basePath, customFontsPath));
// ... 现有代码 ...
//内置字体，内置字体不可更改
const builtInfonts = ["Virgil", "Helvetica", "Cascadia"];
// 初始化参数
elements = ea.getViewSelectedElements().filter((el) => el.type === "text");
if (elements.length === 0) {
	new Notice("Select at least one element");
	return;
}
const customFontNames = customFonts.map(f => f.split(".")[0]);
const fonts = [...builtInfonts, ...customFontNames];
let font = await utils.suggester(fonts, fonts);
let customFont = "";
//更新元素字体
const updateElements = (font) => {
	elements.forEach((el) => el.fontFamily = font);
	ea.copyViewElementsToEAforEditing(elements);
	ea.addElementsToView(false, false);
};
if (builtInfonts.includes(font)) {
	// 内置字体
	font = builtInfonts.indexOf(font);
	font = font === -1 ? 1 : font + 1;
	updateElements(font);
} else if (customFont = customFonts.find(f => f.startsWith(font))) {
	// 修改本地自定义字体为选择的字体
	const excalidraw = app.plugins.plugins['obsidian-excalidraw-plugin'];
	excalidraw.settings.experimantalFourthFont = `${customFontsPath.replace(/^\/|\/$/g, "")}/${customFont}`;
	await excalidraw.saveData(excalidraw.settings);

	// 重写添加字体函数
	const originalAddFonts = excalidraw.addFonts;
	excalidraw.addFonts = async (declarations, ownerDocument = document) => {
		const FONTS_STYLE_ID = "excalidraw-fonts";
		const newStylesheet = ownerDocument.createElement("style");
		newStylesheet.id = FONTS_STYLE_ID;
		newStylesheet.textContent = declarations.join("");
		const oldStylesheet = ownerDocument.getElementById(FONTS_STYLE_ID);
		ownerDocument.head.appendChild(newStylesheet);
		if (oldStylesheet) {
			ownerDocument.head.removeChild(oldStylesheet);
		}
		// 等待字体加载完毕
		await ownerDocument.fonts.load('20px LocalFont');

		// 字体加载完毕，修改元素字体
		font = 4;
		updateElements(font);
		// 恢复字体添加函数
		excalidraw.addFonts = originalAddFonts;
	};
	// 开始初始化字体
	excalidraw.initializeFonts();
} else {
	// 默认使用Virgil字体
	font = 1;
	updateElements(font);
}

