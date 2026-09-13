# ai-reset-alert

用于查看 Tibo（[@thsottiaux](https://x.com/thsottiaux)）发布的 Codex
额度重置消息。网页展示最新消息、历史记录和最近 27 周的重置日历。

## 本地运行

需要 Node.js 20 或更新版本。

```bash
npm install
npm run dev
```

访问终端输出的本地地址即可。生产构建：

```bash
npm run build
npm run preview
```

## 数据来源

网页每 5 分钟请求一次 AIHOT 的公开接口：

```text
https://aihot.news/api/v1/codex-resets
```

页面首次打开、重新回到前台以及点击“立即检查”时也会请求。客户端使用
`ETag` 和 `If-None-Match`，数据没有更新时接口可返回 `304`。

接口提供的是 AIHOT 整理的 Tibo 重置事件，不是完整的 X 时间线。商业公开产品
使用该接口前，需要遵守 AIHOT 的授权要求。
