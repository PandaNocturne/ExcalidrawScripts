// 获取Excalidraw API和容器元素
const api = ea.getExcalidrawAPI();
const container = ea.targetView.containerEl.querySelector(".excalidraw-wrapper");

// 创建缩略图容器
const thumbnailContainer = document.createElement("div");
thumbnailContainer.style.position = "absolute";
thumbnailContainer.style.bottom = "20px";
thumbnailContainer.style.right = "20px";
thumbnailContainer.style.width = "200px";
thumbnailContainer.style.height = "150px";
thumbnailContainer.style.border = "2px solid #ccc";
thumbnailContainer.style.borderRadius = "8px";
thumbnailContainer.style.overflow = "hidden";
thumbnailContainer.style.backgroundColor = "white";
thumbnailContainer.style.zIndex = "1000";
thumbnailContainer.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";

// 创建缩略图元素
const thumbnail = document.createElement("img");
thumbnail.style.width = "100%";
thumbnail.style.height = "100%";
thumbnail.style.objectFit = "contain";

// 创建红色边框覆盖层
const overlay = document.createElement("div");
overlay.style.position = "absolute";
overlay.style.top = "0";
overlay.style.left = "0";
overlay.style.width = "100%";
overlay.style.height = "100%";
overlay.style.border = "2px solid red";
overlay.style.pointerEvents = "none";
overlay.style.boxSizing = "border-box";

// 将元素添加到容器中
thumbnailContainer.appendChild(thumbnail);
thumbnailContainer.appendChild(overlay);
container.appendChild(thumbnailContainer);

// 更新缩略图的函数
async function updateThumbnail() {
    // 获取当前场景的SVG
    const svg = await ea.targetView.svg(ea.targetView.getScene(true), undefined, false);

    // 转换为base64
    const base64 = `data:image/svg+xml;base64,${btoa(
        unescape(encodeURIComponent(svg.outerHTML))
    )}`;

    // 更新缩略图
    thumbnail.src = base64;
}

// 初始更新缩略图
updateThumbnail();

// 监听场景变化并更新缩略图
api.on("change", updateThumbnail);

// 监听视图变化并更新缩略图
api.on("scroll", updateThumbnail);
api.on("zoom", updateThumbnail);

// 添加点击缩略图跳转到对应位置的功能
thumbnailContainer.addEventListener("click", (e) => {
    const rect = thumbnailContainer.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const scene = api.getScene();
    const viewport = api.getViewport();

    const targetX = scene.width * x - viewport.width / 2;
    const targetY = scene.height * y - viewport.height / 2;

    api.scrollTo(targetX, targetY);
}); 