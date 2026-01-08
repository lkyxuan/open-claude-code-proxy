<div align="center">

# Open Claude Code Proxy

**Route API requests through the official Claude Code client**

[English](#english) | [中文](#中文)

[![npm version](https://img.shields.io/npm/v/open-claude-code-proxy.svg?style=flat-square)](https://www.npmjs.com/package/open-claude-code-proxy)
[![npm downloads](https://img.shields.io/npm/dm/open-claude-code-proxy.svg?style=flat-square)](https://www.npmjs.com/package/open-claude-code-proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen?style=flat-square)](https://nodejs.org/)

<img src="https://api.star-history.com/svg?repos=lkyxuan/open-claude-code-proxy&type=Date" alt="Star History Chart" width="600">

</div>

---

<a name="english"></a>

## English

### What is this?

A local proxy server that forwards Anthropic API requests through the **official Claude Code CLI**. This allows you to use Claude in any app that supports the Anthropic API (like [OpenCode](https://opencode.ai), Cursor, etc.) while leveraging your existing Claude Code authentication.

### How it works

```
Your App (OpenCode/Cursor/etc.)
    ↓ POST /v1/messages
localhost:12346 (This Proxy)
    ↓ Spawns `claude --print`
Claude Code CLI (Official Client)
    ↓ Uses your login session
Anthropic API
```

### Quick Start

#### Option 1: Use npx (Recommended)

```bash
npx open-claude-code-proxy
```

#### Option 2: Install globally

```bash
npm install -g open-claude-code-proxy
claude-proxy start
```

#### Option 3: Clone and run

```bash
git clone https://github.com/lkyxuan/open-claude-code-proxy.git
cd open-claude-code-proxy
./claude-proxy start
```

### Prerequisites

1. **Install Claude Code CLI**
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **Login to Claude Code**
   ```bash
   claude auth login
   ```

3. **Configure Claude Code environment** (if using a relay service)
   ```bash
   # Add to ~/.zshrc or ~/.bashrc
   export ANTHROPIC_BASE_URL="https://your-relay-service.com/v1"
   export ANTHROPIC_API_KEY="your-api-key"
   source ~/.zshrc
   ```

### Configure Your Client

Point your app to the local proxy:

```json
{
  "baseURL": "http://localhost:12346",
  "apiKey": "any-string-works"
}
```

> **Note**: The API key can be any string - authentication is handled by your Claude Code session.

### Commands

| Command | Description |
|---------|-------------|
| `claude-proxy start` | Start the proxy (background) |
| `claude-proxy stop` | Stop the proxy |
| `claude-proxy restart` | Restart the proxy |
| `claude-proxy status` | Check status |
| `claude-proxy logs -f` | View logs (live) |
| `claude-proxy test` | Test connectivity |

### API Endpoints

- `GET /health` - Health check
- `POST /v1/messages` - Messages API (Anthropic-compatible)

---

<a name="中文"></a>

## 中文

### 这是什么？

一个本地代理服务器，将 Anthropic API 请求通过**官方 Claude Code CLI** 转发。这允许你在任何支持 Anthropic API 的应用（如 [OpenCode](https://opencode.ai)、Cursor 等）中使用 Claude，同时利用现有的 Claude Code 登录会话。

### 工作原理

```
你的应用 (OpenCode/Cursor/等)
    ↓ POST /v1/messages
localhost:12346 (本代理)
    ↓ 调用 `claude --print`
Claude Code CLI (官方客户端)
    ↓ 使用你的登录会话
Anthropic API
```

### 快速开始

#### 方式 1: 使用 npx（推荐）

```bash
npx open-claude-code-proxy
```

#### 方式 2: 全局安装

```bash
npm install -g open-claude-code-proxy
claude-proxy start
```

#### 方式 3: 克隆运行

```bash
git clone https://github.com/lkyxuan/open-claude-code-proxy.git
cd open-claude-code-proxy
./claude-proxy start
```

### 前置条件

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

### 配置客户端

将你的应用指向本地代理：

```json
{
  "baseURL": "http://localhost:12346",
  "apiKey": "任意字符串"
}
```

> **注意**：API Key 可以是任意字符串，实际认证由 Claude Code 会话处理。

### 命令说明

| 命令 | 说明 |
|------|------|
| `claude-proxy start` | 启动服务（后台运行） |
| `claude-proxy stop` | 停止服务 |
| `claude-proxy restart` | 重启服务 |
| `claude-proxy status` | 查看状态 |
| `claude-proxy logs -f` | 查看日志（实时） |
| `claude-proxy test` | 测试连接 |

### API 端点

- `GET /health` - 健康检查
- `POST /v1/messages` - 消息接口（兼容 Anthropic API）

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| 提示需要登录 | 运行 `claude auth login` 重新登录 |
| 连接失败 | 检查环境变量 `echo $ANTHROPIC_BASE_URL` |
| 端口被占用 | 修改环境变量 `export PORT=12347` |

---

<div align="center">

### Contributing

PRs and issues are welcome!

### License

[MIT](./LICENSE) © 2025

</div>
