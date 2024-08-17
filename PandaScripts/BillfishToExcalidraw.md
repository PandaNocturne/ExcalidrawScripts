const path = require('path');
const fs = require("fs");

let api = ea.getExcalidrawAPI();
let el = ea.targetView.containerEl.querySelectorAll(".excalidraw-wrapper")[0];

el.ondrop = async function (event) {
    console.log("ondrop");
    event.preventDefault();
    if (event.dataTransfer.types.includes("Files")) {
        console.log("文件类型判断");
        for (let file of event.dataTransfer.files) {
            let directoryPath = file.path;
            console.log(directoryPath);
            if (directoryPath) {
                console.log("获取路径");
                // let file_name = directoryPath.match(/([^\\]+)\.(png|jpg|jpeg|html|mhtml|pdf|ppt|pptx)/i);
                let file_name = directoryPath.match(/([^\\]+)(\.[^\\]*)?$/i);
                if (file_name) {
                    file_name = file_name[0];
                    console.log(`file_name:${file_name}`);

                    // 让默认插入文本为文件名
                    let insert_txt = file_name;
                    let insert_link = insert_txt.replace(".png", "")

                    if (file_name.toLowerCase().endsWith(".png")) {
                        // 清空插入的环境变量
                        event.stopPropagation();
                        ea.clear();

                        ea.style.strokeStyle = "solid";
                        ea.style.backgroundColor = "#ffec99";
                        ea.style.fillStyle = 'solid';
                        ea.style.roughness = 0;
                        ea.style.roundness = { type: 3 };
                        ea.style.strokeWidth = 2;
                        ea.style.fontFamily = 4;
                        ea.style.fontSize = 20;

                        let id = await ea.addImage(0, 0, insert_txt);
                        let el = ea.getElement(id);

                        el.link = `[[${insert_link}]]`;

                        await ea.addElementsToView(true, false, false);
                        if (ea.targetView.draginfoDiv) {
                            document.body.removeChild(ea.targetView.draginfoDiv);
                            delete ea.targetView.draginfoDiv;
                        }
                    }

                }
            }
        }
    }
};
