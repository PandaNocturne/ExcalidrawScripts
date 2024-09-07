/*
 * @Author: 熊猫别熬夜 
 * @Date: 2024-04-27 15:47:47 
 * @Last Modified by:   熊猫别熬夜 
 * @Last Modified time: 2024-04-27 15:47:47 
 */

await ea.addElementsToView();
let modalForm;
try {
  modalForm = app.plugins.plugins.modalforms.api;
} catch {
  new Notice("🔴本脚本需要Modal Form插件，请先安装或启动Modal Form插件！");
  return;
}
const api = ea.getExcalidrawAPI();

// ! modalForms 的表单
// 普通的编辑文本框
const editorForm1 = {
  "title": "编辑文本",
  "name": "editorForm1",
  "fields": [
    {
      "name": "editorContent",
      "label": "编辑文本框",
      "description": "",
      "input": {
        "type": "textarea"
      }
    },
    {
      "name": "Tags",
      "description": "选择标签(可选)",
      "input": {
        "type": "tag"
      }
    },
  ],
};


// ! text 类型
const textEls = ea.getViewSelectedElements().filter(el => el.type === "text");

if (imgs.length === 1) {
  ea.copyViewElementsToEAforEditing(imgs);
  const el = ea.getElements()[0];
  let exText = el.rawText;
  // 提取末尾的标签
  const tags = exText.match(/\s(#\S+)/gm);
  console.log(tags);
  // 删除原文中的标签
  const textWithoutTags = exText.replace(/\s(#\S+)/gm, '');

  let result = await modalForm.openForm(
    editorForm1,
    {
      values: {
        Tags: tags ? tags : "",
        editorContent: textWithoutTags.trim(),
      }
    }
  );
  const getTags = result.getValue('Tags').value;
  let tagsStr = "";
  if (getTags.length >= 1) {
    tagsStr = getTags.map(t => "#" + t.trim().replace("#", "")).join(" ");
  }
  let editorContent = result.getValue('editorContent').value;
  el.originalText = el.rawText = el.text = editorContent.trim() + " " + tagsStr;
  // // 文本全部居左，居中
  // el.textAlign = "left";
  // el.textVerticalAlign = "middle";
  ea.refreshTextElementSize(el.id);
  await ea.addElementsToView(false, false);
  if (el.containerId) {
    const containers = ea.getViewElements().filter(e => e.id === el.containerId);
    api.updateContainerSize(containers);
    ea.selectElementsInView(containers);
  }
  return;
}
