await ea.addElementsToView();
const selectedElements = ea.getViewSelectedElements().filter(el => el.type === "image");
const allImgEls = ea.getViewElements().filter(el => el.type === "image");
const els = selectedElements.length ? selectedElements : allImgEls;
if (!els.length) return;
for (let el of els) {
  await ea.resetImageAspectRatio(el);
}
await ea.addElementsToView(false, false);
new Notice("The image size has been reset.", 1000);