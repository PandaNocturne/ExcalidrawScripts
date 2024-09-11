class PKMerExcalidrawScriptMarket extends ea.obsidian.Modal {
  constructor(app, defaultUrls) {
    super(app);
    this.defaultUrls = defaultUrls;
  }

  async onOpen() {
    const { contentEl } = this;
    // 添加URL表单并固定在顶部    
    const formContainer = contentEl.createEl('div', { cls: 'excalidraw-script-form-container' });
    const formEl = formContainer.createEl('form', { cls: 'excalidraw-script-url-form' });
    const selectEl = formEl.createEl('select', { cls: 'excalidraw-script-url-select' });
    const inputEl = formEl.createEl('input', { type: 'text', cls: 'excalidraw-script-url', placeholder: 'URL' });

    const editorButtonEl = formEl.createEl('button', { type: 'button', text: '📝Editor' });
    const submitButtonEl = formEl.createEl('button', { type: 'submit', text: '🔄Reload' });
    const closeButtonEl = formEl.createEl('button', { type: 'button', cls: "excalidraw-script-container-colse", text: '❌' });

    // 关闭按钮点击事件
    closeButtonEl.addEventListener('click', () => {
      this.close();
    });

    // 填充下拉菜单
    this.defaultUrls.forEach(item => {
      selectEl.createEl('option', { text: `🌐${item.name}`, value: item.url });
    });

    // 下拉菜单选择事件
    selectEl.addEventListener('change', async () => {
      inputEl.value = selectEl.value;
      await this.loadDocument(inputEl.value);
    });

    formEl.addEventListener('submit', async (event) => {
      event.preventDefault();
      const url = inputEl.value;
      await this.loadDocument(url);
    });



    // Editor 按钮点击事件
    editorButtonEl.addEventListener('click', async () => {
      const defaultUrls = this.defaultUrls.map(item => `${item.name}|${item.url}`).join('\n');
      const input = await utils.inputPrompt(
        '请编辑URL，格式为：名称|URL',
        '',
        defaultUrls,
        [],
        10,
        false
      );
      const newUrls = input.split('\n').map(line => {
        const [name, url] = line.split('|');
        return { name, url };
      });
      this.defaultUrls = newUrls;
      settings["Scipts URLs"].value = newUrls;
      ea.setScriptSettings(settings);

      // 更新下拉菜单
      selectEl.innerHTML = ''; // 清空现有选项
      this.defaultUrls.forEach(item => {
        selectEl.createEl('option', { text: `🌐${item.name}`, value: item.url });
      });
    });

    // 添加样式
    this.addStyles();
    // 初始加载默认文档
    inputEl.value = this.defaultUrls[0].url || "";
    await this.loadDocument(inputEl.value, true);
  }

  async loadDocument(url) {
    const { contentEl } = this;

    // 清空现有文档内容
    const existingDocContainer = contentEl.querySelector('.doc-container');
    if (existingDocContainer) {
      existingDocContainer.remove();
    }

    // 添加显示文档内容的容器
    const docContainer = contentEl.createEl('div', { cls: 'doc-container excalidraw-script-market' });


    // 获取并显示文档内容
    const docContent = await this.fetchDocumentContent(url);

    // 使用 Obsidian 的 Markdown 渲染功能
    ea.obsidian.MarkdownRenderer.renderMarkdown(docContent, docContainer, '', this);
    // 添加折叠功能
    this.addCollapseFunctionality(docContainer);
  }
  addCollapseFunctionality(container) {
    const headers = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headerStack = [];

    headers.forEach(header => {
      const level = parseInt(header.tagName[1]);
      const content = document.createElement('div');
      let sibling = header.nextElementSibling;

      while (sibling && (!/^H[1-6]$/.test(sibling.tagName) || parseInt(sibling.tagName[1]) > level)) {
        const nextSibling = sibling.nextElementSibling;
        content.appendChild(sibling);
        sibling = nextSibling;
      }

      // 默认折叠 h2 及以下的标题
      if (level >= 2) {
        content.style.display = 'none';
        header.classList.add('collapsed');
      }

      header.style.cursor = 'pointer';
      header.classList.add('collapsible-header');
      header.addEventListener('click', () => {
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
        header.classList.toggle('collapsed');
      });

      if (headerStack.length > 0) {
        const lastHeader = headerStack[headerStack.length - 1];
        const lastLevel = parseInt(lastHeader.tagName[1]);

        if (level > lastLevel) {
          lastHeader.nextElementSibling.appendChild(header);
          lastHeader.nextElementSibling.appendChild(content);
        } else {
          while (headerStack.length > 0 && parseInt(headerStack[headerStack.length - 1].tagName[1]) >= level) {
            headerStack.pop();
          }
          if (headerStack.length > 0) {
            headerStack[headerStack.length - 1].nextElementSibling.appendChild(header);
            headerStack[headerStack.length - 1].nextElementSibling.appendChild(content);
          } else {
            container.appendChild(header);
            container.appendChild(content);
          }
        }
      } else {
        container.appendChild(header);
        container.appendChild(content);
      }

      headerStack.push(header);
    });
  }
  async fetchDocumentContent(url) {
    try {
      let response;
      if (url.includes('github.com')) {
        // 将 GitHub URL 转换为 raw URL
        url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
      }
      response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      const text = await response.text();
      return text;
    } catch (error) {
      console.error('Failed to fetch document:', error);
      return '# 无法加载文档内容';
    }
  }
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
    div.modal:has(.excalidraw-script-market) {
      width: 900px;
      position: relative;

      img {
        &:not(.link-favicon) {
          width: 100%;
        }

        &.coffee {
          width: 10em;
        }

        &[src*=".svg"] {
          width: 2em;
        }
      }


      .excalidraw-script-form-container {
        padding-bottom: 10px;
        border-bottom: 2px solid var(--interactive-accent);

        .excalidraw-script-url-form {
          display: flex;
          width: 100%;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;

          &>*:not(:last-child) {
            margin-right: 10px;
          }

          .excalidraw-script-url {
            flex: 0.8 1 600px;
          }

          .excalidraw-script-container-colse {
            flex: 0.1 1 10px;
          }

          button {
            flex: 0.2 1 100px;
          }
        }
      }

      .modal-close-button,
      button.copy-code-button {
        display: none;
      }

      .doc-container {
        overflow: auto;
        height: 800px;
        user-select: text;
        a {
          cursor: pointer;
        }
        img {
          cursor: zoom-in;
        }
      }

      .collapsible-header {
        position: relative;
      }

      .collapsible-header::after {
        content: '◀';
        position: absolute;
        right: 10px;
        font-size: 0.8em;
        transform: rotate(0deg);
        transition: transform 0.3s ease;
      }

      .collapsible-header.collapsed::after {
        transform: rotate(-90deg);
      }
    }

    .doc-container.excalidraw-script-market {
      --h1-color: #ff8a78;
      --h2-color: #fabe58;
    }
    `;
    document.head.appendChild(style);
  }
  onClose() {
    // 移除动态添加的样式
    const style = document.querySelector('style.excalidraw-script-market');
    if (style) {
      style.remove();
    }
  }
}

let settings = ea.getScriptSettings();
if (!settings["Scipts URLs"]) {
  settings = {
    "Scipts URLs": {
      value: [
        { name: 'PandaScripts', url: 'https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/README.md' },
        // 你可以在这里添加更多默认的URL
        { name: 'ExcalidrawScript', url: 'https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/master/ea-scripts/index-new.md' },
      ],
      hide: true,
    },
  };
  ea.setScriptSettings(settings);
}
// 使用示例
const URLs = settings["Scipts URLs"].value;
const modal = new PKMerExcalidrawScriptMarket(app, URLs);
await modal.open();