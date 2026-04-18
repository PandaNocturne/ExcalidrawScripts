/*
## StyleBrush 
2025-12-24 版本0.1.0 sasa
 
吸取和复制样式
**启动**：选中一个物体 -> 点击脚本 -> 提示“🖌️ 格式刷已激活”。
**连续应用**：此时脚本不会结束。您可以连续点击画布上的物体 A、物体 B、物体 C……每点击选中一个，它就会自动变成源样式。
**退出**：点击画布空白处（取消所有选中）-> 脚本自动停止，提示“🏁 格式刷已停止”。
 
```javascript
*/

const api = ea.getExcalidrawAPI();
const selectedElements = ea.getViewSelectedElements();
const allElements = api.getSceneElements();

// --- 0. 防止重复运行 (如果已经激活，先停止旧的) ---
if (window.BrushCleanup) {
    window.BrushCleanup();
    // 如果用户是在选中状态下再次点击脚本，可能是想重新吸取，所以我们继续执行
    // 如果没选中东西点击脚本，就在清理后直接退出
    if (!selectedElements || selectedElements.length === 0) {
        new Notice("🏁 格式刷已手动停止");
        return;
    }
}

// 如果一开始就没选中东西，直接退出
if (!selectedElements || selectedElements.length === 0) {
    new Notice("⚠️ 请先选中一个物体作为样式源");
    return;
}

// --- 1. 核心工具：测量文本尺寸 (保持 V7 的修复逻辑) ---
const measureTextSize = (text, fontSize, fontFamily) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let fontString = "";
    if (fontFamily === 1) fontString = `${fontSize}px Virgil, Segoe UI Emoji`;
    else if (fontFamily === 2) fontString = `${fontSize}px Helvetica, Segoe UI Emoji`;
    else if (fontFamily === 3) fontString = `${fontSize}px Cascadia, Segoe UI Emoji`;
    else fontString = `${fontSize}px Virgil, Segoe UI Emoji`;
    ctx.font = fontString;
    
    const lines = text.split("\n");
    let maxWidth = 0;
    lines.forEach(line => {
        const width = ctx.measureText(line).width;
        if (width > maxWidth) maxWidth = width;
    });
    const lineHeight = fontSize * 1.25;
    const totalHeight = lines.length * lineHeight;
    return { width: maxWidth + 10, height: totalHeight };
};

const getBoundTextElement = (containerId, currentElements) => {
    return currentElements.find(el => el.containerId === containerId && el.type === "text");
};

// --- 2. 吸取样式 (只执行一次) ---
const source = selectedElements[0];
let textSource = source;
if (source.type !== "text") {
    const boundText = getBoundTextElement(source.id, allElements);
    if (boundText) textSource = boundText;
}

const style = {
    strokeColor: source.strokeColor,
    backgroundColor: source.backgroundColor,
    fillStyle: source.fillStyle,
    strokeWidth: source.strokeWidth,
    strokeStyle: source.strokeStyle,
    strokeSharpness: source.strokeSharpness,
    roughness: source.roughness,
    opacity: source.opacity,
    startArrowhead: source.startArrowhead,
    endArrowhead: source.endArrowhead,
    // 文本相关
    textStrokeColor: textSource.strokeColor, 
    fontFamily: textSource.fontFamily,
    fontSize: textSource.fontSize,
    textAlign: textSource.textAlign,
    verticalAlign: textSource.verticalAlign
};

new Notice("🖌️ 格式刷已激活：点击物体应用，点空白处退出");

// --- 3. 启动监听器 (Continuous Mode) ---

// 记录已经被处理过的元素ID，防止同一个物体被无限重复刷
let processedIds = new Set(selectedElements.map(el => el.id));

// 定义清理函数 (停止监听)
const cleanup = () => {
    if (window.BrushUnsubscribe) {
        window.BrushUnsubscribe(); // 取消 Excalidraw 的监听
        window.BrushUnsubscribe = null;
    }
    window.BrushCleanup = null;
    delete window.BrushActive;
};

// 将清理函数挂载到 window，以便下次运行时可以调用
window.BrushCleanup = cleanup;

// 定义核心处理逻辑
const handleSceneChange = (elements, appState) => {
    // 1. 检查是否点击了空白处 (没有选中任何东西)
    const currentSelectedIds = Object.keys(appState.selectedElementIds);
    if (currentSelectedIds.length === 0) {
        cleanup();
        new Notice("🏁 格式刷已停止");
        return;
    }

    // 2. 筛选出新选中的、且还没被刷过的物体
    const newTargets = currentSelectedIds.filter(id => !processedIds.has(id));

    if (newTargets.length === 0) return; // 还是原来的物体，不处理

    // 3. 开始应用样式
    // 注意：我们需要重新获取全量元素，因为场景可能已经变了
    // 这里的 elements 参数就是最新的场景元素
    const currentAllElements = elements; 
    
    // 找出涉及到的所有元素 (目标 + 绑定的文字)
    let idsToUpdate = new Set();
    newTargets.forEach(id => {
        idsToUpdate.add(id);
        processedIds.add(id); // 标记为已处理
        
        const targetEl = currentAllElements.find(e => e.id === id);
        if (targetEl && targetEl.type !== "text") {
             const boundText = getBoundTextElement(id, currentAllElements);
             if (boundText) {
                 idsToUpdate.add(boundText.id);
                 processedIds.add(boundText.id);
             }
        }
    });

    // 构建更新后的元素列表
    const updatedSceneElements = currentAllElements.map(el => {
        if (idsToUpdate.has(el.id)) {
            const newEl = { ...el };

            if (newEl.type === "text") {
                if (style.fontFamily !== undefined) newEl.fontFamily = style.fontFamily;
                if (style.fontSize !== undefined) newEl.fontSize = style.fontSize;
                if (style.textAlign !== undefined) newEl.textAlign = style.textAlign;
                if (style.verticalAlign !== undefined) newEl.verticalAlign = style.verticalAlign;
                
                if (style.textStrokeColor !== undefined) newEl.strokeColor = style.textStrokeColor;
                else if (style.strokeColor !== undefined) newEl.strokeColor = style.strokeColor;
                if (style.opacity !== undefined) newEl.opacity = style.opacity;

                const size = measureTextSize(newEl.text, newEl.fontSize, newEl.fontFamily);
                newEl.width = size.width;
                newEl.height = size.height;
            } else {
                if (style.strokeColor !== undefined) newEl.strokeColor = style.strokeColor;
                if (style.backgroundColor !== undefined) newEl.backgroundColor = style.backgroundColor;
                if (style.fillStyle !== undefined) newEl.fillStyle = style.fillStyle;
                if (style.strokeWidth !== undefined) newEl.strokeWidth = style.strokeWidth;
                if (style.strokeStyle !== undefined) newEl.strokeStyle = style.strokeStyle;
                if (style.strokeSharpness !== undefined) newEl.strokeSharpness = style.strokeSharpness;
                if (style.roughness !== undefined) newEl.roughness = style.roughness;
                if (style.opacity !== undefined) newEl.opacity = style.opacity;
                
                if (newEl.type === "arrow" || newEl.type === "line") {
                    if (style.startArrowhead !== undefined) newEl.startArrowhead = style.startArrowhead;
                    if (style.endArrowhead !== undefined) newEl.endArrowhead = style.endArrowhead;
                }
            }
            
            newEl.version = el.version + 1;
            newEl.versionNonce = Math.floor(Math.random() * 1000000000);
            return newEl;
        }
        return el;
    });

    // 4. 更新场景
    // 注意：在 onChange 回调中更新场景需要小心，但 api.updateScene 能够处理
    // 这里的 trick 是：我们只修改了属性，保持了 selection 不变，所以用户感觉是"选中即变色"
    api.updateScene({
        elements: updatedSceneElements,
        commitToHistory: true 
    });
};

// 4. 注册监听器
// api.onChange 会返回一个 unsubscribe 函数
window.BrushUnsubscribe = api.onChange(handleSceneChange);
