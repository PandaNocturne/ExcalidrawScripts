ea.targetView.svg(ea.targetView.getScene(true), undefined, true).then(svg => {
  let base64 = `data:image/svg+xml;base64,${btoa(
    unescape(encodeURIComponent(svg.outerHTML.replaceAll("&nbsp;", " "))),
  )}`;

  // 将SVG转换为PNG
  const img = new Image();
  img.src = base64;
  img.onload = function () {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    // 将PNG数据导出到本地文件
    canvas.toBlob(function (blob) {
      const date = window.moment().format("gggg-MM-DD_HHmmss");
      saveBlobToFile(blob, `Excalidraw-${date}.png`);
    });
  };
});

// 将Blob对象保存为文件
function saveBlobToFile(blob, fileName) {
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';
  const url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}