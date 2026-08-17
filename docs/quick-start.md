# 快速开始

## 1. 初始化

```powershell
npm ci
npm run plugin:create -- plugins/volume-force dev.example.volume-force "量价动能"
```

模板会生成：

```text
ALGORITHM.md          算法设计与 Codex 约束
README.md             插件说明
plugin.fixture.json   本地沙箱测试输入
stockanalyzer.plugin.json
src/index.ts          TypeScript 源码
```

## 2. 设计算法

先在 `ALGORITHM.md` 中定义目标、输入、预热期、缺失值、公式、输出和验收样例。指标必须是因果的：第 N 根 Bar 只能读取第 N 根及以前的数据。

## 3. 测试和发布

```powershell
npm run plugin:test -- plugins/volume-force
npm run plugin:release -- plugins/volume-force
```

如果算法参数不是 `length`，请同步修改 `plugin.fixture.json`，让本地测试覆盖默认参数和边界参数。

## 4. 导入宿主

在 StockAnalyzer `/analysis` 页面打开“指标 → 管理本地插件”，选择生成的 `.stockplugin`，检查权限、贡献项和版本后确认。插件只有通过宿主 QuickJS probe 后才会激活。
