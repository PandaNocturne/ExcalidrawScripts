/*
## Frame 大纲列表 - 高阶大纲树交互版
- 亮点：连带子节点整体拖拽、Tab / Shift+Tab 快捷键控制层级
- 状态：纯 UI 与大纲逻辑，未联动画布
*/

const api = ea.getExcalidrawAPI();
const view = ea.targetView;
const container = view?.containerEl?.querySelector?.(".excalidraw-wrapper") || view?.containerEl;

const ROOT_ID = "ea-frame-outline-v4";
const GLOBAL_KEY = "__eaFrameOutlineV4__";
const registry = window[GLOBAL_KEY] ||= new WeakMap();
if (registry.get(container)?.cleanup) {
  registry.get(container).cleanup();
  return;
}

// --- 1. 初始化模拟数据 ---
let mockData = ea.getViewElements()
  .filter(el => el.type === "frame")
  .map(el => ({ id: el.id, name: el.name || "未命名", depth: 0 }));

if (mockData.length === 0) {
  mockData = [
    { id: "1", name: "根节点 A", depth: 0 },
    { id: "2", name: "子节点 A-1", depth: 1 },
    { id: "3", name: "孙节点 A-1-1", depth: 2 },
    { id: "4", name: "根节点 B", depth: 0 },
    { id: "5", name: "子节点 B-1", depth: 1 },
  ];
}

// --- 2. 状态管理 ---
const INDENT_SIZE = 24;
const state = {
  draggingId: null,
  dragIndex: -1,
  dragCount: 0, // 当前拖拽包含多少个子节点（包含自身）
  targetIndex: -1,
  targetDepth: 0,
  itemBounds: [],
};

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

// 获取某个节点及其所有子节点的数量 (计算分支跨度)
const getBranchCount = (index, data) => {
  const baseDepth = data[index].depth;
  let count = 1;
  while (index + count < data.length && data[index + count].depth > baseDepth) {
    count++;
  }
  return count;
};

// --- 3. UI 结构 ---
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
header.textContent = "专业大纲列表 (支持 Tab 缩进/子树拖拽)";
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

// --- 4. 渲染引擎 ---
const render = (focusedId = null) => {
  Array.from(listContainer.children).forEach(child => {
    if (child !== dropIndicator) child.remove();
  });

  mockData.forEach((item, index) => {
    const el = document.createElement("div");
    el.className = "frame-list-item";
    el.draggable = true;
    el.dataset.id = item.id;
    el.tabIndex = 0; // 允许聚焦，以接收快捷键
    
    Object.assign(el.style, {
      padding: `6px 12px 6px ${12 + item.depth * INDENT_SIZE}px`,
      fontSize: "13px", display: "flex", alignItems: "center",
      cursor: "grab", color: "var(--text-normal, #1e293b)",
      outline: "none", // 移除默认高亮，自定义 focus 样式
      border: "1px solid transparent",
      borderRadius: "4px", margin: "0 4px"
    });

    el.innerHTML = `
      <span style="margin-right:8px; color:var(--text-muted, #94a3b8); font-size:16px; line-height:1; pointer-events:none;">•</span>
      <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none;">${item.name}</span>
    `;

    // 交互样式
    el.onfocus = () => { el.style.background = "var(--background-modifier-hover, #f1f5f9)"; };
    el.onblur = () => { el.style.background = "transparent"; };
    el.onmouseenter = () => { if(!state.draggingId && document.activeElement !== el) el.style.background = "var(--background-modifier-hover, #f1f5f9)"; };
    el.onmouseleave = () => { if(document.activeElement !== el) el.style.background = "transparent"; };

    // --- 快捷键逻辑 (Tab / Shift+Tab) ---
    el.onkeydown = (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const branchCount = getBranchCount(index, mockData);
        
        if (e.shiftKey) {
          // 向左缩进 (Shift+Tab)
          if (item.depth > 0) {
            for(let i = 0; i < branchCount; i++) mockData[index + i].depth -= 1;
            render(item.id);
          }
        } else {
          // 向右缩进 (Tab)
          const prevDepth = index > 0 ? mockData[index - 1].depth : -1;
          // 只有当当前深度 小于等于 上一项深度时，才允许进一步缩进 (保持父子级连续)
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
      state.dragIndex = index;
      state.dragCount = getBranchCount(index, mockData); // 获取整个树枝的数量
      e.dataTransfer.effectAllowed = "move";
      
      // 让整个树枝变透明
      setTimeout(() => {
        const domNodes = listContainer.querySelectorAll(".frame-list-item");
        for(let i = 0; i < state.dragCount; i++) {
          if(domNodes[index + i]) domNodes[index + i].style.opacity = "0.3";
        }
      }, 0);

      // 缓存坐标
      state.itemBounds = Array.from(listContainer.querySelectorAll(".frame-list-item")).map((node, i) => {
        const rect = node.getBoundingClientRect();
        const containerRect = listContainer.getBoundingClientRect();
        return {
          index: i, top: rect.top - containerRect.top + listContainer.scrollTop,
          bottom: rect.bottom - containerRect.top + listContainer.scrollTop,
          middle: rect.top - containerRect.top + listContainer.scrollTop + (rect.height / 2)
        };
      });
    };

    el.ondragend = () => {
      state.draggingId = null;
      dropIndicator.style.display = "none";
      render(); // 重置所有透明度
    };

    listContainer.appendChild(el);
  });

  // 恢复焦点
  if (focusedId) {
    setTimeout(() => {
      const target = listContainer.querySelector(`[data-id="${focusedId}"]`);
      if (target) target.focus();
    }, 0);
  }
};

// --- 5. 全局容器拖拽响应 ---
listContainer.ondragover = (e) => {
  e.preventDefault();
  if (!state.draggingId) return;

  const containerRect = listContainer.getBoundingClientRect();
  const mouseY = e.clientY - containerRect.top + listContainer.scrollTop;
  const mouseX = e.clientX - containerRect.left;

  // 1. 寻找插入点
  let insertIndex = state.itemBounds.length;
  let referenceBound = null;
  for (let bound of state.itemBounds) {
    if (mouseY < bound.middle) { insertIndex = bound.index; referenceBound = bound; break; }
  }

  // 2. 约束：不能插入到自己或自己的子节点内部
  if (insertIndex >= state.dragIndex && insertIndex <= state.dragIndex + state.dragCount) {
    dropIndicator.style.display = "none";
    state.targetIndex = -1;
    return;
  }

  // 3. 计算合法的上一节点 Depth
  let prevValidIndex = insertIndex - 1;
  // 如果插入点在被拖拽树枝的正下方，那视觉上的上一个节点其实是 树枝上面的那个节点
  if (prevValidIndex >= state.dragIndex && prevValidIndex < state.dragIndex + state.dragCount) {
    prevValidIndex = state.dragIndex - 1;
  }
  const maxDepth = prevValidIndex >= 0 ? mockData[prevValidIndex].depth + 1 : 0;
  
  // 根据鼠标横向位置计算目标深度
  const suggestedDepth = Math.max(0, Math.floor((mouseX - 12) / INDENT_SIZE));
  const finalDepth = clamp(suggestedDepth, 0, maxDepth);

  // 4. 定位指示线
  let indicatorTop = referenceBound ? referenceBound.top : (state.itemBounds.length ? state.itemBounds[state.itemBounds.length - 1].bottom : 0);
  const indicatorLeft = 12 + 4 + finalDepth * INDENT_SIZE; // +4是补偿外边距
  
  dropIndicator.style.display = "block";
  dropIndicator.style.top = `${indicatorTop}px`;
  dropIndicator.style.left = `${indicatorLeft}px`;
  dropIndicator.style.width = `calc(100% - ${indicatorLeft + 12}px)`;

  state.targetIndex = insertIndex;
  state.targetDepth = finalDepth;
};

// --- 6. 放置逻辑 ---
listContainer.ondrop = (e) => {
  e.preventDefault();
  dropIndicator.style.display = "none";

  if (state.targetIndex !== -1 && state.draggingId) {
    // 切割出整个树枝
    const branch = mockData.splice(state.dragIndex, state.dragCount);
    
    // 计算深度变化差值 (目标深度 - 原树枝根节点深度)
    const depthDelta = state.targetDepth - branch[0].depth;
    // 整个树枝统一调整深度
    branch.forEach(item => item.depth += depthDelta);

    // 计算实际插入位置 (因为前面 slice 导致原数组长度缩短)
    let actualInsertIndex = state.targetIndex;
    if (state.targetIndex > state.dragIndex) {
      actualInsertIndex -= state.dragCount;
    }

    // 重新插入数组
    mockData.splice(actualInsertIndex, 0, ...branch);
    render(state.draggingId); // 渲染并保持焦点
  }
  
  state.draggingId = null;
  state.targetIndex = -1;
};

// --- 7. 清理 ---
const cleanup = () => { root.remove(); registry.delete(container); };
registry.set(container, { cleanup });
render();