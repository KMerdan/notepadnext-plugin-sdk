# Notepad Next ++ Plugin SDK

The native plugin development kit for [Notepad Next ++](https://github.com/KMerdan/notepad-next-plus-plus), maintained by KMerdan. **SDK 0.3.1**, Node **24**. Enhance the existing editor with text tools, previews and HTML/JS services. Plugin authors do not need Qt or the application source tree.

The application implements the native services and owns plugin processes, permissions and panels. This repository owns the public API declarations, metadata/wire contracts, templates, test host and development/package tools. The [official Marketplace](https://github.com/KMerdan/notepadnext-plugin-marketplace) owns Markdown/HTML plugin sources and independent releases.

## Start here

| Goal | Guide |
| --- | --- |
| Create a plugin | [Getting started](docs/GettingStarted.zh-CN.md) |
| Use files, native search, bookmarks and owned highlights | [Native API 0.3](docs/PhaseB.zh-CN.md), `text-inspector` / `todo-navigator` templates |
| Transform selections or call editor operations | [Native editing API 0.3](docs/NativeAPI.zh-CN.md), `text-tools` template |
| Preview Markdown | [Development → debug → package → install](docs/MarkdownWalkthrough.zh-CN.md) |
| Run an HTML/JS service | [HTML service](docs/HtmlService.zh-CN.md), `html-service` template |
| Bind previews to editor tabs and choose a plugin category | [Plugin lifecycle](docs/PluginLifecycle.zh-CN.md) |
| Restore panels after updates | [Hot update lifecycle](docs/HotUpdate.zh-CN.md) |
| Maintain releases | [Marketplace](docs/Marketplace.zh-CN.md), [repository boundaries](docs/RepositoryLayout.zh-CN.md) |
| API reference | [Current API reference](docs/API.zh-CN.md) |

## Install the kit

GitHub Releases provide an npm-format tarball and `sdk-checksums.json`; this package is not on the npm registry. Install an exact URL and commit your lockfile:

```sh
npm install --save-dev --ignore-scripts https://github.com/KMerdan/notepadnext-plugin-sdk/releases/download/v0.3.1/notepadnext-plugin-sdk-0.3.1.tgz
npx --no-install nnp-create ../my-tools --template text-tools --id yourname.text-tools
cd ../my-tools
npm install --ignore-scripts
npm run build
npm test
npm run package -- ../my-tools-package
```

Templates: `hello`, `markdown`, `html-service`, `text-tools`, `text-inspector`, `todo-navigator`. Generated projects retain an exact SDK snapshot for offline portability. The Marketplace instead consumes the released tarball directly; it carries no copy of SDK source.

Plugins import types from `@notepadnext/plugin-sdk/native` and declare `engines.api: ^0.3.1`. The root export and `/native` export expose the same current 0.3 API. Command handlers receive `CommandInvocation`. SDK package version, host API profile, application and plugin versions are separate. Phase B methods require API 0.3 and declared grants; [the guide](docs/PhaseB.zh-CN.md) describes their limits. Deferred encoding/macros/providers remain outside the public API.

Native plugins use `activate(context)`; the host supplies runtime objects. Capabilities restrict host RPC access; trusted Node plugins can still use Node filesystem/network APIs. This is not an operating-system sandbox.

## Develop and verify the SDK

```sh
git clone https://github.com/KMerdan/notepadnext-plugin-sdk.git
cd notepadnext-plugin-sdk
npm test
npm run test:standalone
```

Unit tests need no npm install. Standalone validation packs the actual file whitelist, installs it outside this repository and builds/tests/packages all six templates. Local services require loopback access; template dependencies are installed with hooks disabled. These simulations do not replace native Qt/RPC/undo/CSP tests in the application.

`npm run release:kit -- ../sdk-assets v0.3.1` creates a new output directory. Tag CI validates the package before creating a draft release. Verify and publish immutable assets; do not overwrite a version. Application schema snapshots are synchronized from its reviewed SDK submodule by `scripts/sync-plugin-sdk-contracts.py` in the application repository.

## License and provenance

GPL-3.0-or-later; see [LICENSE](LICENSE). Extracted from NotepadNext / Notepad Next ++ with its Git history and original copyright notices retained. Upstream: [dail8859/NotepadNext](https://github.com/dail8859/NotepadNext). Third-party packages retain their licenses.
