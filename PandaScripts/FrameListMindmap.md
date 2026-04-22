
/*
## Frame 大纲列表 - 严格单例版
- 功能：UL/LI 语义化、子树拖拽、折叠、Tab 缩进
- 修复：采用全局 DOM ID 检测，防止重复打开。再次运行即可关闭。
*/

const api = ea.getExcalidrawAPI();
const view = ea.targetView;
const container = view?.containerEl?.querySelector?.(".excalidraw-wrapper") || view?.containerEl;

if (!container) {
  new Notice("未找到 Excalidraw 视图容器");
  return;
}

// --- 0. 严格的防重复打开 (Toggle 开关逻辑) ---
const ROOT_ID = "ea-frame-outline-strict-singleton";
const existingPanel = document.getElementById(ROOT_ID);
if (existingPanel) {
  existingPanel.remove();
  new Notice("关闭 Frame 大纲");
  return; // 直接退出，实现 Toggle 效果
}

new Notice("打开 Frame 大纲");

// --- 1. 数据初始化 ---
let mockData = ea.getViewElements()
  .filter(el => el.type === "frame")
  .map(el => ({ id: el.id, name: el.name || "未命名", depth: 0, collapsed: false }));

if (mockData.length === 0) {
  mockData = [
    { id: "1", name: "第一章 (尝试拖拽)", depth: 0, collapsed: false },
    { id: "2", name: "第1节", depth: 1, collapsed: false },
    { id: "3", name: "1.1 细节", depth: 2, collapsed: false },
    { id: "4", name: "第二章", depth: 0, collapsed: false },
    { id: "5", name: "第1节", depth: 1, collapsed: false },
  ];
}

const INDENT_SIZE = 22;
const state = {
  draggingId: null, dragIndex: -1, dragCount: 0,
  targetIndex: -1, targetDepth: 0, itemBounds: [], 
};

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

const getBranchCount = (index, data) => {
  const baseDepth = data[index].depth;
  let count = 1;
  while (index + count < data.length && data[index + count].depth > baseDepth) count++;
  return count;
};

const hasChildren = (index, data) => {
  return index + 1 < data.length && data[index + 1].depth > data[index].depth;
};

// --- 2. UI 骨架搭建 ---
const root = document.createElement("div");
root.id = ROOT_ID; // 绑定唯一 ID
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
header.textContent = "语义化大纲 (防多开版)";
Object.assign(header.style, {
  padding: "12px", fontSize: "12px", fontWeight: "600",
  background: "var(--background-secondary, #f4f5f7)", 
  borderBottom: "1px solid var(--background-modifier-border, #d4d4d8)"
});

// 滚动容器 
const scrollWrapper = document.createElement("div");
Object.assign(scrollWrapper.style, { 
  flex: "1", overflowY: "auto", position: "relative", minHeight: "150px" 
});

// 真正的列表容器
const ulContainer = document.createElement("ul");
Object.assign(ulContainer.style, {
  listStyle: "none", 
  margin: "0", 
  padding: "8px 0"
});

// 拖拽指示线
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

scrollWrapper.appendChild(ulContainer);
scrollWrapper.appendChild(dropIndicator);
root.appendChild(header);
root.appendChild(scrollWrapper);
container.appendChild(root);

// --- 3. 渲染引擎 ---
const render = (focusedId = null) => {
  ulContainer.innerHTML = ""; 

  let hideDepthLimit = null; 

  mockData.forEach((item, index) => {
    if (hideDepthLimit !== null) {
      if (item.depth > hideDepthLimit) return; 
      else hideDepthLimit = null; 
    }

    const isParent = hasChildren(index, mockData);
    if (item.collapsed && isParent) hideDepthLimit = item.depth;

    const li = document.createElement("li");
    li.className = "frame-list-item";
    li.draggable = true;
    li.dataset.id = item.id;
    li.dataset.dataIndex = index; 
    li.tabIndex = 0; 
    
    Object.assign(li.style, {
      padding: `4px 12px 4px ${12 + item.depth * INDENT_SIZE}px`,
      fontSize: "13px", display: "flex", alignItems: "center",
      cursor: "grab", color: "var(--text-normal, #1e293b)",
      outline: "none", borderRadius: "4px", margin: "0 4px",
      border: "1px solid transparent"
    });

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

    li.appendChild(toggle);
    li.appendChild(text);

    li.onfocus = () => { li.style.background = "var(--background-modifier-hover, #f1f5f9)"; };
    li.onblur = () => { li.style.background = "transparent"; };
    li.onmouseenter = () => { if(!state.draggingId && document.activeElement !== li) li.style.background = "var(--background-modifier-hover, #f1f5f9)"; };
    li.onmouseleave = () => { if(document.activeElement !== li) li.style.background = "transparent"; };

    li.onkeydown = (e) => {
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

    li.ondragstart = (e) => {
      state.draggingId = item.id;
      state.dragIndex = index; 
      state.dragCount = getBranchCount(index, mockData); 
      e.dataTransfer.effectAllowed = "move";
      
      setTimeout(() => {
        const domNodes = ulContainer.querySelectorAll("li");
        domNodes.forEach(node => {
          const nodeDataIdx = parseInt(node.dataset.dataIndex);
          if (nodeDataIdx >= state.dragIndex && nodeDataIdx < state.dragIndex + state.dragCount) {
            node.style.opacity = "0.3";
          }
        });
      }, 0);

      state.itemBounds = Array.from(ulContainer.querySelectorAll("li")).map((node, i) => {
        const rect = node.getBoundingClientRect();
        const containerRect = scrollWrapper.getBoundingClientRect();
        return {
          domIndex: i, dataIndex: parseInt(node.dataset.dataIndex),
          top: rect.top - containerRect.top + scrollWrapper.scrollTop,
          bottom: rect.bottom - containerRect.top + scrollWrapper.scrollTop,
          middle: rect.top - containerRect.top + scrollWrapper.scrollTop + (rect.height / 2)
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

// --- 4. 拖拽交互 ---
scrollWrapper.ondragover = (e) => {
  e.preventDefault();
  if (!state.draggingId) return;

  const containerRect = scrollWrapper.getBoundingClientRect();
  const mouseY = e.clientY - containerRect.top + scrollWrapper.scrollTop;
  const mouseX = e.clientX - containerRect.left;

  let boundIdx = state.itemBounds.length;
  let referenceBound = null;
  for (let i = 0; i < state.itemBounds.length; i++) {
    if (mouseY < state.itemBounds[i].middle) {
      boundIdx = i; referenceBound = state.itemBounds[i]; break;
    }
  }

  const insertDataIndex = referenceBound ? referenceBound.dataIndex : mockData.length;
  const prevVisibleDataIndex = boundIdx > 0 ? state.itemBounds[boundIdx - 1].dataIndex : -1;

  if (insertDataIndex > state.dragIndex && insertDataIndex <= state.dragIndex + state.dragCount) {
    dropIndicator.style.display = "none";
    state.targetIndex = -1;
    return;
  }

  const maxDepth = prevVisibleDataIndex >= 0 ? mockData[prevVisibleDataIndex].depth + 1 : 0;
  const suggestedDepth = Math.max(0, Math.floor((mouseX - 24) / INDENT_SIZE));
  const finalDepth = clamp(suggestedDepth, 0, maxDepth);

  let indicatorTop = referenceBound ? referenceBound.top : (state.itemBounds.length ? state.itemBounds[state.itemBounds.length - 1].bottom : 0);
  const indicatorLeft = 12 + 10 + finalDepth * INDENT_SIZE;
  
  dropIndicator.style.display = "block";
  dropIndicator.style.top = `${indicatorTop}px`;
  dropIndicator.style.left = `${indicatorLeft}px`;
  dropIndicator.style.width = `calc(100% - ${indicatorLeft + 12}px)`;

  state.targetIndex = insertDataIndex;
  state.targetDepth = finalDepth;
  state.prevVisibleDataIndex = prevVisibleDataIndex;
};

scrollWrapper.ondrop = (e) => {
  e.preventDefault();
  dropIndicator.style.display = "none";

  if (state.targetIndex !== -1 && state.draggingId) {
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
    if (state.targetIndex > state.dragIndex) actualInsertIndex -= state.dragCount;

    mockData.splice(actualInsertIndex, 0, ...branch);
    render(state.draggingId); 
  }
  
  state.draggingId = null;
  state.targetIndex = -1;
};

render();
