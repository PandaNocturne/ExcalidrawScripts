let settings = ea.getScriptSettings();
//在首次运行时设置默认值
if (!settings["Frame Mindmap Layout"]) {
  settings = {
    "MFrame Mindmap Layout": {
      value: "Frame Mindmap Layout",
      hidden: true
    },
    "Default gap": {
      value: 100,
      description: "元素间隔大小",
    },
    "Curve length": {
      value: 80,
      description: "思维导图线条中弧线部分的长度",
    },
    "Length between element and line": {
      value: 100,
      description:
        "连接尾部和思维导图连接元素之间的距离",
    },
  };
  ea.setScriptSettings(settings);
}

const sceneElements = ea.getExcalidrawAPI().getSceneElements();

// 弧线中点的默认X坐标
const defaultDotX = Number(settings["Curve length"].value);
// 弧线中点在X轴上的默认长度
const defaultLengthWithCenterDot = Number(
  settings["Length between element and line"].value
);
// Y轴端点的初始修剪距离
const initAdjLength = 2;
// 默认间隔
const defaultGap = Number(settings["Default gap"].value);

const setCenter = (parent, line) => {
  // Focus and gap need the api calculation of excalidraw
  // e.g. determineFocusDistance, but they are not available now
  // so they are uniformly set to 0/1
  line.startBinding.focus = 0;
  line.startBinding.gap = 1;
  line.endBinding.focus = 0;
  line.endBinding.gap = 1;
  line.x = parent.x + parent.width;
  line.y = parent.y + parent.height / 2;
};

/**
 * set the middle point of curve
 * @param {any} lineEl the line element of excalidraw
 * @param {number} height height of dot on Y axis
 * @param {number} [ratio=1] ，coefficient of the initial trimming distance of the end point on the Y axis, default is 1
 */
const setTopCurveDotOnLine = (lineEl, height, ratio = 1) => {
  if (lineEl.points.length < 3) {
    lineEl.points.splice(1, 0, [defaultDotX, lineEl.points[0][1] - height]);
  } else if (lineEl.points.length === 3) {
    lineEl.points[1] = [defaultDotX, lineEl.points[0][1] - height];
  } else {
    lineEl.points.splice(2, lineEl.points.length - 3);
    lineEl.points[1] = [defaultDotX, lineEl.points[0][1] - height];
  }
  lineEl.points[2][0] = lineEl.points[1][0] + defaultLengthWithCenterDot;
  // adjust the curvature of the second line segment
  lineEl.points[2][1] = lineEl.points[1][1] - initAdjLength * ratio * 0.8;
};

const setMidCurveDotOnLine = (lineEl) => {
  if (lineEl.points.length < 3) {
    lineEl.points.splice(1, 0, [defaultDotX, lineEl.points[0][1]]);
  } else if (lineEl.points.length === 3) {
    lineEl.points[1] = [defaultDotX, lineEl.points[0][1]];
  } else {
    lineEl.points.splice(2, lineEl.points.length - 3);
    lineEl.points[1] = [defaultDotX, lineEl.points[0][1]];
  }
  lineEl.points[2][0] = lineEl.points[1][0] + defaultLengthWithCenterDot;
  lineEl.points[2][1] = lineEl.points[1][1];
};

/**
 * set the middle point of curve
 * @param {any} lineEl the line element of excalidraw
 * @param {number} height height of dot on Y axis
 * @param {number} [ratio=1] ，coefficient of the initial trimming distance of the end point on the Y axis, default is 1
 */
const setBottomCurveDotOnLine = (lineEl, height, ratio = 1) => {
  if (lineEl.points.length < 3) {
    lineEl.points.splice(1, 0, [defaultDotX, lineEl.points[0][1] + height]);
  } else if (lineEl.points.length === 3) {
    lineEl.points[1] = [defaultDotX, lineEl.points[0][1] + height];
  } else {
    lineEl.points.splice(2, lineEl.points.length - 3);
    lineEl.points[1] = [defaultDotX, lineEl.points[0][1] + height];
  }
  lineEl.points[2][0] = lineEl.points[1][0] + defaultLengthWithCenterDot;
  // adjust the curvature of the second line segment
  lineEl.points[2][1] = lineEl.points[1][1] + initAdjLength * ratio * 0.8;
};

const setTextXY = (rect, text) => {
  text.x = rect.x + (rect.width - text.width) / 2;
  text.y = rect.y + (rect.height - text.height) / 2;
};

// 2024-03-29_16:32：修改frame样式也可以移动
const setChildrenXY = (parent, children, line, elementsMap) => {
  x = parent.x + parent.width + line.points[2][0];
  y = parent.y + parent.height / 2 + line.points[2][1] - children.height / 2;
  distX = children.x - x;
  distY = children.y - y;

  ea.getElementsInTheSameGroupWithElement(children, sceneElements).forEach((el) => {
    el.x = el.x - distX;
    el.y = el.y - distY;
  });

  // // 2024-03-30_01:24：：适配Frame
  // if (children.type === "frame") {
  //   sceneElements.forEach((el) => {
  //     if (el.frameId === children.id) {
  //       el.x = el.x - distX;
  //       el.y = el.y - distY;
  //     }
  //   });
  // }

  // 2024-03-30_01:33：适配Frame，直接调用API
  ea.getElementsInFrame(children, sceneElements).forEach((el) => {
    el.x = el.x - distX;
    el.y = el.y - distY;
  });

  if (
    ["rectangle", "diamond", "ellipse"].includes(children.type) &&
    ![null, undefined].includes(children.boundElements)
  ) {
    const textDesc = children.boundElements.filter(
      (el) => el.type === "text"
    )[0];
    if (textDesc !== undefined) {
      const textEl = elementsMap.get(textDesc.id);
      setTextXY(children, textEl);
    }
  }


};

/**
 * returns the height of the upper part of all child nodes
 * and the height of the lower part of all child nodes
 * @param {Number[]} childrenTotalHeightArr
 * @returns {Number[]} [topHeight, bottomHeight]
 */
const getNodeCurrentHeight = (childrenTotalHeightArr) => {
  if (childrenTotalHeightArr.length <= 0) return [0, 0];
  else if (childrenTotalHeightArr.length === 1)
    return [childrenTotalHeightArr[0] / 2, childrenTotalHeightArr[0] / 2];
  const heightArr = childrenTotalHeightArr;
  let topHeight = 0,
    bottomHeight = 0;
  const isEven = heightArr.length % 2 === 0;
  const mid = Math.floor(heightArr.length / 2);
  const topI = mid - 1;
  const bottomI = isEven ? mid : mid + 1;
  topHeight = isEven ? 0 : heightArr[mid] / 2;
  for (let i = topI; i >= 0; i--) {
    topHeight += heightArr[i];
  }
  bottomHeight = isEven ? 0 : heightArr[mid] / 2;
  for (let i = bottomI; i < heightArr.length; i++) {
    bottomHeight += heightArr[i];
  }
  return [topHeight, bottomHeight];
};

/**
 * handle the height of each point in the single-level tree
 * @param {Array} lines
 * @param {Map} elementsMap
 * @param {Boolean} isEven
 * @param {Number} mid 'lines' array midpoint index
 * @returns {Array} height array corresponding to 'lines'
 */
const handleDotYValue = (lines, elementsMap, isEven, mid) => {
  const getTotalHeight = (line, elementsMap) => {
    return elementsMap.get(line.endBinding.elementId).totalHeight;
  };
  const getTopHeight = (line, elementsMap) => {
    return elementsMap.get(line.endBinding.elementId).topHeight;
  };
  const getBottomHeight = (line, elementsMap) => {
    return elementsMap.get(line.endBinding.elementId).bottomHeight;
  };
  const heightArr = new Array(lines.length).fill(0);
  const upI = mid === 0 ? 0 : mid - 1;
  const bottomI = isEven ? mid : mid + 1;
  let initHeight = isEven ? 0 : getTopHeight(lines[mid], elementsMap);
  for (let i = upI; i >= 0; i--) {
    heightArr[i] = initHeight + getBottomHeight(lines[i], elementsMap);
    initHeight += getTotalHeight(lines[i], elementsMap);
  }
  initHeight = isEven ? 0 : getBottomHeight(lines[mid], elementsMap);
  for (let i = bottomI; i < lines.length; i++) {
    heightArr[i] = initHeight + getTopHeight(lines[i], elementsMap);
    initHeight += getTotalHeight(lines[i], elementsMap);
  }
  return heightArr;
};

/**
 * format single-level tree
 * @param {any} parent
 * @param {Array} lines
 * @param {Map} childrenDescMap
 * @param {Map} elementsMap
 */
const formatTree = (parent, lines, childrenDescMap, elementsMap) => {
  // 2024-03-30_02:32：先根据元素的y坐标进行排序
  lines.sort((a, b) => elementsMap.get(a.endBinding.elementId).y - elementsMap.get(b.endBinding.elementId).y);

  lines.forEach((item) => setCenter(parent, item));

  const isEven = lines.length % 2 === 0;
  const mid = Math.floor(lines.length / 2);
  const heightArr = handleDotYValue(lines, childrenDescMap, isEven, mid);
  lines.forEach((item, index) => {
    if (isEven) {
      if (index < mid) setTopCurveDotOnLine(item, heightArr[index], index + 1);
      else setBottomCurveDotOnLine(item, heightArr[index], index - mid + 1);
    } else {
      if (index < mid) setTopCurveDotOnLine(item, heightArr[index], index + 1);
      else if (index === mid) setMidCurveDotOnLine(item);
      else setBottomCurveDotOnLine(item, heightArr[index], index - mid);
    }
  });
  lines.forEach((item) => {
    if (item.endBinding !== null) {
      setChildrenXY(
        parent,
        elementsMap.get(item.endBinding.elementId),
        item,
        elementsMap
      );
    }
  });
};

const generateTree = (elements) => {
  const elIdMap = new Map([[elements[0].id, elements[0]]]);
  let minXEl = elements[0];
  for (let i = 1; i < elements.length; i++) {
    elIdMap.set(elements[i].id, elements[i]);
    if (
      !(elements[i].type === "arrow" || elements[i].type === "line") &&
      elements[i].x < minXEl.x
    ) {
      minXEl = elements[i];
    }
  }
  const root = {
    el: minXEl,
    totalHeight: minXEl.height,
    topHeight: 0,
    bottomHeight: 0,
    linkChildrensLines: [],
    isLeafNode: false,
    children: [],
  };
  const preIdSet = new Set(); // The id_set of Elements that is already in the tree, avoid a dead cycle
  const dfsForTreeData = (root) => {
    if (preIdSet.has(root.el.id)) {
      return 0;
    }
    preIdSet.add(root.el.id);
    let lines = root.el.boundElements.filter(
      (el) =>
        el.type === "arrow" &&
        !preIdSet.has(el.id) &&
        elIdMap.get(el.id)?.startBinding?.elementId === root.el.id
    );
    if (lines.length === 0) {
      root.isLeafNode = true;
      root.totalHeight = root.el.height + 2 * defaultGap;
      [root.topHeight, root.bottomHeight] = [
        root.totalHeight / 2,
        root.totalHeight / 2,
      ];
      return root.totalHeight;
    } else {
      lines = lines.map((elementDesc) => {
        preIdSet.add(elementDesc.id);
        return elIdMap.get(elementDesc.id);
      });
    }

    const linkChildrensLines = [];
    lines.forEach((el) => {
      const line = el;
      if (
        line &&
        line.endBinding !== null &&
        line.endBinding !== undefined &&
        !preIdSet.has(elIdMap.get(line.endBinding.elementId).id)
      ) {
        const children = elIdMap.get(line.endBinding.elementId);
        linkChildrensLines.push(line);
        root.children.push({
          el: children,
          totalHeight: 0,
          topHeight: 0,
          bottomHeight: 0,
          linkChildrensLines: [],
          isLeafNode: false,
          children: [],
        });
      }
    });

    let totalHeight = 0;
    root.children.forEach((el) => (totalHeight += dfsForTreeData(el)));

    root.linkChildrensLines = linkChildrensLines;
    if (root.children.length === 0) {
      root.isLeafNode = true;
      root.totalHeight = root.el.height + 2 * defaultGap;
      [root.topHeight, root.bottomHeight] = [
        root.totalHeight / 2,
        root.totalHeight / 2,
      ];
    } else if (root.children.length > 0) {
      root.totalHeight = Math.max(root.el.height + 2 * defaultGap, totalHeight);
      [root.topHeight, root.bottomHeight] = getNodeCurrentHeight(
        root.children.map((item) => item.totalHeight)
      );
    }

    return totalHeight;
  };
  dfsForTreeData(root);
  const dfsForFormat = (root) => {
    if (root.isLeafNode) return;
    const childrenDescMap = new Map(
      root.children.map((item) => [item.el.id, item])
    );
    formatTree(root.el, root.linkChildrensLines, childrenDescMap, elIdMap);
    root.children.forEach((el) => dfsForFormat(el));
  };
  dfsForFormat(root);
};

// // 最基础功能：选择多个图形对齐，适用于bug问题
// const elements = ea.getViewSelectedElements();
// if (elements.length > 1) {
//   generateTree(elements);
//   ea.copyViewElementsToEAforEditing(elements);
//   await ea.addElementsToView(false, false);
//   return;
// }

// 2024-03-29_18:00：自动对齐所有子元素
// 批量处理
const processMindFrames = async (mindEls) => {
  for (let mind of mindEls) {
    try {
      const allRelatedElements = [];
      const relatedElements = getAllRelatedElements([mind]);
      allRelatedElements.push(...relatedElements);
      console.log(allRelatedElements);
      generateTree(allRelatedElements);
      ea.copyViewElementsToEAforEditing(allRelatedElements);
      await ea.addElementsToView(false, false);
    } catch (error) {
      await ea.addElementsToView(false, false);
      // new Notice("🔴格式化过程中出现问题，可能连线没衔接！");
      console.log(error);
      continue;
    }
  }
};
// // 监听Ctrl + S事件
// document.addEventListener('keydown', async function (event) {
//   if (event.ctrlKey && event.key === 's') {
    // 延迟500ms，等待excalidraw渲染完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    // 拓展功能：由父节点处理子节点
    const selected = ea.getViewSelectedElements().filter(el => el.type !== "arrow").filter(el => el.boundElements);
    // 如果选中了元素
    if (selected.length > 0) {
      await processMindFrames(selected);
      setTimeout(() => {
        this.app.commands.executeCommandById("obsidian-excalidraw-plugin:save");
      }, 500);
      return;
    }

    // 设定文字及其边框自动排版特殊符号
    const mindString = "mind";
    // 获取特定frame：MindFrame，同时包含boundElements属性，不然容易导致错误
    const mindFrames =ea.getViewElements().filter(el => el.type === "frame").filter(el => el.boundElements);

    // 获取特定text及其容器：MindText、MindContainer
    const mindText = ea.getViewElements().filter(el => el.type === "text" && el.rawText.includes(mindString));
    const mindContainer = ea.getViewElements().filter(el => mindText.map(el => el.containerId).includes(el.id));

    // 处理所有元素
    await processMindFrames([...mindFrames, ...mindText, ...mindContainer]);
    await ea.addElementsToView(false, false);
    setTimeout(() => {
      this.app.commands.executeCommandById("obsidian-excalidraw-plugin:save");
    }, 500);
    new Notice("✅Frame导图式布局格式化完成");
//   }
// });



// 获取所有相关的子元素：
function getAllRelatedElements(element) {
  const relatedElements = [];
  for (let i of element) {
    relatedElements.push(i);
    // 获取子集箭头
    const arrowsWithEl = ea.getViewElements().filter(el =>
      el.type === "arrow" &&
      el.startBinding && el.startBinding.elementId === i.id
    ) || [];
    if (!arrowsWithEl) continue;
    relatedElements.push(...arrowsWithEl);
    // 获取子集元素
    arrowsWithEl.forEach(arrow => {
      const element = ea.getViewElements().find(el => el.id === arrow.endBinding.elementId);
      if (element) {
        const relatedElement = getAllRelatedElements([element]);
        relatedElements.push(...relatedElement);
      }
    });
  }
  return relatedElements;
};

// // 排序，全局从最左边的开始
// function elementsSort(elements, key = 'x') {
//   let result = elements.slice(0);
//   return result.sort((a, b) => Number(a[key]) - Number(b[key]));
// }