class ArrangeImagesModal extends ea.obsidian.Modal {
constructor(app, onSubmit) {
super(app);
this.rowCount = 3;
this.colCount = 3;
this.spacingX = 20;
this.spacingY = 20;
this.total = 0;
this.onSubmit = onSubmit;
this.images = [];
this.previewLive = false;
this._previewTimer = null;
this._previewDebounceMs = 70;
}

    /** 取消待执行的防抖预览 */
    cancelPendingPreview() {
        if (this._previewTimer != null) {
            clearTimeout(this._previewTimer);
            this._previewTimer = null;
        }
    }

    /** 防抖：仅当「实时预览」开启时，调节参数才会更新画布 */
    schedulePreview() {
        if (!this.previewLive) return;
        this.cancelPendingPreview();
        this._previewTimer = window.setTimeout(() => {
            this._previewTimer = null;
            applyGridLayoutFromSelection({
                rowCount: this.rowCount,
                colCount: this.colCount,
                spacingX: this.spacingX,
                spacingY: this.spacingY,
            }).catch(() => {});
        }, this._previewDebounceMs);
    }

    /** 立即应用当前参数到画布（用于确定前刷新防抖队列） */
    async flushPreview() {
        this.cancelPendingPreview();
        await applyGridLayoutFromSelection({
            rowCount: this.rowCount,
            colCount: this.colCount,
            spacingX: this.spacingX,
            spacingY: this.spacingY,
        });
    }

    injectStyle() {
        if (document.getElementById("arrange-images-modal-style")) return;
        const style = document.createElement("style");
        style.id = "arrange-images-modal-style";
        style.textContent = `
    .arrange-images-modal {
    min-width: 300px;
    padding: 18px 18px 10px 18px;
    font-size: 15px;
    }
    .arrange-images-modal .modal-title {
    font-size: 1.25em;
    font-weight: bold;
    margin-bottom: 18px;
    text-align: center;
    letter-spacing: 1px;
    }
    .arrange-images-modal .modal-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 18px;
    }
    .arrange-images-modal .input-group {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 1 0 auto;
    gap: 10px;
    }
    .arrange-images-modal label {
    min-width: 90px;

    color: var(--text-normal);
    }
    .arrange-images-modal input[type="number"] {
    flex: 1;
    padding: 4px 8px;
    border-radius: 5px;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-secondary);
    color: var(--text-normal);
    font-size: 1em;
    }


    .arrange-images-modal .modal-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 8px;
    }
    .arrange-images-modal button {
    padding: 5px 18px;
    border-radius: 5px;
    border: none;
    font-size: 1em;
    cursor: pointer;
    background: var(--background-modifier-hover);
    color: var(--text-normal);
    transition: background 0.2s;
    }
    .arrange-images-modal button.mod-cta {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    font-weight: bold;
    }
    .arrange-images-modal button:hover {
    background: var(--background-modifier-active);
    }
    .arrange-images-modal .slider-value {
    min-width: 32px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    }
    .arrange-images-modal .slider-controls {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 4px;
    }
    .arrange-images-modal .slider-btn {
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 4px;
    background: var(--background-modifier-hover);
    color: var(--text-normal);
    font-size: 1.1em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: background 0.2s;
    }
    .arrange-images-modal .slider-btn:active {
    background: var(--background-modifier-active);
    }
    .arrange-images-modal .preview-toggle-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 10px 0 0 0;
    margin-top: 4px;
    border-top: 1px solid var(--background-modifier-border);
    }
    .arrange-images-modal .preview-toggle-row label {
    min-width: 0;
    flex: 0 1 auto;
    cursor: pointer;
    user-select: none;
    text-align: right;
    }
    .arrange-images-modal .preview-toggle-row input[type="checkbox"] {
    cursor: pointer;
    }
        `;
        document.head.appendChild(style);
    }

    async onOpen() {
        this.injectStyle();
        const { contentEl } = this;
        contentEl.addClass("arrange-images-modal");

        contentEl.createDiv({ text: "排列图片参数", cls: "modal-title" });

        // 获取选中图片数量
        await ea.addElementsToView();
        this.images = ea.getViewSelectedElements().filter(el => el.type === "image");
        this.total = this.images.length;
        if (this.total === 0) {
            contentEl.createDiv({ text: "未选中图片", cls: "mod-warning" });
            return;
        }

        // 默认行列
        this.rowCount = Math.max(1, Math.round(Math.sqrt(this.total)));
        this.colCount = Math.ceil(this.total / this.rowCount);

        const form = contentEl.createDiv({ cls: "modal-form" });

        // 行数滑条
        const rowDiv = form.createDiv({ cls: "input-group" });
        rowDiv.createEl("label", { text: "行数:", htmlFor: "rowCount" });
        const rowSliderControls = rowDiv.createDiv({ cls: "slider-controls" });
        const rowSlider = rowSliderControls.createEl("input", { type: "range", id: "rowCount", min: "1", max: this.total.toString() });
        rowSlider.style.flex = "2";
        const rowValue = rowSliderControls.createEl("span", { text: this.rowCount.toString(), cls: "slider-value" });
        const rowMinus = rowSliderControls.createEl("button", { text: "−", cls: "slider-btn", type: "button" });
        const rowPlus = rowSliderControls.createEl("button", { text: "+", cls: "slider-btn", type: "button" });

        // 列数滑条
        const colDiv = form.createDiv({ cls: "input-group" });
        colDiv.createEl("label", { text: "列数:", htmlFor: "colCount" });
        const colSliderControls = colDiv.createDiv({ cls: "slider-controls" });
        const colSlider = colSliderControls.createEl("input", { type: "range", id: "colCount", min: "1", max: this.total.toString() });
        colSlider.style.flex = "2";
        const colValue = colSliderControls.createEl("span", { text: this.colCount.toString(), cls: "slider-value" });
        const colMinus = colSliderControls.createEl("button", { text: "−", cls: "slider-btn", type: "button" });
        const colPlus = colSliderControls.createEl("button", { text: "+", cls: "slider-btn", type: "button" });

        // 初始化滑条的 value
        rowSlider.value = this.rowCount.toString();
        rowValue.innerText = this.rowCount.toString();
        colSlider.value = this.colCount.toString();
        colValue.innerText = this.colCount.toString();

        let updating = false;
        const updateRowSlider = (val) => {
            if (updating) return;
            updating = true;
            this.rowCount = Math.max(1, Math.min(this.total, val));
            this.colCount = Math.ceil(this.total / this.rowCount);
            if (this.colCount > this.total) this.colCount = this.total;
            if (this.colCount < 1) this.colCount = 1;
            rowSlider.value = this.rowCount.toString();
            rowValue.innerText = this.rowCount.toString();
            colSlider.value = this.colCount.toString();
            colValue.innerText = this.colCount.toString();
            updating = false;
            this.schedulePreview();
        };
        const updateColSlider = (val) => {
            if (updating) return;
            updating = true;
            this.colCount = Math.max(1, Math.min(this.total, val));
            this.rowCount = Math.ceil(this.total / this.colCount);
            if (this.rowCount > this.total) this.rowCount = this.total;
            if (this.rowCount < 1) this.rowCount = 1;
            colSlider.value = this.colCount.toString();
            colValue.innerText = this.colCount.toString();
            rowSlider.value = this.rowCount.toString();
            rowValue.innerText = this.rowCount.toString();
            updating = false;
            this.schedulePreview();
        };

        rowSlider.max = Math.ceil(this.total).toString();
        rowSlider.min = "1";
        colSlider.max = Math.ceil(this.total).toString();
        colSlider.min = "1";

        rowSlider.addEventListener("input", (evt) => {
            const v = parseInt(evt.target.value, 10);
            if (!isNaN(v)) updateRowSlider(v);
        });
        colSlider.addEventListener("input", (evt) => {
            const v = parseInt(evt.target.value, 10);
            if (!isNaN(v)) updateColSlider(v);
        });

        rowMinus.addEventListener("click", () => {
            updateRowSlider(Math.max(1, this.rowCount - 1));
        });
        rowPlus.addEventListener("click", () => {
            updateRowSlider(Math.min(this.total, this.rowCount + 1));
        });
        colMinus.addEventListener("click", () => {
            updateColSlider(Math.max(1, this.colCount - 1));
        });
        colPlus.addEventListener("click", () => {
            updateColSlider(Math.min(this.total, this.colCount + 1));
        });

        // 水平间距
        const spacingXDiv = form.createDiv({ cls: "input-group" });
        spacingXDiv.createEl("label", { text: "水平间距:", htmlFor: "spacingX" });
        const spacingXInput = spacingXDiv.createEl("input", { type: "number", id: "spacingX", value: this.spacingX.toString() });
        spacingXInput.style.width = "80px";
        const syncSpacingX = () => {
            const v = parseInt(spacingXInput.value, 10);
            if (!isNaN(v)) this.spacingX = v;
        };
        const syncSpacingY = () => {
            const v = parseInt(spacingYInput.value, 10);
            if (!isNaN(v)) this.spacingY = v;
        };
        spacingXInput.addEventListener("input", () => {
            syncSpacingX();
            this.schedulePreview();
        });
        spacingXInput.addEventListener("change", () => {
            syncSpacingX();
            this.schedulePreview();
        });

        // 垂直间距
        const spacingYDiv = form.createDiv({ cls: "input-group" });
        spacingYDiv.createEl("label", { text: "垂直间距:", htmlFor: "spacingY" });
        const spacingYInput = spacingYDiv.createEl("input", { type: "number", id: "spacingY", value: this.spacingY.toString() });
        spacingYInput.style.width = "80px";
        spacingYInput.addEventListener("input", () => {
            syncSpacingY();
            this.schedulePreview();
        });
        spacingYInput.addEventListener("change", () => {
            syncSpacingY();
            this.schedulePreview();
        });

        const previewRow = form.createDiv({ cls: "preview-toggle-row" });
        previewRow.createEl("label", { text: "实时预览（开启后拖动参数会更新画布）", htmlFor: "arrange-img-preview-live" });
        const previewCb = previewRow.createEl("input", { type: "checkbox", id: "arrange-img-preview-live" });
        previewCb.addEventListener("change", () => {
            this.previewLive = previewCb.checked;
            if (this.previewLive) {
                this.cancelPendingPreview();
                applyGridLayoutFromSelection({
                    rowCount: this.rowCount,
                    colCount: this.colCount,
                    spacingX: this.spacingX,
                    spacingY: this.spacingY,
                }).catch(() => {});
            } else {
                this.cancelPendingPreview();
            }
        });

        // 按钮组
        const buttonGroup = contentEl.createDiv({ cls: "modal-buttons" });
        const closeButton = buttonGroup.createEl("button", { text: "关闭" });
        closeButton.addEventListener("click", () => {
            this.close();
        });

        const arrangeButton = buttonGroup.createEl("button", { text: "排列图片", cls: "mod-cta" });
        arrangeButton.addEventListener("click", async () => {
            syncSpacingX();
            syncSpacingY();
            if (
                isNaN(this.rowCount) || isNaN(this.colCount) ||
                isNaN(this.spacingX) || isNaN(this.spacingY) ||
                this.rowCount < 1 || this.colCount < 1 ||
                this.rowCount > this.total || this.colCount > this.total
            ) {
                new Notice("请输入有效的数字参数。");
                return;
            }
            const r = await this.flushPreview();
            if (!r.ok) {
                new Notice("未选中图片");
                return;
            }
            this.close();
            if (this.onSubmit) {
                this.onSubmit({
                    rowCount: this.rowCount,
                    colCount: this.colCount,
                    spacingX: this.spacingX,
                    spacingY: this.spacingY,
                    total: this.total
                });
            }
        });
    }

    onClose() {
        this.cancelPendingPreview();
        const { contentEl } = this;
        contentEl.empty();
        contentEl.removeClass("arrange-images-modal");
    }

}

/\*_ 将当前选中图片按网格写入画布；预览与最终排列共用 _/
async function applyGridLayoutFromSelection({ rowCount, colCount, spacingX, spacingY }) {
await ea.addElementsToView();
const images = ea.getViewSelectedElements().filter(el => el.type === "image");
if (images.length === 0) {
return { ok: false, n: 0 };
}

    let maxWidth = 0, maxHeight = 0;
    for (const img of images) {
        if (img.width > maxWidth) maxWidth = img.width;
        if (img.height > maxHeight) maxHeight = img.height;
    }

    let minX = Infinity, minY = Infinity;
    for (const img of images) {
        if (img.x < minX) minX = img.x;
        if (img.y < minY) minY = img.y;
    }

    const sortedImages = [...images].sort((a, b) => {
        if (Math.abs(a.y - b.y) > 10) {
            return a.y - b.y;
        }
        return a.x - b.x;
    });

    for (let idx = 0; idx < sortedImages.length; idx++) {
        const row = Math.floor(idx / colCount);
        const col = idx % colCount;
        const x = minX + col * (maxWidth + spacingX);
        const y = minY + row * (maxHeight + spacingY);
        sortedImages[idx].x = x;
        sortedImages[idx].y = y;
    }

    await ea.copyViewElementsToEAforEditing(sortedImages);
    await ea.addElementsToView(false, false);
    return { ok: true, n: sortedImages.length };

}

// 画布在弹窗内可能已通过「实时预览」更新；此处仅作完成提示
function arrangeImages({ rowCount, colCount, spacingX, spacingY, total }) {
new Notice(`✅已排列${total}张图片（${rowCount}行 × ${colCount}列）`);
}

new ArrangeImagesModal(app, arrangeImages).open();
