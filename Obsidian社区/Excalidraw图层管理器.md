---
created: 2025-10-26T14:14
updated: 2025-10-26T14:39
---
/*

 ```js*/
 
 // Excalidraw 图层管理器脚本

// 检查 Excalidraw 插件版本是否满足要求
if (!ea.verifyMinimumPluginVersion || !ea.verifyMinimumPluginVersion("2.0.0")) {
  new Notice("此脚本需要较新版本的 Excalidraw 插件。请更新您的插件。");
  return;
}

// 防止重复打开窗口
if (window.layerManagerModal) {
  window.layerManagerModal.open();
  return;
}

const modal = new ea.FloatingModal(ea.plugin.app);
window.layerManagerModal = modal;

// 用于存储图层顺序的隐藏元素标记
const STATE_ELEMENT_ID = "excalidraw-layer-manager-state";

// ---------------------------------
// 状态管理函数
// ---------------------------------

/**
 * 从一个隐藏的元素中获取已保存的图层顺序
 * @returns {string[]}
 */
const getLayerOrderState = () => {
    const stateEl = ea.getViewElements().find(el => el.customData?.isLayerManagerState);
    return stateEl?.customData?.layerOrder || [];
};

/**
 * 将图层顺序保存到一个隐藏的元素中
 * @param {string[]} order 
 */
const saveLayerOrderState = async (order) => {
    ea.clear(); // 操作前清空工作台
    let stateEl = ea.getViewElements().find(el => el.customData?.isLayerManagerState);
    
    if (!stateEl) {
        // 如果状态元素不存在，则创建一个新的
        const stateElId = ea.addRect(-10000, -10000, 1, 1); // 在画布外创建，使其不可见
        const newEl = ea.getElement(stateElId);
        newEl.opacity = 0;
        newEl.locked = true;
        ea.addAppendUpdateCustomData(stateElId, { isLayerManagerState: true, layerOrder: order });
    } else {
        // 如果已存在，则更新它
        ea.copyViewElementsToEAforEditing([stateEl]);
        ea.addAppendUpdateCustomData(stateEl.id, { layerOrder: order });
    }
    
    await ea.addElementsToView();
};

/**
 * 根据图层顺序重新排列画布上所有图层元素的 Z-index
 * @param {string[]} order 
 */
const reorderCanvasElements = async (order) => {
    const allCanvasElements = ea.getViewElements();
    const layeredElementsMap = new Map();
    const unlayeredElements = [];

    allCanvasElements.forEach(el => {
        const layerId = el.customData?.layerId;
        if (layerId) {
            if (!layeredElementsMap.has(layerId)) {
                layeredElementsMap.set(layerId, []);
            }
            layeredElementsMap.get(layerId).push(el);
        } else {
            unlayeredElements.push(el);
        }
    });

    let finalOrderedElements = [...unlayeredElements];
    
    // 从后往前遍历顺序数组，将图层元素添加到最终数组中
    // 数组中靠后的元素会在 Excalidraw 中渲染在更上层
    for (const layerId of [...order].reverse()) {
        const elementsInLayer = layeredElementsMap.get(layerId);
        if (elementsInLayer) {
            finalOrderedElements.push(...elementsInLayer);
        }
    }
    
    await ea.getExcalidrawAPI().updateScene({ elements: finalOrderedElements });
    // 短暂延迟以确保场景更新
    await new Promise(resolve => setTimeout(resolve, 50));
};


// ---------------------------------
// 主构建函数：创建或刷新 UI
// ---------------------------------
const buildUI = async () => {
  const { contentEl } = modal;
  contentEl.empty();
  
  contentEl.createEl("h2", { text: "图层管理器" });

  const layerListEl = contentEl.createEl("div", {
    attr: {
      style: "max-height: 500px; overflow-y: auto; border: 1px solid var(--background-modifier-border); padding: 5px; border-radius: 5px;"
    }
  });
  
  const layers = findLayersOnCanvas();
  let layerOrder = getLayerOrderState();

  const presentLayerIds = new Set(layers.keys());
  const originalOrder = JSON.stringify(layerOrder);
  
  layerOrder = layerOrder.filter(id => presentLayerIds.has(id));
  
  const orderedLayerIds = new Set(layerOrder);
  const newLayers = [...presentLayerIds].filter(id => !orderedLayerIds.has(id)).sort();
  layerOrder.push(...newLayers);

  if (JSON.stringify(layerOrder) !== originalOrder) {
      await saveLayerOrderState(layerOrder);
  }

  if (layerOrder.length === 0) {
    layerListEl.createEl("p", { text: "未发现图层。请选择一些元素并点击“添加到图层”。" });
  } else {
    const sortedLayers = layerOrder.map(layerId => [layerId, layers.get(layerId)]);

    for (const [index, [layerId, elements]] of sortedLayers.entries()) {
      const setting = new ea.obsidian.Setting(layerListEl)
        .setName(layerId);
      
      const img = setting.controlEl.createEl("img");
      img.style.width = "100px";
      img.style.height = "60px";
      img.style.border = "1px solid var(--background-modifier-border)";
      img.style.marginRight = "10px";
      img.style.objectFit = "contain";
      setting.controlEl.prepend(img);
      
      generateLayerPreview(elements).then(dataUrl => {
        img.src = dataUrl;
      });
      
      const isLocked = elements.every(el => el.locked);
      const isHidden = elements.every(el => el.opacity === 0);

      setting.addButton(btn => {
        btn.setIcon("arrow-up")
           .setTooltip("上移")
           .setDisabled(index === 0)
           .onClick(() => moveLayer(index, 'up'));
      });
      setting.addButton(btn => {
        btn.setIcon("arrow-down")
           .setTooltip("下移")
           .setDisabled(index === sortedLayers.length - 1)
           .onClick(() => moveLayer(index, 'down'));
      });

      setting.addButton(btn => {
        btn.setIcon(isLocked ? "lock" : "unlock")
           .setTooltip(isLocked ? "解锁图层" : "锁定图层")
           .onClick(() => toggleLock(layerId, !isLocked));
      });

      setting.addButton(btn => {
        btn.setIcon(isHidden ? "eye-off" : "eye")
           .setTooltip(isHidden ? "显示图层" : "隐藏图层")
           .onClick(() => toggleVisibility(layerId, !isHidden));
      });
      
      setting.addButton(btn => {
        btn.setIcon("trash")
           .setTooltip("移除图层（将元素释放到场景中）")
           .onClick(() => removeLayer(layerId));
      });
    }
  }
  
  const bottomControls = new ea.obsidian.Setting(contentEl)
    .addButton(btn => btn.setButtonText("解锁全部").onClick(unlockAllLayers))
    .addButton(btn => btn.setButtonText("添加到图层").onClick(addToLayer))
    .addButton(btn => btn.setButtonText("刷新").onClick(buildUI).setCta());
};

// ---------------------------------
// 核心功能函数
// ---------------------------------

const findLayersOnCanvas = () => {
  const layers = new Map();
  ea.getViewElements().forEach(el => {
    const layerId = el.customData?.layerId;
    if (layerId) {
      if (!layers.has(layerId)) layers.set(layerId, []);
      layers.get(layerId).push(el);
    }
  });
  return layers;
};

const generateLayerPreview = async (elements) => {
  const appState = ea.getExcalidrawAPI().getAppState();
  const svg = await ea.createViewSVG({
    elementsOverride: elements,
    withBackground: true,
    theme: appState.theme,
    padding: 10
  });
  const svgString = new XMLSerializer().serializeToString(svg);
  return `data:image/svg+xml;base64,${btoa(svgString)}`;
};

const moveLayer = async (index, direction) => {
  let order = getLayerOrderState();
  if (direction === 'up' && index > 0) {
    [order[index], order[index - 1]] = [order[index - 1], order[index]];
  }
  if (direction === 'down' && index < order.length - 1) {
    [order[index], order[index + 1]] = [order[index + 1], order[index]];
  }
  await saveLayerOrderState(order);
  await reorderCanvasElements(order);
  buildUI();
};

const toggleLock = async (layerId, lock) => {
  ea.clear();
  const elementsToToggle = findLayersOnCanvas().get(layerId);
  if (!elementsToToggle) return;
  ea.copyViewElementsToEAforEditing(elementsToToggle);
  ea.getElements().forEach(el => { el.locked = lock; });
  await ea.addElementsToView();
  buildUI();
};

const toggleVisibility = async (layerId, hide) => {
  ea.clear();
  const elementsToToggle = findLayersOnCanvas().get(layerId);
  if (!elementsToToggle) return;
  ea.copyViewElementsToEAforEditing(elementsToToggle);
  ea.getElements().forEach(el => {
    if (hide) {
      ea.addAppendUpdateCustomData(el.id, { originalOpacity: el.opacity });
      el.opacity = 0;
    } else {
      el.opacity = el.customData?.originalOpacity ?? 100;
      ea.addAppendUpdateCustomData(el.id, { originalOpacity: undefined });
    }
  });
  await ea.addElementsToView();
  buildUI();
};

const removeLayer = async (layerId) => {
  ea.clear();
  const elementsToRelease = findLayersOnCanvas().get(layerId);
  if (!elementsToRelease) return;
  ea.copyViewElementsToEAforEditing(elementsToRelease);
  ea.getElements().forEach(el => {
    el.locked = false;
    el.opacity = el.customData?.originalOpacity ?? el.opacity;
    if(el.opacity === 0) el.opacity = 100;
    ea.addAppendUpdateCustomData(el.id, { layerId: undefined, originalOpacity: undefined });
  });
  await ea.addElementsToView();
  
  let order = getLayerOrderState().filter(id => id !== layerId);
  await saveLayerOrderState(order);
  await reorderCanvasElements(order);
  buildUI();
};

const unlockAllLayers = async () => {
  ea.clear();
  const allElements = Array.from(findLayersOnCanvas().values()).flat();
  if (allElements.length === 0) return;
  ea.copyViewElementsToEAforEditing(allElements);
  ea.getElements().forEach(el => {
    el.locked = false;
    el.opacity = el.customData?.originalOpacity ?? el.opacity;
    if(el.opacity === 0) el.opacity = 100;
    ea.addAppendUpdateCustomData(el.id, { originalOpacity: undefined });
  });
  await ea.addElementsToView();
  buildUI();
};

const addToLayer = async () => {
  const selectedElements = ea.getViewSelectedElements();
  if (selectedElements.length === 0) {
    new Notice("请先在画布上选择要添加的元素。");
    return;
  }
  
  const layerId = await utils.inputPrompt("输入图层名称：", "例如：背景、前景、注释");
  if (!layerId) return;
  
  ea.clear();
  ea.copyViewElementsToEAforEditing(selectedElements);
  ea.getElements().forEach(el => {
    ea.addAppendUpdateCustomData(el.id, { layerId: layerId });
  });
  await ea.addElementsToView();
  
  let order = getLayerOrderState();
  if (!order.includes(layerId)) {
    order.unshift(layerId); // 新图层添加到顶部
    await saveLayerOrderState(order);
  }
  await reorderCanvasElements(order);
  buildUI();
};

// ---------------------------------
// 模态窗口事件处理
// ---------------------------------
modal.onOpen = buildUI;
modal.onClose = () => { delete window.layerManagerModal; };

modal.open();
