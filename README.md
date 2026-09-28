# AGI 时代下，人类如何生活？

![AGI 时代下，人类如何生活？假如整个社会是一栋楼](assets/share.png)

共同未来 · 一次 10 分钟的互动推演：假如整个社会是一栋楼，AI 越来越能干以后，这栋楼会发生什么，我们还有哪些选择。手机上每一章都是一屏，滑到就自动演示，想自己玩可以点“自己试试”。

中文和英文是两个独立的网站，各有自己的互动页、研究报告和短片。

| | 中文网站 | English site |
| --- | --- | --- |
| 网址 | https://lisiyuan-cosmoli.github.io/agi-era/ | https://lisiyuan-cosmoli.github.io/agi-era/en/ |
| 互动页 | `index.html` | `en/index.html` |
| 研究报告 | `report/index.html` | `en/report/index.html` |
| 90 秒短片 | `assets/short.mp4` | `en/assets/short.mp4` |
| 分享卡片 | `assets/share.png` | `en/assets/share.png` |

本地打开：双击 `index.html` 或 `en/index.html`，不需要联网、账户或安装任何东西。

## English

*How Will Humans Live in the Age of AGI?* is a 10-minute interactive story that imagines society as one apartment building with 12 households and a little diner, and asks what happens as AI gets more capable. The English site lives at https://lisiyuan-cosmoli.github.io/agi-era/en/, with its own research report (29 sourced references) and a 90-second vertical film.

## 内容

- 互动推演：把整个社会比作一栋住着 12 户人家的楼，共八章：节点、AI 敲门、连锁反应、钱怎么转、四种未来、各方能做什么、更远的未来、轮到你。英文版的 12 户人家用的是来自不同地方的名字，职业和工作内容与中文版一一对应。
- 研究报告：和互动页的八章一一对应，每章写清结论、证据、还不知道的问题，以及出现什么信号就要改判断。所有数字都注明出处，共 29 条参考资料，资料截至 2026 年 9 月。Markdown 原文是 `report/report.zh.md` 和 `report/report.en.md`。
- 短片：竖屏 1080×1920，约 90 秒，带配乐，适合发到 X 等社交平台。互动页上点“看 90 秒短片”可以直接播放和下载。
- `essay/开放演化的共生文明.md`：关于智能、主体与共同未来的长文，第 07 章由此而来。

## 修改与构建

- `source/story/`：互动页的源文件。`story.html` 和 `story.en.html` 是中英文页面，`strings.zh.json` 和 `strings.en.json` 是脚本里用到的文字，两个页面共用 `story.css` 和 `story.js`。
- `report/report.zh.md`、`report/report.en.md`：报告正文。`source/report/` 是报告页面的样式和脚本。
- `source/video/`：短片的源文件。`short.html` 按时间画出每一帧，配乐也在里面用代码合成；`short.html?lang=en` 是英文版。`render.js` 逐帧渲染成 MP4，需要 Node.js、Playwright 和 ffmpeg：在该目录执行 `npm install`，再运行 `npm run render`（中文）或 `npm run render:en`（英文）。
- `tools/`：构建脚本和分享卡片的源文件（`share-card.html`、`share-card.en.html`，按 1200×630 截图）。
- 修改网页或报告后，在仓库根目录执行：

```sh
python3 build.py
```

网页和报告的构建只用 Python 标准库，运行时不联网。构建会检查：中英文页面的结构一致，文字表一一对应；报告的每个引用编号都有出处，每条参考资料都被引用，两版的参考资料数量一致。修改内容时，中英两版要一起改。

## 发布到 GitHub Pages

仓库设置 → Pages → Build and deployment，选择 “Deploy from a branch”，分支选 `main`，目录选 `/ (root)`。根目录已有 `.nojekyll`，文件会按原样发布。旧的英文报告地址 `report/en.html` 会自动跳转到 `en/report/`。

## 分享到 X 等社交平台

两个网站各有自己的分享卡片。卡片图片用的是完整网址，默认指向上面的 GitHub Pages 地址。如果换了网址，用新网址重新构建：

```sh
SITE_URL=https://新网址/ python3 build.py
```

## 内容边界

- 图都是示意，不是预测，也没有虚构数据或概率。
- 报告只用公开、可查证的资料；属于推理而不是数据的地方，文中写明了。
- AI 能力持续增长是推演的前提。AGI／ASI 的到来时间、AI 是否具有主体性、未来会走向哪种结果，都没有写成确定的事实。
- 页面不追踪读者，也不从其他网站加载任何东西。互动页只在读者自己的浏览器里记住所选的年份和“哪一户是你”。

## 许可

- 代码（HTML 结构、CSS、JavaScript、Python 构建脚本、短片的渲染代码）：MIT，见 `LICENSE`。
- 文字、图像和短片（互动页文案与插图、研究报告、长文、分享卡片、短片的画面与配乐）：CC BY 4.0，见 `LICENSE-CONTENT.md`。转载或改编时，请注明出处“共同未来 / Futures We Share”并附上仓库链接。
