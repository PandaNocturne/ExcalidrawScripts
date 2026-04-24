/*
## Frame 导图大纲 (导图布局 + 手动层级编号 + 自由视窗)
- 样式更新：全自动生成原生 Elbow 拐角连线，强制锁定左右边缘锚点。
- 节点操作：支持节点同步删除，双击大纲聚焦当前节点及其子树。
- 核心逻辑：手动层级编号 (1, 1.1, 1.2.1)，点击按钮时执行，不干扰正常编辑。
- 界面升级：支持拖拽顶部栏改变面板位置，拖拽右下角调整界面宽高度，并限制了边界和最小宽高。
- 配置存储：布局设置和视窗尺寸位置使用 ea 脚本配置接口保存。
- 稳定性修复：已修复新建节点时因缺少默认渲染属性导致的画布布局崩溃问题。
- 新增功能：在设置中增加 Frame Marker 开关，默认将所有 Frame 设置为 "marker" 角色。
*/

const api = ea.getExcalidrawAPI();
const view = ea.targetView;
const container = view?.containerEl?.querySelector?.(".excalidraw-wrapper") || view?.containerEl;

if (!container) {
  new Notice("未找到 Excalidraw 视图容器");
  return;
}

// --- 0. 防多开与清理 ---
const ROOT_ID = "ea-frame-list-mindmap-layout-tool";
const GLOBAL_KEY = "__eaFrameListMindmapLayoutTool__";
const SETTINGS_KEY = "ea-frame-list-mindmap-layout-settings";
const COLLAPSED_STATE_KEY = "__eaFrameOutlineMindmapCollapsed__";

const registry = window[GLOBAL_KEY] ||= new WeakMap();
window[COLLAPSED_STATE_KEY] = window[COLLAPSED_STATE_KEY] || new Set();
const collapsedSet = window[COLLAPSED_STATE_KEY];

if (registry.get(container)?.cleanup) {
  registry.get(container).cleanup();
  new Notice("关闭 Frame 导图大纲");
  return;
}
new Notice("打开 Frame 导图大纲");

const DEFAULT_LAYOUT_SETTINGS = {
  horizontalGap: 80,
  verticalGap: 40,
  width: 320,
  height: 500,
  left: -1,
  top: 60,
  isFrameMarker: true, // 【新增】默认开启 marker 类型
};
const ARROW_STROKE_COLOR = "#1e1e1e";
const ARROW_STROKE_WIDTH = 4;

const sanitizeNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// 【变更】使用 ea 设置替代 localStorage
const loadConfig = () => {
  try {
    const settings = ea.getScriptSettings?.() || {};
    const saved = settings[SETTINGS_KEY] || {};
    return {
      horizontalGap: sanitizeNumber(saved.horizontalGap, DEFAULT_LAYOUT_SETTINGS.horizontalGap),
      verticalGap: sanitizeNumber(saved.verticalGap, DEFAULT_LAYOUT_SETTINGS.verticalGap),
      width: sanitizeNumber(saved.width, DEFAULT_LAYOUT_SETTINGS.width),
      height: sanitizeNumber(saved.height, DEFAULT_LAYOUT_SETTINGS.height),
      left: sanitizeNumber(saved.left, DEFAULT_LAYOUT_SETTINGS.left),
      top: sanitizeNumber(saved.top, DEFAULT_LAYOUT_SETTINGS.top),
      isFrameMarker: saved.isFrameMarker !== undefined ? saved.isFrameMarker : DEFAULT_LAYOUT_SETTINGS.isFrameMarker, // 【新增】读取 marker 配置
    };
  } catch {
    return { ...DEFAULT_LAYOUT_SETTINGS };
  }
};

const saveConfig = (nextConfig) => {
  const settings = ea.getScriptSettings?.() || {};
  settings[SETTINGS_KEY] = { ...CONFIG, ...nextConfig };
  ea.setScriptSettings?.(settings);
  Object.assign(CONFIG, nextConfig);
};

let CONFIG = loadConfig();

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
    data.push({ id: frame.id, name: frame.name, depth, collapsed: collapsedSet.has(frame.id) });
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
// 高级文本编辑器函数
// =====================================================================
async function openEditPrompt(ocrText, n = 10) {
  if (typeof utils === "undefined") {
    new Notice("提示: 未检测到 QuickAdd utils，使用基础输入框", 2000);
    const res = window.prompt("请输入新的节点名称", ocrText);
    if (res === null) return { confirmed: false, ocrTextEdit: ocrText };
    return { confirmed: true, ocrTextEdit: res };
  }
  const frameNameEditor = await utils.inputPrompt("编辑FrameName", "修改 Frame 标题", ocrText, undefined, n, true);
  if (frameNameEditor === null || typeof frameNameEditor === "undefined") return { confirmed: false, ocrTextEdit: ocrText };
  return { confirmed: true, ocrTextEdit: frameNameEditor === " " ? "" : frameNameEditor };
}

const getBranchItems = (index, data = treeData) => data.slice(index, index + getBranchCount(index, data));
const createCloneId = (prefix = "item") => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const cloneSceneElement = (element, elementIdMap, frameIdMap, groupIdMap) => {
  const cloned = JSON.parse(JSON.stringify(element));
  cloned.id = elementIdMap.get(element.id) || createCloneId(element.type || "el");
  cloned.isDeleted = false;
  cloned.version = 1;
  cloned.versionNonce = Math.floor(Math.random() * 1_000_000_000);

  if (typeof cloned.seed === "number") cloned.seed = Math.floor(Math.random() * 1_000_000_000);
  if (typeof cloned.frameId === "string" && frameIdMap.has(cloned.frameId)) cloned.frameId = frameIdMap.get(cloned.frameId);
  if (Array.isArray(cloned.groupIds)) cloned.groupIds = cloned.groupIds.map((id) => groupIdMap.get(id) || id);
  if (Array.isArray(cloned.boundElements)) {
    cloned.boundElements = cloned.boundElements.map((binding) => elementIdMap.has(binding.id) ? { ...binding, id: elementIdMap.get(binding.id) } : null).filter(Boolean);
  }
  if (typeof cloned.containerId === "string" && elementIdMap.has(cloned.containerId)) cloned.containerId = elementIdMap.get(cloned.containerId);
  if (cloned.startBinding?.elementId && elementIdMap.has(cloned.startBinding.elementId)) cloned.startBinding.elementId = elementIdMap.get(cloned.startBinding.elementId);
  if (cloned.endBinding?.elementId && elementIdMap.has(cloned.endBinding.elementId)) cloned.endBinding.elementId = elementIdMap.get(cloned.endBinding.elementId);
  
  // 【新增】如果克隆的是 frame，一并同步配置的 role
  if (cloned.type === "frame") cloned.frameRole = CONFIG.isFrameMarker ? "marker" : null;
  
  return cloned;
};

const duplicateBranchToCanvas = async (index, { includeChildren = false } = {}) => {
  state.suppressChange = true;
  const branchItems = getBranchItems(index);
  const sourceItems = includeChildren ? branchItems : [branchItems[0]];
  const sourceFrameIds = new Set(sourceItems.map((item) => item.id));
  const frameIdMap = new Map(sourceItems.map((item) => [item.id, createCloneId("frame")]));
  const sceneElements = api.getSceneElements();
  const sourceElements = sceneElements.filter((el) => !el.isDeleted && (sourceFrameIds.has(el.id) || sourceFrameIds.has(el.frameId)));
  const groupIdMap = new Map();

  sourceElements.forEach((el) => {
    (el.groupIds || []).forEach((groupId) => { if (!groupIdMap.has(groupId)) groupIdMap.set(groupId, createCloneId("group")); });
  });

  const elementIdMap = new Map(sourceElements.map((el) => [el.id, frameIdMap.get(el.id) || createCloneId(el.type || "el")]));
  const clonedTreeItems = sourceItems.map((item) => ({ ...item, id: frameIdMap.get(item.id), collapsed: false }));
  const insertIndex = index + branchItems.length;
  const clonedSceneElements = sourceElements.map((el) => cloneSceneElement(el, elementIdMap, frameIdMap, groupIdMap));

  treeData.splice(insertIndex, 0, ...clonedTreeItems);
  render();
  api.updateScene({ elements: [...sceneElements, ...clonedSceneElements], commitToHistory: true });

  setTimeout(async () => {
    await syncToCanvas();
    scheduleDataRefresh({ focusedId: clonedTreeItems[0]?.id || null });
  }, 100);
};

// =====================================================================
// === 2. 核心排版引擎 ===
// =====================================================================
const syncToCanvas = async () => {
  state.suppressChange = true;
  const horizontalGap = sanitizeNumber(CONFIG.horizontalGap, DEFAULT_LAYOUT_SETTINGS.horizontalGap);
  const verticalGap = sanitizeNumber(CONFIG.verticalGap, DEFAULT_LAYOUT_SETTINGS.verticalGap);
  const allEls = api.getSceneElements();
  ea.clear();

  const frameIds = new Set(treeData.map((t) => t.id));
  const framesToEdit = allEls.filter((e) => e.type === "frame" && frameIds.has(e.id) && !e.isDeleted);
  ea.copyViewElementsToEAforEditing(framesToEdit);

  const oldArrows = allEls.filter((e) => e.type === "arrow" && !e.isDeleted && frameIds.has(e.startBinding?.elementId) && frameIds.has(e.endBinding?.elementId));
  const oldArrowIds = new Set(oldArrows.map((a) => a.id));

  if (oldArrows.length > 0) {
    ea.copyViewElementsToEAforEditing(oldArrows);
    oldArrows.forEach((a) => { ea.elementsDict[a.id].isDeleted = true; });
  }

  const frameMap = new Map();
  framesToEdit.forEach((frame) => {
    const el = ea.elementsDict[frame.id];
    el.boundElements = el.boundElements ? el.boundElements.filter((b) => !oldArrowIds.has(b.id)) : [];
    
    // 【新增】在排版更新时，强制同步 Frame Role 配置
    el.frameRole = CONFIG.isFrameMarker ? "marker" : null;
    
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
    node.children.forEach((child) => { childrenHeightSum += calcHeights(child); });
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
      frame.x += dx; frame.y += dy;
      const innerEls = ea.getElementsInFrame(frame, allEls);
      innerEls.forEach((el) => {
        if (!ea.elementsDict[el.id]) ea.copyViewElementsToEAforEditing([el]);
        ea.elementsDict[el.id].x += dx; ea.elementsDict[el.id].y += dy;
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

  const arrowStyle = { strokeColor: ARROW_STROKE_COLOR, strokeWidth: ARROW_STROKE_WIDTH, strokeStyle: "solid", fillStyle: "solid", roughness: 0, roundness: { type: 2 }, startArrowhead: null, endArrowhead: "arrow", elbowed: true };
  Object.assign(ea.style, arrowStyle);
  const elementIdsBeforeConnect = new Set(Object.keys(ea.elementsDict));

  arrowsToCreate.forEach((arr) => { ea.connectObjects(arr.parent, "right", arr.child, "left", { type: "arrow", ...arrowStyle }); });

  const newArrowIds = Object.keys(ea.elementsDict).filter((id) => !elementIdsBeforeConnect.has(id));
  newArrowIds.forEach((id) => {
    const el = ea.elementsDict[id];
    if (el?.type !== "arrow") return;
    Object.assign(el, arrowStyle);
    if (el.startBinding) { el.startBinding.fixedPoint = [1, 0.5]; delete el.startBinding.focus; }
    if (el.endBinding) { el.endBinding.fixedPoint = [0, 0.5]; delete el.endBinding.focus; }
  });

  await ea.addElementsToView(false, false);
  setTimeout(() => { state.suppressChange = false; }, 300);
};

// =====================================================================
// === 3. 大纲 UI 与交互层 ===
// =====================================================================
const INDENT_SIZE = 22;
const state = { draggingId: null, dragIndex: -1, dragCount: 0, targetIndex: -1, targetDepth: 0, itemBounds: [], suppressChange: false, unsub: null, renderTimer: 0, settingsOpen: false, dataRefreshTimer: 0, refreshInFlight: false };

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const getBranchCount = (index, data) => {
  let count = 1;
  while (index + count < data.length && data[index + count].depth > data[index].depth) count++;
  return count;
};
const hasChildren = (index, data) => index + 1 < data.length && data[index + 1].depth > data[index].depth;

const applyManualNumbering = () => {
  let counters = [];
  let changed = false;
  treeData.forEach((item) => {
    const d = item.depth;
    counters.splice(d + 1);
    counters[d] = (counters[d] || 0) + 1;

    const numStr = counters.slice(0, d + 1).join('.');
    const cleanName = item.name.replace(/^(\d+(?:\.\d+)*)\s+/, '');
    const newName = `${numStr} ${cleanName}`;

    if (item.name !== newName) {
      item.name = newName;
      changed = true;
    }
  });
  return changed;
};

// 【新增】移除手动编号逻辑
const removeManualNumbering = () => {
  let changed = false;
  treeData.forEach((item) => {
    const cleanName = item.name.replace(/^(\d+(?:\.\d+)*)\s+/, '');
    if (item.name !== cleanName) {
      item.name = cleanName;
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
    if (typeof nextName === "string" && el.name !== nextName) { changed = true; return { ...el, name: nextName }; }
    return el;
  });
  if (!changed) return false;
  api.updateScene({ elements: updated, commitToHistory: true });
  return true;
};

const flushDataRefresh = ({ reinit = false, focusedId = null } = {}) => {
  if (state.refreshInFlight) return;
  state.refreshInFlight = true;
  state.suppressChange = true;
  try {
    if (reinit) treeData = initTreeData();
    const sceneChanged = syncTreeDataToSceneNames();
    if (sceneChanged || reinit) render(focusedId);
  } finally {
    setTimeout(() => { state.suppressChange = false; state.refreshInFlight = false; }, 300);
  }
};

const scheduleDataRefresh = ({ delay = 120, reinit = false, focusedId = null } = {}) => {
  clearTimeout(state.dataRefreshTimer);
  state.dataRefreshTimer = setTimeout(() => { flushDataRefresh({ reinit, focusedId }); }, delay);
};

const createIconButton = (text, title, onClick) => {
  const btn = document.createElement("div");
  btn.textContent = text;
  btn.title = title;
  Object.assign(btn.style, {
    cursor: "pointer",
    flexShrink: "0",
    color: "var(--text-muted, #64748b)",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.1s ease, color 0.1s ease",
  });
  btn.onmouseenter = () => {
    btn.style.transform = "scale(1.2)";
    btn.style.color = "var(--text-normal, #1e293b)";
  };
  btn.onmouseleave = () => {
    btn.style.transform = "scale(1)";
    btn.style.color = "var(--text-muted, #64748b)";
  };
  btn.onclick = onClick;
  return btn;
};

const root = document.createElement("div");
root.id = ROOT_ID;

// 【变更】取消 CSS resize，依靠自定义大小调整手柄，应用配置宽高
Object.assign(root.style, {
  position: "absolute",
  zIndex: "40",
  width: `${Math.max(200, CONFIG.width)}px`,
  height: `${Math.max(150, CONFIG.height)}px`,
  background: "var(--background-primary, #ffffff)",
  border: "1px solid var(--background-modifier-border, #d4d4d8)",
  borderRadius: "8px",
  boxShadow: "var(--shadow-s)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  userSelect: "none",
});

if (CONFIG.left !== -1) {
  root.style.left = `${CONFIG.left}px`;
  root.style.right = "auto";
} else {
  root.style.right = "20px";
  root.style.left = "auto";
}
root.style.top = `${CONFIG.top}px`;

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
  cursor: "grab",
});

// 【变更】增加基于边界检测的 header 拖拽逻辑
let dragMove = null;
let dragUp = null;

const dragCleanup = () => {
  if (dragMove) window.removeEventListener("pointermove", dragMove);
  if (dragUp) window.removeEventListener("pointerup", dragUp);
  dragMove = null;
  dragUp = null;
};

header.addEventListener("pointerdown", (e) => {
  if (e.target !== header && e.target !== headerTitle) return;
  e.preventDefault();
  e.stopPropagation();

  const startX = e.clientX;
  const startY = e.clientY;
  const rect = root.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const originLeft = rect.left - containerRect.left;
  const originTop = rect.top - containerRect.top;
  header.style.cursor = "grabbing";

  dragMove = (moveEvent) => {
    const width = root.offsetWidth;
    const height = root.offsetHeight;
    const maxLeft = Math.max(0, containerRect.width - width);
    const maxTop = Math.max(0, containerRect.height - height);

    const nextLeft = clamp(originLeft + (moveEvent.clientX - startX), 0, maxLeft);
    const nextTop = clamp(originTop + (moveEvent.clientY - startY), 0, maxTop);

    root.style.left = `${nextLeft}px`;
    root.style.top = `${nextTop}px`;
    root.style.right = "auto";

    CONFIG.left = nextLeft;
    CONFIG.top = nextTop;
  };

  dragUp = () => {
    header.style.cursor = "grab";
    saveConfig({ left: CONFIG.left, top: CONFIG.top });
    dragCleanup();
  };

  window.addEventListener("pointermove", dragMove);
  window.addEventListener("pointerup", dragUp, { once: true });
});

const headerTitle = document.createElement("div");
headerTitle.textContent = "Frame 导图大纲";
Object.assign(headerTitle.style, { whiteSpace: "nowrap",overflow: "hidden" });

const headerActions = document.createElement("div");
Object.assign(headerActions.style, { display: "flex", alignItems: "center", gap: "4px" });

const settingsPanel = document.createElement("div");
Object.assign(settingsPanel.style, { display: "none", padding: "10px 12px", borderBottom: "1px solid var(--background-modifier-border)", background: "var(--background-primary, #ffffff)" });
const settingsGrid = document.createElement("div");
Object.assign(settingsGrid.style, { display: "grid", gridTemplateColumns: "1fr auto", gap: "8px 10px", alignItems: "center" });

const horizontalGapInput = document.createElement("input");
horizontalGapInput.type = "number"; horizontalGapInput.min = "0"; horizontalGapInput.step = "10";
const verticalGapInput = document.createElement("input");
verticalGapInput.type = "number"; verticalGapInput.min = "0"; verticalGapInput.step = "10";
// 【新增】Marker 开关 UI
const isFrameMarkerInput = document.createElement("input");
isFrameMarkerInput.type = "checkbox";
isFrameMarkerInput.style.cursor = "pointer";

const styleSettingsInput = (input) => { Object.assign(input.style, { width: "72px", padding: "4px 6px", borderRadius: "6px", border: "1px solid var(--background-modifier-border, #d4d4d8)", background: "var(--background-primary, #ffffff)", color: "var(--text-normal, #1e293b)", fontSize: "12px" }); };
styleSettingsInput(horizontalGapInput); styleSettingsInput(verticalGapInput);

const makeSettingRow = (labelText, inputEl) => { const label = document.createElement("div"); label.textContent = labelText; label.style.color = "var(--text-muted, #64748b)"; label.style.fontSize = "12px"; settingsGrid.appendChild(label); settingsGrid.appendChild(inputEl); };
makeSettingRow("水平间距", horizontalGapInput); 
makeSettingRow("垂直间距", verticalGapInput);
makeSettingRow("设为 Marker", isFrameMarkerInput); // 【新增】加入面板设置

settingsPanel.appendChild(settingsGrid);

const syncSettingsInputs = () => { 
  horizontalGapInput.value = String(CONFIG.horizontalGap); 
  verticalGapInput.value = String(CONFIG.verticalGap); 
  isFrameMarkerInput.checked = CONFIG.isFrameMarker; // 【新增】同步 UI 状态
};
const applySettingsFromInputs = async () => {
  const nextSettings = { 
    horizontalGap: sanitizeNumber(horizontalGapInput.value, DEFAULT_LAYOUT_SETTINGS.horizontalGap), 
    verticalGap: sanitizeNumber(verticalGapInput.value, DEFAULT_LAYOUT_SETTINGS.verticalGap),
    isFrameMarker: isFrameMarkerInput.checked // 【新增】保存 Marker 设置
  };
  saveConfig(nextSettings); 
  syncSettingsInputs(); 
  await syncToCanvas(); 
  render();
};
horizontalGapInput.onchange = applySettingsFromInputs; 
verticalGapInput.onchange = applySettingsFromInputs;
isFrameMarkerInput.onchange = applySettingsFromInputs; // 【新增】监听切换事件

const expandAllBtn = createIconButton("➕", "全部展开", (e) => { e.stopPropagation(); treeData.forEach(item => { item.collapsed = false; collapsedSet.delete(item.id); }); render(); });
const collapseAllBtn = createIconButton("➖", "全部折叠", (e) => { e.stopPropagation(); treeData.forEach(item => { item.collapsed = true; collapsedSet.add(item.id); }); render(); });

const numberBtn = createIconButton("🔢", "生成/更新序号", (e) => {
  e.stopPropagation();
  state.suppressChange = true;
  const changed = applyManualNumbering();
  if (changed) {
    syncTreeDataToSceneNames();
    render();
  }
  setTimeout(() => { state.suppressChange = false; }, 300);
});

// 【新增】移除序号按钮事件
const removeNumberBtn = createIconButton("🔤", "移除序号", (e) => {
  e.stopPropagation();
  state.suppressChange = true;
  const changed = removeManualNumbering();
  if (changed) {
    syncTreeDataToSceneNames();
    render();
  }
  setTimeout(() => { state.suppressChange = false; }, 300);
});

const refreshBtn = createIconButton("🔄", "强制刷新并重排", async (e) => { e.stopPropagation(); treeData = initTreeData(); await syncToCanvas(); scheduleDataRefresh({ reinit: true }); });
const settingsBtn = createIconButton("⚙️", "布局设置", (e) => { e.stopPropagation(); state.settingsOpen = !state.settingsOpen; settingsPanel.style.display = state.settingsOpen ? "block" : "none"; if (state.settingsOpen) syncSettingsInputs(); });
const closeBtn = createIconButton("❌", "关闭面板", (e) => { e.stopPropagation(); cleanup(); });

headerActions.appendChild(expandAllBtn);
headerActions.appendChild(collapseAllBtn);
headerActions.appendChild(numberBtn);
headerActions.appendChild(removeNumberBtn); // 【新增】将移除序号按钮加入顶栏
headerActions.appendChild(settingsBtn);
headerActions.appendChild(refreshBtn);
headerActions.appendChild(closeBtn);

header.appendChild(headerTitle);
header.appendChild(headerActions);

const scrollWrapper = document.createElement("div");
Object.assign(scrollWrapper.style, { flex: "1", overflowY: "auto", position: "relative", minHeight: "150px" });

const ulContainer = document.createElement("ul");
Object.assign(ulContainer.style, { listStyle: "none", margin: "0", padding: "8px 0" });

const dropIndicator = document.createElement("div");
Object.assign(dropIndicator.style, { position: "absolute", left: "0", top: "0", height: "2px", background: "var(--interactive-accent, #2563eb)", pointerEvents: "none", display: "none", zIndex: "50" });
const dot = document.createElement("div");
Object.assign(dot.style, { position: "absolute", left: "-4px", top: "-3px", width: "8px", height: "8px", borderRadius: "50%", background: "var(--interactive-accent, #2563eb)", border: "2px solid var(--background-primary, #fff)" });
dropIndicator.appendChild(dot);

// 【变更】自定义尺寸缩放手柄，处理防溢出
const resizeHandle = document.createElement("div");
resizeHandle.title = "拖拽调整面板大小";
Object.assign(resizeHandle.style, {
  position: "absolute",
  right: "0",
  bottom: "0",
  width: "18px",
  height: "18px",
  cursor: "nwse-resize",
  background: "linear-gradient(135deg, transparent 0 48%, var(--background-modifier-border, #d4d4d8) 48% 56%, transparent 56% 64%, var(--background-modifier-border, #d4d4d8) 64% 72%, transparent 72%)",
  opacity: "0.85",
  zIndex: "50",
});

let resizeMove = null;
let resizeUp = null;

const resizeCleanup = () => {
  if (resizeMove) window.removeEventListener("pointermove", resizeMove);
  if (resizeUp) window.removeEventListener("pointerup", resizeUp);
  resizeMove = null;
  resizeUp = null;
};

resizeHandle.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();

  const startX = e.clientX;
  const startY = e.clientY;
  const rect = root.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const originWidth = rect.width;
  const originHeight = rect.height;
  const originLeft = rect.left - containerRect.left;
  const originTop = rect.top - containerRect.top;

  // 保证不仅不会小于最小值，放大时也不会超过容器剩余空间
  const maxWidth = Math.max(400, containerRect.width - originLeft);
  const maxHeight = Math.max(300, containerRect.height - originTop);

  resizeMove = (moveEvent) => {
    const nextWidth = clamp(originWidth + (moveEvent.clientX - startX), 200, maxWidth);
    const nextHeight = clamp(originHeight + (moveEvent.clientY - startY), 150, maxHeight);

    CONFIG.width = nextWidth;
    CONFIG.height = nextHeight;
    root.style.width = `${nextWidth}px`;
    root.style.height = `${nextHeight}px`;
  };

  resizeUp = () => {
    saveConfig({ width: CONFIG.width, height: CONFIG.height });
    resizeCleanup();
  };

  window.addEventListener("pointermove", resizeMove);
  window.addEventListener("pointerup", resizeUp, { once: true });
});

scrollWrapper.appendChild(ulContainer);
scrollWrapper.appendChild(dropIndicator);
root.appendChild(header);
root.appendChild(settingsPanel);
root.appendChild(scrollWrapper);
root.appendChild(resizeHandle);
container.appendChild(root);
syncSettingsInputs();

const cleanup = () => {
  if (state.unsub) state.unsub();
  dragCleanup();
  resizeCleanup();
  root.remove();
  registry.delete(container);
};

// 【修复】：全量恢复了初始版的新建节点对象，补齐了所有的必需默认属性
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
    angle: 0,                 // 【关键修复】Excalidraw 必须有 angle 才能计算选中框和交互
    name,
    strokeColor: "#000000",
    backgroundColor: "transparent",
    fillStyle: "solid",       // Frame 内部通常用 solid
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    boundElements: [],
    roundness: null,          // 补充默认属性
    seed: Math.floor(Math.random() * 1_000_000_000), // 【关键修复】seed 必须是有效整数
    version: 1,
    versionNonce: Math.floor(Math.random() * 1_000_000_000), // 【关键修复】必须是有效整数
    isDeleted: false,
    locked: false,            // 【关键修复】确保节点未被锁定
    frameRole: CONFIG.isFrameMarker ? "marker" : null, // 【新增】新建时根据设置赋予 marker 角色
    link: null,
    updated: Date.now(),      // 补充更新时间
  };

  insertToDataCallback(id);
  render();

  const finalName = treeData.find((item) => item.id === id)?.name || name;
  api.updateScene({ elements: [...api.getSceneElements(), { ...newFrame, name: finalName }], commitToHistory: true });

  setTimeout(async () => {
    await syncToCanvas();
    scheduleDataRefresh({ focusedId: id });
  }, 100);
};

const deleteFramesFromCanvas = async (idsToDeleteSet) => {
  state.suppressChange = true;
  const sceneElements = api.getSceneElements();
  const updated = sceneElements.map((el) => {
    const isTargetFrameOrInner = idsToDeleteSet.has(el.id) || idsToDeleteSet.has(el.frameId);
    const isConnectedArrow = el.type === "arrow" && (idsToDeleteSet.has(el.startBinding?.elementId) || idsToDeleteSet.has(el.endBinding?.elementId));
    if (isTargetFrameOrInner || isConnectedArrow) return { ...el, isDeleted: true };
    return el;
  });

  api.updateScene({ elements: updated, commitToHistory: true });
  setTimeout(async () => {
    await syncToCanvas();
    scheduleDataRefresh({ reinit: true });
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
    li.draggable = true; li.dataset.id = item.id; li.dataset.dataIndex = index; li.tabIndex = 0;

    Object.assign(li.style, {
      padding: `4px 8px 4px ${12 + item.depth * INDENT_SIZE}px`, fontSize: "13px", display: "flex", alignItems: "center",
      cursor: "grab", color: "var(--text-normal, #1e293b)", outline: "none", borderRadius: "4px", margin: "0 4px",
      border: "1px solid transparent", position: "relative",
    });

    const toggle = document.createElement("div");
    Object.assign(toggle.style, { width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: "4px", borderRadius: "4px", color: "var(--text-muted, #94a3b8)", cursor: isParent ? "pointer" : "default", fontSize: isParent ? "10px" : "14px", transition: "background 0.1s", });
    toggle.innerHTML = isParent ? (item.collapsed ? "▶" : "▼") : "•";

    if (isParent) {
      toggle.onclick = (e) => { e.stopPropagation(); item.collapsed = !item.collapsed; if (item.collapsed) collapsedSet.add(item.id); else collapsedSet.delete(item.id); render(item.id); };
      toggle.onmouseenter = () => { toggle.style.background = "var(--background-modifier-border, #e2e8f0)"; };
      toggle.onmouseleave = () => { toggle.style.background = "transparent"; };
    }

    const text = document.createElement("span");
    text.textContent = item.name || "未命名";
    Object.assign(text.style, { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none", flex: "1", });

    const actions = document.createElement("div");
    // 【修改】强制将动作栏容器背景设置为主体背景色（不透明），加入同色遮罩阴影防透底
    Object.assign(actions.style, {
      display: "flex", gap: "2px", opacity: "0", transition: "opacity 0.1s",
      pointerEvents: "auto", position: "absolute", right: "6px", top: "50%",
      transform: "translateY(-50%)",
      background: "var(--background-primary, #ffffff)",
      padding: "2px", borderRadius: "4px",
      // boxShadow: "-12px 0 10px var(--background-primary, #ffffff)",
      zIndex: "10"
    });

    const createBtn = (char, title, onClick) => {
      const btn = document.createElement("div");
      btn.textContent = char; btn.title = title;
      Object.assign(btn.style, {
        width: "20px", height: "20px", display: "flex", alignItems: "center",
        justifyContent: "center", cursor: "pointer", borderRadius: "4px",
        color: "var(--text-muted, #94a3b8)", fontSize: "14px", fontWeight: "bold",
      });
      btn.onmouseenter = () => { btn.style.background = "var(--background-modifier-border, #e2e8f0)"; btn.style.color = "var(--text-normal, #1e293b)"; };
      btn.onmouseleave = () => { btn.style.background = "transparent"; btn.style.color = "var(--text-muted, #94a3b8)"; };
      btn.onclick = (e) => { e.stopPropagation(); onClick(); };
      return btn;
    };

    actions.appendChild(createBtn("🖉", "修改标题", async () => {
      const exText = item.name;
      const { confirmed, ocrTextEdit } = await openEditPrompt(exText, 1);
      if (!confirmed) return;
      const finalName = ocrTextEdit;
      item.name = finalName; render(item.id);
      state.suppressChange = true;
      const sceneElements = api.getSceneElements();
      const updated = sceneElements.map((el) => el.id === item.id ? { ...el, name: finalName } : el);
      api.updateScene({ elements: updated, commitToHistory: true });
      setTimeout(() => state.suppressChange = false, 300);
    }));

    if (item.depth > 0) {
      actions.appendChild(createBtn("❏", "向下复制当前节点", async () => { await duplicateBranchToCanvas(index, { includeChildren: false }); }));
      actions.appendChild(createBtn("⧉", "向下复制当前+子项", async () => { await duplicateBranchToCanvas(index, { includeChildren: true }); }));
      actions.appendChild(createBtn("+", "添加同级", () => { addNewFrameToCanvas("新建节点", (newId) => { const branchCount = getBranchCount(index, treeData); treeData.splice(index + branchCount, 0, { id: newId, name: "新建节点", depth: item.depth, collapsed: false }); }); }));
    }

    actions.appendChild(createBtn("↳", "添加子项", () => { item.collapsed = false; addNewFrameToCanvas("新建子节点", (newId) => { const branchCount = getBranchCount(index, treeData); treeData.splice(index + branchCount, 0, { id: newId, name: "新建子节点", depth: item.depth + 1, collapsed: false }); }); }));
    actions.appendChild(createBtn("×", "删除", () => { const branchCount = getBranchCount(index, treeData); const deleted = treeData.splice(index, branchCount); render(); deleteFramesFromCanvas(new Set(deleted.map((d) => d.id))); }));

    li.appendChild(toggle); li.appendChild(text); li.appendChild(actions);

    li.ondblclick = (e) => {
      if (actions.contains(e.target) || toggle.contains(e.target)) return;
      const branchCount = getBranchCount(index, treeData);
      const branchIds = new Set(treeData.slice(index, index + branchCount).map((node) => node.id));
      const targetFrames = api.getSceneElements().filter((el) => branchIds.has(el.id));
      if (targetFrames.length > 0) { api.zoomToFit(targetFrames, 3); }
    };

    li.onfocus = () => { li.style.background = "var(--background-modifier-hover, #f1f5f9)"; };
    li.onblur = () => { li.style.background = "transparent"; };
    li.onmouseenter = () => { if (!state.draggingId && document.activeElement !== li) li.style.background = "var(--background-modifier-hover, #f1f5f9)"; actions.style.opacity = "1"; };
    li.onmouseleave = () => { if (document.activeElement !== li) li.style.background = "transparent"; actions.style.opacity = "0"; };

    li.onkeydown = async (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const branchCount = getBranchCount(index, treeData); let changed = false;
        if (e.shiftKey) { if (item.depth > 0) { for (let i = 0; i < branchCount; i++) treeData[index + i].depth -= 1; changed = true; } }
        else { const prevDepth = index > 0 ? treeData[index - 1].depth : -1; if (item.depth <= prevDepth) { for (let i = 0; i < branchCount; i++) treeData[index + i].depth += 1; changed = true; } }
        if (changed) { render(); await syncToCanvas(); scheduleDataRefresh({ focusedId: item.id }); }
      }
    };

    li.ondragstart = (e) => {
      state.draggingId = item.id; state.dragIndex = index; state.dragCount = getBranchCount(index, treeData); e.dataTransfer.effectAllowed = "move";
      setTimeout(() => { ulContainer.querySelectorAll("li").forEach((node) => { const dataIdx = parseInt(node.dataset.dataIndex); if (dataIdx >= state.dragIndex && dataIdx < state.dragIndex + state.dragCount) node.style.opacity = "0.3"; }); }, 0);
      state.itemBounds = Array.from(ulContainer.querySelectorAll("li")).map((node) => { const rect = node.getBoundingClientRect(); const wrapRect = scrollWrapper.getBoundingClientRect(); return { dataIndex: parseInt(node.dataset.dataIndex), top: rect.top - wrapRect.top + scrollWrapper.scrollTop, bottom: rect.bottom - wrapRect.top + scrollWrapper.scrollTop, middle: rect.top - wrapRect.top + scrollWrapper.scrollTop + rect.height / 2, }; });
    };

    li.ondragend = () => { state.draggingId = null; dropIndicator.style.display = "none"; render(); };
    ulContainer.appendChild(li);
  });

  if (focusedId) { setTimeout(() => { const target = ulContainer.querySelector(`[data-id="${focusedId}"]`); if (target) target.focus(); }, 0); }
};

scrollWrapper.ondragover = (e) => {
  e.preventDefault();
  if (!state.draggingId) return;
  const wrapRect = scrollWrapper.getBoundingClientRect();
  const mouseY = e.clientY - wrapRect.top + scrollWrapper.scrollTop;
  const mouseX = e.clientX - wrapRect.left;

  let boundIdx = state.itemBounds.length; let referenceBound = null;
  for (let i = 0; i < state.itemBounds.length; i++) { if (mouseY < state.itemBounds[i].middle) { boundIdx = i; referenceBound = state.itemBounds[i]; break; } }

  const insertDataIndex = referenceBound ? referenceBound.dataIndex : treeData.length;
  const prevVisibleDataIndex = boundIdx > 0 ? state.itemBounds[boundIdx - 1].dataIndex : -1;

  if (insertDataIndex > state.dragIndex && insertDataIndex <= state.dragIndex + state.dragCount) { dropIndicator.style.display = "none"; state.targetIndex = -1; return; }

  const maxDepth = prevVisibleDataIndex >= 0 ? treeData[prevVisibleDataIndex].depth + 1 : 0;
  const finalDepth = clamp(Math.max(0, Math.floor((mouseX - 24) / INDENT_SIZE)), 0, maxDepth);

  const indicatorTop = referenceBound ? referenceBound.top : state.itemBounds.length ? state.itemBounds[state.itemBounds.length - 1].bottom : 0;
  const indicatorLeft = 12 + 10 + finalDepth * INDENT_SIZE;

  dropIndicator.style.display = "block"; dropIndicator.style.top = `${indicatorTop}px`; dropIndicator.style.left = `${indicatorLeft}px`; dropIndicator.style.width = `calc(100% - ${indicatorLeft + 12}px)`;
  state.targetIndex = insertDataIndex; state.targetDepth = finalDepth; state.prevVisibleDataIndex = prevVisibleDataIndex;
};

scrollWrapper.ondrop = async (e) => {
  e.preventDefault(); dropIndicator.style.display = "none";
  if (state.targetIndex !== -1 && state.draggingId) {
    const focusedId = state.draggingId;
    if (state.prevVisibleDataIndex >= 0 && state.targetDepth > treeData[state.prevVisibleDataIndex].depth) { treeData[state.prevVisibleDataIndex].collapsed = false; }
    const branch = treeData.splice(state.dragIndex, state.dragCount);
    const depthDelta = state.targetDepth - branch[0].depth;
    branch.forEach((item) => { item.depth += depthDelta; });
    let actualInsertIndex = state.targetIndex;
    if (state.targetIndex > state.dragIndex) actualInsertIndex -= state.dragCount;
    treeData.splice(actualInsertIndex, 0, ...branch);
    render();
    await syncToCanvas();
    scheduleDataRefresh({ focusedId });
  }
  state.draggingId = null; state.targetIndex = -1;
};

state.unsub = api.onChange(() => {
  if (state.suppressChange || state.draggingId) return;
  clearTimeout(state.renderTimer);
  state.renderTimer = setTimeout(() => { scheduleDataRefresh({ reinit: true }); }, 500);
});

registry.set(container, { cleanup });
render();