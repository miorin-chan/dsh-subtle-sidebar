# 低调侧边栏维护说明

- [产品设计](../DESIGN.md)：问题定位、目标体验、边界与成功标准。

[英文用户说明](../README.md)与[中文用户说明](../README.zh.md)记录使用方法。

## 启动收起

插件在 `shell.overlay` 首次挂载时，通过 DSH 0.2.2-rc.5 的 AppFrame 标记确认左栏是否已经收起。
只在展开时调用 `layout.toggleSidebar()`，不接管用户后续的开关或侧栏快捷键设置。
找不到布局框架时不切换。

## 验证

运行 `pnpm install --frozen-lockfile`、`npm test` 和 `npm run check`。
从工作区根运行 `node tools/new-dsh-plugin/cli.mts --check plugins/dsh-subtle-sidebar`。
升级 DSH 后，在一次性 profile 验证宽窗启动收起、窄窗不误展开以及后续会话切换保持状态。
图标检查浅色和深色下 36 px 的视觉平衡，并确认与外观 Atlas 的激进侧边栏、倒反天罡相邻。
