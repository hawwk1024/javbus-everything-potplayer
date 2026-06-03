# JavBus Local Helper

> 在 JAVBus 页面检测本地视频文件，一键通过 PotPlayer 播放（via Everything）

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-brightgreen)]()

## 功能

### 详情页 — 导航栏按钮
- 自动提取番号，检测本地视频文件（8 种格式）
- 🟢 **绿色** = 有本地文件 / 🟠 **橙色** = 无本地文件
- 鼠标悬浮显示上次播放时间
- 点击调用所选播放器直接播放（via Everything HTTP）

### 星页 `/star/*` — 番号着色
- 每个影片的番号文字直接着色，直观显示本地文件状态
- 🟢 绿色 = 有文件 / 🟠 橙色 = 无文件
- **点击绿色番号**直接播放
- 检测进度实时显示：`🔍 检测中 5/10 🟢3 🟠2`

### 批量导入索引
- 油猴菜单 → **「📥 从Everything导入文件索引」**
- 指定目录，批量建立番号缓存
- 记住上次输入的目录路径
- 进度可视化：`📥 导入中 60% · 60/100 · 已识别 15 个`

### 播放器选择
- 油猴菜单 → **「🎬 选择播放器」**，支持 PotPlayer / VLC / MPC-HC / 系统默认
- 选择后记住，所有播放走同一协议

### 油猴菜单
| 菜单项 | 功能 |
|---|---|
| 🎬 选择播放器 | 切换 PotPlayer / VLC / MPC-HC / 系统默认 |
| 🗑️ 清空播放记录缓存 | 清除所有番号的上次打开时间 |
| 🔄 清空文件检测缓存 | 清除文件存在缓存，下次重新检测 |
| 📥 从Everything导入文件索引 | 按目录批量导入番号索引 |

## 使用前提

### Everything
- [下载 Everything](https://www.voidtools.com/zh-cn/downloads/)
- 工具 → 选项 → HTTP 服务器 → 启用 → 端口 80

### PotPlayer
- [下载 PotPlayer](https://potplayer.daum.net/)
- 安装后自动注册 `potplayer://` 协议

### 视频文件命名
- 文件名需包含番号（如 `SSIS-123.mp4`）
- 支持格式：mp4 / mkv / avi / mov / wmv / flv / webm / m4v

## 使用方法

### 详情页
1. 访问任意影片详情页
2. 导航栏右侧出现状态按钮，自动检测
3. 绿色按钮 → 点击播放

### 星页
1. 访问演员页面 `/star/*`
2. 每个影片的番号自动着色
3. 点击绿色番号 → 直接播放

### 首次使用建议
1. 打开 Everything，确认 HTTP 服务已启用
2. 油猴菜单 → **「🎬 选择播放器」**，选择你的播放器
3. 油猴菜单 → **「📥 从Everything导入文件索引」**，输入视频目录（如 `D:\JAV`）
4. 等待导入完成，之后星页秒开全绿

## 优先级规则

匹配到多个视频文件时：
1. 优先文件名含 `ch`（不区分大小写，如 `SSIS-123-ch1.mp4`）
2. 同优先级内选体积最大的

## FAQ

**Q: 点击提示「无法连接 Everything」**
> 检查 Everything HTTP 服务是否已启用（任务栏右键 Everything → 选项 → HTTP 服务器）

**Q: 明明有文件却显示橙色**
> 确认文件名包含完整番号，Everything 中手动搜索 `番号 ext:mp4;mkv` 验证

**Q: 端口不是 80**
> 修改脚本中所有 `localhost:80` 为你的端口号

**Q: 如何清理缓存**
> 油猴菜单 → `🔄 清空文件检测缓存`

## 更新日志

### v0.4 (2026.06.08)
- 重命名：JavBus Local Helper（via Everything）
- 新增星页 `/star/*` 支持：番号着色 + 点击直接播放
- 详情页按钮改为直接播放（不再打开 Everything 搜索页）
- 新增 Everything 批量导入索引（目录过滤、进度可视化、路径记忆）
- 新增播放器选择（PotPlayer / VLC / MPC-HC / 系统默认）
- 星页检测进度实时显示

### v0.3 (2026.06.04)
- 文件缓存 + 自动验证机制
- 上次打开时间记录、油猴缓存管理菜单

### v0.2 (2026.06.03)
- 8 种视频格式、智能优先级（ch 优先 → 体积最大）
- HTML 解析获取正确 HTTP 路径

### v0.1 (2026.05.26)
- 首次发布：番号识别、Everything API 检测、PotPlayer 播放

## 相关链接

- [Everything](https://www.voidtools.com/)
- [PotPlayer](https://potplayer.daum.net/)
- [Tampermonkey](https://www.tampermonkey.net/)
