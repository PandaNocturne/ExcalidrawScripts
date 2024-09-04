分享下使用 Obsidian 一年多折腾 Excalidraw 时写的 Excalidraw 脚本片段，GitHub 仓库：[熊猫别熬夜的 Excalidraw 代码片段](https://github.com/PandaNocturne/ExcalidrawScripts)，

可通过 Excalidraw 插件的脚本代码块 (\`\`\`excalidraw-script-install) 来安装，里面放的是脚本 GitHub 的 RAW 链接，在 Obsidian 中会显示为按钮，脚本更新会自动检测，欢迎大家分享和反馈，脚本的详细介绍我都上传到 [PKMer](https://pkmer.cn/) 了。

![File-20240426045317569.png](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318704.png)

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
	- ![File-20240426045317691.gif](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318594.gif)

## 文档编辑

### QuickerInsertZKCard

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/QuickerInsertZKCard.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - 快速插入时间戳笔记](https://pkmer.cn/show/20231110162417)
- Description：快速插入或删除时间戳笔记
	- ![File-20240426045317669.gif](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318588.gif)
	- 选择或框选笔记后，再次运行脚本就可以删除本地笔记和画板元素了
		- ![File-20240426045317674.gif](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318045.gif)

### AddMermaidSvg

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/AddMermaidSvg.md
```

- Author：一鸣惊人
- PKMerDoc：[自定义 Excalidraw 脚本 - 插入可以编辑的 Mermaid 图形](https://pkmer.cn/show/20231207020538)
- Description：插入可以二次编辑的 Mermaid 矢量图
	- ![File-20240426045317716.gif](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318556.gif)
	- `Ctrl + 鼠标左键单击` 可以弹出源码：
		- ![File-20240426045317740.gif](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318560.gif)

### NumberMode

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/NumberMode.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - 双击添加圆圈编号](https://pkmer.cn/show/20240221010235)
- Description：编号模式，双击添加或编辑编号
	- ![File-20240426045317732.gif](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318109.gif)
		- ✅已启动编号模式，双击添加 num
		- ⏩双击 num 可以重新编辑编号
		- ⏹再次运行脚本即可退出编号模式

### AddTagsByModalForm

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/AddTagsByModalForm.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义Excalidraw脚本-给Excalidraw添加标签](https://pkmer.cn/show/20240428133002)
- Description：借助 Modal Form 插件的表单，给 Excalidraw 画板内的文本添加标签。
	- ![File-20240427040319310.gif](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318777.gif)

## 图片处理

### OpenSelectImage

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/OpenSelectImage.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - 默认应用打开图片](https://pkmer.cn/show/20231128000314)
- Description：设定默认或其他软件打开图片
	- 在 Excalidraw 插件设置里面可以设置参数，除了默认应用打开外，还可以自定义多个不同软件打开
	- ![File-20240426045317742.png](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318798.png)
	- ![File-20240426045317719.png](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318372.png)

> 这个非常好用，简单但实用

### TextExtractor

- [自定义 Excalidraw 脚本 - OCR 自动提取图片文字](https://pkmer.cn/show/20231115000252)

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/TextExtractor.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - OCR 自动提取图片文字](https://pkmer.cn/show/20231115000252)
- Description：使用 Text Extractor 插件或者本地 Paddleocr 模型批量识别画板中的图片到 Yaml 区，可编辑修改。
	- ![File-20240426045317644.gif](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318773.gif)
	- ![File-20240426045317675.png](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318218.png)
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
	- ![File-20240426045317709.gif](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318461.gif)

> 这个非常好用，简单但实用

### UploadImageToPicGo

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/UploadImageToPicGo.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - 上传画板中的图片到图床](https://pkmer.cn/show/20240221010558)
- Description：将 Excalidraw 画板中引用的图片直接上传到 PicGo 的 Server 后并删除本地文件 (可不删除)
	- ![File-20240426045317583.gif](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318200.gif)
	- ![File-20240426045310205.png](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318148.png)

### SaveSelectAsLocalePng

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/SaveSelectAsLocalePng.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - 将选中元素为 PNG 或者 SVG 格式文件到本地]( https://pkmer.cn/show/20240401215647 )
- Description：将选中的元素保存为 PNG 或者 SVG 格式本地文件，相当于网页版 Excalidraw 的导出仅选中图片。
	- ![File-20240401094628708.gif](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318639.gif)
	- Tip: 如果未选择元素则自动选中画板内全部元素，以及如果选中的是 Frame 框架，则自动选择 Frame 内部所有元素。
- ChangeLog：
	- 24.08.21：更新了UI
		- ![Excalidraw.md](https://cdn.pkmer.cn/images/202408281302056.png!pkmer)
	- 24.08.28：添加`Copy to Clipboard`和`Copy as Wiki`按钮，①将PNG(SVG不可行)图片复制剪切板；②将图片自动生成在ob的默认附件位置，并复制`![[filename]]`文本至剪切板。
	  相较于自带的`Copy to clipboard as PNG/SVG`，可随时调节PNG的缩放比例，调整清晰度。
		- ![Excalidraw.md](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202409041948886.png)

### RemoveBg

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/RemoveBg.md
```

- Author：熊猫别熬夜
- PKMerDoc：待写
- Description：采用[Remove.bg](https://www.remove.bg/zh/g/developers)的API来对Excalidraw中的图片进行抠图。
	- ![Excalidraw.md](https://cdn.pkmer.cn/images/202408281302659.png!pkmer)

## 画布演示

### playExcalidrawAnimation

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/playExcalidrawAnimation.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - 画板局部或者全局播放动画](https://pkmer.cn/show/20231108003544)
- Description：逐步显示 Excalidraw 画板的元素
	- ![File-20240426045317718.png](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318566.png)
	- ![File-20240426045317610.gif](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318922.gif)
	- ![File-20240426045317697.gif](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318597.gif)

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
			- ![File-20240426045317647.png](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318128.png)
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
	- ![File-20240426045317605.png](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318449.png)
- ChangeLog：
	- 2023-10-17：添加可以匹配 Zotero 标注颜色的设置
	- 2024-03-22：可以通过复制粘贴形式来添加

> Zotero 与 Obsidian 的 md 笔记的联动，参考 Quikcer 动作：
> - [ZoteroToObsidian - by 熊猫别熬夜 - 动作信息 - Quicker](https://getquicker.net/Sharedaction?code=b7727e44-4933-4ec5-8103-08dbc1cb1ea7)
> 	- ![File-20240426045317735.png](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318990.png)

### BookxnoteToExcalidraw

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/BookxnoteToExcalidraw.[]
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - 实现 Excalidraw 与 BookxNote 的联动](https://pkmer.cn/show/20231220152351)
- Description：联动 Bookxnote 与 Excalidraw
	- ![File-20240426045317727.gif](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318596.gif)

> Bookxnote pro 与 Obsidian 的 md 笔记的联动，参考 Quikcer 动作：
> - [BookxNoteToObsidian - by 熊猫别熬夜 - 动作信息 - Quicker](https://getquicker.net/Sharedaction?code=2bd5ec90-db36-49d4-51b3-08db7dd91f1a)
> 	- ![File-20240426045317566.png](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318200.png)

### EagleToExcalidraw

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/EagleToExcalidraw.md
```

- Author：熊猫别熬夜
- PKMerDoc：[自定义 Excalidraw 脚本 - 建立库外 Eagle 素材库的连接](https://pkmer.cn/show/20231014173618)
- Description：实现 Eagle 与 Excalidraw 的联动，可导入素材并定位到 Eagle 具体位置，暂时还没做发送 Excalidraw 的图片到 Eagle。
- ChangeLog：
	- 24.08.17
		- 可选中 Excalidraw 中局部元素发送到 Eagle
			- ![File-20240817110840973.png](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172318933.png)
		- 添加启动和关闭模式选项
			- ![File-20240817110929916.png](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172319366.png)
		- 从 Eagle 导入到 Excalidraw 的文件自动添加 `Eagle→Excalidraw` 标签

> Zotero 与 Eagle 的联动我也有一点尝试：
> - [ZoteroToEagle - by 熊猫别熬夜 - 动作信息 - Quicker](https://getquicker.net/Sharedaction?code=85b92307-2003-47bd-afea-08dc426a44c3)
> 	- ![File-20240426045317722.png](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172319867.png)


### ShareToEagle

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/PandaScripts/ShareToEagle.md
```

- Author：熊猫别熬夜
- Description：可选中 Excalidraw 中局部元素发送到 Eagle，已集合到EagleToExcalidraw脚本中，该脚本单独将此功能分离出来，导入Eagle里面的格式是SVG，可在官方Excalidraw中还原并二次编辑。
	- ![File-20240817110840973.png](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408181239889.png)
	- ![PixPin_2024-08-18_12-37-11.gif](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408181239290.gif)
	- ![PixPin_2024-08-18_12-37-40.gif](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408181239775.gif)

# 社区分享的脚本

## 统计选中图层字数 (Word Counter)

```excalidraw-script-install
https://raw.githubusercontent.com/wish5115/my-softs/main/Excalidraw/Words%20Counter.md
```

- Author: wilson
- ObsidianDoc: [Excalidraw脚本统计选中图层字数 - 经验分享 - Obsidian 中文论坛](https://forum-zh.obsidian.md/t/topic/36490/2)
- Description：选中要统计的图层，点击插件按钮”123“图标，即弹出统计通知
	- ![File-20240709110928305.png](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202408172319398.png)
	- 统计逻辑：一个英文单词算一个，一个中文文字算一个，一个空格或标点符号算一个。

# 测试性脚本

## CreateAndUpdateLinearNotes

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/TestScripts/CreateAndUpdateLinearNotes.md
```

- Author：熊猫别熬夜
- PKMerDoc：[PKMer_自定义 Excalidraw 脚本 - 制作 Excalidraw 悬浮大纲以及一键生成线型笔记]( https://pkmer.cn/show/20231029232811 )
- Description：将 Excalidraw 的画板内容制作线型笔记，一开始尝试添加特殊文本编号按大小排序来制作 Excalidraw 的悬浮大纲，后来通过特定的组和 Frame 区域来用于构建 Excalidraw 的连接：分 Frame、Group、Link 的连接形式一键制作线型笔记，并把嵌入的 Frame 笔记给嵌入到线型笔记中来，排除省略了只包含少量的元素的 Frame 或者 Group 让生成的线型笔记更加简洁。仅仅是一个尝试，不能保证大纲和线型笔记的效果达到非常完美，特别是排序只是从大到小的排序，而不是针对列表的顺序排序，存在很多漏洞。

## FrameMindmapLayout

```excalidraw-script-install
https://raw.githubusercontent.com/PandaNocturne/ExcalidrawScripts/master/TestScripts/FrameMindmapLayout.md
```

- Author：熊猫别熬夜
- Doc：无文档
- Description：
	- 设置了一个 frame 容器，当该 frame 的名称以 `mind` 结尾时，脚本会排列组合容器内连接的元素。
		- ![2024-02-23_自定义Excalidraw脚本-修改MindMap Format设置思维导图Frame容器.md](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202409042003683.gif)
	- 优化 Frame + 子节点自动布局：![2024-02-23_自定义Excalidraw脚本-修改MindMap Format设置思维导图Frame容器.md](https://raw.githubusercontent.com/PandaNocturne/ImageAssets/main/Obsidian/202409042004865.png)
		1. 选择父节点，自动排列子节点，用起来方便点，不过思维导图不打算咋用  
		2. 最主要的是第二个 Frame 导图，为了章节的递进，以及添加特殊名称入 Mind 后自动排版  
			1. 可以设立多个导图，主要用来表示 Frame 的递进关系
