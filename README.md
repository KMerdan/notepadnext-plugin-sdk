# Notepad Next ++ Plugin SDK

The independent plugin development kit for [Notepad Next ++](https://github.com/KMerdan/notepad-next-plus-plus), maintained by KMerdan. Package name **`@notepadnext/plugin-sdk`**, version **0.1.3**; compatible host API remains **0.1.x**. Use **Node 24**. Plugin authors do not need a Qt compiler or the application repository.

This repository owns TypeScript API declarations, unified plugin/marketplace metadata schemas, templates, the simulated test host, local debugger, local HTTP service helper, package/release tools and the static VS Code importer contract. The application owns the actual Qt UI, JSON-RPC transport, runtime adapters, permissions and native integration tests. The [official marketplace](https://github.com/KMerdan/notepadnext-markdown-preview) owns the plugins and their separately versioned releases.

The SDK was extracted with its existing Git history from the application. GPL-3.0-or-later and original copyright notices are retained. Third-party packages keep their own licenses.

## Use a released kit

GitHub Releases distribute an npm-format `.tgz` and `sdk-checksums.json`. The package is not published to the npm registry; install its exact release URL into a tooling project:

```sh
npm install --save-dev --ignore-scripts https://github.com/KMerdan/notepadnext-plugin-sdk/releases/download/v0.1.3/notepadnext-plugin-sdk-0.1.3.tgz
npx --no-install nnp-create ../my-markdown --template markdown --id yourname.markdown-preview --name "Markdown Preview"
cd ../my-markdown
npm install --ignore-scripts
npm run build
npm test
npm run debug
```

Templates include `hello`, `markdown` and `html-service`. Generated projects carry the exact SDK snapshot used to create them, for offline portability. Treat it as a pinned dependency rather than editing a second SDK source. The official marketplace consumes the release tarball directly through lockfiles with integrity checks.

TS code uses `import type {PluginContext} from '@notepadnext/plugin-sdk'`; the host injects runtime objects through `activate(context)`. API declarations do not implement JSON-RPC for plugin authors. A locally simulated host does not establish native renderer or permission behavior.

## Develop the SDK

```sh
git clone https://github.com/KMerdan/notepadnext-plugin-sdk.git
cd notepadnext-plugin-sdk
npm test
npm run test:standalone
```

SDK unit tests need no npm install. The standalone check packs the actual npm file whitelist, installs the tarball outside the source tree, generates/builds/debugs/packages all three templates and imports a built VS Code fixture, without an application checkout. Template build dependencies are installed with hooks disabled.

`npm run release:kit -- ../sdk-assets v0.1.3` creates a new release directory. CI on `v<version>` tags tests the standalone package before creating a draft. Verify the tarball's identity, version, file list, size and SHA-256, then publish. Never replace an existing version. Plugin ZIP releases use the SDK's separate `nnp-release` tool.

## Documents

- [Getting started](docs/GettingStarted.zh-CN.md)
- [Markdown development → debug → package → install/update](docs/MarkdownWalkthrough.zh-CN.md)
- [Debugging](docs/Debugging.zh-CN.md) and [API](docs/API.zh-CN.md)
- [Hot updates and panel restoration](docs/HotUpdate.zh-CN.md)
- [Node HTML/JS service](docs/HtmlService.zh-CN.md)
- [Multi-plugin marketplace releases](docs/Marketplace.zh-CN.md)
- [Repository boundaries and compatibility](docs/RepositoryLayout.zh-CN.md)

The application's `packages/plugin-sdk` is a Git submodule pinned to a reviewed SDK commit. Its copy of the shared configuration contract is bundled during the application build; no whole SDK toolchain is needed by installed plugin processes. Metadata schema snapshots in application documentation are generated from this SDK and checked for drift.
