/*

## FrameFloatingOutline

悬浮 Frame 大纲。

- 首次运行：在当前 Excalidraw 视图显示 frame 悬浮大纲
- 再次运行：关闭悬浮大纲
- 与画布实时同步：frame 新增、删除、重命名都会刷新
- 单击条目：仅高亮当前条目，不修改画布
- 双击标题：原地编辑 frame 名称
- 顺序按钮：按当前列表顺序为 frame 名称补 01、02、03 前缀
- 支持拖拽排序：可直接拖动条目，仅调整悬浮大纲中的显示顺序，不移动 frame 本体也不修改名称
- 支持拖拽右下角：调整大纲面板宽高并持久保存

```javascript
*/

const api = ea.getExcalidrawAPI();
if (!api) {
  new Notice("未获取到 Excalidraw API");
  return;
}

const view = ea.targetView;
const container = view?.containerEl?.querySelector?.(".excalidraw-wrapper") || view?.containerEl;
if (!container) {
  new Notice("未找到 Excalidraw 视图容器");
  return;
}

const ROOT_ID = "ea-frame-floating-outline";
const GLOBAL_KEY = "__eaFrameFloatingOutlineRegistry__";
const SETTINGS_KEY = "FrameFloatingOutlineSettings";
const registry = window[GLOBAL_KEY] ||= new WeakMap();
const existing = registry.get(container);
if (existing?.cleanup) {
  existing.cleanup();
  return;
}

const DEFAULT_CONFIG = {
  width: 280,
  maxHeight: 420,
  side: "right",
  offsetX: 16,
  offsetY: 16,
  autoNumberOnDrop: true,
  renumberSeparator: " ",
  zoomLevel: 5,
};

const loadConfig = () => {
  const settings = ea.getScriptSettings?.() || {};
  const saved = settings[SETTINGS_KEY] || {};
  return {
    width: Number(saved.width ?? DEFAULT_CONFIG.width),
    maxHeight: Number(saved.maxHeight ?? DEFAULT_CONFIG.maxHeight),
    side: saved.side === "left" ? "left" : DEFAULT_CONFIG.side,
    offsetX: Number(saved.offsetX ?? DEFAULT_CONFIG.offsetX),
    offsetY: Number(saved.offsetY ?? DEFAULT_CONFIG.offsetY),
    autoNumberOnDrop: saved.autoNumberOnDrop ?? DEFAULT_CONFIG.autoNumberOnDrop,
    renumberSeparator:
      typeof saved.renumberSeparator === "string"
        ? saved.renumberSeparator
        : DEFAULT_CONFIG.renumberSeparator,
    zoomLevel: Number( DEFAULT_CONFIG.zoomLevel),
  };
};

const CONFIG = loadConfig();

const saveConfig = () => {
  const settings = ea.getScriptSettings?.() || {};
  settings[SETTINGS_KEY] = {
    width: CONFIG.width,
    maxHeight: CONFIG.maxHeight,
    side: CONFIG.side,
    offsetX: CONFIG.offsetX,
    offsetY: CONFIG.offsetY,
    autoNumberOnDrop: CONFIG.autoNumberOnDrop,
    renumberSeparator: CONFIG.renumberSeparator,
    // zoomLevel: CONFIG.zoomLevel,
  };
  ea.setScriptSettings?.(settings);
};

const state = {
  disposed: false,
  unsub: null,
  raf: 0,
  frames: [],
  orderedFrameIds: [],
  editId: null,
  dragId: null,
  dropId: null,
  dropDirection: null,
  suppressChange: false,
  clickCandidateId: null,
  pointerDown: null,
  renderTimer: 0,
  skipPointerUpFrameId: null,
};

const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
const cssVar = (name, fallback) => `var(${name}, ${fallback})`;

const getOrderedFrames = (frames = getFrames()) => {
  const frameMap = new Map(frames.map((frame) => [frame.id, frame]));
  const ordered = [];
  state.orderedFrameIds.forEach((id) => {
    const frame = frameMap.get(id);
    if (!frame) return;
    ordered.push(frame);
    frameMap.delete(id);
  });
  ordered.push(...frameMap.values());
  state.orderedFrameIds = ordered.map((frame) => frame.id);
  return ordered;
};

const ORDERED_NAME_PATTERN = /^\s*\d{2,}[._\-\s、]+/;

const isOrderedFrameName = (name) => ORDERED_NAME_PATTERN.test(String(name || ""));

const splitFramesByOrganization = (frames) => {
  const organized = [];
  const unorganized = [];
  frames.forEach((frame) => {
    const name = String(frame.name || "").trim();
    if (!name || !isOrderedFrameName(name)) {
      unorganized.push(frame);
      return;
    }
    organized.push(frame);
  });
  return { organized, unorganized };
};

const root = document.createElement("div");
root.id = ROOT_ID;
Object.assign(root.style, {
  position: "absolute",
  zIndex: "40",
  width: `${Math.max(220, CONFIG.width)}px`,
  maxHeight: `${Math.max(180, CONFIG.maxHeight)}px`,
  display: "flex",
  flexDirection: "column",
  background: cssVar("--background-primary", "#ffffff"),
  color: cssVar("--text-normal", "#222222"),
  border: `1px solid ${cssVar("--background-modifier-border", "#d4d4d8")}`,
  borderRadius: cssVar("--radius-m", "12px"),
  boxShadow: cssVar("--shadow-s", "0 8px 28px rgba(0,0,0,0.16)"),
  overflow: "hidden",
  userSelect: "none",
  fontSize: "13px",
});

if (CONFIG.side === "left") {
  root.style.left = `${CONFIG.offsetX}px`;
} else {
  root.style.right = `${CONFIG.offsetX}px`;
}
root.style.top = `${CONFIG.offsetY}px`;

const header = document.createElement("div");
Object.assign(header.style, {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  padding: "10px 12px",
  borderBottom: `1px solid ${cssVar("--background-modifier-border", "#d4d4d8")}`,
  background: cssVar("--background-secondary", "#f5f6f8"),
  cursor: "grab",
  flexShrink: "0",
});

const title = document.createElement("div");
title.textContent = "Frame 大纲";
Object.assign(title.style, {
  fontWeight: "600",
  letterSpacing: "0.02em",
});

const toolbar = document.createElement("div");
Object.assign(toolbar.style, {
  display: "flex",
  gap: "6px",
  alignItems: "center",
});

const countBadge = document.createElement("span");
Object.assign(countBadge.style, {
  minWidth: "20px",
  height: "20px",
  padding: "0 6px",
  borderRadius: "999px",
  border: `1px solid ${cssVar("--background-modifier-border", "#d4d4d8")}`,
  background: cssVar("--background-modifier-hover", "#eceef2"),
  color: cssVar("--text-muted", "#666") ,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "11px",
});

const makeButton = (label, tip) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.title = tip;
  Object.assign(btn.style, {
    border: "none",
    background: "transparent",
    color: cssVar("--text-normal", "#222222"),
    padding: "0",
    margin: "0",
    boxShadow: "none",
    outline: "none",
    appearance: "none",
    cursor: "pointer",
    fontSize: "14px",
    lineHeight: "1",
  });
  return btn;
};

const renumberBtn = makeButton("🔢", "仅按已排序区当前顺序补 01、02、03 前缀");
const refreshBtn = makeButton("🔄", "手动刷新大纲");
const closeBtn = makeButton("✖", "关闭悬浮大纲");

const list = document.createElement("div");
Object.assign(list.style, {
  overflow: "auto",
  padding: "8px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  flex: "1",
});

const sortedList = document.createElement("div");
Object.assign(sortedList.style, {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

const unsortedList = document.createElement("div");
Object.assign(unsortedList.style, {
  display: "none",
  flexDirection: "column",
  gap: "6px",
  paddingTop: "8px",
  marginTop: "2px",
  borderTop: `1px dashed ${cssVar("--background-modifier-border", "#d4d4d8")}`,
});

list.appendChild(sortedList);
list.appendChild(unsortedList);

const empty = document.createElement("div");
empty.textContent = "当前画板没有 frame";
Object.assign(empty.style, {
  padding: "18px 12px",
  color: cssVar("--text-muted", "#666"),
  textAlign: "center",
  display: "none",
});

const resizeHandle = document.createElement("div");
resizeHandle.title = "拖拽调整大纲宽高";
Object.assign(resizeHandle.style, {
  position: "absolute",
  right: "0",
  bottom: "0",
  width: "18px",
  height: "18px",
  cursor: "nwse-resize",
  background: "linear-gradient(135deg, transparent 0 48%, var(--background-modifier-border, #d4d4d8) 48% 56%, transparent 56% 64%, var(--background-modifier-border, #d4d4d8) 64% 72%, transparent 72%)",
  opacity: "0.85",
});

header.appendChild(title);
toolbar.appendChild(countBadge);
toolbar.appendChild(renumberBtn);
toolbar.appendChild(refreshBtn);
toolbar.appendChild(closeBtn);
header.appendChild(toolbar);
root.appendChild(header);
root.appendChild(list);
root.appendChild(empty);
root.appendChild(resizeHandle);
container.appendChild(root);

const stop = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

root.addEventListener("pointerdown", (event) => event.stopPropagation());
root.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });

const normalizeFrameName = (name, fallbackIndex) => {
  const text = String(name || "").trim();
  if (text) return text;
  return `未命名 Frame ${String(fallbackIndex + 1).padStart(2, "0")}`;
};

const stripOrderPrefix = (name) =>
  String(name || "")
    .replace(/^\s*\d{2,}[._\-\s、]+/, "")
    .trim();

const formatOrderedName = (index, name) => {
  const order = String(index + 1).padStart(2, "0");
  const base = stripOrderPrefix(name) || `Frame ${order}`;
  return `${order}${CONFIG.renumberSeparator}${base}`;
};

const getFrames = () => {
  return ea
    .getViewElements()
    .filter((el) => el.type === "frame")
    .slice()
    .sort((a, b) => {
      const nameCompare = String(a.name || "").localeCompare(String(b.name || ""), "zh-Hans-CN", {
        numeric: true,
      });
      if (nameCompare !== 0) return nameCompare;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
};

const updateFrameNames = async (nameMap) => {
  const scene = api.getSceneElements();
  let changed = false;
  const nextElements = scene.map((el) => {
    if (el.type !== "frame") return el;
    const nextName = nameMap.get(el.id);
    if (typeof nextName !== "string" || nextName === el.name) return el;
    changed = true;
    return { ...el, name: nextName };
  });
  if (!changed) return false;

  state.suppressChange = true;
  api.updateScene({
    elements: nextElements,
    commitToHistory: true,
  });
  await wait(40);
  state.suppressChange = false;
  render();
  return true;
};

const focusFrame = (frame) => {
  if (!frame) return;
    api.zoomToFit([frame], CONFIG.zoomLevel);
};

const scheduleRender = (delay = 120) => {
  if (state.disposed || state.raf || state.renderTimer) return;
  state.renderTimer = window.setTimeout(() => {
    state.renderTimer = 0;
    render();
  }, delay);
};

const beginEdit = (frameId) => {
  state.clickCandidateId = null;
  state.pointerDown = null;
  state.editId = frameId;
  state.skipPointerUpFrameId = frameId;
  render();
};

const finishEdit = async (frameId, nextName) => {
  const value = String(nextName || "").trim();
  state.editId = null;
  if (!value) {
    render();
    return;
  }
  await updateFrameNames(new Map([[frameId, value]]));
};

const renumberFrames = async (orderedFrames) => {
  const nameMap = new Map();
  orderedFrames.forEach((frame, index) => {
    nameMap.set(frame.id, formatOrderedName(index, frame.name));
  });
  await updateFrameNames(nameMap);
};

const reorderFrames = async (dragId, dropId, direction) => {
  if (!dragId || !dropId || dragId === dropId) return;
  const allFrames = getOrderedFrames();
  const { organized } = splitFramesByOrganization(allFrames);
  const frameMap = new Map(allFrames.map((frame) => [frame.id, frame]));
  const items = organized.map((frame) => frame.id);
  const targetIndex = items.indexOf(dropId);
  if (targetIndex < 0 || !frameMap.has(dragId)) return;

  const fromIndex = items.indexOf(dragId);
  if (fromIndex >= 0) {
    items.splice(fromIndex, 1);
  }

  let insertIndex = targetIndex;
  if (fromIndex >= 0 && fromIndex < targetIndex) insertIndex -= 1;
  if (direction === "after") insertIndex += 1;
  items.splice(Math.max(0, Math.min(items.length, insertIndex)), 0, dragId);

  const trailingIds = allFrames
    .filter((frame) => !items.includes(frame.id))
    .map((frame) => frame.id);
  state.orderedFrameIds = [...items, ...trailingIds].filter((id) => frameMap.has(id));
  
  // FIX: 根据配置自动更新名称前缀，保证重排序后序号是对的
  if (CONFIG.autoNumberOnDrop) {
    const newOrganized = items.map(id => frameMap.get(id));
    await renumberFrames(newOrganized);
  } else {
    render();
  }
};

const moveFrameToSortedZone = async (dragId, position = "end") => {
  if (!dragId) return;
  const allFrames = getOrderedFrames();
  const { organized } = splitFramesByOrganization(allFrames);
  const frameMap = new Map(allFrames.map((frame) => [frame.id, frame]));
  if (!frameMap.has(dragId)) return;

  const items = organized.map((frame) => frame.id).filter((id) => id !== dragId);
  const insertIndex = position === "start" ? 0 : items.length;
  items.splice(insertIndex, 0, dragId);

  const trailingIds = allFrames
    .filter((frame) => !items.includes(frame.id))
    .map((frame) => frame.id);
  state.orderedFrameIds = [...items, ...trailingIds].filter((id) => frameMap.has(id));
  
  // FIX: 强制为刚拖进来的 Frame 添加数字前缀，否则下次渲染又被踢出排序区
  if (CONFIG.autoNumberOnDrop) {
    const newOrganized = items.map(id => frameMap.get(id));
    await renumberFrames(newOrganized);
  } else {
    const dragFrame = frameMap.get(dragId);
    const newName = formatOrderedName(insertIndex, dragFrame.name);
    await updateFrameNames(new Map([[dragId, newName]]));
  }
};

const moveFrameToUnsortedZone = async (dragId, position = "end") => {
  if (!dragId) return;
  const allFrames = getOrderedFrames();
  const { organized, unorganized } = splitFramesByOrganization(allFrames);
  const frameMap = new Map(allFrames.map((frame) => [frame.id, frame]));
  const dragFrame = frameMap.get(dragId);
  if (!dragFrame) return;

  const organizedIds = organized.map((frame) => frame.id).filter((id) => id !== dragId);
  const unorganizedIds = unorganized.map((frame) => frame.id).filter((id) => id !== dragId);
  const insertIndex = position === "start" ? 0 : unorganizedIds.length;
  unorganizedIds.splice(insertIndex, 0, dragId);
  state.orderedFrameIds = [...organizedIds, ...unorganizedIds].filter((id) => frameMap.has(id));

  // 剥离原有的排序前缀
  const strippedName = stripOrderPrefix(dragFrame.name);
  const nextName = strippedName || "Frame";
  
  const nameMap = new Map();
  if (nextName !== String(dragFrame.name || "")) {
    nameMap.set(dragId, nextName);
  }

  // FIX: 如果移出了排序区，需重新更新排序区中剩余成员的序号
  if (CONFIG.autoNumberOnDrop) {
    organizedIds.forEach((id, index) => {
      const f = frameMap.get(id);
      if (f) {
        nameMap.set(id, formatOrderedName(index, f.name));
      }
    });
  }

  if (nameMap.size > 0) {
    await updateFrameNames(nameMap);
  } else {
    render();
  }
};

const clearDropState = () => {
  state.dropId = null;
  state.dropDirection = null;
};

const renderItem = (frame, options = {}) => {
  const {
    index = null,
    draggable = true,
    droppable = true,
    zone = "sorted",
  } = options;
  const item = document.createElement("div");
  Object.assign(item.style, {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "8px",
    borderRadius: cssVar("--radius-s", "10px"),
    border: `1px solid ${cssVar("--background-modifier-border", "#d4d4d8")}`,
    background: cssVar("--background-primary-alt", "#f8f9fb"),
    cursor: "default",
    opacity: draggable ? "1" : "0.92",
  });
  item.draggable = draggable;
  item.dataset.frameId = frame.id;

  const topLine = document.createElement("div");
  Object.assign(topLine.style, {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  });

  const indexBadge = document.createElement("div");
  indexBadge.textContent = index == null ? "--" : String(index + 1).padStart(2, "0");
  Object.assign(indexBadge.style, {
    minWidth: "24px",
    height: "20px",
    borderRadius: "999px",
    border: `1px solid ${cssVar("--background-modifier-border", "#d4d4d8")}`,
    background: draggable
      ? cssVar("--background-secondary-alt", "#eef1f5")
      : cssVar("--background-modifier-hover", "#eceef2"),
    color: cssVar("--text-muted", "#666"),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    flexShrink: "0",
  });

  const content = document.createElement("div");
  Object.assign(content.style, {
    flex: "1",
    minWidth: "0",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  });

  const jumpTarget = document.createElement("div");
  Object.assign(jumpTarget.style, {
    flex: "1",
    minWidth: "0",
    display: "flex",
    alignItems: "center",
    cursor: state.editId === frame.id ? "default" : "pointer",
  });

  const isEditing = state.editId === frame.id;
  const itemActionBtn = makeButton(isEditing ? "✖" : "✏️", isEditing ? "退出编辑" : "编辑这个 frame 名称");
  Object.assign(itemActionBtn.style, {
    flexShrink: "0",
  });

  const displayName = normalizeFrameName(frame.name, index ?? 0);

  if (isEditing) {
    const input = document.createElement("input");
    input.type = "text";
    input.value = displayName;
    Object.assign(input.style, {
      width: "100%",
      border: `1px solid ${cssVar("--interactive-accent", "#6b8cff")}`,
      background: cssVar("--background-primary", "#ffffff"),
      color: cssVar("--text-normal", "#222222"),
      borderRadius: cssVar("--button-radius", "8px"),
      padding: "6px 8px",
      outline: "none",
      minWidth: "0",
    });
    input.addEventListener("pointerdown", (event) => event.stopPropagation());
    input.addEventListener("mousedown", (event) => event.stopPropagation());
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("keydown", async (event) => {
      event.stopPropagation();
      if (event.key === "Enter") {
        await finishEdit(frame.id, input.value);
      }
      if (event.key === "Escape") {
        state.editId = null;
        render();
      }
    });
    jumpTarget.appendChild(input);
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);

    itemActionBtn.addEventListener("click", (event) => {
      stop(event);
      state.editId = null;
      render();
    });
  } else {
    const label = document.createElement("div");
    label.textContent = displayName;
    label.title = displayName;
    Object.assign(label.style, {
      flex: "1",
      minWidth: "0",
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      cursor: "inherit",
      lineHeight: "1.4",
    });
    label.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    jumpTarget.appendChild(label);

    itemActionBtn.addEventListener("click", (event) => {
      stop(event);
      beginEdit(frame.id);
    });
  }

  topLine.appendChild(indexBadge);
  topLine.appendChild(jumpTarget);
  topLine.appendChild(itemActionBtn);
  item.appendChild(topLine);

  jumpTarget.addEventListener("pointerdown", (event) => {
    if (state.editId === frame.id || event.button !== 0) return;
    state.clickCandidateId = frame.id;
    state.pointerDown = {
      x: event.clientX,
      y: event.clientY,
    };
  });

  jumpTarget.addEventListener("pointerup", (event) => {
    if (state.skipPointerUpFrameId === frame.id) {
      state.skipPointerUpFrameId = null;
      state.clickCandidateId = null;
      state.pointerDown = null;
      event.stopPropagation();
      return;
    }
    if (state.editId === frame.id || state.clickCandidateId !== frame.id || !state.pointerDown) return;
    const dx = Math.abs(event.clientX - state.pointerDown.x);
    const dy = Math.abs(event.clientY - state.pointerDown.y);
    state.clickCandidateId = null;
    state.pointerDown = null;
    if (dx <= 4 && dy <= 4) {
      event.stopPropagation();
      focusFrame(frame);
    }
  });

  jumpTarget.addEventListener("pointercancel", () => {
    if (state.clickCandidateId === frame.id) {
      state.clickCandidateId = null;
      state.pointerDown = null;
    }
  });

  if (draggable) {
    item.addEventListener("dragstart", (event) => {
      state.dragId = frame.id;
      state.clickCandidateId = null;
      state.pointerDown = null;
      item.style.opacity = "0.45";
      event.dataTransfer.effectAllowed = "move";
      try {
        event.dataTransfer.setData("text/plain", frame.id);
      } catch (error) {}
    });

    item.addEventListener("dragend", () => {
      item.style.opacity = "1";
      state.dragId = null;
      state.dropId = null;
      state.dropDirection = null;
      render();
    });
  }

  if (droppable) {
    item.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move"; // FIX: 确保所有环境都允许放置
      const rect = item.getBoundingClientRect();
      const ratio = (event.clientY - rect.top) / Math.max(rect.height, 1);
      state.dropId = frame.id;
      state.dropDirection = ratio < 0.5 ? "before" : "after";
      item.style.borderTop = state.dropDirection === "before"
        ? `2px solid ${cssVar("--interactive-accent", "#6b8cff")}`
        : `1px solid ${cssVar("--background-modifier-border", "#d4d4d8")}`;
      item.style.borderBottom = state.dropDirection === "after"
        ? `2px solid ${cssVar("--interactive-accent", "#6b8cff")}`
        : `1px solid ${cssVar("--background-modifier-border", "#d4d4d8")}`;
    });

    item.addEventListener("dragleave", (event) => {
      item.style.borderTop = `1px solid ${cssVar("--background-modifier-border", "#d4d4d8")}`;
      item.style.borderBottom = `1px solid ${cssVar("--background-modifier-border", "#d4d4d8")}`;
      if (!item.contains(event.relatedTarget) && state.dropId === frame.id) {
        clearDropState();
      }
    });

    item.addEventListener("drop", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      item.style.borderTop = `1px solid ${cssVar("--background-modifier-border", "#d4d4d8")}`;
      item.style.borderBottom = `1px solid ${cssVar("--background-modifier-border", "#d4d4d8")}`;
      const dragId = state.dragId;
      const dropId = frame.id;
      const direction = state.dropDirection || "after";
      const allFrames = getOrderedFrames();
      const { organized } = splitFramesByOrganization(allFrames);
      const dragIsSorted = organized.some((item) => item.id === dragId);

      if (!dragId || dragId === dropId) {
        state.dragId = null;
        state.dropId = null;
        state.dropDirection = null;
        return;
      }

      if (zone === "sorted") {
        if (dragIsSorted) {
          await reorderFrames(dragId, dropId, direction);
        } else {
          // FIX: 未排序拖入已排序，同步修改名称
          const frameMap = new Map(allFrames.map((item) => [item.id, item]));
          if (!frameMap.has(dragId) || !frameMap.has(dropId)) {
            state.dragId = null;
            state.dropId = null;
            state.dropDirection = null;
            return;
          }

          const sortedIds = organized.map((item) => item.id);
          const targetIndex = sortedIds.indexOf(dropId);
          if (targetIndex < 0) {
            state.dragId = null;
            state.dropId = null;
            state.dropDirection = null;
            return;
          }

          const insertIndex = direction === "before" ? targetIndex : targetIndex + 1;
          sortedIds.splice(insertIndex, 0, dragId);

          const trailingIds = allFrames
            .filter((item) => !sortedIds.includes(item.id))
            .map((item) => item.id);
          state.orderedFrameIds = [...sortedIds, ...trailingIds].filter((id) => frameMap.has(id));
          
          if (CONFIG.autoNumberOnDrop) {
            const newOrganized = sortedIds.map(id => frameMap.get(id));
            await renumberFrames(newOrganized);
          } else {
            const dragFrame = frameMap.get(dragId);
            const newName = formatOrderedName(insertIndex, dragFrame.name);
            await updateFrameNames(new Map([[dragId, newName]]));
          }
        }
      } else {
        await moveFrameToUnsortedZone(dragId, direction === "before" ? "start" : "end");
      }

      state.dragId = null;
      state.dropId = null;
      state.dropDirection = null;
    });
  }

  return item;
};

const render = () => {
  if (state.disposed) return;
  if (state.raf) cancelAnimationFrame(state.raf);
  state.raf = requestAnimationFrame(() => {
    state.raf = 0;
    const frames = getOrderedFrames();
    const { organized, unorganized } = splitFramesByOrganization(frames);
    state.frames = frames;
    countBadge.textContent = String(frames.length);
    sortedList.replaceChildren();
    unsortedList.replaceChildren();
    empty.style.display = frames.length ? "none" : "block";
    unsortedList.style.display = unorganized.length || organized.length ? "flex" : "none";

    organized.forEach((frame, index) => {
      sortedList.appendChild(renderItem(frame, {
        index,
        draggable: true,
        droppable: true,
        zone: "sorted",
      }));
    });

    if (!organized.length && frames.length) {
      const sortedDropHint = document.createElement("div");
      sortedDropHint.textContent = "拖到这里加入已排序区";
      Object.assign(sortedDropHint.style, {
        padding: "10px 12px",
        borderRadius: cssVar("--radius-s", "10px"),
        border: `1px dashed ${cssVar("--background-modifier-border", "#d4d4d8")}`,
        color: cssVar("--text-muted", "#666"),
        textAlign: "center",
        fontSize: "12px",
      });
      sortedList.appendChild(sortedDropHint);
    }

    if (!unorganized.length && organized.length) {
      const unsortedDropHint = document.createElement("div");
      unsortedDropHint.textContent = "拖到这里移出已排序区";
      Object.assign(unsortedDropHint.style, {
        padding: "10px 12px",
        borderRadius: cssVar("--radius-s", "10px"),
        border: `1px dashed ${cssVar("--background-modifier-border", "#d4d4d8")}`,
        color: cssVar("--text-muted", "#666"),
        textAlign: "center",
        fontSize: "12px",
      });
      unsortedList.appendChild(unsortedDropHint);
    }

    unorganized.forEach((frame) => {
      unsortedList.appendChild(renderItem(frame, {
        draggable: true,
        droppable: true,
        zone: "unsorted",
      }));
    });
  });
};

const resetSortedListDropState = () => {
  sortedList.style.background = "transparent";
  sortedList.style.outline = "none";
  sortedList.style.outlineOffset = "0";
};

const updateSortedListDropState = (event) => {
  const { organized } = splitFramesByOrganization(getOrderedFrames());
  sortedList.style.background = cssVar("--background-modifier-hover", "#eceef2");
  sortedList.style.outline = `1px dashed ${cssVar("--interactive-accent", "#6b8cff")}`;
  sortedList.style.outlineOffset = "4px";
  if (!organized.length) {
    state.dropDirection = "end";
    return;
  }
  const rect = sortedList.getBoundingClientRect();
  const ratio = (event.clientY - rect.top) / Math.max(rect.height, 1);
  state.dropDirection = ratio < 0.5 ? "start" : "end";
};

const resetUnsortedListDropState = () => {
  unsortedList.style.background = "transparent";
  unsortedList.style.outline = "none";
  unsortedList.style.outlineOffset = "0";
};

const updateUnsortedListDropState = (event) => {
  const { unorganized } = splitFramesByOrganization(getOrderedFrames());
  unsortedList.style.background = cssVar("--background-modifier-hover", "#eceef2");
  unsortedList.style.outline = `1px dashed ${cssVar("--interactive-accent", "#6b8cff")}`;
  unsortedList.style.outlineOffset = "4px";
  if (!unorganized.length) {
    state.dropDirection = "end";
    return;
  }
  const rect = unsortedList.getBoundingClientRect();
  const ratio = (event.clientY - rect.top) / Math.max(rect.height, 1);
  state.dropDirection = ratio < 0.5 ? "start" : "end";
};

sortedList.addEventListener("dragover", (event) => {
  if (!state.dragId) return;
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = "move"; // FIX: 兼容增强
  if (state.dropId) return;
  updateSortedListDropState(event);
});

sortedList.addEventListener("dragleave", (event) => {
  if (!sortedList.contains(event.relatedTarget)) {
    resetSortedListDropState();
    if (!state.dropId) state.dropDirection = null;
  }
});

sortedList.addEventListener("drop", async (event) => {
  if (!state.dragId) return;
  event.preventDefault();
  event.stopPropagation();
  if (state.dropId && event.target?.closest?.("[data-frame-id]")) return;
  const allFrames = getOrderedFrames();
  const { organized } = splitFramesByOrganization(allFrames);
  const dragId = state.dragId;
  const dragIsSorted = organized.some((item) => item.id === dragId);
  const position = state.dropDirection === "start" ? "start" : "end";
  state.dragId = null;
  state.dropId = null;
  state.dropDirection = null;
  resetSortedListDropState();
  if (dragIsSorted && organized.length) {
    const anchorId = position === "start" ? organized[0].id : organized[organized.length - 1].id;
    await reorderFrames(dragId, anchorId, position === "start" ? "before" : "after");
    return;
  }
  await moveFrameToSortedZone(dragId, position);
});

unsortedList.addEventListener("dragover", (event) => {
  if (!state.dragId) return;
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = "move"; // FIX: 兼容增强
  if (state.dropId) return;
  updateUnsortedListDropState(event);
});

unsortedList.addEventListener("dragleave", (event) => {
  if (!unsortedList.contains(event.relatedTarget)) {
    resetUnsortedListDropState();
    if (!state.dropId) state.dropDirection = null;
  }
});

unsortedList.addEventListener("drop", async (event) => {
  if (!state.dragId) return;
  event.preventDefault();
  event.stopPropagation();
  if (state.dropId && event.target?.closest?.("[data-frame-id]")) return;
  const dragId = state.dragId;
  const position = state.dropDirection === "start" ? "start" : "end";
  state.dragId = null;
  state.dropId = null;
  state.dropDirection = null;
  resetUnsortedListDropState();
  await moveFrameToUnsortedZone(dragId, position);
});

const cleanup = () => {
  if (state.disposed) return;
  state.disposed = true;
  if (state.unsub) state.unsub();
  if (state.raf) cancelAnimationFrame(state.raf);
  if (state.renderTimer) window.clearTimeout(state.renderTimer);
  dragCleanup();
  resizeCleanup();
  root.remove();
  registry.delete(container);
};

refreshBtn.addEventListener("click", (event) => {
  stop(event);
  render();
});

renumberBtn.addEventListener("click", async (event) => {
  stop(event);
  const { organized } = splitFramesByOrganization(getOrderedFrames());
  await renumberFrames(organized);
});

closeBtn.addEventListener("click", (event) => {
  stop(event);
  cleanup();
});

let dragMove = null;
let dragUp = null;
let resizeMove = null;
let resizeUp = null;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const getPanelSize = () => ({
  width: Math.max(220, CONFIG.width),
  height: root.getBoundingClientRect().height,
  maxHeight: Math.max(180, CONFIG.maxHeight),
});
const dragCleanup = () => {
  if (dragMove) window.removeEventListener("pointermove", dragMove);
  if (dragUp) window.removeEventListener("pointerup", dragUp);
  dragMove = null;
  dragUp = null;
};
const resizeCleanup = () => {
  if (resizeMove) window.removeEventListener("pointermove", resizeMove);
  if (resizeUp) window.removeEventListener("pointerup", resizeUp);
  resizeMove = null;
  resizeUp = null;
};

header.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) return;
  stop(event);
  const startX = event.clientX;
  const startY = event.clientY;
  const rect = root.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const originLeft = rect.left - containerRect.left;
  const originTop = rect.top - containerRect.top;
  header.style.cursor = "grabbing";

  dragMove = (moveEvent) => {
    const panel = getPanelSize();
    const maxLeft = Math.max(0, containerRect.width - panel.width);
    const maxTop = Math.max(0, containerRect.height - panel.height);
    const nextLeft = clamp(originLeft + (moveEvent.clientX - startX), 0, maxLeft);
    const nextTop = clamp(originTop + (moveEvent.clientY - startY), 0, maxTop);
    root.style.left = `${nextLeft}px`;
    root.style.top = `${nextTop}px`;
    root.style.right = "auto";
    CONFIG.side = "left";
    CONFIG.offsetX = nextLeft;
    CONFIG.offsetY = nextTop;
  };

  dragUp = () => {
    header.style.cursor = "grab";
    saveConfig();
    dragCleanup();
  };

  window.addEventListener("pointermove", dragMove);
  window.addEventListener("pointerup", dragUp, { once: true });
});

resizeHandle.addEventListener("pointerdown", (event) => {
  stop(event);
  const startX = event.clientX;
  const startY = event.clientY;
  const rect = root.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const originWidth = rect.width;
  const originHeight = rect.height;
  const originLeft = rect.left - containerRect.left;
  const originTop = rect.top - containerRect.top;
  const maxWidth = Math.max(220, containerRect.width - originLeft);
  const maxHeight = Math.max(180, containerRect.height - originTop);

  resizeMove = (moveEvent) => {
    const nextWidth = clamp(originWidth + (moveEvent.clientX - startX), 220, maxWidth);
    const nextHeight = clamp(originHeight + (moveEvent.clientY - startY), 180, maxHeight);
    CONFIG.width = nextWidth;
    CONFIG.maxHeight = nextHeight;
    root.style.width = `${nextWidth}px`;
    root.style.maxHeight = `${nextHeight}px`;
  };

  resizeUp = () => {
    saveConfig();
    resizeCleanup();
  };

  window.addEventListener("pointermove", resizeMove);
  window.addEventListener("pointerup", resizeUp, { once: true });
});

state.unsub = api.onChange(() => {
  if (state.suppressChange) return;
  scheduleRender();
});

registry.set(container, { cleanup });
render();

new Notice("Frame 悬浮大纲已开启");