# Native Text Tools

Build with Node 24: `npm install --ignore-scripts`, `npm run build`, `npm test`.
This template requires native host API **0.2**. Register its metadata through
**Plugin Manager → Add Source… → Local metadata**, then **Local Package…**,
enable, and choose a command. Registration does not install or execute code.

Uppercase captures the originating editor, UTF-16 text and selections, then
commits a single guarded undo transaction. Duplicate removal uses the shared
native command service. Test-host uppercase checks are simulations; verify
undo, tab switching, read-only buffers and native commands in the app.

`npm run debug` 输出转换后的正文到 `.debug/preview.html`；`npm run dev` 监听重建/输入变化。脚本显式选择 API 0.2 的模拟上下文；deduplicate/native core 必须在真实应用调试。
