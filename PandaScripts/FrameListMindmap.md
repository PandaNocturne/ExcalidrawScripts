/*
## Frame 大纲列表 - 终极版 (支持折叠)
- 新增：点击三角图标折叠/展开子节点
- 拖拽适配：拖拽折叠状态的父节点，会连同其隐藏的子节点一并移动
- 智能展开：将项目拖拽到折叠的父节点下作为其子级时，父节点会自动展开
*/

const api = ea.getExcalidrawAPI();
const view = ea.targetView;
const container = view?.containerEl?.querySelector?.(".excalidraw-wrapper") || view?.containerEl;

const ROOT_ID = "ea-frame-outline-v5";
const GLOBAL_KEY = "__eaFrameOutlineV5__";
const registry = window[GLOBAL_KEY] ||= new WeakMap();
if (registry.get(container)?.cleanup) {
  registry.get(container).cleanup();
  return;
}

// --- 1. 数据初始化 (加入 collapsed 属性) ---
let mockData = ea.getViewElements()
  .filter(el => el.type === "frame")
  .map(el => ({ id: el.id, name: el.name || "未命名", depth: 0, collapsed: false }));

if (mockData.length === 0) {
  mockData = [
    { id: "1", name: "第一章", depth: 0, collapsed: false },
    { id: "2", name: "第1节 (尝试点击左侧折叠)", depth: 1, collapsed: false },
    { id: "3", name: "1.1 细节", depth: 2, collapsed: false },
    { id: "4", name: "1.2 细节", depth: 2, collapsed: false },
    { id: "5", name: "第二章", depth: 0, collapsed: false },
    { id: "6", name: "第1节", depth: 1, collapsed: false },
  ];
}

const INDENT_SIZE = 22;
const state = {
  draggingId: null,
  dragIndex: -1,
  dragCount: 0,
  targetIndex: -1,
  targetDepth: 0,
  itemBounds: [], 
};

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

// 获取某个节点及其所有子节点的总数（无论是否折叠）
const getBranchCount = (index, data) => {
  const baseDepth = data[index].depth;
  let count = 1;
  while (index + count < data.length && data[index + count].depth > baseDepth) count++;
  return count;
};

// 检查是否有子节点
const hasChildren = (index, data) => {
  return index + 1 < data.length && data[index + 1].depth > data[index].depth;
};

// --- 2. UI 骨架搭建 ---
const root = document.createElement("div");
Object.assign(root.style, {
  position: "absolute", right: "20px", top: "60px", zIndex: "40",
  width: "300px", maxHeight: "500px",
  background: "var(--background-primary, #ffffff)",
  border: "1px solid var(--background-modifier-border, #d4d4d8)",
  borderRadius: "8px", boxShadow: "var(--shadow-s)",
  display: "flex", flexDirection: "column", overflow: "hidden",
  userSelect: "none"
});

const header = document.createElement("div");
header.textContent = "大纲列表 (折叠与拖拽测试)";
Object.assign(header.style, {
  padding: "12px", fontSize: "12px", fontWeight: "600",
  background: "var(--background-secondary, #f4f5f7)", 
  borderBottom: "1px solid var(--background-modifier-border, #d4d4d8)"
});

const listContainer = document.createElement("div");
Object.assign(listContainer.style, { 
  flex: "1", overflowY: "auto", padding: "8px 0", 
  position: "relative", minHeight: "150px" 
});

const dropIndicator = document.createElement("div");
Object.assign(dropIndicator.style, {
  position: "absolute", left: "0", top: "0", height: "2px",
  background: "var(--interactive-accent, #2563eb)",
  pointerEvents: "none", display: "none", zIndex: "50"
});
const dot = document.createElement("div");
Object.assign(dot.style, {
  position: "absolute", left: "-4px", top: "-3px", width: "8px", height: "8px",
  borderRadius: "50%", background: "var(--interactive-accent, #2563eb)",
  border: "2px solid var(--background-primary, #fff)"
});
dropIndicator.appendChild(dot);
listContainer.appendChild(dropIndicator);

root.appendChild(header);
root.appendChild(listContainer);
container.appendChild(root);

// --- 3. 渲染引擎 ---
const render = (focusedId = null) => {
  Array.from(listContainer.children).forEach(child => {
    if (child !== dropIndicator) child.remove();
  });

  let hideDepthLimit = null; // 用于折叠的深度限制过滤

  mockData.forEach((item, index) => {
    // 【折叠逻辑】：如果当前深度超过了隐藏限制，跳过渲染
    if (hideDepthLimit !== null) {
      if (item.depth > hideDepthLimit) return; 
      else hideDepthLimit = null; // 跳出了折叠层级，恢复渲染
    }

    const isParent = hasChildren(index, mockData);
    
    // 如果当前节点是折叠状态，且它是父节点，设置后续元素的隐藏阈值
    if (item.collapsed && isParent) {
      hideDepthLimit = item.depth;
    }

    const el = document.createElement("div");
    el.className = "frame-list-item";
    el.draggable = true;
    el.dataset.id = item.id;
    el.dataset.dataIndex = index; // 记录它在总数据中的真实索引
    el.tabIndex = 0; 
    
    Object.assign(el.style, {
      padding: `4px 12px 4px ${12 + item.depth * INDENT_SIZE}px`,
      fontSize: "13px", display: "flex", alignItems: "center",
      cursor: "grab", color: "var(--text-normal, #1e293b)",
      outline: "none", borderRadius: "4px", margin: "0 4px",
      border: "1px solid transparent"
    });

    // 折叠/展开 图标
    const toggle = document.createElement("div");
    Object.assign(toggle.style, {
      width: "20px", height: "20px", display: "flex", 
      alignItems: "center", justifyContent: "center",
      marginRight: "4px", borderRadius: "4px",
      color: "var(--text-muted, #94a3b8)",
      cursor: isParent ? "pointer" : "default",
      fontSize: isParent ? "10px" : "14px", transition: "background 0.1s"
    });
    
    toggle.innerHTML = isParent ? (item.collapsed ? "▶" : "▼") : "•";
    
    if (isParent) {
      toggle.onclick = (e) => {
        e.stopPropagation();
        item.collapsed = !item.collapsed;
        render(item.id);
      };
      toggle.onmouseenter = () => toggle.style.background = "var(--background-modifier-border, #e2e8f0)";
      toggle.onmouseleave = () => toggle.style.background = "transparent";
    }

    const text = document.createElement("span");
    text.textContent = item.name;
    Object.assign(text.style, {
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none"
    });

    el.appendChild(toggle);
    el.appendChild(text);

    // 交互样式与快捷键
    el.onfocus = () => { el.style.background = "var(--background-modifier-hover, #f1f5f9)"; };
    el.onblur = () => { el.style.background = "transparent"; };
    el.onmouseenter = () => { if(!state.draggingId && document.activeElement !== el) el.style.background = "var(--background-modifier-hover, #f1f5f9)"; };
    el.onmouseleave = () => { if(document.activeElement !== el) el.style.background = "transparent"; };

    el.onkeydown = (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const branchCount = getBranchCount(index, mockData);
        if (e.shiftKey) {
          if (item.depth > 0) {
            for(let i = 0; i < branchCount; i++) mockData[index + i].depth -= 1;
            render(item.id);
          }
        } else {
          const prevDepth = index > 0 ? mockData[index - 1].depth : -1;
          if (item.depth <= prevDepth) {
            for(let i = 0; i < branchCount; i++) mockData[index + i].depth += 1;
            render(item.id);
          }
        }
      }
    };

    // --- 拖拽逻辑 ---
    el.ondragstart = (e) => {
      state.draggingId = item.id;
      state.dragIndex = index; // 真实索引
      state.dragCount = getBranchCount(index, mockData); 
      e.dataTransfer.effectAllowed = "move";
      
      setTimeout(() => {
        const domNodes = listContainer.querySelectorAll(".frame-list-item");
        domNodes.forEach(node => {
          const nodeDataIdx = parseInt(node.dataset.dataIndex);
          // 变透明：选中自身及所有渲染在DOM里的子节点
          if (nodeDataIdx >= state.dragIndex && nodeDataIdx < state.dragIndex + state.dragCount) {
            node.style.opacity = "0.3";
          }
        });
      }, 0);

      state.itemBounds = Array.from(listContainer.querySelectorAll(".frame-list-item")).map((node, i) => {
        const rect = node.getBoundingClientRect();
        const containerRect = listContainer.getBoundingClientRect();
        return {
          domIndex: i, dataIndex: parseInt(node.dataset.dataIndex),
          top: rect.top - containerRect.top + listContainer.scrollTop,
          bottom: rect.bottom - containerRect.top + listContainer.scrollTop,
          middle: rect.top - containerRect.top + listContainer.scrollTop + (rect.height / 2)
        };
      });
    };

    el.ondragend = () => {
      state.draggingId = null;
      dropIndicator.style.display = "none";
      render(); 
    };

    listContainer.appendChild(el);
  });

  if (focusedId) {
    setTimeout(() => {
      const target = listContainer.querySelector(`[data-id="${focusedId}"]`);
      if (target) target.focus();
    }, 0);
  }
};

// --- 4. 拖拽坐标指示器 ---
listContainer.ondragover = (e) => {
  e.preventDefault();
  if (!state.draggingId) return;

  const containerRect = listContainer.getBoundingClientRect();
  const mouseY = e.clientY - containerRect.top + listContainer.scrollTop;
  const mouseX = e.clientX - containerRect.left;

  // 1. 根据鼠标 Y 轴找到悬浮在哪个可见元素的缝隙中
  let boundIdx = state.itemBounds.length;
  let referenceBound = null;
  for (let i = 0; i < state.itemBounds.length; i++) {
    if (mouseY < state.itemBounds[i].middle) {
      boundIdx = i; referenceBound = state.itemBounds[i]; break;
    }
  }

  // 计算目标真实数据索引
  const insertDataIndex = referenceBound ? referenceBound.dataIndex : mockData.length;
  // 找到插入位置正上方的那一行（视觉上）
  const prevVisibleDataIndex = boundIdx > 0 ? state.itemBounds[boundIdx - 1].dataIndex : -1;

  // 约束：防止拖到自己或自己的隐藏节点内部
  if (insertDataIndex > state.dragIndex && insertDataIndex <= state.dragIndex + state.dragCount) {
    dropIndicator.style.display = "none";
    state.targetIndex = -1;
    return;
  }

  // 2. 根据上方元素计算最大允许深度
  const maxDepth = prevVisibleDataIndex >= 0 ? mockData[prevVisibleDataIndex].depth + 1 : 0;
  const suggestedDepth = Math.max(0, Math.floor((mouseX - 24) / INDENT_SIZE));
  const finalDepth = clamp(suggestedDepth, 0, maxDepth);

  // 3. 画出占位指示线
  let indicatorTop = referenceBound ? referenceBound.top : (state.itemBounds.length ? state.itemBounds[state.itemBounds.length - 1].bottom : 0);
  const indicatorLeft = 12 + 10 + finalDepth * INDENT_SIZE; // +10避开Toggle图标位置
  
  dropIndicator.style.display = "block";
  dropIndicator.style.top = `${indicatorTop}px`;
  dropIndicator.style.left = `${indicatorLeft}px`;
  dropIndicator.style.width = `calc(100% - ${indicatorLeft + 12}px)`;

  state.targetIndex = insertDataIndex;
  state.targetDepth = finalDepth;
  state.prevVisibleDataIndex = prevVisibleDataIndex;
};

// --- 5. 放置并更新数据 ---
listContainer.ondrop = (e) => {
  e.preventDefault();
  dropIndicator.style.display = "none";

  if (state.targetIndex !== -1 && state.draggingId) {
    // 智能展开：如果把它拖成某个折叠节点的子节点，自动展开该父节点
    if (state.prevVisibleDataIndex >= 0) {
      const prevNode = mockData[state.prevVisibleDataIndex];
      if (state.targetDepth > prevNode.depth && prevNode.collapsed) {
        prevNode.collapsed = false;
      }
    }

    const branch = mockData.splice(state.dragIndex, state.dragCount);
    const depthDelta = state.targetDepth - branch[0].depth;
    branch.forEach(item => item.depth += depthDelta);

    let actualInsertIndex = state.targetIndex;
    if (state.targetIndex > state.dragIndex) {
      actualInsertIndex -= state.dragCount;
    }

    mockData.splice(actualInsertIndex, 0, ...branch);
    render(state.draggingId); 
  }
  
  state.draggingId = null;
  state.targetIndex = -1;
};

const cleanup = () => { root.remove(); registry.delete(container); };
registry.set(container, { cleanup });
render();