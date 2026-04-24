/*
#exclude
```js*/
/**
 * If set, this callback is triggered when the user closes an Excalidraw view.
 *   onViewUnloadHook: (view: ExcalidrawView) => void = null;
 */
//ea.onViewUnloadHook = (view) => {};

/**
 * If set, this callback is triggered, when the user changes the view mode.
 * You can use this callback in case you want to do something additional when the user switches to view mode and back.
 *   onViewModeChangeHook: (isViewModeEnabled:boolean, view: ExcalidrawView, ea: ExcalidrawAutomate) => void = null;
 */
//ea.onViewModeChangeHook = (isViewModeEnabled, view, ea) => {};

/**
 * If set, this callback is triggered, when the user hovers a link in the scene.
 * You can use this callback in case you want to do something additional when the onLinkHover event occurs.
 * This callback must return a boolean value.
 * In case you want to prevent the excalidraw onLinkHover action you must return false, it will stop the native excalidraw onLinkHover management flow.
 *   onLinkHoverHook: (
 *     element: NonDeletedExcalidrawElement,
 *     linkText: string,
 *     view: ExcalidrawView,
 *     ea: ExcalidrawAutomate
 *   ) => boolean = null;
 */
//ea.onLinkHoverHook = (element, linkText, view, ea) => {};

/**
 * If set, this callback is triggered, when the user clicks a link in the scene.
 * You can use this callback in case you want to do something additional when the onLinkClick event occurs.
 * This callback must return a boolean value.
 * In case you want to prevent the excalidraw onLinkClick action you must return false, it will stop the native excalidraw onLinkClick management flow.
 *   onLinkClickHook:(
 *     element: ExcalidrawElement,
 *     linkText: string,
 *     event: MouseEvent,
 *     view: ExcalidrawView,
 *     ea: ExcalidrawAutomate
 *   ) => boolean = null;
 */
//ea.onLinkClickHook = (element,linkText,event, view, ea) => {};

/**
 * If set, this callback is triggered, when Excalidraw receives an onDrop event. 
 * You can use this callback in case you want to do something additional when the onDrop event occurs.
 * This callback must return a boolean value.
 * In case you want to prevent the excalidraw onDrop action you must return false, it will stop the native excalidraw onDrop management flow.
 *   onDropHook: (data: {
 *     ea: ExcalidrawAutomate;
 *     event: React.DragEvent<HTMLDivElement>;
 *     draggable: any; //Obsidian draggable object
 *     type: "file" | "text" | "unknown";
 *     payload: {
 *       files: TFile[]; //TFile[] array of dropped files
 *       text: string; //string
 *     };
 *     excalidrawFile: TFile; //the file receiving the drop event
 *     view: ExcalidrawView; //the excalidraw view receiving the drop
 *     pointerPosition: { x: number; y: number }; //the pointer position on canvas at the time of drop
 *   }) => boolean = null;
 */
//ea.onDropHook = (data) => {};

/**
 * If set, this callback is triggered, when Excalidraw receives an onPaste event.
 * You can use this callback in case you want to do something additional when the
 * onPaste event occurs.
 * This callback must return a boolean value.
 * In case you want to prevent the excalidraw onPaste action you must return false,
 * it will stop the native excalidraw onPaste management flow.
 *   onPasteHook: (data: {
 *     ea: ExcalidrawAutomate;
 *     payload: ClipboardData;
 *     event: ClipboardEvent;
 *     excalidrawFile: TFile; //the file receiving the paste event
 *     view: ExcalidrawView; //the excalidraw view receiving the paste
 *     pointerPosition: { x: number; y: number }; //the pointer position on canvas
 *   }) => boolean = null;
 */
//ea.onPasteHook = (data) => {};

/**
 * if set, this callback is triggered, when an Excalidraw file is opened
 * You can use this callback in case you want to do something additional when the file is opened.
 * This will run before the file level script defined in the `excalidraw-onload-script` frontmatter.
 *   onFileOpenHook: (data: {
 *     ea: ExcalidrawAutomate;
 *     excalidrawFile: TFile; //the file being loaded
 *     view: ExcalidrawView;
 *   }) => Promise<void>;
 */

/**
 * if set, this callback is triggered, when an Excalidraw file is created
 * see also: https://github.com/zsviczian/obsidian-excalidraw-plugin/issues/1124
 *   onFileCreateHook: (data: {
 *     ea: ExcalidrawAutomate;
 *     excalidrawFile: TFile; //the file being created
 *     view: ExcalidrawView;
 *   }) => Promise<void>;
 */


/**
 * If set, this callback is triggered whenever the active canvas color changes
 *   onCanvasColorChangeHook: (
 *     ea: ExcalidrawAutomate,
 *     view: ExcalidrawView, //the excalidraw view 
 *     color: string,
 *   ) => void = null;
 */
//ea.onCanvasColorChangeHook = (ea, view, color) => {};

/**
* If set, this callback is triggered whenever a drawing is exported to SVG.
* The string returned will replace the link in the exported SVG.
* The hook is only executed if the link is to a file internal to Obsidian
* see: https://github.com/zsviczian/obsidian-excalidraw-plugin/issues/1605
*  onUpdateElementLinkForExportHook: (data: {
*    originalLink: string,
*    obsidianLink: string,
*    linkedFile: TFile | null,
*    hostFile: TFile,
*  }) => string = null;
*/
//ea.onUpdateElementLinkForExportHook = (data) => {
//  const decodedObsidianURI = decodeURIComponent(data.obsidianLink);
//};


/**
 * 自动加载 Excalidraw 扩展工具
 * - 当前支持：ExcalidrawMinimap、FrameListMindmapLayoutTool
 * - 可自行添加更多工具（按下方 tools 数组配置）
 * 
 * 工作方式：
 * 1. 打开/创建绘图文件时触发
 * 2. 检查当前视图是否已加载该工具（通过 DOM 特征或内部注册表）
 * 3. 若未加载，则查找对应的 Obsidian 命令并执行
 */

// ==================== 工具配置 ====================
const __toolsToAutoLoad = [
  {
    name: "Minimap",
    commandKeywords: ["obsidian-excalidraw-plugin", "ExcalidrawMinimap"],
    // 可选：自定义检查函数（返回 true 表示工具已激活）
    isActive: (view) => {
      const reg = window["__eaExcalidrawMinimapRegistry__"];
      const container = view?.containerEl?.querySelector?.(".excalidraw-wrapper") || view?.containerEl;
      return reg && typeof reg.get === "function" && container && Boolean(reg.get(container));
    }
  },
  {
    name: "FrameListMindmapLayoutTool",
    commandKeywords: ["obsidian-excalidraw-plugin","FrameListMindmapLayoutTool"]
  }
];

// ==================== 内部注册表（防止重复执行）====================
const __eaToolsRegistryKey = "__eaAutoLoadToolsRegistry__";
const __getRegistry = () => {
  if (!window[__eaToolsRegistryKey]) {
    window[__eaToolsRegistryKey] = new Map(); // key: view.containerEl, value: Set<toolName>
  }
  return window[__eaToolsRegistryKey];
};

const __isToolActive = (view, toolName, customCheck) => {
  // 优先使用自定义检查
  if (customCheck && typeof customCheck === "function") {
    try {
      if (customCheck(view)) return true;
    } catch (e) { /* 忽略检查错误 */ }
  }
  // 后备：检查内部注册表
  const reg = __getRegistry();
  const container = view?.containerEl;
  if (!container) return false;
  const activeSet = reg.get(container);
  return activeSet ? activeSet.has(toolName) : false;
};

const __markToolActive = (view, toolName) => {
  const reg = __getRegistry();
  const container = view?.containerEl;
  if (!container) return;
  if (!reg.has(container)) reg.set(container, new Set());
  reg.get(container).add(toolName);
};

// ==================== 命令查找 ====================
const __findCommandId = (keywords) => {
  const commands = app?.commands?.commands;
  if (!commands) return null;
  const commandIds = Object.keys(commands).filter((key) =>
    keywords.every((kw) => key.includes(kw) || commands[key]?.name?.includes?.(kw))
  );
  return commandIds[0] || null;
};

// ==================== 主入口 ====================
const __runToolsIfNeeded = async (data) => {
  const { view } = data;
  if (!view) return;

  for (const tool of __toolsToAutoLoad) {
    if (__isToolActive(view, tool.name, tool.isActive)) continue;

    const commandId = __findCommandId(tool.commandKeywords);
    if (!commandId) {
      console.warn(`[AutoLoadTools] 未找到命令: ${tool.name}，关键字: ${tool.commandKeywords}`);
      continue;
    }

    await new Promise((r) => requestAnimationFrame(r));
    app.commands.executeCommandById(commandId);
    __markToolActive(view, tool.name);
  }
};

// 挂载钩子
ea.onFileOpenHook = __runToolsIfNeeded;
ea.onFileCreateHook = __runToolsIfNeeded;