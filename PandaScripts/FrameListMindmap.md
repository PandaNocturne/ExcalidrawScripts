/*
## Frame 导图大纲 (加粗线条 + 完美粘性连线 + 原生拐角版)
- 样式更新：线条加粗 (strokeWidth: 4)，实线样式，填充样式。
- 核心：使用 ea.connectObjects 解决连线脱落问题，全自动生成 Elbow 拐角连线。
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
const registry = window[GLOBAL_KEY] ||= new WeakMap();

if (registry.get(container)?.cleanup) {
  registry.get(container).cleanup();
  new Notice("关闭 Frame 导图大纲");
  return; 
}
new Notice("打开 Frame 导图大纲");

// --- 1. 画布数据解析引擎 (Canvas -> UI) ---
const initTreeData = () => {
  const frames = ea.getViewElements().filter(e => e.type === "frame" && !e.isDeleted);
  const frameIds = new Set(frames.map(f => f.id));
  const arrows = ea.getViewElements().filter(e => 
    e.type === "arrow" && !e.isDeleted && 
    frameIds.has(e.startBinding?.elementId) && frameIds.has(e.endBinding?.elementId)
  );

  const childrenMap = new Map();
  const hasParent = new Set();
  arrows.forEach(a => {
    const p = a.startBinding.elementId;
    const c = a.endBinding.elementId;
    if (!childrenMap.has(p)) childrenMap.set(p, []);
    childrenMap.get(p).push(c);
    hasParent.add(c);
  });

  const roots = frames.filter(f => !hasParent.has(f.id)).sort((a,b) => a.y - b.y);
  const data = [];
  
  const traverse = (frame, depth) => {
    data.push({ id: frame.id, name: frame.name || "未命名", depth, collapsed: false });
    const children = (childrenMap.get(frame.id) || []).map(id => frames.find(f => f.id === id)).filter(Boolean);
    children.sort((a,b) => a.y - b.y).forEach(c => traverse(c, depth + 1));
  };
  
  roots.forEach(r => traverse(r, 0));
  frames.forEach(f => { if (!data.find(d => d.id === f.id)) traverse(f, 0); });
  return data;
};

let treeData = initTreeData();

// =====================================================================
// === 2. 核心排版引擎 (自动绑定 + 拐角连线 + 自定义线条样式) ===
// =====================================================================
const syncToCanvas = async () => {
  state.suppressChange = true;
  
  const allEls = api.getSceneElements();
  ea.clear();
  
  const frameIds = new Set(treeData.map(t => t.id));
  
  // 1. 获取所有的相关 Frame 装载进编辑队列
  const framesToEdit = allEls.filter(e => e.type === "frame" && frameIds.has(e.id) && !e.isDeleted);
  ea.copyViewElementsToEAforEditing(framesToEdit);
  
  // 2. 清理旧连线及其记录
  const oldArrows = allEls.filter(e => e.type === "arrow" && !e.isDeleted && frameIds.has(e.startBinding?.elementId) && frameIds.has(e.endBinding?.elementId));
  const oldArrowIds = new Set(oldArrows.map(a => a.id));
  
  if (oldArrows.length > 0) {
    ea.copyViewElementsToEAforEditing(oldArrows);
    oldArrows.forEach(a => ea.elementsDict[a.id].isDeleted = true);
  }

  const frameMap = new Map();
  framesToEdit.forEach(f => {
     const el = ea.elementsDict[f.id];
     if (el.boundElements) {
       el.boundElements = el.boundElements.filter(b => !oldArrowIds.has(b.id));
     } else {
       el.boundElements = [];
     }
     frameMap.set(f.id, el);
  });

  // 3. 构建深度树，用于高度和坐标计算
  const nestedTree = [];
  const stack = [];
  treeData.forEach(item => {
    const node = { ...item, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].depth >= item.depth) stack.pop();
    if (stack.length === 0) nestedTree.push(node);
    else stack[stack.length - 1].node.children.push(node);
    stack.push({ node, depth: item.depth });
  });

  const GAP_X = 80;  // 节点水平间距
  const GAP_Y = 40;  // 节点垂直间距

  const calcHeights = (node) => {
    const frame = frameMap.get(node.id);
    node.frameHeight = frame ? frame.height : 100;
    if (!node.children || node.children.length === 0) {
      node.totalHeight = node.frameHeight + GAP_Y;
      return node.totalHeight;
    }
    let childrenHeightSum = 0;
    node.children.forEach(c => childrenHeightSum += calcHeights(c));
    node.totalHeight = Math.max(node.frameHeight + GAP_Y, childrenHeightSum);
    return node.totalHeight;
  };

  nestedTree.forEach(root => calcHeights(root));

  // 4. 坐标分配 & 收集连线关系
  const arrowsToCreate = [];
  const setPositions = (node, startX, centerY) => {
    const frame = frameMap.get(node.id);
    if (!frame) return;

    const targetX = startX;
    const targetY = centerY - node.frameHeight / 2;
    const dx = targetX - frame.x;
    const dy = targetY - frame.y;
    
    // 如果 Frame 有位移，不仅移动 Frame，还要移动它内部包含的所有子元素！
    if (dx !== 0 || dy !== 0) {
      frame.x += dx; frame.y += dy;
      
      const innerEls = ea.getElementsInFrame(frame, allEls);
      innerEls.forEach(el => {
        if (!ea.elementsDict[el.id]) ea.copyViewElementsToEAforEditing([el]);
        ea.elementsDict[el.id].x += dx; 
        ea.elementsDict[el.id].y += dy;
      });
    }

    if (!node.children || node.children.length === 0) return;

    const childX = targetX + frame.width + GAP_X;
    const totalChildrenHeight = node.children.reduce((sum, c) => sum + c.totalHeight, 0);
    let currentY = centerY - totalChildrenHeight / 2;

    node.children.forEach((child) => {
      const childCenterY = currentY + child.totalHeight / 2;
      setPositions(child, childX, childCenterY);

      arrowsToCreate.push({
        parent: frame.id,
        child: child.id
      });
      currentY += child.totalHeight;
    });
  };

  nestedTree.forEach(root => {
    const frame = frameMap.get(root.id);
    if (frame) setPositions(root, frame.x, frame.y + frame.height / 2);
  });

  // 5. 【核心】创建新连线，并应用你的自定义样式
  arrowsToCreate.forEach(arr => {
    ea.connectObjects(
      arr.parent, 
      "right", // 从父节点右侧接出
      arr.child, 
      "left",  // 接入子节点左侧
      {
        type: "arrow",
        strokeColor: "#808080",      // 连线颜色
        strokeWidth: 4,              // 加粗连线
        strokeStyle: "solid",        // 实线样式
        fillStyle: "hachure",        // 填充样式
        roughness: 0,                // 0为直线无手绘抖动，如需手绘感可调为 1 或 2
        roundness: { type: 3 },      // 原生 Elbow (拐角) 线条
        startArrowhead: null,        // 起点无箭头
        endArrowhead: "arrow"        // 终点标准箭头
      }
    );
  });

  await ea.addElementsToView(false, false);
  
  setTimeout(() => { state.suppressChange = false; }, 300);
};

// =====================================================================
// === 3. 大纲 UI 与交互层 ===
// =====================================================================
const INDENT_SIZE = 22;
const state = {
  draggingId: null, dragIndex: -1, dragCount: 0, targetIndex: -1, targetDepth: 0, itemBounds: [],
  suppressChange: false, unsub: null, renderTimer: 0 
};
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const getBranchCount = (index, data) => {
  let count = 1;
  while (index + count < data.length && data[index + count].depth > data[index].depth) count++;
  return count;
};
const hasChildren = (index, data) => index + 1 < data.length && data[index + 1].depth > data[index].depth;

const root = document.createElement("div");
root.id = ROOT_ID; 
Object.assign(root.style, {
  position: "absolute", right: "20px", top: "60px", zIndex: "40",
  width: "320px", maxHeight: "550px",
  background: "var(--background-primary, #ffffff)",
  border: "1px solid var(--background-modifier-border, #d4d4d8)",
  borderRadius: "8px", boxShadow: "var(--shadow-s)",
  display: "flex", flexDirection: "column", overflow: "hidden", userSelect: "none"
});

const header = document.createElement("div");
header.textContent = "Frame 导图大纲";
Object.assign(header.style, {
  padding: "12px", fontSize: "12px", fontWeight: "600",
  background: "var(--background-secondary, #f4f5f7)", borderBottom: "1px solid var(--background-modifier-border)"
});

const scrollWrapper = document.createElement("div");
Object.assign(scrollWrapper.style, { flex: "1", overflowY: "auto", position: "relative", minHeight: "150px" });

const ulContainer = document.createElement("ul");
Object.assign(ulContainer.style, { listStyle: "none", margin: "0", padding: "8px 0" });

const dropIndicator = document.createElement("div");
Object.assign(dropIndicator.style, {
  position: "absolute", left: "0", top: "0", height: "2px", background: "var(--interactive-accent, #2563eb)",
  pointerEvents: "none", display: "none", zIndex: "50"
});
const dot = document.createElement("div");
Object.assign(dot.style, {
  position: "absolute", left: "-4px", top: "-3px", width: "8px", height: "8px", borderRadius: "50%",
  background: "var(--interactive-accent, #2563eb)", border: "2px solid var(--background-primary, #fff)"
});
dropIndicator.appendChild(dot);

scrollWrapper.appendChild(ulContainer);
scrollWrapper.appendChild(dropIndicator);
root.appendChild(header); root.appendChild(scrollWrapper); container.appendChild(root);

const addNewFrameToCanvas = async (name, insertToDataCallback) => {
  state.suppressChange = true;
  const id = "frame_" + Date.now();
  const newFrame = {
    id, type: "frame", x: 0, y: 0, width: 240, height: 160, name,
    strokeColor: "#000000", backgroundColor: "transparent", fillStyle: "hachure",
    strokeWidth: 1, strokeStyle: "solid", roughness: 0, opacity: 100,
    groupIds: [], boundElements: [], version: 1, versionNonce: Math.random(), isDeleted: false
  };
  api.updateScene({ elements: [...api.getSceneElements(), newFrame], commitToHistory: true });
  setTimeout(async () => {
    insertToDataCallback(id);
    await syncToCanvas();
    render(id);
  }, 100);
};

const deleteFramesFromCanvas = async (idsToDeleteSet) => {
  state.suppressChange = true;
  const sceneElements = api.getSceneElements();
  const updated = sceneElements.map(el => {
    if (idsToDeleteSet.has(el.id) || idsToDeleteSet.has(el.frameId)) return {...el, isDeleted: true};
    return el;
  });
  api.updateScene({ elements: updated, commitToHistory: true });
  setTimeout(async () => {
    await syncToCanvas();
    render();
  }, 100);
};

const render = (focusedId = null) => {
  ulContainer.innerHTML = ""; 
  let hideDepthLimit = null; 

  treeData.forEach((item, index) => {
    if (hideDepthLimit !== null) {
      if (item.depth > hideDepthLimit) return; 
      else hideDepthLimit = null; 
    }
    const isParent = hasChildren(index, treeData);
    if (item.collapsed && isParent) hideDepthLimit = item.depth;

    const li = document.createElement("li");
    li.draggable = true; li.dataset.id = item.id; li.dataset.dataIndex = index; li.tabIndex = 0; 
    
    Object.assign(li.style, {
      padding: `4px 8px 4px ${12 + item.depth * INDENT_SIZE}px`, fontSize: "13px", display: "flex", 
      alignItems: "center", cursor: "grab", color: "var(--text-normal, #1e293b)",
      outline: "none", borderRadius: "4px", margin: "0 4px", border: "1px solid transparent"
    });

    const toggle = document.createElement("div");
    Object.assign(toggle.style, {
      width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      marginRight: "4px", borderRadius: "4px", color: "var(--text-muted, #94a3b8)",
      cursor: isParent ? "pointer" : "default", fontSize: isParent ? "10px" : "14px", transition: "background 0.1s"
    });
    toggle.innerHTML = isParent ? (item.collapsed ? "▶" : "▼") : "•";
    
    if (isParent) {
      toggle.onclick = (e) => { e.stopPropagation(); item.collapsed = !item.collapsed; render(item.id); };
      toggle.onmouseenter = () => toggle.style.background = "var(--background-modifier-border, #e2e8f0)";
      toggle.onmouseleave = () => toggle.style.background = "transparent";
    }

    const text = document.createElement("span");
    text.textContent = item.name;
    Object.assign(text.style, { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none", flex: "1" });

    const actions = document.createElement("div");
    Object.assign(actions.style, { display: "flex", gap: "2px", opacity: "0", transition: "opacity 0.1s", pointerEvents: "auto" });

    const createBtn = (char, title, onClick) => {
      const btn = document.createElement("div");
      btn.textContent = char; btn.title = title;
      Object.assign(btn.style, {
        width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", borderRadius: "4px", color: "var(--text-muted, #94a3b8)", fontSize: "14px", fontWeight: "bold"
      });
      btn.onmouseenter = () => btn.style.background = "var(--background-modifier-border, #e2e8f0)";
      btn.onmouseleave = () => btn.style.background = "transparent";
      btn.onclick = (e) => { e.stopPropagation(); onClick(); };
      return btn;
    };

    actions.appendChild(createBtn("+", "添加同级", () => {
      addNewFrameToCanvas("新建节点", (newId) => {
        const branchCount = getBranchCount(index, treeData);
        treeData.splice(index + branchCount, 0, { id: newId, name: "新建节点", depth: item.depth, collapsed: false });
      });
    }));
    actions.appendChild(createBtn("↳", "添加子项", () => {
      item.collapsed = false; 
      addNewFrameToCanvas("新建子节点", (newId) => {
        treeData.splice(index + 1, 0, { id: newId, name: "新建子节点", depth: item.depth + 1, collapsed: false });
      });
    }));
    actions.appendChild(createBtn("×", "删除", () => {
      const branchCount = getBranchCount(index, treeData);
      const deleted = treeData.splice(index, branchCount);
      deleteFramesFromCanvas(new Set(deleted.map(d => d.id)));
    }));

    li.appendChild(toggle); li.appendChild(text); li.appendChild(actions); 

    li.onfocus = () => { li.style.background = "var(--background-modifier-hover, #f1f5f9)"; };
    li.onblur = () => { li.style.background = "transparent"; };
    li.onmouseenter = () => { 
      if(!state.draggingId && document.activeElement !== li) li.style.background = "var(--background-modifier-hover, #f1f5f9)"; 
      actions.style.opacity = "1"; 
    };
    li.onmouseleave = () => { 
      if(document.activeElement !== li) li.style.background = "transparent"; 
      actions.style.opacity = "0"; 
    };

    li.onkeydown = async (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const branchCount = getBranchCount(index, treeData);
        let changed = false;
        if (e.shiftKey) {
          if (item.depth > 0) {
            for(let i = 0; i < branchCount; i++) treeData[index + i].depth -= 1;
            changed = true;
          }
        } else {
          const prevDepth = index > 0 ? treeData[index - 1].depth : -1;
          if (item.depth <= prevDepth) {
            for(let i = 0; i < branchCount; i++) treeData[index + i].depth += 1;
            changed = true;
          }
        }
        if (changed) { await syncToCanvas(); render(item.id); }
      }
    };

    li.ondragstart = (e) => {
      state.draggingId = item.id; state.dragIndex = index; state.dragCount = getBranchCount(index, treeData); 
      e.dataTransfer.effectAllowed = "move";
      setTimeout(() => {
        ulContainer.querySelectorAll("li").forEach(node => {
          const dataIdx = parseInt(node.dataset.dataIndex);
          if (dataIdx >= state.dragIndex && dataIdx < state.dragIndex + state.dragCount) node.style.opacity = "0.3";
        });
      }, 0);
      state.itemBounds = Array.from(ulContainer.querySelectorAll("li")).map((node, i) => {
        const rect = node.getBoundingClientRect(); const wrapRect = scrollWrapper.getBoundingClientRect();
        return { dataIndex: parseInt(node.dataset.dataIndex), top: rect.top - wrapRect.top + scrollWrapper.scrollTop, bottom: rect.bottom - wrapRect.top + scrollWrapper.scrollTop, middle: rect.top - wrapRect.top + scrollWrapper.scrollTop + (rect.height / 2) };
      });
    };

    li.ondragend = () => { state.draggingId = null; dropIndicator.style.display = "none"; render(); };
    ulContainer.appendChild(li);
  });
  if (focusedId) setTimeout(() => { const target = ulContainer.querySelector(`[data-id="${focusedId}"]`); if (target) target.focus(); }, 0);
};

scrollWrapper.ondragover = (e) => {
  e.preventDefault(); if (!state.draggingId) return;
  const wrapRect = scrollWrapper.getBoundingClientRect();
  const mouseY = e.clientY - wrapRect.top + scrollWrapper.scrollTop;
  const mouseX = e.clientX - wrapRect.left;

  let boundIdx = state.itemBounds.length, referenceBound = null;
  for (let i = 0; i < state.itemBounds.length; i++) { if (mouseY < state.itemBounds[i].middle) { boundIdx = i; referenceBound = state.itemBounds[i]; break; } }

  const insertDataIndex = referenceBound ? referenceBound.dataIndex : treeData.length;
  const prevVisibleDataIndex = boundIdx > 0 ? state.itemBounds[boundIdx - 1].dataIndex : -1;

  if (insertDataIndex > state.dragIndex && insertDataIndex <= state.dragIndex + state.dragCount) { dropIndicator.style.display = "none"; state.targetIndex = -1; return; }

  const maxDepth = prevVisibleDataIndex >= 0 ? treeData[prevVisibleDataIndex].depth + 1 : 0;
  const finalDepth = clamp(Math.max(0, Math.floor((mouseX - 24) / INDENT_SIZE)), 0, maxDepth);

  let indicatorTop = referenceBound ? referenceBound.top : (state.itemBounds.length ? state.itemBounds[state.itemBounds.length - 1].bottom : 0);
  const indicatorLeft = 12 + 10 + finalDepth * INDENT_SIZE;
  
  dropIndicator.style.display = "block"; dropIndicator.style.top = `${indicatorTop}px`; dropIndicator.style.left = `${indicatorLeft}px`; dropIndicator.style.width = `calc(100% - ${indicatorLeft + 12}px)`;
  state.targetIndex = insertDataIndex; state.targetDepth = finalDepth; state.prevVisibleDataIndex = prevVisibleDataIndex;
};

scrollWrapper.ondrop = async (e) => {
  e.preventDefault(); dropIndicator.style.display = "none";
  if (state.targetIndex !== -1 && state.draggingId) {
    if (state.prevVisibleDataIndex >= 0 && state.targetDepth > treeData[state.prevVisibleDataIndex].depth) treeData[state.prevVisibleDataIndex].collapsed = false;
    
    const branch = treeData.splice(state.dragIndex, state.dragCount);
    const depthDelta = state.targetDepth - branch[0].depth;
    branch.forEach(item => item.depth += depthDelta);

    let actualInsertIndex = state.targetIndex;
    if (state.targetIndex > state.dragIndex) actualInsertIndex -= state.dragCount;

    treeData.splice(actualInsertIndex, 0, ...branch);
    await syncToCanvas();
    render(state.draggingId); 
  }
  state.draggingId = null; state.targetIndex = -1;
};

// --- 实时监听画布变动 ---
state.unsub = api.onChange(() => {
  if (state.suppressChange || state.draggingId) return;
  clearTimeout(state.renderTimer);
  state.renderTimer = setTimeout(() => {
    treeData = initTreeData();
    render();
  }, 500); 
});

const cleanup = () => {
  if (state.unsub) state.unsub();
  root.remove();
  registry.delete(container);
};
registry.set(container, { cleanup });

render();