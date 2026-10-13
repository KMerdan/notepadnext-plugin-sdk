# 原生 API 0.3

SDK 0.3.2 的根入口与 `@notepadnext/plugin-sdk/native` 提供相同的原生 API 0.3 类型。manifest 声明 `engines.api: ^0.3.0`，命令统一接收固定目标的 `CommandInvocation`。全部官方模板和 Marketplace 插件使用这一契约。

## 已实现的编辑基础

| 服务 | 方法 | 所需 capability |
| --- | --- | --- |
| 文档 | `getActive/getSnapshot/list/getInfo` | `documents.read@1` |
| 选区 | `editors.getActive/getSelections/capture` | `editors.selection.read@1`；capture 另需 `documents.read@1` |
| 设置选区 | `editors.setSelections` | `editors.selection.write@1` |
| 文本事务 | `documents.applyEdits`，可选 `selectionGuard` | `documents.write@1` |
| 原生命令 | `core.list/execute` | `core.commands@1`；编辑另需 write，折叠另需 `editors.view.write@1` |
| 完整 HTML | `webviews.createHtml`、`setDocument/mapAsset/setTitle` | `webviews@1` 和 `webviews.html@1`，Qt >=6.6 |
| 生命周期与诊断 | `stopping`、`host.supports`、`host.limits`、`log` | 本地 SDK facade |

命令回调收到 `{commandId,windowId,editorId,documentId,args}`。目标在点击时捕获，包括异步包校验和首次激活之前。没有文档时两个 ID 为 null；关闭文档使其失效。`editors.capture(invocation)` 在 GUI 线程一次读取原目标正文、版本、选区 revision 和选中文本。切换标签页不改变目标。

`getActive/getSnapshot/watch/watchAll` 提供活动文档、快照与预览事件；`getInfo/list/capture` 提供 name、lineEnding、encoding、bom、byteLength、lineCount。编码字段是已知文件表示，正文使用 UTF-8 buffer；不猜测不可解码的内容。

## 选区变换

```ts
import type {PluginContext} from '@notepadnext/plugin-sdk/native';
export async function activate(ctx:PluginContext) {
  ctx.subscriptions.push(await ctx.commands.register('author.tools.upper',async invocation=>{
    if (!invocation.editorId) return;
    const c = await ctx.editors.capture(invocation);
    if(c.selection.mode !== 'stream' || c.selection.selections.some(s=>s.anchorVirtualSpace || s.caretVirtualSpace)) return;
    await ctx.documents.applyEdits(c.document.documentId,c.document.version,
      c.selection.selections.map((s,i)=>({range:s.range,text:c.selectedText[i].toUpperCase()})),
      {selectionGuard:{editorId:c.editor.editorId,revision:c.selection.revision}});
  }));
}
```

坐标零起始，character 为 UTF-16 code units，Range 为 `[start,end)`。Emoji 代理对不能拆开；CRLF 不计入行内 character。anchor/caret 保留方向；模式可为 stream/rectangle/thin/lines。设置选区只支持 stream 和零 virtual space，先校验全部范围再设置。

一批 edits 使用同一旧正文坐标，先校验 readonly、版本、选区 guard、全部范围、编码、数量和重叠，再提交一个 undo step。2 MiB UTF-8 快照/编辑 preflight 上限，最多 256 edits/选区。不支持跨 RPC 持有 undo 锁。版本单调递增，不保证只加一。冲突不重试，不覆盖用户的新内容。

错误包含 numeric `code` 和客户端 `kind`；1011 为 SelectionConflict，1001 为 VersionConflict，1002 为 DocumentClosed，1003 为 CapabilityDenied/ReadOnlyDocument。写入取消、断线或超时可能得到 `outcome: unknown`，不能据此重发写操作；已收到成功结果即已提交。公开返回值仍为 `{version}`，持久 operation ID/去重尚未实现。

## 复用原生功能

`core.list()` 返回稳定 ID、所需能力、effect、selectionSemantics、createsUndoStep。`core.execute` 使用显式 target `{editorId,documentId,expectedVersion,selectionRevision?}`，不会查找任意 QAction。

- `edit.undo/redo`：原 undo 栈，不创建额外 undo action。
- `edit.case.upper/lower`：原生选区大小写转换。
- `edit.comment.toggle`：原生选中行注释。
- `edit.lines.deduplicate`：整个正文；可选 `consecutiveOnly`。
- `edit.lines.sort`：选中的完整行，空选区时整个正文；`order` ascending/descending，`compare` caseSensitive/caseInsensitive/length。
- `view.fold.all`：目标 editor 全部折叠级别，`folded` 为 boolean。

菜单与 SDK 使用同一 `EditorOperations` 服务。SDK 编辑操作只支持普通 stream、无 virtual space，且通过 2 MiB/Unicode preflight。更大的正文仍可由用户使用原生菜单编辑。Readonly、失效目标或过期版本在修改前拒绝。

## 面板和停止

`createHtml({viewType,title,enableScripts,resourceRoots})` 由 host 分配 panelId；完整 HTML/JS 使用包内资源、CSP、JSON state/message 桥。浏览器使用 `acquireNotepadNextApi()`。fragment/service 与按 viewType 注册的 restorer 沿用通用热更新流程，不回放 Open 命令。

`ctx.stopping` 在 deactivate 前 abort。SDK 自动释放 owned resources；自建 timer/请求仍需插件清理或绑定 signal。`ctx.log` 输出至受限插件 stderr 日志。`host.supports` 仅查询已协商的 grant；不意味任意 OS 权限。

文件生命周期、字面量搜索、语言、书签和会话高亮已实现，见 [Phase B](PhaseB.zh-CN.md)。编码转换、宏、providers 与导出仍未开放。单宿主窗口，没有 shared-buffer 克隆视图承诺。原生完整验收由应用仓库承担；模拟 test host 支持 selection transform，但明确拒绝 core/native renderer 模拟。

text-tools 的 `npm run debug/dev/debug:break` 显式传 `--api-version 0.3.0`，模拟 debugger 提供固定 invocation 并将转换后的正文输出到 HTML。默认 debugger 使用同一 API 0.3；自建项目也可显式声明这一版本。core、选择不同子范围和浏览器渲染仍需 native 验证。

## 文件编码元数据

`documents.getInfo()` 和原生文档事件的 `encoding` 是长度 1–64 的字符集名称，使用小写形式，例如 `utf-8`、`utf-16le`、`windows-1252`、`shift_jis`、`gb18030`；无法确定时为 `unknown`。`bom` 单独表示 BOM。这里报告的是文件保存格式；编辑缓冲区与文本 API 仍使用 Unicode/UTF-8 坐标约定。编码转换由编辑器 Encoding 菜单提供，尚无 SDK 转换方法。
