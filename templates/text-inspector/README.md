# Text Inspector

Inspect the originating editor's selections, encoding, EOL and effective indentation. The excerpt uses `documents.readRange`, never a full snapshot. It follows changes to that editor; the Reveal command scrolls without changing the selection.

```sh
npm install --ignore-scripts
npm run build
npm test
npm run debug
npm run package
```

Requires native API 0.3. The SDK debug host simulates text and subscriptions; verify selection/focus, read limits and hot update in the real editor. Install the generated package through Plugin Manager → Discover → Local Package. A full development guide is in `tools/plugin-sdk/docs/PhaseB.zh-CN.md`.
