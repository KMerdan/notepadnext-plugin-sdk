# 三仓边界和兼容性

| 仓库 | 维护内容 | 版本来源 |
| --- | --- | --- |
| `KMerdan/notepad-next-plus-plus` | Qt/C++ 主应用、JSON-RPC 服务、Node/Python 插件宿主、VS Code 运行时适配器、安装/更新、原生集成测试 | 应用版本；SDK 子模块固定 commit |
| `KMerdan/notepadnext-plugin-sdk` | API 类型、共享 metadata Schema、静态兼容性契约、模板、调试/测试工具、服务 helper、打包和 SDK 文档 | SDK SemVer tag 和 `.tgz` Release |
| `KMerdan/notepadnext-markdown-preview` | 官方目录、Markdown/HTML 插件源码、独立 lockfile、插件 ZIP Release | 各自 `<plugin-id>/v<version>` |

SDK 是 SDK 源码唯一维护位置。应用使用子模块，不复制编辑整个 SDK；Marketplace 使用精确 Release URL 和 npm lockfile integrity，不维护 vendored SDK 源码。生成的第三方模板可保留离线 SDK 快照，但其更新仍来自 SDK 官方版本。

应用中的 JSON-RPC transport 和宿主实现留在应用仓库。SDK 类型/Schema 描述公开契约；变更契约需 SDK 测试及应用集成验证共同通过。SDK 包版本与宿主 API 版本不同：当前 SDK 0.1.3 对应 API 0.1.x，不强迫插件、目录或应用版本同步递增。

VS Code 导入器只读取、验证和复制已经构建的扩展。它不导入运行时适配器，也不执行扩展入口。静态 configuration 定义解析留在 SDK `compat/configuration.cjs`；宿主打包该同一模块并保留自身 runtime Error/API 行为。

更新顺序：先修改 SDK → 单元和独立 tarball 验证 → 发布新 SDK → 主应用升级子模块并检查 Schema/宿主行为 → 官方插件升级明确的 SDK URL、刷新 lockfile、验证并按需发布插件版本。仅升级构建依赖不修改已经公开的插件包。

Marketplace 暂时保留原仓库 URL：安装器将仓库视为更新信任来源，已有 Markdown 关联数据也按该来源隔离。未来改名需先实现并验证来源迁移；无需为改仓库名字中断现有安装。
