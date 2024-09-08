
class LatexEditorModal extends ea.obsidian.Modal {
  constructor(app, defaultLatex = '') {
    super(app);
    this.defaultLatex = defaultLatex;
    this.result = null;
  }

  async onOpen() {
    const { contentEl } = this;
    const container = contentEl.createEl('div', { cls: 'latex-container' });
    const preview = container.createEl('div', { cls: 'latex-preview excalidraw-latex-editor' });
    const input = container.createEl('textarea', { placeholder: '在这里输入LaTeX公式...' });

    // 设置默认值
    input.value = this.defaultLatex;
    this.renderLatex(preview, this.defaultLatex);

    input.addEventListener('input', () => {
      const latex = input.value;
      this.renderLatex(preview, latex);
    });

    const buttonContainer = contentEl.createEl('div', { cls: 'button-container' });

    const cancelButton = buttonContainer.createEl('button', { text: '取消编辑' });
    cancelButton.addEventListener('click', () => {
      this.close();
    });

    const copyButton = buttonContainer.createEl('button', { text: '复制公式' });
    copyButton.addEventListener('click', () => {
      const latex = input.value;
      navigator.clipboard.writeText(latex).then(() => {
        new Notice('公式已复制到剪贴板');
      });
    });

    const insertButton = buttonContainer.createEl('button', { text: '完成编辑' });
    insertButton.addEventListener('click', () => {
      const latex = input.value;
      this.result = latex;
      this.close();
    });

    // 添加样式
    this.addStyles();
  }

  renderLatex(preview, latex) {
    // 清空预览内容
    preview.empty();
    // 自动换行替换
    // latex = `${latex.replace(/\n/, '\\\\')}`;
    // 使用 Obsidian 的 Markdown 渲染功能，并用 $$包裹 LaTeX 公式，
    const wrappedLatex = `\$\$${latex}\$\$`;
    ea.obsidian.MarkdownRenderer.renderMarkdown(wrappedLatex, preview, '');
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    if (this.resolve) {
      this.resolve(this.result);
    }
  }

  // 添加一个静态方法来打开模态框并返回Promise
  static open(app, defaultLatex = '') {
    return new Promise((resolve) => {
      const modal = new LatexEditorModal(app, defaultLatex);
      modal.resolve = resolve;
      modal.open();
    });
  }

  addStyles() {
    //   const style = document.createElement('style');
    //   style.textContent = `      
    //   .modal-container:has(.excalidraw-latex-editor) {
    //     .latex-preview {
    //       border: 1px solid #ccc;
    //       padding: 10px;
    //       margin-bottom: 10px;
    //       background-color: #f9f9f9;
    //       color: black;
    //       border-radius: 4px;
    //       min-height: 80px;
    //       overflow: auto;
    //     }
    //     textarea {
    //       width: 100%;
    //       height: 100px;
    //       padding: 10px;
    //       box-sizing: border-box;
    //       border: 1px solid #ccc;
    //       border-radius: 4px;
    //       margin-bottom: 10px;
    //       font-family: monospace;
    //     }

    //     .button-container {
    //       display: flex;
    //       justify-content: space-between;
    //     }

    //     button {
    //       flex: 1;
    //       margin: 5px;
    //       padding: 10px;
    //       align-items: center;
    //       justify-content: center;
    //       border: none;
    //       border-radius: 4px;
    //       cursor: pointer;
    //       font-size: 16px;
    //     }

    //     button:hover {
    //       background-color: #0056b3;
    //     }
    //   }
    //   `;
    //   document.head.appendChild(style);
  }
}


await ea.addElementsToView();

// 获取笔记的基本路径
// const excalidrawPlugin = await app.plugins.plugins["obsidian-excalidraw-plugin"];
const imgEls = (ea.getViewSelectedElements().filter(el => el.type === "image"));
const el = imgEls[0];
let defaultLatex = "";
// 判断图片类型
let imgType = "insert";
if (el && !ea.plugin.filesMaster.get(el.fileId)) {
  // 获取latex的默认值
  // defaultLatex = excalidrawPlugin.equationsMaster.get(img.fileId);
  defaultLatex = await ea.targetView.excalidrawData.getEquation(el.fileId)?.latex;
  // console.table(ea.targetView.excalidrawData)
  imgType = defaultLatex ? "latex" : imgType;
}
console.log('公式类型为：', imgType);
// 打开模态框，并处理返回值
const result = await LatexEditorModal.open(app, defaultLatex);
console.log('用户输入的LaTeX公式:', result);
if (!result) return;

switch (imgType) {
  case "insert":
    await ea.addLaTex(null, null, result);
    // 等待500ms，方便插入公式位置
    await new Promise(resolve => setTimeout(resolve, 400));
    await ea.addElementsToView(true, false, false);
    break;
  case "latex":
    // await ea.copyViewElementsToEAforEditing([el]);
    await ea.targetView.excalidrawData.setEquation(el.fileId, {
      latex: result,
      isLoaded: false
    });
    // await ea.targetView.save(false);
    await ea.targetView.forceSave(true);
    // ea.addElementsToView(false, false);
    break;
  case "image":

    break;
}

