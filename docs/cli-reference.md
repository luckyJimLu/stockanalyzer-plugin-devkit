# CLI 参考

所有命令在仓库根目录执行，路径参数使用位置参数可以避免不同 npm 版本对 `--` 的转发差异。

```powershell
npm run plugin:create -- <目录> [插件ID] [名称]
npm run plugin:build -- <目录>
npm run plugin:probe -- <目录>
npm run plugin:test -- <目录>
npm run plugin:release -- <目录> [输出.stockplugin]
npm run plugin:validate -- <文件.stockplugin>
```

`create` 拒绝覆盖已有目录。

`build` 读取 `stockanalyzer.plugin.json` 和 `src/index.ts`，输出 manifest entry 指定的 IIFE。

`probe` 只验证导出表和贡献项形状。

`test` 先 probe，再使用 `plugin.fixture.json` 在 QuickJS 沙箱执行每个 indicator。没有 fixture 时使用内置的确定性 OHLCV 数据。

`release` 执行 `test`、构建 checksums、按白名单打包并再次校验。

`validate` 不执行插件代码，只检查归档结构、manifest、checksums、bundle 大小和动态 import。
