# JAVBus & Everything 本地播放联动脚本

Greasy Fork: 等待发布
License: MIT
JavaScript: ES6+

> 在 JAVBus 页面添加浮动按钮，通过 Everything JSON API 快速检测本地文件，一键调用 PotPlayer 播放。

## 功能特点

- 智能番号识别 - 自动提取页面番号，支持 SPA 页面切换
- 快速检测 - 通过 Everything JSON API 查询，超时 1.5 秒
- 状态可视化 - 绿色=有文件 / 橙色=无文件
- 按钮可拖动 - 鼠标/触摸拖动，位置自动保存
- 一键播放 - 点击即可调用 PotPlayer 播放


## 使用前提

### 1. Everything 配置

- 下载安装 Everything: https://www.voidtools.com/zh-cn/downloads/
- 打开 Everything → 工具 → 选项 → HTTP 服务器
- 勾选「启用 HTTP 服务器」
- 端口保持默认 80
- 点击确定

### 2. 视频文件命名规范

- 文件名必须包含番号
- 文件格式为 .mp4
- 示例：SSIS-123.mp4、[FHD]SSIS-123.mp4

### 3. PotPlayer 安装

- PotPlayer 官网下载: https://potplayer.daum.net/
- 安装后自动注册 potplayer:// 协议，无需额外配置

## 使用方法

1. 访问 https://www.javbus.com 任意影片详情页
2. 右下角出现浮动按钮，自动检测本地文件（约 0.5-1 秒）
3. 按钮显示状态：
   - 绿色「本地播放」→ 点击即可播放
   - 橙色「无本地文件」→ 提示未找到文件
4. 按钮可随意拖动，位置自动保存

## 技术实现

脚本流程：

JAVBus 页面
    |
    ├─ 提取番号
    ├─ 调用 Everything JSON API
    │       └─ http://127.0.0.1:80/?json=1&search=番号+.mp4
    ├─ 解析结果，缓存状态
    └─ 用户点击 → 打开 Everything 搜索页

Everything 页面 (127.0.0.1)
    |
    ├─ 解析番号
    ├─ 查找 .mp4 链接
    └─ 调用 potplayer:// 协议 → PotPlayer 播放

使用的 API：
- Everything HTTP JSON API: http://127.0.0.1:80/?json=1&search=xxx
- PotPlayer 协议: potplayer://http://127.0.0.1/视频路径

## 常见问题

Q: 点击按钮提示「无法连接 Everything」
A: 检查 Everything 是否开启 HTTP 服务，任务栏右键 Everything → 选项 → HTTP 服务器 → 启用

Q: 明明有文件，却提示「无本地文件」
A: 
- 确认文件名包含番号且以 .mp4 结尾
- Everything 中手动搜索「番号 .mp4」看是否有结果
- 检查 Everything 索引路径：工具 → 选项 → 索引 → 文件夹 → 添加视频文件夹

Q: 按钮拖到了屏幕外，找不到了
A: 浏览器控制台执行：
   localStorage.removeItem('javbus_btn_right');
   localStorage.removeItem('javbus_btn_bottom');
   location.reload();

Q: 能否支持其他播放器？
A: 可以，修改脚本中的 potplayer:// 为其他播放器协议：
   - VLC: vlc://
   - MPC-HC: mpc://
   - IINA (Mac): iina://

Q: Everything 端口不是 80
A: 修改脚本中的端口号，将 80 改为你的端口

## 更新日志

v0.1 (2026.5.26)
- 首次正式发布
- 支持 JAVBus 番号自动识别
- 支持 Everything JSON API 快速检测
- 支持按钮拖动与位置记忆
- 支持 PotPlayer 一键播放
- 文件状态可视化（绿/橙双色）
- 支持 SPA 页面自动切换检测

## 相关链接

- Everything 下载: https://www.voidtools.com/zh-cn/downloads/
- PotPlayer 下载: https://potplayer.daum.net/
- Tampermonkey 下载: https://www.tampermonkey.net/
- Greasy Fork 页面: 等待发布
