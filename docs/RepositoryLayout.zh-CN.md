# 三仓边界和版本

| 仓库 | 维护内容 | 版本/依赖 |
| --- | --- | --- |
| `KMerdan/notepad-next-plus-plus` | Qt/Scintilla 功能、原生操作、RPC 实现、Node host、管理器、热更新与真实集成验证 | 应用版本；SDK submodule 固定 commit |
| `KMerdan/notepadnext-plugin-sdk` | 原生 API 0.3 类型、metadata/wire Schema、模板、调试/模拟测试、HTTP service helper、打包和文档 | SDK 0.3.1；Git tag 和 npm-format `.tgz` |
| `KMerdan/notepadnext-plugin-marketplace` | 第一方插件源码、目录、独立 lockfile 与 Release | 各插件 `<plugin-id>/v<version>` |

SDK 源码只在独立仓库维护。主应用通过 submodule 引用经过测试的 commit，并将规范 Schema 快照同步入应用；安装的 host 不加载整个 SDK。Marketplace 通过固定 Release URL 和 npm lockfile integrity 引用开发依赖，构建包只携带必要 runtime helper。作者生成的模板可保留离线 SDK 快照。

SDK 根入口与 `/native` 入口统一为原生 API 0.3。manifest 声明 `^0.3.0`，命令回调接收固定目标 invocation。wire profile 0.1 和 JSON-RPC 2.0 是当前传输格式；应用、SDK、插件与 catalog 版本独立。

原生插件用于增强现有 Notepad Next ++，可以参考和移植其他编辑器插件源码。SDK 与宿主不交付 VS Code importer、适配层或 Python 原型。

升级顺序：SDK 实现与类型/独立包测试 → 应用原生行为验证 → SDK commit/tag/Release → 应用固定该 commit 并同步快照 → Marketplace 升级固定 URL/lockfiles、重建验证 → 有 runtime 改动时发布新插件版本。公开资产不可覆盖。

Marketplace 使用规范名称 notepadnext-plugin-marketplace。旧 origin 的安装需一次性重新注册/安装；宿主不会自动改变受信任来源或迁移 source-isolated 数据。名称为 Official Plugin Marketplace，对本 fork 官方；与上游无官方关联。GPL-3.0-or-later 及上游声明保留。
