# Historical VS Code importer experiment

`../import-vscode.cjs` is a retained, bounded importer for built CommonJS samples. Its static configuration parser lives here. This is not part of the native API 0.2 design, and native plugins do not load a VS Code adapter. Study an extension and port its functionality to the Notepad Next ++ SDK instead. The host retains old adapter packages for existing experiments; no general VS Code extension compatibility is promised.
