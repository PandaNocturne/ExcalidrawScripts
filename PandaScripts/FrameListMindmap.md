/*
## Frame 导图大纲 (完美拐角 + 智能编号 + 高级编辑)
- 样式更新：全自动生成原生 Elbow 拐角连线，强制锁定左右边缘锚点。
- 节点操作：支持节点同步删除，双击大纲聚焦当前节点及其子树。
- 核心逻辑：智能层级编号 (01, 02...)，列表更新时自动重编号并同步到画布。
- 新增更新：接入高级文本编辑器，仅支持“修改”并覆盖。
*/

const api = ea.getExcalidrawAPI();
const view = ea.targetView;
const container = view?.containerEl?.querySelector?.(".excalidraw-wrapper") || view?.containerEl;

if (!container) {
  new Notice("未找到 Excalidraw 视图容器");
  return;
}

// --- 0. 防多开与清理 ---
const ROOT_ID = "ea-frame-outline-mindmap-sync";
const GLOBAL_KEY = "__eaFrameOutlineMindmap__";
const SETTINGS_STORAGE_KEY = "frame-list-mindmap-layout-settings";
const registry = window[GLOBAL_KEY] ||= new WeakMap();

if (registry.get(container)?.cleanup) {
  registry.get(container).cleanup();
  new Notice("关闭 Frame 导图大纲");
  return;
}
new Notice("打开 Frame 导图大纲");

const DEFAULT_LAYOUT_SETTINGS = {
  horizontalGap: 80,
  verticalGap: 40,
};
const ARROW_STROKE_COLOR = "#808080";
const ARROW_STROKE_WIDTH = 4;

const sanitizeNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const loadLayoutSettings = () => {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LAYOUT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      horizontalGap: sanitizeNumber(parsed?.horizontalGap, DEFAULT_LAYOUT_SETTINGS.horizontalGap),
      verticalGap: sanitizeNumber(parsed?.verticalGap, DEFAULT_LAYOUT_SETTINGS.verticalGap),
    };
  } catch {
    return { ...DEFAULT_LAYOUT_SETTINGS };
  }
};

const saveLayoutSettings = (nextSettings) => {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
};

let layoutSettings = loadLayoutSettings();

// --- 1. 画布数据解析引擎 (Canvas -> UI) ---
const initTreeData = () => {
  const viewElements = ea.getViewElements();
  const frames = viewElements.filter((e) => e.type === "frame" && !e.isDeleted);
  const frameIds = new Set(frames.map((f) => f.id));
  const arrows = viewElements.filter(
    (e) =>
      e.type === "arrow" &&
      !e.isDeleted &&
      frameIds.has(e.startBinding?.elementId) &&
      frameIds.has(e.endBinding?.elementId)
  );

  const childrenMap = new Map();
  const hasParent = new Set();
  arrows.forEach((a) => {
    const parentId = a.startBinding.elementId;
    const childId = a.endBinding.elementId;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId).push(childId);
    hasParent.add(childId);
  });

  const frameById = new Map(frames.map((f) => [f.id, f]));
  const roots = frames.filter((f) => !hasParent.has(f.id)).sort((a, b) => a.y - b.y);
  const data = [];
  const visited = new Set();

  const traverse = (frame, depth) => {
    if (!frame || visited.has(frame.id)) return;
    visited.add(frame.id);
    data.push({ id: frame.id, name: frame.name || "未命名", depth, collapsed: false });
    const children = (childrenMap.get(frame.id) || [])
      .map((id) => frameById.get(id))
      .filter(Boolean)
      .sort((a, b) => a.y - b.y);
    children.forEach((child) => traverse(child, depth + 1));
  };

  roots.forEach((root) => traverse(root, 0));
  frames.forEach((frame) => traverse(frame, 0));
  return data;
};

let treeData = initTreeData();

// =====================================================================
// [新增] 文本编辑器函数 (集成 QuickAdd Utils)
// =====================================================================
async function openEditPrompt(ocrText, n = 10) {
  // 兜底检查：如果没有定义 utils，平滑降级为原生弹窗
  if (typeof utils === "undefined") {
    new Notice("提示: 未检测到 QuickAdd utils，使用基础输入框", 2000);
    const res = window.prompt("请输入新的节点名称", ocrText);
    if (res === null) return { confirmed: false, ocrTextEdit: ocrText };
    return { confirmed: true, ocrTextEdit: res };
  }

  const ocrTextEdit = await utils.inputPrompt(
    "编辑文本",
    "仅修改 Frame 标题",
    ocrText,
    undefined,
    n,
    true
  );

  if (ocrTextEdit === null || typeof ocrTextEdit === "undefined") {
    return { confirmed: false, ocrTextEdit: ocrText };
  }

  return {
    confirmed: true,
    ocrTextEdit: ocrTextEdit === " " ? "" : ocrTextEdit,
  };
}

const getBranchItems = (index, data = treeData) => data.slice(index, index + getBranchCount(index, data));

const createCloneId = (prefix = "item") => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const cloneSceneElement = (element, elementIdMap, frameIdMap, groupIdMap) => {
  const cloned = JSON.parse(JSON.stringify(element));
  cloned.id = elementIdMap.get(element.id) || createCloneId(element.type || "el");
  cloned.isDeleted = false;
  cloned.version = 1;
  cloned.versionNonce = Math.floor(Math.random() * 1_000_000_000);

  if (typeof cloned.seed === "number") {
    cloned.seed = Math.floor(Math.random() * 1_000_000_000);
  }
  if (typeof cloned.frameId === "string" && frameIdMap.has(cloned.frameId)) {
    cloned.frameId = frameIdMap.get(cloned.frameId);
  }
  if (Array.isArray(cloned.groupIds)) {
    cloned.groupIds = cloned.groupIds.map((id) => groupIdMap.get(id) || id);
  }
  if (Array.isArray(cloned.boundElements)) {
    cloned.boundElements = cloned.boundElements
      .map((binding) => elementIdMap.has(binding.id) ? { ...binding, id: elementIdMap.get(binding.id) } : null)
      .filter(Boolean);
  }
  if (typeof cloned.containerId === "string" && elementIdMap.has(cloned.containerId)) {
    cloned.containerId = elementIdMap.get(cloned.containerId);
  }
  if (cloned.startBinding?.elementId && elementIdMap.has(cloned.startBinding.elementId)) {
    cloned.startBinding.elementId = elementIdMap.get(cloned.startBinding.elementId);
  }
  if (cloned.endBinding?.elementId && elementIdMap.has(cloned.endBinding.elementId)) {
    cloned.endBinding.elementId = elementIdMap.get(cloned.endBinding.elementId);
  }

  return cloned;
};

const duplicateBranchToCanvas = async (index, { includeChildren = false } = {}) => {
  state.suppressChange = true;

  const branchItems = getBranchItems(index);
  const sourceItems = includeChildren ? branchItems : [branchItems[0]];
  const sourceFrameIds = new Set(sourceItems.map((item) => item.id));
  const frameIdMap = new Map(sourceItems.map((item) => [item.id, createCloneId("frame")]));
  const sceneElements = api.getSceneElements();
  const sourceElements = sceneElements.filter(
    (el) => !el.isDeleted && (sourceFrameIds.has(el.id) || sourceFrameIds.has(el.frameId))
  );
  const groupIdMap = new Map();

  sourceElements.forEach((el) => {
    (el.groupIds || []).forEach((groupId) => {
      if (!groupIdMap.has(groupId)) {
        groupIdMap.set(groupId, createCloneId("group"));
      }
    });
  });

  const elementIdMap = new Map(
    sourceElements.map((el) => [el.id, frameIdMap.get(el.id) || createCloneId(el.type || "el")])
  );
  const clonedTreeItems = sourceItems.map((item) => ({
    ...item,
    id: frameIdMap.get(item.id),
    collapsed: false,
  }));
  const insertIndex = index + branchItems.length;
  const clonedSceneElements = sourceElements.map((el) => cloneSceneElement(el, elementIdMap, frameIdMap, groupIdMap));

  treeData.splice(insertIndex, 0, ...clonedTreeItems);
  api.updateScene({ elements: [...sceneElements, ...clonedSceneElements], commitToHistory: true });

  setTimeout(async () => {
    await syncToCanvas();
    scheduleNumberingRefresh({ focusedId: clonedTreeItems[0]?.id || null });
  }, 100);
};

// =====================================================================
// === 2. 核心排版引擎 (自动绑定 + 拐角连线 + 自定义线条样式) ===
// =====================================================================
const syncToCanvas = async () => {
  state.suppressChange = true;

  const horizontalGap = sanitizeNumber(layoutSettings.horizontalGap, DEFAULT_LAYOUT_SETTINGS.horizontalGap);
  const verticalGap = sanitizeNumber(layoutSettings.verticalGap, DEFAULT_LAYOUT_SETTINGS.verticalGap);
  const allEls = api.getSceneElements();
  ea.clear();

  const frameIds = new Set(treeData.map((t) => t.id));

  const framesToEdit = allEls.filter((e) => e.type === "frame" && frameIds.has(e.id) && !e.isDeleted);
  ea.copyViewElementsToEAforEditing(framesToEdit);

  const oldArrows = allEls.filter(
    (e) =>
      e.type === "arrow" &&
      !e.isDeleted &&
      frameIds.has(e.startBinding?.elementId) &&
      frameIds.has(e.endBinding?.elementId)
  );
  const oldArrowIds = new Set(oldArrows.map((a) => a.id));

  if (oldArrows.length > 0) {
    ea.copyViewElementsToEAforEditing(oldArrows);
    oldArrows.forEach((a) => {
      ea.elementsDict[a.id].isDeleted = true;
    });
  }

  const frameMap = new Map();
  framesToEdit.forEach((frame) => {
    const el = ea.elementsDict[frame.id];
    if (el.boundElements) {
      el.boundElements = el.boundElements.filter((b) => !oldArrowIds.has(b.id));
    } else {
      el.boundElements = [];
    }
    frameMap.set(frame.id, el);
  });

  const nestedTree = [];
  const stack = [];
  treeData.forEach((item) => {
    const node = { ...item, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].depth >= item.depth) stack.pop();
    if (stack.length === 0) nestedTree.push(node);
    else stack[stack.length - 1].node.children.push(node);
    stack.push({ node, depth: item.depth });
  });

  const calcHeights = (node) => {
    const frame = frameMap.get(node.id);
    node.frameHeight = frame ? frame.height : 100;
    if (!node.children || node.children.length === 0) {
      node.totalHeight = node.frameHeight + verticalGap;
      return node.totalHeight;
    }
    let childrenHeightSum = 0;
    node.children.forEach((child) => {
      childrenHeightSum += calcHeights(child);
    });
    node.totalHeight = Math.max(node.frameHeight + verticalGap, childrenHeightSum);
    return node.totalHeight;
  };

  nestedTree.forEach((rootNode) => calcHeights(rootNode));

  const arrowsToCreate = [];
  const setPositions = (node, startX, centerY) => {
    const frame = frameMap.get(node.id);
    if (!frame) return;

    const targetX = startX;
    const targetY = centerY - node.frameHeight / 2;
    const dx = targetX - frame.x;
    const dy = targetY - frame.y;

    if (dx !== 0 || dy !== 0) {
      frame.x += dx;
      frame.y += dy;

      const innerEls = ea.getElementsInFrame(frame, allEls);
      innerEls.forEach((el) => {
        if (!ea.elementsDict[el.id]) ea.copyViewElementsToEAforEditing([el]);
        ea.elementsDict[el.id].x += dx;
        ea.elementsDict[el.id].y += dy;
      });
    }

    if (!node.children || node.children.length === 0) return;

    const childX = targetX + frame.width + horizontalGap;
    const totalChildrenHeight = node.children.reduce((sum, child) => sum + child.totalHeight, 0);
    let currentY = centerY - totalChildrenHeight / 2;

    node.children.forEach((child) => {
      const childCenterY = currentY + child.totalHeight / 2;
      setPositions(child, childX, childCenterY);
      arrowsToCreate.push({ parent: frame.id, child: child.id });
      currentY += child.totalHeight;
    });
  };

  nestedTree.forEach((rootNode) => {
    const frame = frameMap.get(rootNode.id);
    if (frame) setPositions(rootNode, frame.x, frame.y + frame.height / 2);
  });

  const arrowStyle = {
    strokeColor: ARROW_STROKE_COLOR,
    strokeWidth: ARROW_STROKE_WIDTH,
    strokeStyle: "solid",
    fillStyle: "solid",
    roughness: 0,
    roundness: { type: 2 },
    startArrowhead: null,
    endArrowhead: "arrow",
    elbowed: true,
  };

  Object.assign(ea.style, arrowStyle);
  const elementIdsBeforeConnect = new Set(Object.keys(ea.elementsDict));

  arrowsToCreate.forEach((arr) => {
    ea.connectObjects(arr.parent, "right", arr.child, "left", { type: "arrow", ...arrowStyle });
  });

  const newArrowIds = Object.keys(ea.elementsDict).filter((id) => !elementIdsBeforeConnect.has(id));
  newArrowIds.forEach((id) => {
    const el = ea.elementsDict[id];
    if (el?.type !== "arrow") return;
    Object.assign(el, arrowStyle);

    if (el.startBinding) {
      el.startBinding.fixedPoint = [1, 0.5];
      delete el.startBinding.focus;
    }
    if (el.endBinding) {
      el.endBinding.fixedPoint = [0, 0.5];
      delete el.endBinding.focus;
    }
  });

  await ea.addElementsToView(false, false);

  setTimeout(() => {
    state.suppressChange = false;
  }, 300);
};

// =====================================================================
// === 3. 大纲 UI 与交互层 ===
// =====================================================================
const INDENT_SIZE = 22;
const state = {
  draggingId: null,
  dragIndex: -1,
  dragCount: 0,
  targetIndex: -1,
  targetDepth: 0,
  itemBounds: [],
  suppressChange: false,
  unsub: null,
  renderTimer: 0,
  settingsOpen: false,
  numberingTimer: 0,
  numberingInFlight: false,
};

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const getBranchCount = (index, data) => {
  let count = 1;
  while (index + count < data.length && data[index + count].depth > data[index].depth) count++;
  return count;
};
const hasChildren = (index, data) => index + 1 < data.length && data[index + 1].depth > data[index].depth;

const applyAutoNumbering = () => {
  let counters = [];
  let changed = false;

  treeData.forEach((item) => {
    const d = item.depth;
    counters.splice(d + 1);
    counters[d] = (counters[d] || 0) + 1;

    const numStr = String(counters[d]).padStart(2, '0');
    const cleanName = item.name.replace(/^\d{2}\s+/, '');
    const newName = `${numStr} ${cleanName}`;
    if (item.name !== newName) {
      item.name = newName;
      changed = true;
    }
  });

  return changed;
};

const syncTreeDataToSceneNames = () => {
  const nameMap = new Map(treeData.map((item) => [item.id, item.name]));
  const sceneElements = api.getSceneElements();
  let changed = false;
  const updated = sceneElements.map((el) => {
    const nextName = nameMap.get(el.id);
    if (typeof nextName === "string" && el.name !== nextName) {
      changed = true;
      return { ...el, name: nextName };
    }
    return el;
  });

  if (!changed) return false;
  api.updateScene({ elements: updated, commitToHistory: true });
  return true;
};

const flushNumbering = ({ reinit = false, focusedId = null } = {}) => {
  if (state.numberingInFlight) return;
  state.numberingInFlight = true;
  state.suppressChange = true;

  try {
    if (reinit) treeData = initTreeData();
    const numberingChanged = applyAutoNumbering();
    const sceneChanged = syncTreeDataToSceneNames();
    if (numberingChanged || sceneChanged || reinit) {
      render(focusedId);
    }
  } finally {
    setTimeout(() => {
      state.suppressChange = false;
      state.numberingInFlight = false;
    }, 300);
  }
};

const scheduleNumberingRefresh = ({ delay = 120, reinit = false, focusedId = null } = {}) => {
  clearTimeout(state.numberingTimer);
  state.numberingTimer = setTimeout(() => {
    flushNumbering({ reinit, focusedId });
  }, delay);
};

const createIconButton = (text, title, onClick) => {
  const btn = document.createElement("div");
  btn.textContent = text;
  btn.title = title;
  Object.assign(btn.style, {
    padding: "2px 8px",
    borderRadius: "6px",
    cursor: "pointer",
    flexShrink: "0",
    color: "var(--text-muted, #64748b)",
    border: "1px solid var(--background-modifier-border, #d4d4d8)",
    background: "var(--background-primary, #ffffff)",
    fontSize: "12px",
    fontWeight: "500",
    lineHeight: "18px",
  });
  btn.onmouseenter = () => {
    btn.style.background = "var(--background-modifier-hover, #f1f5f9)";
  };
  btn.onmouseleave = () => {
    btn.style.background = "var(--background-primary, #ffffff)";
  };
  btn.onclick = onClick;
  return btn;
};

const root = document.createElement("div");
root.id = ROOT_ID;
Object.assign(root.style, {
  position: "absolute",
  right: "20px",
  top: "60px",
  zIndex: "40",
  width: "320px",
  maxHeight: "550px",
  background: "var(--background-primary, #ffffff)",
  border: "1px solid var(--background-modifier-border, #d4d4d8)",
  borderRadius: "8px",
  boxShadow: "var(--shadow-s)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  userSelect: "none",
});

const header = document.createElement("div");
Object.assign(header.style, {
  padding: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  fontSize: "12px",
  fontWeight: "600",
  background: "var(--background-secondary, #f4f5f7)",
  borderBottom: "1px solid var(--background-modifier-border)",
});

const headerTitle = document.createElement("div");
headerTitle.textContent = "Frame 导图大纲";

const headerActions = document.createElement("div");
Object.assign(headerActions.style, {
  display: "flex",
  alignItems: "center",
  gap: "6px",
});

const settingsPanel = document.createElement("div");
Object.assign(settingsPanel.style, {
  display: "none",
  padding: "10px 12px",
  borderBottom: "1px solid var(--background-modifier-border)",
  background: "var(--background-primary, #ffffff)",
});

const settingsGrid = document.createElement("div");
Object.assign(settingsGrid.style, {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "8px 10px",
  alignItems: "center",
});

const horizontalGapInput = document.createElement("input");
horizontalGapInput.type = "number";
horizontalGapInput.min = "0";
horizontalGapInput.step = "10";
const verticalGapInput = document.createElement("input");
verticalGapInput.type = "number";
verticalGapInput.min = "0";
verticalGapInput.step = "10";

const styleSettingsInput = (input) => {
  Object.assign(input.style, {
    width: "72px",
    padding: "4px 6px",
    borderRadius: "6px",
    border: "1px solid var(--background-modifier-border, #d4d4d8)",
    background: "var(--background-primary, #ffffff)",
    color: "var(--text-normal, #1e293b)",
    fontSize: "12px",
  });
};
styleSettingsInput(horizontalGapInput);
styleSettingsInput(verticalGapInput);

const makeSettingRow = (labelText, inputEl) => {
  const label = document.createElement("div");
  label.textContent = labelText;
  label.style.color = "var(--text-muted, #64748b)";
  label.style.fontSize = "12px";
  settingsGrid.appendChild(label);
  settingsGrid.appendChild(inputEl);
};
makeSettingRow("水平间距", horizontalGapInput);
makeSettingRow("垂直间距", verticalGapInput);
settingsPanel.appendChild(settingsGrid);

const syncSettingsInputs = () => {
  horizontalGapInput.value = String(layoutSettings.horizontalGap);
  verticalGapInput.value = String(layoutSettings.verticalGap);
};

const applySettingsFromInputs = async () => {
  const nextSettings = {
    horizontalGap: sanitizeNumber(horizontalGapInput.value, DEFAULT_LAYOUT_SETTINGS.horizontalGap),
    verticalGap: sanitizeNumber(verticalGapInput.value, DEFAULT_LAYOUT_SETTINGS.verticalGap),
  };
  layoutSettings = nextSettings;
  saveLayoutSettings(nextSettings);
  syncSettingsInputs();
  await syncToCanvas();
  render();
};

horizontalGapInput.onchange = applySettingsFromInputs;
verticalGapInput.onchange = applySettingsFromInputs;

// [一键编号]
const numberBtn = createIconButton("🔢", "自动编号", (e) => {
  e.stopPropagation();
  flushNumbering();
});

const refreshBtn = createIconButton("🔄️", "刷新并重排", async (e) => {
  e.stopPropagation();
  treeData = initTreeData();
  await syncToCanvas();
  scheduleNumberingRefresh({ reinit: true });
});

const settingsBtn = createIconButton("⚙️", "布局设置", (e) => {
  e.stopPropagation();
  state.settingsOpen = !state.settingsOpen;
  settingsPanel.style.display = state.settingsOpen ? "block" : "none";
  if (state.settingsOpen) syncSettingsInputs();
});

headerActions.appendChild(numberBtn);
headerActions.appendChild(settingsBtn);
headerActions.appendChild(refreshBtn);
header.appendChild(headerTitle);
header.appendChild(headerActions);

const scrollWrapper = document.createElement("div");
Object.assign(scrollWrapper.style, {
  flex: "1",
  overflowY: "auto",
  position: "relative",
  minHeight: "150px",
});

const ulContainer = document.createElement("ul");
Object.assign(ulContainer.style, {
  listStyle: "none",
  margin: "0",
  padding: "8px 0",
});

const dropIndicator = document.createElement("div");
Object.assign(dropIndicator.style, {
  position: "absolute",
  left: "0",
  top: "0",
  height: "2px",
  background: "var(--interactive-accent, #2563eb)",
  pointerEvents: "none",
  display: "none",
  zIndex: "50",
});
const dot = document.createElement("div");
Object.assign(dot.style, {
  position: "absolute",
  left: "-4px",
  top: "-3px",
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  background: "var(--interactive-accent, #2563eb)",
  border: "2px solid var(--background-primary, #fff)",
});
dropIndicator.appendChild(dot);

scrollWrapper.appendChild(ulContainer);
scrollWrapper.appendChild(dropIndicator);
root.appendChild(header);
root.appendChild(settingsPanel);
root.appendChild(scrollWrapper);
container.appendChild(root);

syncSettingsInputs();

const addNewFrameToCanvas = async (name, insertToDataCallback) => {
  state.suppressChange = true;
  const id = `frame_${Date.now()}`;
  const newFrame = {
    id,
    type: "frame",
    x: 0,
    y: 0,
    width: 240,
    height: 160,
    name,
    strokeColor: "#000000",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    boundElements: [],
    version: 1,
    versionNonce: Math.random(),
    isDeleted: false,
  };

  insertToDataCallback(id);
  const numberingChanged = applyAutoNumbering();
  const finalName = treeData.find((item) => item.id === id)?.name || name;

  api.updateScene({ elements: [...api.getSceneElements(), { ...newFrame, name: finalName }], commitToHistory: true });

  setTimeout(async () => {
    await syncToCanvas();
    if (numberingChanged) {
      scheduleNumberingRefresh({ focusedId: id });
    } else {
      render(id);
    }
  }, 100);
};

const deleteFramesFromCanvas = async (idsToDeleteSet) => {
  state.suppressChange = true;
  const sceneElements = api.getSceneElements();
  const updated = sceneElements.map((el) => {
    const isTargetFrameOrInner = idsToDeleteSet.has(el.id) || idsToDeleteSet.has(el.frameId);
    const isConnectedArrow = el.type === "arrow" && (
      idsToDeleteSet.has(el.startBinding?.elementId) ||
      idsToDeleteSet.has(el.endBinding?.elementId)
    );

    if (isTargetFrameOrInner || isConnectedArrow) {
      return { ...el, isDeleted: true };
    }
    return el;
  });

  api.updateScene({ elements: updated, commitToHistory: true });
  setTimeout(async () => {
    await syncToCanvas();
    scheduleNumberingRefresh({ reinit: true });
  }, 100);
};

const render = (focusedId = null) => {
  ulContainer.innerHTML = "";
  let hideDepthLimit = null;

  treeData.forEach((item, index) => {
    if (hideDepthLimit !== null) {
      if (item.depth > hideDepthLimit) return;
      hideDepthLimit = null;
    }
    const isParent = hasChildren(index, treeData);
    if (item.collapsed && isParent) hideDepthLimit = item.depth;

    const li = document.createElement("li");
    li.draggable = true;
    li.dataset.id = item.id;
    li.dataset.dataIndex = index;
    li.tabIndex = 0;

    Object.assign(li.style, {
      padding: `4px 8px 4px ${12 + item.depth * INDENT_SIZE}px`,
      fontSize: "13px",
      display: "flex",
      alignItems: "center",
      cursor: "grab",
      color: "var(--text-normal, #1e293b)",
      outline: "none",
      borderRadius: "4px",
      margin: "0 4px",
      border: "1px solid transparent",
    });

    const toggle = document.createElement("div");
    Object.assign(toggle.style, {
      width: "20px",
      height: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginRight: "4px",
      borderRadius: "4px",
      color: "var(--text-muted, #94a3b8)",
      cursor: isParent ? "pointer" : "default",
      fontSize: isParent ? "10px" : "14px",
      transition: "background 0.1s",
    });
    toggle.innerHTML = isParent ? (item.collapsed ? "▶" : "▼") : "•";

    if (isParent) {
      toggle.onclick = (e) => {
        e.stopPropagation();
        item.collapsed = !item.collapsed;
        render(item.id);
      };
      toggle.onmouseenter = () => {
        toggle.style.background = "var(--background-modifier-border, #e2e8f0)";
      };
      toggle.onmouseleave = () => {
        toggle.style.background = "transparent";
      };
    }

    const text = document.createElement("span");
    text.textContent = item.name;
    Object.assign(text.style, {
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      pointerEvents: "none",
      flex: "1",
    });

    const actions = document.createElement("div");
    Object.assign(actions.style, {
      display: "flex",
      gap: "2px",
      opacity: "0",
      transition: "opacity 0.1s",
      pointerEvents: "auto",
    });

    const createBtn = (char, title, onClick) => {
      const btn = document.createElement("div");
      btn.textContent = char;
      btn.title = title;
      Object.assign(btn.style, {
        width: "20px",
        height: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        borderRadius: "4px",
        color: "var(--text-muted, #94a3b8)",
        fontSize: "14px",
        fontWeight: "bold",
      });
      btn.onmouseenter = () => {
        btn.style.background = "var(--background-modifier-border, #e2e8f0)";
      };
      btn.onmouseleave = () => {
        btn.style.background = "transparent";
      };
      btn.onclick = (e) => {
        e.stopPropagation();
        onClick();
      };
      return btn;
    };

    // [更新] 编辑 Frame 标题，仅支持确认或取消
    actions.appendChild(
      createBtn("✎", "修改标题", async () => {
        const exText = item.name;
        const { confirmed, ocrTextEdit } = await openEditPrompt(exText, 1);
        if (!confirmed) return;

        const finalName = ocrTextEdit;

        state.suppressChange = true;
        const sceneElements = api.getSceneElements();
        const updated = sceneElements.map((el) => {
          if (el.id === item.id) return { ...el, name: finalName };
          return el;
        });
        api.updateScene({ elements: updated, commitToHistory: true });

        treeData = initTreeData();
        render(item.id);
        setTimeout(() => state.suppressChange = false, 300);
      })
    );

    if (item.depth > 0) {
      actions.appendChild(
        createBtn("⎘", "向下复制当前节点", async () => {
          await duplicateBranchToCanvas(index, { includeChildren: false });
        })
      );

      actions.appendChild(
        createBtn("⧉", "向下复制当前+子项", async () => {
          await duplicateBranchToCanvas(index, { includeChildren: true });
        })
      );

      actions.appendChild(
        createBtn("+", "添加同级", () => {
          addNewFrameToCanvas("新建节点", (newId) => {
            const branchCount = getBranchCount(index, treeData);
            treeData.splice(index + branchCount, 0, { id: newId, name: "新建节点", depth: item.depth, collapsed: false });
          });
        })
      );
    }

    actions.appendChild(
      createBtn("↳", "添加子项", () => {
        item.collapsed = false;
        addNewFrameToCanvas("新建子节点", (newId) => {
          const branchCount = getBranchCount(index, treeData);
          treeData.splice(index + branchCount, 0, { id: newId, name: "新建子节点", depth: item.depth + 1, collapsed: false });
        });
      })
    );

    actions.appendChild(
      createBtn("×", "删除", () => {
        const branchCount = getBranchCount(index, treeData);
        const deleted = treeData.splice(index, branchCount);
        deleteFramesFromCanvas(new Set(deleted.map((d) => d.id)));
      })
    );

    li.appendChild(toggle);
    li.appendChild(text);
    li.appendChild(actions);

    li.ondblclick = (e) => {
      if (actions.contains(e.target) || toggle.contains(e.target)) return;

      const branchCount = getBranchCount(index, treeData);
      const branchIds = new Set(treeData.slice(index, index + branchCount).map((node) => node.id));
      const targetFrames = api.getSceneElements().filter((el) => branchIds.has(el.id));
      if (targetFrames.length > 0) {
        api.zoomToFit(targetFrames, 3);
      }
    };

    li.onfocus = () => {
      li.style.background = "var(--background-modifier-hover, #f1f5f9)";
    };
    li.onblur = () => {
      li.style.background = "transparent";
    };
    li.onmouseenter = () => {
      if (!state.draggingId && document.activeElement !== li) li.style.background = "var(--background-modifier-hover, #f1f5f9)";
      actions.style.opacity = "1";
    };
    li.onmouseleave = () => {
      if (document.activeElement !== li) li.style.background = "transparent";
      actions.style.opacity = "0";
    };

    li.onkeydown = async (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const branchCount = getBranchCount(index, treeData);
        let changed = false;
        if (e.shiftKey) {
          if (item.depth > 0) {
            for (let i = 0; i < branchCount; i++) treeData[index + i].depth -= 1;
            changed = true;
          }
        } else {
          const prevDepth = index > 0 ? treeData[index - 1].depth : -1;
          if (item.depth <= prevDepth) {
            for (let i = 0; i < branchCount; i++) treeData[index + i].depth += 1;
            changed = true;
          }
        }
        if (changed) {
          await syncToCanvas();
          scheduleNumberingRefresh({ focusedId: item.id });
        }
      }
    };

    li.ondragstart = (e) => {
      state.draggingId = item.id;
      state.dragIndex = index;
      state.dragCount = getBranchCount(index, treeData);
      e.dataTransfer.effectAllowed = "move";
      setTimeout(() => {
        ulContainer.querySelectorAll("li").forEach((node) => {
          const dataIdx = parseInt(node.dataset.dataIndex);
          if (dataIdx >= state.dragIndex && dataIdx < state.dragIndex + state.dragCount) node.style.opacity = "0.3";
        });
      }, 0);
      state.itemBounds = Array.from(ulContainer.querySelectorAll("li")).map((node) => {
        const rect = node.getBoundingClientRect();
        const wrapRect = scrollWrapper.getBoundingClientRect();
        return {
          dataIndex: parseInt(node.dataset.dataIndex),
          top: rect.top - wrapRect.top + scrollWrapper.scrollTop,
          bottom: rect.bottom - wrapRect.top + scrollWrapper.scrollTop,
          middle: rect.top - wrapRect.top + scrollWrapper.scrollTop + rect.height / 2,
        };
      });
    };

    li.ondragend = () => {
      state.draggingId = null;
      dropIndicator.style.display = "none";
      render();
    };
    ulContainer.appendChild(li);
  });

  if (focusedId) {
    setTimeout(() => {
      const target = ulContainer.querySelector(`[data-id="${focusedId}"]`);
      if (target) target.focus();
    }, 0);
  }
};

scrollWrapper.ondragover = (e) => {
  e.preventDefault();
  if (!state.draggingId) return;
  const wrapRect = scrollWrapper.getBoundingClientRect();
  const mouseY = e.clientY - wrapRect.top + scrollWrapper.scrollTop;
  const mouseX = e.clientX - wrapRect.left;

  let boundIdx = state.itemBounds.length;
  let referenceBound = null;
  for (let i = 0; i < state.itemBounds.length; i++) {
    if (mouseY < state.itemBounds[i].middle) {
      boundIdx = i;
      referenceBound = state.itemBounds[i];
      break;
    }
  }

  const insertDataIndex = referenceBound ? referenceBound.dataIndex : treeData.length;
  const prevVisibleDataIndex = boundIdx > 0 ? state.itemBounds[boundIdx - 1].dataIndex : -1;

  if (insertDataIndex > state.dragIndex && insertDataIndex <= state.dragIndex + state.dragCount) {
    dropIndicator.style.display = "none";
    state.targetIndex = -1;
    return;
  }

  const maxDepth = prevVisibleDataIndex >= 0 ? treeData[prevVisibleDataIndex].depth + 1 : 0;
  const finalDepth = clamp(Math.max(0, Math.floor((mouseX - 24) / INDENT_SIZE)), 0, maxDepth);

  const indicatorTop = referenceBound ? referenceBound.top : state.itemBounds.length ? state.itemBounds[state.itemBounds.length - 1].bottom : 0;
  const indicatorLeft = 12 + 10 + finalDepth * INDENT_SIZE;

  dropIndicator.style.display = "block";
  dropIndicator.style.top = `${indicatorTop}px`;
  dropIndicator.style.left = `${indicatorLeft}px`;
  dropIndicator.style.width = `calc(100% - ${indicatorLeft + 12}px)`;
  state.targetIndex = insertDataIndex;
  state.targetDepth = finalDepth;
  state.prevVisibleDataIndex = prevVisibleDataIndex;
};

scrollWrapper.ondrop = async (e) => {
  e.preventDefault();
  dropIndicator.style.display = "none";
  if (state.targetIndex !== -1 && state.draggingId) {
    const focusedId = state.draggingId;
    if (state.prevVisibleDataIndex >= 0 && state.targetDepth > treeData[state.prevVisibleDataIndex].depth) {
      treeData[state.prevVisibleDataIndex].collapsed = false;
    }

    const branch = treeData.splice(state.dragIndex, state.dragCount);
    const depthDelta = state.targetDepth - branch[0].depth;
    branch.forEach((item) => {
      item.depth += depthDelta;
    });

    let actualInsertIndex = state.targetIndex;
    if (state.targetIndex > state.dragIndex) actualInsertIndex -= state.dragCount;

    treeData.splice(actualInsertIndex, 0, ...branch);
    await syncToCanvas();
    scheduleNumberingRefresh({ focusedId });
  }
  state.draggingId = null;
  state.targetIndex = -1;
};

state.unsub = api.onChange(() => {
  if (state.suppressChange || state.draggingId) return;
  clearTimeout(state.renderTimer);
  state.renderTimer = setTimeout(() => {
    scheduleNumberingRefresh({ reinit: true });
  }, 500);
});

const cleanup = () => {
  if (state.unsub) state.unsub();
  root.remove();
  registry.delete(container);
};

registry.set(container, { cleanup });
render();