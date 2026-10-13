# 插件类别、组件所有权与生命周期

这是 Notepad Next ++ 的原生 SDK 设计。文件语言只决定预览是否支持该文档，不自动打开面板。manifest 的 `category` 表明用途；进程激活、编辑器文档、面板和安装包是四个独立生命周期。

| category | 用途与所有者 | 打开/激活 | 释放 |
| --- | --- | --- | --- |
| `command` | 一次编辑操作；调用时捕获目标 | 用户命令 | 调用结束后释放工作资源；宿主窗口关闭时停用进程 |
| `editor-tool` | 选区检查、搜索、高亮；句柄属于文档或会话 | 用户命令 | 文档关闭释放相关句柄；停用/退出释放会话资源 |
| `editor-preview` | 匹配文件类型的共享预览 dock | 用户命令；不能以 onLanguage/onStartup 打开 | 用户关闭或最后一个匹配文档关闭时关闭面板和进程 |
| `window-tool` | 文档之外的工具面板 | 用户命令 | 用户关闭面板；停用/宿主窗口关闭释放全部资源 |
| `background-service` | 无强制 UI 的后台服务 | 明确声明的启动或命令事件 | 停用或宿主窗口关闭；Node 服务随所属插件进程结束 |

未声明类别的基础工具沿用会话所有权；生产插件应显式声明类别。类别不是权限，所需 capabilities 仍须单独申请。当前宿主是一主窗口，尚未承诺 workspace/application 全局服务或第三方原生窗口。

## 手动打开的共享预览

```json
{
  "category": "editor-preview",
  "preview": {
    "viewType": "html-preview",
    "languages": ["html"],
    "extensions": [".html", ".htm"]
  }
}
```

`preview` 只用于 editor-preview。它指定一个 viewType、语言与文件后缀。每个插件/宿主窗口最多一个共享 dock。`webviews.document@1` 允许 `context.previews.getSource()` 查询宿主选择的文档；返回 null 表示当前 tab 不匹配。

1. 安装和启用只提供菜单入口。打开文件、切换语言或激活进程不打开预览。
2. 在匹配文档上手动执行 Open 后创建 dock。切换匹配 tab 时宿主发送 `sourceChanged`，插件读取该 source 的快照并渲染。不同 tab 的浏览器 state、表单和滚动由宿主分别保存。
3. 切到不匹配 tab 时 dock 隐藏，保留匹配 tab 的预览状态；回到匹配 tab 时才显示。隐藏不是用户关闭。
4. 关闭一个 tab 后以编辑器选出的下一个活动 tab 为准，插件不得激活其他文档来迁就预览。没有剩余匹配文档时关闭预览并停用其进程，插件仍保持 Installed/Enabled。
5. 用户关闭 dock 是明确结束本次预览。之后打开或切换文件不会重新打开；只能再次执行 Open。
6. 保存、另存为、语言变化、关闭取消、文档重载使用真实文档 ID/事件。关闭被取消不释放预览；语言和后缀都不再匹配时释放该文档状态。
7. 更新、Reload 或回滚恢复仍存活的 dock、源文档映射与逐文档状态，不重放 Open 命令。关闭的文档和面板不能被复活。异步渲染必须用 AbortSignal/版本检查拒绝过时结果。

## 所有权边界与研究依据

安装包由 registry/package lease 管理，跨进程更新保持不可变；持久化数据由 plugin ID 与来源隔离。文档由 EditorManager/DocumentBridge 管理，插件只持有稳定 ID。面板由宿主 Qt 对象管理。进程退出、禁用、卸载和更新撤销资源句柄，HTTP 服务和 JS 定时器必须由插件停用逻辑释放。

[VS Code activation events](https://code.visualstudio.com/api/references/activation-events) 定义代码何时加载，而 [webview lifecycle](https://code.visualstudio.com/api/extension-guides/webview#lifecycle) 单独定义面板的创建、关闭和资源释放。这支持将激活与 UI 所有权分开的设计；这里的类别与 tab 绑定是本项目自己的契约，不复用 VS Code API。

[Qt object trees and ownership](https://doc.qt.io/qt-6.10/objecttrees.html) 提供宿主对象的父子销毁规则。文档绑定不能仅使用 dock 的 QObject 父对象：文档不是它的父节点，必须显式订阅文档事件。热更新保留 dock 时也必须继续观察文档关闭。

验证覆盖：未打开的匹配文档、A/B 匹配文档切换、非匹配 tab、关闭其中一个/最后一个、取消关闭、手动关闭后切换、语言变化、更新期间关闭与恢复。业务插件测试在 Marketplace；通用 tab 所有权与契约测试在宿主，类型与模板验证在 SDK。

## 预览状态限额

逐文档浏览器快照为临时状态，每个预览最多缓存 32 个文档，每份最多 128 KiB；JSON API state 的既有限额仍为 64 KiB。超过缓存文档数会释放部分旧状态。表单自动恢复限制为 128 个非密码/文件字段，单个字段最多 4096 字符。需要恢复 JS 应用状态时显式使用 `setState()`，任意 JavaScript heap 与 Node 服务内存不会迁移。
