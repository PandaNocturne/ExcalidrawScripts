if (!ea.verifyMinimumPluginVersion || !ea.verifyMinimumPluginVersion("1.8.25")) {
    new Notice("This script requires a newer version of Excalidraw. Please install the latest version.");
    return;
}

const api = ea.getExcalidrawAPI();
const win = ea.targetView.ownerWindow;
if (!win.NumberMode) win.NumberMode = {};

if (typeof win.NumberMode.penOnly === "undefined") {
    win.NumberMode.penOnly = false;
}

let windowOpen = false; //to prevent the modal window to open again while writing with scribble
let prevZoomValue = api.getAppState().zoom.value; //used to avoid trigger on pinch zoom

let selectedTextElements = ea.getViewSelectedElements().filter(el => el.type === "text");

//-------------------------------------------
// Functions to add and remove event listners
//-------------------------------------------
const addEventHandler = (handler) => {
    if (win.NumberMode.eventHandler) {
        win.removeEventListner("pointerdown", handler);
    }
    win.addEventListener("pointerdown", handler);
    win.NumberMode.eventHandler = handler;
    win.NumberMode.window = win;
};

const removeEventHandler = (handler) => {
    win.removeEventListener("pointerdown", handler);
    delete win.NumberMode.eventHandler;
    delete win.NumberMode.window;
};

//Stop the script if scribble helper is clicked and no eligable element is selected
let silent = false;
if (win.NumberMode?.eventHandler) {
    removeEventHandler(win.NumberMode.eventHandler);
    delete win.NumberMode.eventHandler;
    delete win.NumberMode.window;
    if (!(containerElements.length === 1 || selectedTextElements.length === 1)) {
        new Notice("🟠已退出编号模式", 1000);
        return;
    }
    silent = true;
}

// ----------------------
// Custom dialog controls
// ----------------------
win.NumberMode.penOnly ??= false;
win.NumberMode.penDetected ??= false;
win.NumberMode.bulletedNumber ??= 1;


let timer = Date.now();
let eventHandler = () => { };

// -------------------------------
// Click / dbl click event handler
// -------------------------------
eventHandler = async (evt) => {
    if (windowOpen) return;
    if (ea.targetView !== app.workspace.activeLeaf.view) removeEventHandler(eventHandler);
    if (evt && evt.target && !evt.target.hasClass("excalidraw__canvas")) return;
    if (evt && (evt.ctrlKey || evt.altKey || evt.metaKey || evt.shiftKey)) return;

    const st = api.getAppState();

    //don't trigger text editor when editing a line or arrow
    if (st.editingElement && ["arrow", "line"].contains(st.editingElment.type)) return;

    if (typeof win.NumberMode.penOnly === "undefined") {
        win.NumberMode.penOnly = false;
    }
    const now = Date.now();

    //the <50 condition is to avoid false double click when pinch zooming
    const DBLCLICKTIMEOUT = 400;
    if ((now - timer > DBLCLICKTIMEOUT) || (now - timer < 50)) {
        prevZoomValue = st.zoom.value;
        timer = now;
        containerElements = ea.getViewSelectedElements()
            .filter(el => ["arrow", "rectangle", "ellipse", "line", "diamond"].contains(el.type));
        selectedTextElements = ea.getViewSelectedElements().filter(el => el.type === "text");
        return;
    }

    //further safeguard against triggering when pinch zooming
    if (st.zoom.value !== prevZoomValue) return;

    //sleeping to allow keyboard to pop up on mobile devices
    await sleep(50);
    ea.clear();

    //if a single element with text is selected, edit the text
    //(this can be an arrow, a sticky note, or just a text element)
    // ... existing code ...
    if (selectedTextElements.length === 1) {
        editExistingTextElement(selectedTextElements);
        return;
    }

    //if no text elements are selected (i.e. not multiple text  elements selected),
    //check if there is a single eligeable container selected
    let containerID;
    let container;
    if (selectedTextElements.length === 0) {
        if (containerElements.length === 1) {
            ea.copyViewElementsToEAforEditing(containerElements);
            containerID = containerElements[0].id;
            container = ea.getElement(containerID);
        }
    }

    if (ea.targetView !== app.workspace.activeLeaf.view) return;

    // 开始编号
    windowOpen = true;
    bulletedNumberIndex = win.NumberMode.bulletedNumber ?? 1;
    console.log("当前编号: ", bulletedNumberIndex); // 添加调试信息
    if (st) {
        for (s in st) {
            if (s.startsWith("currentItem")) {
                ea.style[`${s.charAt(11).toLowerCase() + s.slice(12)}`] = st[s];
                // console.log(`${s}: ${ea.style[s]}`)
            }
        }
    }
    // 字体设置
    ea.style.strokeColor = '#1e1e1e';
    // 最好选用3号等宽字体
    ea.style.fontFamily = 3;
    // 边框设置
    ea.style.roughness = 0;
    ea.style.strokeWidth = 1;
    const { width, height } = ea.measureText(`${bulletedNumberIndex}`);
    const maxSize = Math.max(width, height) + 2;
    const padding = maxSize * 0.5;
    const id = ea.addText(0, 0, `${bulletedNumberIndex}`, {
        width: maxSize,
        height: maxSize,
        box: "ellipse",
        wrapAt: 0,
        boxPadding: padding,
        textAlign: "center",
        textVerticalAlign: "middle",
        boxStrokeColor: "black",
        boxPadding: 2
    });
    const box = ea.getElement(id);
    const colorList = ["#FF595E", "#FFCA3A", "#8AC926", "#1982C4", "#6A4C93"];
    box.backgroundColor = colorList[(bulletedNumberIndex - 1) % colorList.length];
    box.width = maxSize + 2 * padding;
    box.height = maxSize + 2 * padding;
    win.NumberMode.bulletedNumber += 1;
    console.log("更新后的编号: ", win.NumberMode.bulletedNumber); // 添加调试信息
    ea.addElementsToView(true, true, true);
    windowOpen = false;
    // ... existing code ...
};

// ---------------------
// Edit Existing Element
// ---------------------
const editExistingTextElement = async (elements) => {
    windowOpen = true;
    let isModified = false;
    ea.copyViewElementsToEAforEditing(elements);
    const el = ea.getElements()[0];
    ea.style.strokeColor = el.strokeColor;
    const text = await utils.inputPrompt(
        "重新设置编号",
        "输入数字",
        elements[0].rawText,
        [
            {
                caption: "取消",
                action: () => { isModified = false; return; }
            },
            {
                caption: "编辑",
                action: () => { isModified = true; return; }
            }
        ],
        1,
        true
    );
    if (isModified) {
        win.NumberMode.bulletedNumber = Number(text) + 1;
    }
    windowOpen = false;
    if (!text) return;
    el.originalText = text;
    el.text = text;
    el.rawText = text;
    ea.refreshTextElementSize(el.id);
    await ea.addElementsToView(false, false);

    if (el.containerId) {
        const containers = ea.getViewElements().filter(e => e.id === el.containerId);
        api.updateContainerSize(containers);
        ea.selectElementsInView(containers);
    }
};

//--------------
// Start actions
//--------------
if (!win.NumberMode?.eventHandler) {
    if (!silent) new Notice(
        "✅已启动编号模式，双击添加num\n" +
        "⏩双击num可以重新编辑编号\n" +
        "⏹再次运行脚本即可退出编号模式",
        5000
    );
    addEventHandler(eventHandler);
}

if (containerElements.length === 1 || selectedTextElements.length === 1) {
    timer = timer - 100;
    eventHandler();
}