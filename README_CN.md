<div align="center">

# Open Claude Code Proxy

**通过官方 Claude Code 客户端转发 API 请求**

[English](./README.md) | [中文](./README_CN.md)

[![npm version](https://img.shields.io/npm/v/open-claude-code-proxy.svg?style=flat-square)](https://www.npmjs.com/package/open-claude-code-proxy)
[![npm downloads](https://img.shields.io/npm/dm/open-claude-code-proxy.svg?style=flat-square)](https://www.npmjs.com/package/open-claude-code-proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen?style=flat-square)](https://nodejs.org/)

</div>

---

## 这是什么？

一个本地代理服务器，将 Anthropic API 请求通过**官方 Claude Code CLI** 转发。这允许你在任何支持 Anthropic API 的应用（如 [OpenCode](https://opencode.ai)、Cursor 等）中使用 Claude，同时利用现有的 Claude Code 登录会话。

### 功能特性

- **工具兼容**：自动工具名映射（Read→read, WebSearch→websearch_exa_* 等）
- **参数转换**：自动参数名转换（file_path→filePath, old_string→oldString 等）
- **多轮对话**：完整对话历史支持，包括 tool_use/tool_result
- **缓存优化**：处理 cache_control 避免与 Claude Code 冲突
- **OpenCode 集成**：自动配置 OpenCode，支持备份

## 工作原理

```
你的应用 (OpenCode/Cursor/等)
    ↓ POST /v1/messages
localhost:12346 (本代理)
    ↓ 调用 `claude --print`
Claude Code CLI (官方客户端)
    ↓ 使用你的登录会话
Anthropic API
```

## 快速开始

### 方式 1: 让 AI 帮你安装（推荐）

在 OpenCode/Cursor/Claude 中粘贴这句话：

```
Install and configure by following the instructions here https://raw.githubusercontent.com/lkyxuan/open-claude-code-proxy/main/INSTALL_GUIDE.md
```

### 方式 2: 全局安装（手动）

```bash
npm install -g open-claude-code-proxy
claude-local-proxy
```

### 方式 3: 克隆运行

```bash
git clone https://github.com/lkyxuan/open-claude-code-proxy.git
cd open-claude-code-proxy
node cli.js
```

## 前置条件

1. **安装 Claude Code CLI**
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **登录 Claude Code**
   ```bash
   claude auth login
   ```

3. **配置 Claude Code 环境变量**（如使用中转服务）
   ```bash
   # 添加到 ~/.zshrc 或 ~/.bashrc
   export ANTHROPIC_BASE_URL="https://your-relay-service.com/v1"
   export ANTHROPIC_API_KEY="your-api-key"
   source ~/.zshrc
   ```

## 端口配置

代理支持灵活的端口配置方式：

```bash
# 使用命令行参数
claude-local-proxy --port 8080
claude-local-proxy -p 8080

# 或使用环境变量
PORT=8080 claude-local-proxy

# 或使用已保存的配置 (~/.claude-proxy/config.json)
claude-local-proxy
```

**端口优先级**：命令行参数 > 配置文件 > 环境变量 > 默认值 (12346)

首次运行时会提示你自定义端口，你的选择会被保存供后续使用。

## OpenCode 自动配置

代理可以自动为 [OpenCode](https://opencode.ai) 配置连接：

- 自动检测 `~/.config/opencode/opencode.json` 配置文件
- 更新 `provider.anthropic.options.baseURL` 为代理端口
- 修改前自动备份（保留最近 3 个备份）
- 修改前会询问确认（使用 `--skip-opencode` 跳过）

```bash
# 自动配置 OpenCode
claude-local-proxy -p 8080

# 跳过 OpenCode 配置
claude-local-proxy -p 8080 --skip-opencode
```

## 配置客户端

将你的应用指向本地代理：

```json
{
  "baseURL": "http://localhost:12346",
  "apiKey": "任意字符串"
}
```

> **注意**：API Key 可以是任意字符串，实际认证由 Claude Code 会话处理。

## 命令说明

本项目提供两个命令：

### `claude-local-proxy` - 交互模式

```bash
claude-local-proxy [选项]

选项:
  -p, --port <port>    服务器端口 (1024-65535)
  --skip-opencode      跳过 OpenCode 自动配置
  -h, --help           显示帮助
  -v, --version        显示版本
```

### `claude-proxy` - 后台模式

| 命令 | 说明 |
|------|------|
| `claude-proxy start` | 启动服务（后台运行） |
| `claude-proxy stop` | 停止服务 |
| `claude-proxy restart` | 重启服务 |
| `claude-proxy status` | 查看状态 |
| `claude-proxy logs -f` | 查看日志（实时） |
| `claude-proxy test` | 测试连接 |

## API 端点

- `GET /health` - 健康检查
- `POST /v1/messages` - 消息接口（兼容 Anthropic API）

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| 提示需要登录 | 运行 `claude auth login` 重新登录 |
| 连接失败 | 检查环境变量 `echo $ANTHROPIC_BASE_URL` |
| 端口被占用 | 使用其他端口 `claude-local-proxy -p 12347` |
| 工具名不匹配 | 代理自动映射工具名（如 Read→read） |

---

<div align="center">

### 贡献

欢迎提交 PR 和 Issue！

### 许可证

[MIT](./LICENSE)

</div>
