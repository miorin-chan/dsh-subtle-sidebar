# 低调侧边栏维护说明

- [产品设计](../DESIGN.md)：问题定位、目标体验、边界与成功标准。

[英文用户说明](../README.md)与[中文用户说明](../README.zh.md)记录使用方法和恢复步骤。

## 启动和换键

插件在 `shell.overlay` 首次挂载时，通过 DSH 0.2.2-rc.5 的 AppFrame 标记确认左栏是否已经收起。
只在展开时调用 `layout.toggleSidebar()`，不接管用户后续的开关。
找不到布局框架时不切换。

快捷键由原生 `sidebar.left.toggle` 和 `sidebar.right.toggle` 执行。
插件等到原生配置就绪，只对两条仍使用默认键位的命令提交带修订号的交换。
每次原生 API 只编辑一条，因此先释放左栏键位，再更新右栏和左栏。
中途失败会尝试恢复它自己的中间写入。如果发现这两条已被另外编辑，则保留较新的数据。
交换成功后使用同设备原生持久化设置，停用插件不撤销换键。
DSH 未提供把原生命令转成只读或注销它的插件 API。

## 验证

运行 `pnpm install --frozen-lockfile`、`npm test` 和 `npm run check`。
从工作区根运行 `node tools/new-dsh-plugin/cli.mts --check plugins/dsh-subtle-sidebar`。
升级 DSH 后，在一次性 profile 验证宽窗启动收起、窄窗不误展开、两条原生命令换键，以及自定义键位保留。
图标检查浅色和深色下 36 px 的视觉平衡，并确认与外观 Atlas 的激进侧边栏相邻。
