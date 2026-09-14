# ai-reset-alert

[![Windows build](https://github.com/waterbrother666/ai-reset-alert/actions/workflows/windows-build.yml/badge.svg)](https://github.com/waterbrother666/ai-reset-alert/actions/workflows/windows-build.yml)
[![macOS build](https://github.com/waterbrother666/ai-reset-alert/actions/workflows/macos-build.yml/badge.svg)](https://github.com/waterbrother666/ai-reset-alert/actions/workflows/macos-build.yml)
[![License](https://img.shields.io/github/license/waterbrother666/ai-reset-alert)](LICENSE)

`ai-reset-alert` 用来查看 Tibo（[@thsottiaux](https://x.com/thsottiaux)）公开发布的
OpenAI Codex 额度重置消息。它提供可直接使用的网页界面，也可以作为 Windows 或
macOS 桌面应用在后台运行，并在发现新的重置事件时发送系统通知。

> 本项目是社区开源工具，与 OpenAI、X 或 Tibo 没有官方关联。显示内容来自公开数据，
> 具体额度和重置规则请以 OpenAI 官方说明为准。

## 功能

- 查看最新的 Codex 重置信号和 Tibo 原帖内容
- 浏览历史记录，按“全员重置”或“重置卡”筛选
- 使用最近 27 周的活动方格查看每天的重置次数
- 点击有记录的日期，在弹窗中查看当天全部帖子
- 每 5 分钟检查一次 AIHOT 接口，也支持手动立即检查
- Windows 和 macOS 原生系统通知
- 通知状态显示为“已通知”或“未通知”
- 桌面应用关闭窗口后继续在托盘或菜单栏运行
- 跟随系统代理访问数据接口
- Windows x64、macOS Intel x64 和 Apple Silicon arm64 构建

## 直接使用网页端

安装 [Node.js 22 或更新版本](https://nodejs.org/) 后运行：

```bash
git clone https://github.com/waterbrother666/ai-reset-alert.git
cd ai-reset-alert
npm install
npm run dev
```

打开终端显示的本地地址。网页端会读取真实 AIHOT 数据，但浏览器不会发送桌面应用的
系统通知，因此网页记录会显示为“未通知”。

生产构建和本地预览：

```bash
npm run build
npm run preview
```

构建结果位于 `dist/`，可以部署到任意静态网站托管服务。

## 安装桌面应用

在仓库的 [Actions 页面](https://github.com/waterbrother666/ai-reset-alert/actions)打开最新成功的
对应系统构建，在页面底部下载 Artifact 并解压。

| 系统 | 下载的 Artifact | 建议安装文件 |
| --- | --- | --- |
| Windows 10/11 x64 | `ai-reset-alert-Windows-x64` | `.exe` NSIS 安装程序 |
| Apple Silicon Mac（M1/M2/M3/M4） | `ai-reset-alert-macOS-arm64` | `.dmg` |
| Intel Mac | `ai-reset-alert-macOS-x64` | `.dmg` |

### Windows

运行 `.exe` 并按安装向导完成安装。当前公开构建没有商业代码签名，Windows SmartScreen
可能显示“未知发布者”，请在确认文件来自本仓库后选择继续运行。

启动后可以关闭主窗口，应用仍会留在系统托盘并继续检查。左键点击托盘图标可重新打开
窗口，右键点击可立即检查、暂停监控或退出。

### macOS

打开 `.dmg`，将 `ai-reset-alert` 拖入“应用程序”。当前公开构建尚未经过 Apple Developer
签名和公证。如果首次启动被 Gatekeeper 拦截，请在 Finder 的“应用程序”中右键点击应用，
选择“打开”，然后再次确认。

应用运行后会留在菜单栏。点击 Dock 图标或左键点击菜单栏图标可以重新打开窗口；右键点击
菜单栏图标可立即检查、暂停监控或退出。

## 通知如何工作

桌面应用启动后每 5 分钟请求一次数据。以下情况会进入通知流程：

1. 首次成功同步只建立本地基线，不补发已有历史事件。
2. 后续出现新的重置事件时发送通知。
3. 已有事件从“预告”变为“确认”时可以再次通知。
4. 普通文字或时间修正只更新本地记录，不重复通知。
5. 系统通知成功交给操作系统后，记录显示“已通知”；尚未发送或发送失败时显示“未通知”。

若要稳定收到通知，请保持应用在托盘或菜单栏运行，并在系统设置中允许
`ai-reset-alert` 显示通知。当前版本没有开机自动启动功能，电脑重启后需要手动打开应用。

## 数据来源

项目使用 AIHOT 提供的公开接口：

```text
https://aihot.news/api/v1/codex-resets
```

接口返回的是 AIHOT 整理过的 Tibo 重置事件，不是完整的 X 时间线。客户端支持 `ETag`
和 `If-None-Match`，数据未变化时服务端可以返回 `304`，减少重复传输。公开部署或商业使用
前，请自行确认并遵守 AIHOT 的接口授权要求。

桌面端通过 Electron 网络层访问接口，因此会使用操作系统配置的代理。项目不要求 X Cookie、
账号密码或 API Key，也不包含遥测上报。桌面历史记录和通知状态保存在本机 SQLite 数据库中。

## 桌面端开发

桌面应用复用仓库根目录的 React 页面。首次开发需要分别安装网页端与 Electron 端依赖：

```bash
npm install
cd desktop
npm install
npm run dev
```

常用命令：

```bash
# 在 desktop/ 目录执行
npm run typecheck
npm test
npm run build
```

Windows x64 打包：

```powershell
npm run build
npm run rebuild:electron
npx electron-builder --win nsis --x64
```

macOS 当前架构打包（把 `<arch>` 替换为 `arm64` 或 `x64`）：

```bash
npm run build
npx electron-rebuild -f -w better-sqlite3 -a <arch>
npx electron-builder --mac dmg zip --<arch>
```

安装包输出到 `desktop/release/`。`better-sqlite3` 是原生模块，运行单元测试后如果需要启动
Electron 或打包，必须先使用 `electron-rebuild` 为 Electron ABI 重新构建。

## 项目结构

```text
.
├── src/                         React 页面、数据转换和浏览器 API
├── public/                      网页静态资源
├── desktop/
│   ├── src/main/                Electron 生命周期、托盘、通知和调度
│   ├── src/preload/             安全的渲染层桥接
│   ├── src/monitor/             AIHOT 请求、事件同步和 SQLite 存储
│   ├── resources/               Windows/macOS 应用与托盘图标
│   └── tests/                   监控与桌面层测试
└── .github/workflows/           Windows 和 macOS 自动构建
```

## 常见问题

**为什么第一次启动没有弹出历史通知？**

第一次同步会静默建立基线，避免把接口中所有旧记录当成新事件。之后新增或确认的事件才会通知。

**为什么显示“未通知”？**

网页端不会发送系统通知。桌面端还可能因为首次基线、通知权限关闭、应用未运行或发送失败而显示
“未通知”。

**为什么另一台电脑没有收到通知？**

每台电脑都需要单独安装并启动应用，允许系统通知，并确保网络或代理能够访问 `aihot.news`。

**应用多久检查一次？**

后台默认每 5 分钟检查一次，因此新事件通常会在接口更新后的 0～5 分钟内被发现。

**应用会自动更新吗？**

当前版本尚未接入自动更新。新版本发布后需要重新下载安装包覆盖安装，本地历史数据库会继续保留。

## 参与贡献

欢迎通过 Issue 报告问题或提出功能建议。提交代码前请：

1. 从 `main` 创建一个范围清晰的分支。
2. 一个 PR 只解决一个模块或问题。
3. 运行根目录 `npm run build`。
4. 涉及桌面端时，在 `desktop/` 运行 `npm run typecheck` 和 `npm test`。
5. 在 PR 中说明变更行为、验证结果以及影响的平台。

请勿提交 Cookie、API Key、签名证书或其他密钥。

## License

本项目使用 [MIT License](LICENSE)。
