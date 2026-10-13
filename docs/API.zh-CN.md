# Native API 0.3

SDK 0.3 只维护当前原生编辑器 API。公开类型见 [native.d.ts](../native.d.ts)；基础预览、消息、存储和面板类型见 [base.d.ts](../base.d.ts)。命令接收一个 `CommandInvocation`，参数在 `invocation.args`。

- [开发与安装](GettingStarted.zh-CN.md)
- [编辑选区与原生命令](NativeAPI.zh-CN.md)
- [文件、搜索、语言、书签与高亮](PhaseB.zh-CN.md)
- [预览面板热更新](HotUpdate.zh-CN.md)

当前工具包提供 Node/TypeScript 插件模板；传输使用 JSON-RPC 2.0，可据其契约实现其他语言的客户端。旧 0.1/0.2 profiles、Python 原型及 VS Code 导入/运行适配不随此版本交付。
