# TODO Navigator

Find whole words with the native literal search service, highlight versioned ranges and reveal a clicked result. The panel retains its query and scroll across hot updates. Temporary indicators belong to this plugin session; stopping or closing the document releases them and leaves user bookmarks intact.

```sh
npm install --ignore-scripts
npm run build
npm test
npm run package
```

Requires native API 0.3 and full HTML panels. Install the package in the editor, enable it, open a document containing TODO and run Plugins → TODO Navigator. Edit the buffer, change the query, click a result and reload the plugin. Native services must be verified in the real application; the SDK test host does not model them. See `tools/plugin-sdk/docs/PhaseB.zh-CN.md` for native debugging and packaging.
