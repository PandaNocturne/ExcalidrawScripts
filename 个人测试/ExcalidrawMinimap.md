/*
## ExcalidrawMinimap
切换式小地图脚本。
- 首次运行：在当前 Excalidraw 视图显示 minimap
- 再次运行：关闭 minimap
- 点击 minimap：平移主视图到对应位置
- 拖动 viewport：连续平移主视图
- 滚轮：缩放主视图

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

const MINIMAP_ID = "ea-excalidraw-minimap";
const GLOBAL_KEY = "__eaExcalidrawMinimapRegistry__";
const SETTINGS_KEY = "ExcalidrawMinimapSettings";
const POSITION_STYLES = ["top-left", "top-right", "bottom-right", "bottom-left"];
const ZOOM_TRANSITION_STEP_COUNT = 60;
const ZOOM_TRANSITION_DELAY = 280;

const registry = window[GLOBAL_KEY] ||= new WeakMap();
const existing = registry.get(container);
if (existing?.cleanup) {
  existing.cleanup();
  new Notice("当前 Excalidraw 视图的 Minimap 已关闭");
  return;
}

const DEFAULT_CONFIG = {
  width: 220,
  height: 160,
  adaptiveSize: false,
  elementClickAction: "move",
  padding: 120,
  side: "bottom-right",
  offset: 12,
  background: "rgba(20,20,20,0.22)",
  border: "1px solid rgba(255,255,255,0.18)",
  frameFill: "rgba(120,180,255,0.22)",
  frameStroke: "rgba(93,156,236,0.82)",
  imageFill: "rgba(102, 214, 154, 0.42)",
  imageStroke: "rgba(72, 186, 127, 0.72)",
  embeddableFill: "rgba(190, 144, 209, 0.42)",
  embeddableStroke: "rgba(167, 114, 190, 0.72)",
  elementFill: "rgba(230,230,230,0.7)",
  elementStroke: "rgba(255,255,255,0.24)",
  viewportFill: "rgba(255,165,0,0.16)",
  viewportStroke: "rgba(255,140,0,0.96)",
  throttleMs: 80,
  zoomStep: 1.12,
  minZoom: 0.1,
  maxZoom: 8,
};

const loadSettings = () => {
  const saved = ea.getScriptSettings?.() || {};
  return {
    ...DEFAULT_CONFIG,
    width: Number(saved[SETTINGS_KEY]?.width ?? DEFAULT_CONFIG.width),
    height: Number(saved[SETTINGS_KEY]?.height ?? DEFAULT_CONFIG.height),
    adaptiveSize: saved[SETTINGS_KEY]?.adaptiveSize ?? DEFAULT_CONFIG.adaptiveSize,
    elementClickAction: ["move", "zoom"].includes(saved[SETTINGS_KEY]?.elementClickAction)
      ? saved[SETTINGS_KEY].elementClickAction
      : DEFAULT_CONFIG.elementClickAction,
    side: POSITION_STYLES.includes(saved[SETTINGS_KEY]?.side) ? saved[SETTINGS_KEY].side : DEFAULT_CONFIG.side,
    offset: Number(saved[SETTINGS_KEY]?.offset ?? DEFAULT_CONFIG.offset),
  };
};

const CONFIG = loadSettings();

const saveSettings = () => {
  const current = ea.getScriptSettings?.() || {};
  current[SETTINGS_KEY] = {
    width: CONFIG.width,
    height: CONFIG.height,
    adaptiveSize: CONFIG.adaptiveSize,
    elementClickAction: CONFIG.elementClickAction,
    side: CONFIG.side,
    offset: CONFIG.offset,
  };
  ea.setScriptSettings?.(current);
};

const state = {
  unsub: null,
  disposed: false,
  raf: 0,
  lastRenderAt: 0,
  sceneBounds: null,
  viewportMiniBounds: null,
  elementMiniBounds: [],
  zoomAnimationFrame: 0,
  draggingViewport: false,
  renderWidth: CONFIG.width,
  renderHeight: CONFIG.height,
  renderScale: 1,
  renderOffsetX: 0,
  renderOffsetY: 0,
};

const ensureRelativePosition = (el) => {
  const style = window.getComputedStyle(el);
  if (style.position === "static") {
    el.style.position = "relative";
  }
};

const applyPlacement = () => {
  root.style.left = "";
  root.style.right = "";
  root.style.top = "";
  root.style.bottom = "";

  if (CONFIG.side === "top-left") {
    root.style.left = `${CONFIG.offset}px`;
    root.style.top = `${CONFIG.offset}px`;
  }
  if (CONFIG.side === "top-right") {
    root.style.right = `${CONFIG.offset}px`;
    root.style.top = `${CONFIG.offset}px`;
  }
  if (CONFIG.side === "bottom-right") {
    root.style.right = `${CONFIG.offset}px`;
    root.style.bottom = `${CONFIG.offset}px`;
  }
  if (CONFIG.side === "bottom-left") {
    root.style.left = `${CONFIG.offset}px`;
    root.style.bottom = `${CONFIG.offset}px`;
  }
};

const computeRenderMetrics = (bounds) => {
  const maxWidth = Math.max(80, Number(CONFIG.width) || DEFAULT_CONFIG.width);
  const maxHeight = Math.max(60, Number(CONFIG.height) || DEFAULT_CONFIG.height);
  const safeWidth = Math.max(1, bounds?.width || 1);
  const safeHeight = Math.max(1, bounds?.height || 1);

  if (!CONFIG.adaptiveSize) {
    const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight);
    return {
      width: maxWidth,
      height: maxHeight,
      scale,
      offsetX: (maxWidth - safeWidth * scale) / 2,
      offsetY: (maxHeight - safeHeight * scale) / 2,
    };
  }

  const sceneRatio = safeWidth / safeHeight;
  const maxRatio = maxWidth / maxHeight;

  let width;
  let height;
  if (sceneRatio >= maxRatio) {
    width = maxWidth;
    height = Math.max(60, Math.round(width / sceneRatio));
  } else {
    height = maxHeight;
    width = Math.max(80, Math.round(height * sceneRatio));
  }

  width = Math.min(maxWidth, width);
  height = Math.min(maxHeight, height);

  const scale = Math.min(width / safeWidth, height / safeHeight);
  return {
    width,
    height,
    scale,
    offsetX: (width - safeWidth * scale) / 2,
    offsetY: (height - safeHeight * scale) / 2,
  };
};

const refreshRootSize = () => {
  root.style.width = `${state.renderWidth}px`;
  root.style.height = `${state.renderHeight}px`;
  svg.setAttribute("width", String(state.renderWidth));
  svg.setAttribute("height", String(state.renderHeight));
  svg.setAttribute("viewBox", `0 0 ${state.renderWidth} ${state.renderHeight}`);
  settingsButton.style.right = "8px";
  settingsButton.style.top = "8px";
  applyPlacement();
};

const openSettingsModal = () => {
  const modal = new ea.obsidian.Modal(app);
  modal.titleEl.setText("Minimap 设置");
  modal.modalEl.style.zIndex = "1000";

  const snapshot = {
    width: CONFIG.width,
    height: CONFIG.height,
    adaptiveSize: CONFIG.adaptiveSize,
    elementClickAction: CONFIG.elementClickAction,
    side: CONFIG.side,
    offset: CONFIG.offset,
  };

  const draft = {
    width: String(CONFIG.width),
    height: String(CONFIG.height),
    adaptiveSize: CONFIG.adaptiveSize,
    elementClickAction: CONFIG.elementClickAction,
    side: CONFIG.side,
    offset: String(CONFIG.offset),
  };

  let committed = false;

  const applyDraft = ({ persist = false } = {}) => {
    const width = Number(draft.width);
    const height = Number(draft.height);
    const offset = Number(draft.offset);

    if (!Number.isFinite(width) || width < 80) return false;
    if (!Number.isFinite(height) || height < 60) return false;
    if (!Number.isFinite(offset) || offset < 0) return false;
    if (!POSITION_STYLES.includes(draft.side)) return false;
    if (!["move", "zoom"].includes(draft.elementClickAction)) return false;

    CONFIG.width = Math.round(width);
    CONFIG.height = Math.round(height);
    CONFIG.adaptiveSize = draft.adaptiveSize;
    CONFIG.elementClickAction = draft.elementClickAction;
    CONFIG.side = draft.side;
    CONFIG.offset = Math.round(offset);

    if (persist) {
      saveSettings();
      committed = true;
    }

    render();
    return true;
  };

  const restoreSnapshot = () => {
    CONFIG.width = snapshot.width;
    CONFIG.height = snapshot.height;
    CONFIG.adaptiveSize = snapshot.adaptiveSize;
    CONFIG.elementClickAction = snapshot.elementClickAction;
    CONFIG.side = snapshot.side;
    CONFIG.offset = snapshot.offset;
    render();
  };

  modal.onClose = () => {
    if (!committed) {
      restoreSnapshot();
    }
  };

  new ea.obsidian.Setting(modal.contentEl)
    .setName("宽度上限")
    .setDesc("minimap 最大宽度")
    .addText(text => {
      text.setPlaceholder("220");
      text.setValue(draft.width);
      text.onChange(value => {
        draft.width = value;
        applyDraft();
      });
    });

  new ea.obsidian.Setting(modal.contentEl)
    .setName("高度上限")
    .setDesc("minimap 最大高度")
    .addText(text => {
      text.setPlaceholder("160");
      text.setValue(draft.height);
      text.onChange(value => {
        draft.height = value;
        applyDraft();
      });
    });

  new ea.obsidian.Setting(modal.contentEl)
    .setName("自适应 minimap 尺寸上限")
    .setDesc("按内容比例在最大宽高内自动调整 minimap 实际尺寸")
    .addToggle(toggle => {
      toggle.setValue(draft.adaptiveSize);
      toggle.onChange(value => {
        draft.adaptiveSize = value;
        applyDraft();
      });
    });

  new ea.obsidian.Setting(modal.contentEl)
    .setName("位置")
    .setDesc("左上、右上、右下、左下")
    .addDropdown(dropdown => {
      dropdown
        .addOption("top-left", "左上")
        .addOption("top-right", "右上")
        .addOption("bottom-right", "右下")
        .addOption("bottom-left", "左下")
        .setValue(draft.side)
        .onChange(value => {
          draft.side = value;
          applyDraft();
        });
    });

  new ea.obsidian.Setting(modal.contentEl)
    .setName("页边距")
    .setDesc("距离边缘的像素")
    .addText(text => {
      text.setPlaceholder("12");
      text.setValue(draft.offset);
      text.onChange(value => {
        draft.offset = value;
        applyDraft();
      });
    });

  new ea.obsidian.Setting(modal.contentEl)
    .setName("元素点击事件")
    .setDesc("点击 minimap 中元素区域时，执行移动或缩放")
    .addDropdown(dropdown => {
      dropdown
        .addOption("move", "移动")
        .addOption("zoom", "缩放")
        .setValue(draft.elementClickAction)
        .onChange(value => {
          draft.elementClickAction = value;
          applyDraft();
        });
    });

  new ea.obsidian.Setting(modal.contentEl)
    .addButton(btn => btn
      .setButtonText("保存")
      .setCta()
      .onClick(() => {
        const width = Number(draft.width);
        const height = Number(draft.height);
        const offset = Number(draft.offset);

        if (!Number.isFinite(width) || width < 80) {
          new Notice("宽度至少为 80");
          return;
        }
        if (!Number.isFinite(height) || height < 60) {
          new Notice("高度至少为 60");
          return;
        }
        if (!Number.isFinite(offset) || offset < 0) {
          new Notice("页边距不能小于 0");
          return;
        }
        if (!POSITION_STYLES.includes(draft.side)) {
          new Notice("位置参数无效");
          return;
        }

        applyDraft({ persist: true });
        modal.close();
      }))
    .addButton(btn => btn
      .setButtonText("取消")
      .onClick(() => modal.close()));

  modal.open();
};

const getRenderableElements = () => {
  return api
    .getSceneElements()
    .filter((el) => !el.isDeleted)
    .filter((el) => el.width && el.height)
    .filter((el) => !["selection", "arrow", "line"].includes(el.type));
};

const getSceneBounds = (elements) => {
  if (!elements.length) {
    return { minX: -500, minY: -500, maxX: 500, maxY: 500, width: 1000, height: 1000 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  }

  minX -= CONFIG.padding;
  minY -= CONFIG.padding;
  maxX += CONFIG.padding;
  maxY += CONFIG.padding;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
};

const getViewportBounds = () => {
  const appState = api.getAppState();
  const zoom = appState.zoom?.value || 1;
  const viewBg = container.querySelector(".excalidraw__canvas") || container;
  const rect = viewBg.getBoundingClientRect();
  const width = rect.width / zoom;
  const height = rect.height / zoom;
  const minX = -appState.scrollX;
  const minY = -appState.scrollY;

  return {
    minX,
    minY,
    maxX: minX + width,
    maxY: minY + height,
    width,
    height,
  };
};

const mapSceneToMini = (x, y, bounds) => ({
  x: state.renderOffsetX + (x - bounds.minX) * state.renderScale,
  y: state.renderOffsetY + (y - bounds.minY) * state.renderScale,
});

const mapMiniToScene = (x, y, bounds) => ({
  x: bounds.minX + (x - state.renderOffsetX) / state.renderScale,
  y: bounds.minY + (y - state.renderOffsetY) / state.renderScale,
});

ensureRelativePosition(container);

const root = document.createElement("div");
root.id = MINIMAP_ID;
root.style.position = "absolute";
root.style.zIndex = "30";
root.style.overflow = "hidden";
root.style.border = CONFIG.border;
root.style.borderRadius = "8px";
root.style.background = CONFIG.background;
root.style.backdropFilter = "blur(4px)";
root.style.cursor = "pointer";
root.style.userSelect = "none";
root.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
root.style.pointerEvents = "auto";
root.style.opacity = "0.92";

const settingsButton = document.createElement("button");
settingsButton.type = "button";
settingsButton.textContent = "⚙";
settingsButton.style.position = "absolute";
settingsButton.style.zIndex = "3";
settingsButton.style.width = "22px";
settingsButton.style.height = "22px";
settingsButton.style.padding = "0";
settingsButton.style.border = "none";
settingsButton.style.borderRadius = "999px";
settingsButton.style.background = "rgba(20,20,20,0.45)";
settingsButton.style.color = "rgba(255,255,255,0.9)";
settingsButton.style.cursor = "pointer";
settingsButton.style.display = "flex";
settingsButton.style.alignItems = "center";
settingsButton.style.justifyContent = "center";
settingsButton.style.fontSize = "12px";
settingsButton.style.lineHeight = "1";
settingsButton.style.pointerEvents = "auto";
settingsButton.style.opacity = "0";
settingsButton.style.transition = "opacity 120ms ease";
settingsButton.title = "设置 minimap";

const svgNs = "http://www.w3.org/2000/svg";
const svg = document.createElementNS(svgNs, "svg");
svg.style.display = "block";
svg.style.width = "100%";
svg.style.height = "100%";

root.appendChild(svg);
root.appendChild(settingsButton);
container.appendChild(root);

const clearSvg = () => {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
};

const createSvgEl = (name, attrs = {}) => {
  const el = document.createElementNS(svgNs, name);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
};

const getElementMiniStyle = (el) => {
  if (el.type === "frame") {
    return {
      fill: CONFIG.frameFill,
      stroke: CONFIG.frameStroke,
      strokeWidth: 1,
      radius: 3,
    };
  }

  if (el.type === "image") {
    return {
      fill: CONFIG.imageFill,
      stroke: CONFIG.imageStroke,
      strokeWidth: 0.8,
      radius: 1,
    };
  }

  if (el.type === "embeddable") {
    return {
      fill: CONFIG.embeddableFill,
      stroke: CONFIG.embeddableStroke,
      strokeWidth: 0.8,
      radius: 1,
    };
  }

  return {
    fill: CONFIG.elementFill,
    stroke: CONFIG.elementStroke,
    strokeWidth: 0.6,
    radius: 1,
  };
};

const render = () => {
  if (state.disposed) return;

  const now = Date.now();
  if (now - state.lastRenderAt < CONFIG.throttleMs) {
    cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(render);
    return;
  }
  state.lastRenderAt = now;

  const elements = getRenderableElements();
  const sceneBounds = getSceneBounds(elements);
  const viewportBounds = getViewportBounds();
  const metrics = computeRenderMetrics(sceneBounds);

  state.renderWidth = metrics.width;
  state.renderHeight = metrics.height;
  state.renderScale = metrics.scale;
  state.renderOffsetX = metrics.offsetX;
  state.renderOffsetY = metrics.offsetY;
  refreshRootSize();

  clearSvg();
  state.elementMiniBounds = [];

  const bg = createSvgEl("rect", {
    x: 0,
    y: 0,
    width: state.renderWidth,
    height: state.renderHeight,
    fill: "transparent",
  });
  svg.appendChild(bg);

  for (const el of elements) {
    const p1 = mapSceneToMini(el.x, el.y, sceneBounds);
    const p2 = mapSceneToMini(el.x + el.width, el.y + el.height, sceneBounds);
    const miniStyle = getElementMiniStyle(el);
    const rect = createSvgEl("rect", {
      x: p1.x,
      y: p1.y,
      width: Math.max(1.2, p2.x - p1.x),
      height: Math.max(1.2, p2.y - p1.y),
      rx: miniStyle.radius,
      ry: miniStyle.radius,
      fill: miniStyle.fill,
      stroke: miniStyle.stroke,
      "stroke-width": miniStyle.strokeWidth,
    });
    state.elementMiniBounds.push({
      minX: p1.x,
      minY: p1.y,
      maxX: p1.x + Math.max(1.2, p2.x - p1.x),
      maxY: p1.y + Math.max(1.2, p2.y - p1.y),
      sceneX: el.x,
      sceneY: el.y,
      sceneWidth: Math.max(1, el.width),
      sceneHeight: Math.max(1, el.height),
      sceneCenterX: el.x + el.width / 2,
      sceneCenterY: el.y + el.height / 2,
      element: el,
    });
    svg.appendChild(rect);
  }

  const vp1 = mapSceneToMini(viewportBounds.minX, viewportBounds.minY, sceneBounds);
  const vp2 = mapSceneToMini(viewportBounds.maxX, viewportBounds.maxY, sceneBounds);
  const viewportRect = createSvgEl("rect", {
    x: vp1.x,
    y: vp1.y,
    width: Math.max(2, vp2.x - vp1.x),
    height: Math.max(2, vp2.y - vp1.y),
    fill: CONFIG.viewportFill,
    stroke: CONFIG.viewportStroke,
    "stroke-width": 1.2,
  });
  svg.appendChild(viewportRect);

  state.sceneBounds = sceneBounds;
  state.viewportMiniBounds = {
    minX: vp1.x,
    minY: vp1.y,
    maxX: vp2.x,
    maxY: vp2.y,
    width: Math.max(2, vp2.x - vp1.x),
    height: Math.max(2, vp2.y - vp1.y),
  };
};

const panToScenePoint = (sceneX, sceneY) => {
  const appState = api.getAppState();
  const zoom = appState.zoom?.value || 1;
  const rect = (container.querySelector(".excalidraw__canvas") || container).getBoundingClientRect();
  const viewportWidth = rect.width / zoom;
  const viewportHeight = rect.height / zoom;

  api.updateScene({
    appState: {
      ...appState,
      scrollX: -(sceneX - viewportWidth / 2),
      scrollY: -(sceneY - viewportHeight / 2),
    },
    commitToHistory: false,
  });
};

const isInViewportRect = (x, y) => {
  const vp = state.viewportMiniBounds;
  if (!vp) return false;
  return x >= vp.minX && x <= vp.maxX && y >= vp.minY && y <= vp.maxY;
};

const getHitElementAtMiniPoint = (x, y) => {
  return state.elementMiniBounds.find((bounds) => {
    return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
  }) || null;
};

const getMiniPointFromEvent = (evt) => {
  const rect = root.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top,
  };
};

const moveViewportByMiniPoint = (x, y) => {
  if (!state.sceneBounds) return;
  const scenePoint = mapMiniToScene(x, y, state.sceneBounds);
  panToScenePoint(scenePoint.x, scenePoint.y);
};

const zoomAtMiniPoint = (x, y, zoomFactor) => {
  if (!state.sceneBounds) return;

  const appState = api.getAppState();
  const currentZoom = appState.zoom?.value || 1;
  const nextZoom = Math.min(CONFIG.maxZoom, Math.max(CONFIG.minZoom, currentZoom * zoomFactor));
  if (nextZoom === currentZoom) return;

  const clampedX = Math.max(state.renderOffsetX, Math.min(state.renderWidth - state.renderOffsetX, x));
  const clampedY = Math.max(state.renderOffsetY, Math.min(state.renderHeight - state.renderOffsetY, y));
  const scenePoint = mapMiniToScene(clampedX, clampedY, state.sceneBounds);
  const canvasRect = (container.querySelector(".excalidraw__canvas") || container).getBoundingClientRect();
  const viewportSceneWidth = canvasRect.width / nextZoom;
  const viewportSceneHeight = canvasRect.height / nextZoom;

  api.updateScene({
    appState: {
      ...appState,
      zoom: {
        ...appState.zoom,
        value: nextZoom,
      },
      scrollX: -(scenePoint.x - viewportSceneWidth / 2),
      scrollY: -(scenePoint.y - viewportSceneHeight / 2),
    },
    commitToHistory: false,
  });
};

const animateZoomToElement = (elementBounds) => {
  if (!elementBounds) return;

  cancelAnimationFrame(state.zoomAnimationFrame);

  const startState = api.getAppState();
  const startZoom = startState.zoom?.value || 1;
  const startScrollX = startState.scrollX;
  const startScrollY = startState.scrollY;
  const canvasRect = (container.querySelector(".excalidraw__canvas") || container).getBoundingClientRect();
  const viewportWidth = Math.max(1, canvasRect.width);
  const viewportHeight = Math.max(1, canvasRect.height);
  const targetZoom = Math.min(
    CONFIG.maxZoom,
    Math.max(
      CONFIG.minZoom,
      Math.min(
        viewportWidth / Math.max(1, elementBounds.sceneWidth),
        viewportHeight / Math.max(1, elementBounds.sceneHeight)
      ) * 0.9
    )
  );

  const targetViewportSceneWidth = viewportWidth / targetZoom;
  const targetViewportSceneHeight = viewportHeight / targetZoom;
  const targetScrollX = -(elementBounds.sceneCenterX - targetViewportSceneWidth / 2);
  const targetScrollY = -(elementBounds.sceneCenterY - targetViewportSceneHeight / 2);

  const startedAt = performance.now();

  const step = (now) => {
    const elapsed = now - startedAt;
    const timeProgress = Math.min(1, elapsed / ZOOM_TRANSITION_DELAY);
    const stepProgress = Math.min(
      1,
      Math.round(ZOOM_TRANSITION_STEP_COUNT * timeProgress) / ZOOM_TRANSITION_STEP_COUNT
    );

    api.updateScene({
      appState: {
        ...api.getAppState(),
        zoom: {
          ...api.getAppState().zoom,
          value: startZoom + (targetZoom - startZoom) * stepProgress,
        },
        scrollX: startScrollX + (targetScrollX - startScrollX) * stepProgress,
        scrollY: startScrollY + (targetScrollY - startScrollY) * stepProgress,
      },
      commitToHistory: false,
    });

    if (elapsed < ZOOM_TRANSITION_DELAY && stepProgress < 1) {
      state.zoomAnimationFrame = requestAnimationFrame(step);
      return;
    }

    api.updateScene({
      appState: {
        ...api.getAppState(),
        zoom: {
          ...api.getAppState().zoom,
          value: targetZoom,
        },
        scrollX: targetScrollX,
        scrollY: targetScrollY,
      },
      commitToHistory: false,
    });

    state.zoomAnimationFrame = 0;
    render();
  };

  state.zoomAnimationFrame = requestAnimationFrame(step);
};

const handlePointerDown = (evt) => {
  if (evt.target === settingsButton) return;
  evt.preventDefault();
  evt.stopPropagation();

  if (!state.sceneBounds) return;

  const point = getMiniPointFromEvent(evt);
  state.draggingViewport = isInViewportRect(point.x, point.y);

  if (!state.draggingViewport) {
    const hitElement = getHitElementAtMiniPoint(point.x, point.y);
    if (hitElement && CONFIG.elementClickAction === "zoom") {
      animateZoomToElement(hitElement);
    } else {
      moveViewportByMiniPoint(point.x, point.y);
      render();
    }
    return;
  }

  root.style.cursor = "grabbing";
  root.setPointerCapture?.(evt.pointerId);
};

const handlePointerMove = (evt) => {
  if (!state.draggingViewport) return;
  evt.preventDefault();
  evt.stopPropagation();

  const point = getMiniPointFromEvent(evt);
  moveViewportByMiniPoint(point.x, point.y);
};

const stopViewportDrag = (evt) => {
  if (evt) {
    evt.preventDefault();
    evt.stopPropagation();
  }
  state.draggingViewport = false;
  root.style.cursor = "pointer";
  if (evt?.pointerId !== undefined) {
    root.releasePointerCapture?.(evt.pointerId);
  }
};

const handleWheel = (evt) => {
  if (evt.target === settingsButton) return;
  evt.preventDefault();
  evt.stopPropagation();

  if (!state.sceneBounds) return;

  const point = getMiniPointFromEvent(evt);
  const zoomFactor = evt.deltaY < 0 ? CONFIG.zoomStep : 1 / CONFIG.zoomStep;
  zoomAtMiniPoint(point.x, point.y, zoomFactor);
  render();
};

const handleSettingsClick = (evt) => {
  evt.preventDefault();
  evt.stopPropagation();
  openSettingsModal();
};

const showSettingsButton = () => {
  settingsButton.style.opacity = "1";
};

const hideSettingsButton = () => {
  settingsButton.style.opacity = "0";
};

root.addEventListener("pointerenter", showSettingsButton);
root.addEventListener("pointerleave", hideSettingsButton);
root.addEventListener("pointerdown", handlePointerDown);
root.addEventListener("pointermove", handlePointerMove);
root.addEventListener("pointerup", stopViewportDrag);
root.addEventListener("pointercancel", stopViewportDrag);
root.addEventListener("lostpointercapture", stopViewportDrag);
root.addEventListener("wheel", handleWheel, { passive: false });
settingsButton.addEventListener("click", handleSettingsClick);
state.unsub = api.onChange(() => render());
window.addEventListener("resize", render);

const cleanup = () => {
  if (state.disposed) return;
  state.disposed = true;
  cancelAnimationFrame(state.raf);
  root.removeEventListener("pointerenter", showSettingsButton);
  root.removeEventListener("pointerleave", hideSettingsButton);
  root.removeEventListener("pointerdown", handlePointerDown);
  root.removeEventListener("pointermove", handlePointerMove);
  root.removeEventListener("pointerup", stopViewportDrag);
  root.removeEventListener("pointercancel", stopViewportDrag);
  root.removeEventListener("lostpointercapture", stopViewportDrag);
  root.removeEventListener("wheel", handleWheel);
  settingsButton.removeEventListener("click", handleSettingsClick);
  state.unsub?.();
  window.removeEventListener("resize", render);
  root.remove();
  registry.delete(container);
};

registry.set(container, { cleanup, render, root, container, view });
render();
new Notice("当前 Excalidraw 视图的 Minimap 已开启，再次运行脚本可关闭");