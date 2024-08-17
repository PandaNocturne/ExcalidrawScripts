let api = ea.getExcalidrawAPI();

let settings = ea.getScriptSettings();
//set default values on first run
if (!settings["animationGapMs"]) {
	settings = {
		"animationGapMs": {
			value: 400,
			description: "动画过程中的播放的间隙(ms)",
		},
		"playTextFormat": {
			value: "word",
			valueset: ["letter", "word", "paragraph"],
			description: "字母(letter)、单词(word)、整段(paragraph)的播放文字<br>推荐使用单词(word)的模式",

		},
		"wordPlaybackSpeed": {
			value: 50,
			description: "单词加载的间隙(ms)",
		}
	};
	ea.setScriptSettings(settings);
}


// 排除一些指定元素
const specialTextMatch = /^[(PS)]/;
const selectedEls = ea.getViewSelectedElements().filter(el => !specialTextMatch.test(el.text)).filter(el => !(el.type == "frame"));

const allEls = ea.getViewElements().filter(el => !specialTextMatch.test(el.text)).filter(el => !(el.type == "frame"));


function elementsSort(elements, key = 'version') {
	// default ordered by uptated time
	// [older -> newer]
	let result = elements.slice(0);
	return result.sort((a, b) => a[key] - b[key]);
}


let updatedEls;

if (Object.keys(selectedEls).length !== 0) {
	updatedEls = elementsSort(selectedEls, 'y');
	updatedEls = elementsSort(selectedEls, 'x');

} else {
	if (confirm("是否进行全局播放？")) {
		updatedEls = elementsSort(allEls, 'y');
		// updatedEls = elementsSort(allEls, 'x');

	} else {
		new Notice(`❎退出播放！`, 2000);
	}
}


for (let el of updatedEls) {
	// 逐步显示元素
	el.opacity = 0;
	ea.copyViewElementsToEAforEditing([el]);
	ea.addElementsToView();
}

async function animateElements() {
	for (let el of updatedEls) {
		// 逐步显示元素
		await new Promise(resolve => setTimeout(resolve, 300));
		// el.clear()

		if (el.type == "text") {
			// 单词添加时间间隔(ms)
			let spaceTime = settings["wordPlaybackSpeed"].value;

			// 保存原始数据
			let elText = el.originalText;
			let elOriginalText = el.originalText;
			let elRawText = el.rawText;

			let words = "";
			let wordList = elOriginalText.split("");

			for (let word of wordList) {

				if (settings["playTextFormat"].value == "paragraph") break;
				el.opacity = 100;
				words += word;
				el.originalText = el.rawText = el.text = words;

				if (/[^a-zA-Z0-9]/g.test(word)) {
					ea.copyViewElementsToEAforEditing([el]);

					// 添加元素但不保存
					ea.addElementsToView(false, false);
					await new Promise(resolve => setTimeout(resolve, spaceTime));
				} else {
					if (settings["playTextFormat"].value == "word") continue;
					// 用于分割单词的
					ea.copyViewElementsToEAforEditing([el]);
					ea.addElementsToView(false, false);
					await new Promise(resolve => setTimeout(resolve, spaceTime));
					// continue
				}

			}

			el.opacity = 100;

			// 还原原始数据
			el.originalText = elOriginalText;
			el.rawText = elRawText;
			el.text = elText;

			ea.copyViewElementsToEAforEditing([el]);
			// 添加但不保存
			ea.addElementsToView(false, false);
			await new Promise(resolve => setTimeout(resolve, spaceTime));

		} else {
			await new Promise(resolve => setTimeout(resolve, settings["animationGapMs"].value));
			el.opacity = 100;
			ea.copyViewElementsToEAforEditing([el]);

			// 添加元素并保存
			ea.addElementsToView(false, false);
		}

	}

	for (el of updatedEls) {
		el.opacity = 100;
		ea.copyViewElementsToEAforEditing([el]);

		// 添加元素并保存
		ea.addElementsToView(false, true);
	}
	new Notice(`✅回放已完成！`, 2000);
}

animateElements();

