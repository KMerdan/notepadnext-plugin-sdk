# Native API 0.3：编辑增强插件

Phase B 在已有文档、选区、命令和面板契约上增加原生能力。使用 `@notepadnext/plugin-sdk/native`，manifest 声明 `engines.api: ^0.3.0`，并声明所调用的 required/optional capabilities。旧 API 0.1/0.2 插件保留原调用方式；Python prototype 仍使用 0.1。

| 服务 | 方法 | 主要 capability |
| --- | --- | --- |
| 宿主预算 | `host.getNativeLimits` | `documents.read@1` |
| 文档 | `readRange`, `watchNative`, `convertLineEndings` | `documents.read@1`, `documents.native.events@1`, `documents.write@1` |
| 编辑视图 | `watchSelections`, `getOptions`, `activate`, `revealRange` | `editors.selection.events@1`, `editors.selection.read@1`, `editors.view.write@1` |
| 文件 | `create`, `open`, `save`, `saveAs`, `close` | `files.read@1` / `files.write@1` |
| 原生搜索 | `findAll`, `count` | `search.read@1` |
| 语言 | `list`, `getKeywords`, `set` | `languages.read@1` / `languages.write@1` |
| 用户书签 | `list`, `set` | `bookmarks.read@1` / `bookmarks.write@1` |
| 插件装饰 | `create` → `set` / `dispose` | `decorations.write@1` |
| 更多原生命令 | `core.execute` 的行操作、显式注释、缩进和按级折叠 | `core.commands@1` + document/view write |

正式签名见 [native.d.ts](../native.d.ts)，请求/结果以 [wire schema](../schemas/wire.schema.json) 为准。JSON-RPC 与 wire profile 保持原版本；新增读取/搜索/装饰预算通过 `getNativeLimits` 查询，不修改旧 initialize limits。

## 范围、事件和目标

范围始终是 UTF-16、零起点、end exclusive。`readRange(documentId, expectedVersion, range)` 真正读取局部正文，默认最多 256 KiB；位置所在单行的映射预算也为 256 KiB。可读取大文件的小范围，超预算拒绝。原有全文 snapshot 和 applyEdits 的 2 MiB 预检边界保留。

`watchNative` 返回订阅时的 documents/editors/eventSeq，之后通知丰富 metadata、正文失效、打开/关闭/激活、保存、重载和书签变化。`watchSelections(editorId, listener)` 返回初始 selection 和 sequence，之后通知该视图的选区、reset 和关闭。两者都需要 `documents.read@1`；都是 Disposable。通知可合并为最终状态，`reset` 要重新读取；它们不替代旧 delta stream，也不保证每次击键对应一次通知。

从 command invocation 的 editorId/documentId 发起操作；await 后不要重新取当前编辑器作为写入目标。`revealRange` 展开折叠并滚动，不改变选区或输入焦点。`activate` 的聚焦行为显式控制。选区修改仍使用 `setSelections` 的 document version 和 revision。

## 文件和编辑操作

文件 URI 必须是绝对 `file:` URI。`create/open` 返回实际文档 ID，open 会复用已打开的文件；后台操作可指定 `activate:false`。首版插件打开文件最多 2 MiB。save/saveAs/close 接受固定 ID 和 expectedVersion，弹窗返回后再次验证。原生 EditorConfig 保存钩子保留，结果 version 是保存后的真实版本。

返回 `completed`、`cancelled` 或 `skipped`；IO 错误为 `FileIOError`。关闭支持 `prompt` / `ifClean`，插件关闭最后文档会保留主窗口和空白页。取消不会继续写入。写入发生断线/超时或 IO 错误时可能为 unknown outcome，不能自动重试。

新增 core IDs：`edit.lines.duplicate/move/join/split/reverse`、`edit.comment.add/remove`、`edit.indent.increase/decrease`、`view.fold.level`。使用与原生菜单相同的操作实现；全部 text edits 是一个 undo 分组。EOL 转换也可一次撤销正文转换；新输入的 EOL mode 是视图设置，不随 text undo 自动恢复。

## 搜索、语言和标记

首版搜索为字面量，使用原生大小写/whole-word 规则并保持用户的 search flags/target。范围、cursor、maxResults 有限；结果带 version、complete、next。count 同样可能截断，不能把 partial count 当总数。native 扫描按短任务让出 GUI 线程，可取消；正文变化返回 VersionConflict。替换用已有 guarded applyEdits。任意 regex、大文件全文搜索和跨文档全局事务不在此契约中。

语言 ID 沿用现有公开映射（例如 `text`、`html`），显示名来自原生语言表。set 只接受已登记 ID，保留 EditorConfig 优先级；不开放 Lua 执行。getOptions 返回实际 tabWidth/indentWidth/useTabs。

用户书签属于用户，set 是对指定行明确增/删，不是清空其他书签；插件停用不清除它。临时检查结果用 decorations：每会话最多 8 styles，每 style 最多 1024 ranges，映射有 aggregate budget。set 带 expectedVersion，所有范围预检后才替换。dispose、文档关闭、停用、崩溃、卸载和热更新释放 indicator。更新时新会话可准备装饰，验证完成后才显示；旧句柄不会跨会话复用。保存用户书签或操纵内置 mark indicators 不是装饰 API 的效果。

## 从模板到真实调试

```sh
npx --no-install nnp-create ../my-inspector --template text-inspector --id yourname.text-inspector
cd ../my-inspector
npm install --ignore-scripts
npm run build
npm test
npm run debug
npm run package
```

Text Inspector 用局部读取和选区事件显示文本、EOL、编码和缩进，另有 Reveal 命令。其 debug host 只模拟正文/事件。TODO Navigator 模板组合 native search、owned decoration、HTML panel 和点击定位；它需要真实编辑器调试，测试中的 mock 只证明插件业务组合，不证明 Qt 语义。

本地包在 Plugin Manager 注册 metadata 后进入 Discover，再选择 Local Package 安装、启用、打开命令。修改源码并重新 build/package，使用管理器 Update 或开发 Reload 验证面板位置、query/scroll 和标记重建。Node 调试器接入方式见 [Debugging](Debugging.zh-CN.md)。SDK、宿主和 Marketplace 分别验证类型/模板、原生契约、插件业务与发布包；插件测试不进入主仓必需 CI。
