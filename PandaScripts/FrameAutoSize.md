await ea.addElementsToView();
const els = ea.getViewElements();
const frameEls = els.filter(el => el.type === "frame");

for (let frameEl of frameEls) {
  let minX = Infinity;
  let maxY = -Infinity;
  let maxX = -Infinity;
  let minY = Infinity;

  for (let i of els) {
    if (i.frameId === frameEl.id) {
      if (i.x < minX) minX = i.x;
      if (i.x + i.width > maxX) maxX = i.x + i.width;
      if (i.y < minY) minY = i.y;
      if (i.y + i.height > maxY) maxY = i.y + i.height;
    }
  }

  // 更新frame的大小和位置
  frameEl.x = minX - 20;
  frameEl.y = minY - 20;
  frameEl.width = maxX - minX + 40;
  frameEl.height = maxY - minY + 40;
  await ea.addElementsToView(false, false);
}

new Notice("Frame已自适应!",1000);