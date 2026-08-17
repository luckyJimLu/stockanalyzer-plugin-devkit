# Basic Indicator Template

正式创建插件请执行：

```powershell
npm run plugin:create -- plugins/my-indicator dev.example.my-indicator "我的指标"
```

生成目录会自动包含算法设计文档、fixture、manifest 和 SMA 示例源码。模板保持 indicator-only；不要手工把 manifest 改成 strategy 以绕过宿主的逐 Bar 因果限制。
