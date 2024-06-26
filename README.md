---
uid: "20240318075141227"
---
分享下使用 Obsidian 一年多折腾 Excalidraw 时写的 Excalidraw 脚本片段，GitHub 仓库：[熊猫别熬夜的 Excalidraw 代码片段](https://github.com/PandaNocturne/ExcalidrawScripts)，

可通过 Excalidraw 插件的脚本代码块 (\`\`\`excalidraw-script-install) 来安装，里面放的是脚本 GitHub 的 RAW 链接，在 Obsidian 中会显示为按钮，脚本更新会自动检测，欢迎大家分享和反馈，脚本的详细介绍我都上传到 [PKMer](https://pkmer.cn/) 了。

![](./Assets/README_IMG-1.png)

````md
```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/README.md
```
````

> - Excalidraw 脚本的详细介绍：[Excalidraw 如何安装脚本 + 脚本设置介绍]( https://pkmer.cn/show/20231229194628 )
> - Excalidraw 脚本开发文档：[ExcalidrawPluginDocs](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/master/docs/readme.md)
> 	- [Excalidraw 脚本的基本配置]( https://pkmer.cn/show/20231110205703 )

---

脚本安装可以根据源码来安装，也可以通过 Excalidraw 插件提供的脚本安装代码块来安装

- 代码块链接方法：
	- 优点：一键安装脚本和图标，操作方便，后续脚本更新可以检测
	- 缺点：国内需要可访问 GitHub 的网络
- 源码拷贝方式：
	- 优点：不需要特殊网络
	- 缺点：需要手动复制源码，这个过程很容易出问题，没有图标，脚本更新无法检测…

> PS：之后我的脚本更新或者 BUG 修复，可能不会更新到网站，而是直接更新到 GitHub，因为这样对我来说比较方便点而且快速点。

# PandaScripts 脚本简单介绍

> [Obsidian 插件：Excalidraw 完美的绘图工具](https://pkmer.cn/show/20230329145825)

## 实用脚本

### QuickSwitchFrame

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/QuickSwitchFrame.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 -QuickSwitchFrame- 简单的 Frame 切换大纲](https://pkmer.cn/show/20240311180729)
- Description：提供一个 Frame 边框切换的提示框。
	- ![](./Assets/README_IMG-2.gif)

## 文档编辑

### QuickerInsertZKCard

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/QuickerInsertZKCard.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - 快速插入时间戳笔记](https://pkmer.cn/show/20231110162417)
- Description：快速插入或删除时间戳笔记
	- ![](900【素材】Assets/910_ObsidianImages/./Assets/README_IMG-3.png)
	- ![](./Assets/README_IMG-4.gif)
	- 选择或框选笔记后，再次运行脚本就可以删除本地笔记和画板元素了
		- ![](./Assets/README_IMG-5.gif)

### AddMermaidSvg

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/AddMermaidSvg.md
```

- Author：一鸣惊人
- PKMerDoc：[自定义 Excalidraw 脚本 - 插入可以编辑的 Mermaid 图形](https://pkmer.cn/show/20231207020538)
- Description：插入可以二次编辑的 Mermaid 矢量图
	- ![](./Assets/README_IMG-6.gif)
	- `Ctrl + 鼠标左键单击` 可以弹出源码：
		- ![](./Assets/README_IMG-7.gif)

### NumberMode

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/NumberMode.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - 双击添加圆圈编号](https://pkmer.cn/show/20240221010235)
- Description：编号模式，双击添加或编辑编号
	- ![](./Assets/README_IMG-8.gif)
		- ✅已启动编号模式，双击添加 num
		- ⏩双击 num 可以重新编辑编号
		- ⏹再次运行脚本即可退出编号模式

## 图片处理

### OpenSelectImage

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/OpenSelectImage.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - 默认应用打开图片](https://pkmer.cn/show/20231128000314)
- Description：设定默认或其他软件打开图片
	- 在 Excalidraw 插件设置里面可以设置参数，除了默认应用打开外，还可以自定义多个不同软件打开
	- ![](./Assets/README_IMG-9.png)
	- ![](./Assets/README_IMG-10.png)

> 这个非常好用，简单但实用

### TextExtractor

- [自定义 Excalidraw 脚本 - OCR 自动提取图片文字](https://pkmer.cn/show/20231115000252)

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/TextExtractor.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - OCR 自动提取图片文字](https://pkmer.cn/show/20231115000252)
- Description：使用 Text Extractor 插件或者本地 Paddleocr 模型批量识别画板中的图片到 Yaml 区，可编辑修改。
	- ![](./Assets/README_IMG-11.gif)
	- ![](./Assets/README_IMG-12.png)
- ChangeLog：
	- 2023-12-29：
		- 优化 OCR 识别文本的 Yaml 数据结构存储
		- 修复修改文本后不同步问题
	- 2024-03-02：
		- 添加当编辑 Frame 名称后，会将名称添加到 Yaml 的 aliases 属性中，方便通过别名来定位 Excalidraw 内的标题

### AdjustImageSize

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/AdjustImageSize.md
```

- Author：一鸣惊人，熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 -AdjustImageSize- 统一多个图片宽度或者高度](https://pkmer.cn/show/20240131140236)
- Description：用于调整多个图片 (image)、矩形框 (rectangle)、Frame 边框的大小，以选中的元素的最大宽度 (高度) 或者最小宽度 (高度) 进行统一缩放，分别有 `等宽缩放`、`等高缩放`、`完全相等` 这 3 个选项。
	- ![](./Assets/README_IMG-13.gif)

> 这个非常好用，简单但实用

### UploadImageToPicGo

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/UploadImageToPicGo.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - 上传画板中的图片到图床](https://pkmer.cn/show/20240221010558)
- Description：将 Excalidraw 画板中引用的图片直接上传到 PicGo 的 Server 后并删除本地文件 (可不删除)
	- ![](./Assets/README_IMG-14.gif)
	- ![](./Assets/README_IMG-15.png)

## 画布演示

### playExcalidrawAnimation

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/playExcalidrawAnimation.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - 画板局部或者全局播放动画](https://pkmer.cn/show/20231108003544)
- Description：逐步显示 Excalidraw 画板的元素
	- ![](./Assets/README_IMG-16.png)
	- ![](./Assets/README_IMG-17.gif)
	- ![](./Assets/README_IMG-18.gif)

### FrameKanban

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/FrameKanban.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - 画板与 Kanban 得梦幻结合 - 像 PPT 一样演示](https://pkmer.cn/show/20240122215722)
- Description：配合 Kanban 插件生成画板的 Frame 缩略图或者线型大纲
- ChangeLog：
	- 2024-03-02：
		- 添加缩略图是否添加连接选项，参数修改为中文注释
			- ![](./Assets/README_IMG-19.png)
		- 排序时会将 Frame 名称添加到文档的 aliases 区 (添加文档别名方便搜索)
	- 2024-03-06：
		- 当选中一个 Frame 时，不再弹出选项框，而是更新 frame 大纲 (无缩略图)
		- 添加设置 Kanban 宽度选项 ->可以随时调整宽度

> 推荐配合另一个脚本 QuickSwitchFrame 使用。

## 外部联用

### ZoteroToExcalidraw

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/ZoteroToExcalidraw.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本：实现 Zotero 与 Excalidraw 的拖拽联动](https://pkmer.cn/show/20230929013043)
- Description：实现 Zotero 标注文本或者图片通过拖拽或者复制粘贴的形式添加到 Excalidraw 画板中
	- ![](./Assets/README_IMG-20.png)
- ChangeLog：
	- 2023-10-17：添加可以匹配 Zotero 标注颜色的设置
	- 2024-03-22：可以通过复制粘贴形式来添加

> Zotero 与 Obsidian 的 md 笔记的联动，参考 Quikcer 动作：
> - [ZoteroToObsidian - by 熊猫别熬夜 - 动作信息 - Quicker](https://getquicker.net/Sharedaction?code=b7727e44-4933-4ec5-8103-08dbc1cb1ea7)
> 	- ![](./Assets/README_IMG-21.png)

### BookxnoteToExcalidraw

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/BookxnoteToExcalidraw.[]
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - 实现 Excalidraw 与 BookxNote 的联动](https://pkmer.cn/show/20231220152351)
- Description：联动 Bookxnote 与 Excalidraw
	- ![](./Assets/README_IMG-22.gif)

> Bookxnote pro 与 Obsidian 的 md 笔记的联动，参考 Quikcer 动作：
> - [BookxNoteToObsidian - by 熊猫别熬夜 - 动作信息 - Quicker](https://getquicker.net/Sharedaction?code=2bd5ec90-db36-49d4-51b3-08db7dd91f1a)
> 	- ![](./Assets/README_IMG-23.png)

### EagleToExcalidraw

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/EagleToExcalidraw.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - 建立库外 Eagle 素材库的连接](https://pkmer.cn/show/20231014173618)
- Description：实现 Eagle 与 Excalidraw 的联动，可导入素材并定位到 Eagle 具体位置，暂时还没做发送 Excalidraw 的图片到 Eagle。

> Zotero 与 Eagle 的联动我也有一点尝试：
> - [ZoteroToEagle - by 熊猫别熬夜 - 动作信息 - Quicker](https://getquicker.net/Sharedaction?code=85b92307-2003-47bd-afea-08dc426a44c3)
> 	- ![](./Assets/README_IMG-24.png)
