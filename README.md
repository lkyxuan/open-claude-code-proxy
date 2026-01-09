<div align="center">

# Open Claude Code Proxy

**Route API requests through the official Claude Code client**

[English](./README.md) | [中文](./README_CN.md)

[![npm version](https://img.shields.io/npm/v/open-claude-code-proxy.svg?style=flat-square)](https://www.npmjs.com/package/open-claude-code-proxy)
[![npm downloads](https://img.shields.io/npm/dm/open-claude-code-proxy.svg?style=flat-square)](https://www.npmjs.com/package/open-claude-code-proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen?style=flat-square)](https://nodejs.org/)

<img src="https://api.star-history.com/svg?repos=lkyxuan/open-claude-code-proxy&type=Date" alt="Star History Chart" width="600">

</div>

---

## What is this?

A local proxy server that forwards Anthropic API requests through the **official Claude Code CLI**. This allows you to use Claude in any app that supports the Anthropic API (like [OpenCode](https://opencode.ai), Cursor, etc.) while leveraging your existing Claude Code authentication.

## How it works

```
Your App (OpenCode/Cursor/etc.)
    ↓ POST /v1/messages
localhost:12346 (This Proxy)
    ↓ Spawns `claude --print`
Claude Code CLI (Official Client)
    ↓ Uses your login session
Anthropic API
```

## Quick Start

### Option 1: Install globally (Recommended)

```bash
npm install -g open-claude-code-proxy
claude-local-proxy
```

### Option 2: Clone and run

```bash
git clone https://github.com/lkyxuan/open-claude-code-proxy.git
cd open-claude-code-proxy
node cli.js
```

## Prerequisites

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

## Port Configuration

The proxy supports flexible port configuration:

```bash
# Use command line argument
claude-local-proxy --port 8080
claude-local-proxy -p 8080

# Or use environment variable
PORT=8080 claude-local-proxy

# Or let it use saved config (~/.claude-proxy/config.json)
claude-local-proxy
```

**Port Priority**: CLI argument > Config file > Environment variable > Default (12346)

On first run, you'll be prompted to customize the port. Your choice is saved for future use.

## OpenCode Auto-Configuration

The proxy can automatically configure [OpenCode](https://opencode.ai) for you:

- Detects OpenCode config at `~/.config/opencode/opencode.json`
- Updates `provider.anthropic.options.baseURL` to match your proxy port
- Creates automatic backups before modifying (keeps last 3)
- Prompts before making changes (use `--skip-opencode` to skip)

```bash
# Auto-configure OpenCode
claude-local-proxy -p 8080

# Skip OpenCode configuration
claude-local-proxy -p 8080 --skip-opencode
```

## Configure Your Client

Point your app to the local proxy:

```json
{
  "baseURL": "http://localhost:12346",
  "apiKey": "any-string-works"
}
```

> **Note**: The API key can be any string - authentication is handled by your Claude Code session.

## CLI Options

```
Usage: claude-local-proxy [options]

Options:
  -p, --port <port>    Server port (1024-65535)
  --skip-opencode      Skip OpenCode auto-configuration
  -h, --help           Show help
  -v, --version        Show version
```

## Commands

| Command | Description |
|---------|-------------|
| `claude-proxy start` | Start the proxy (background) |
| `claude-proxy stop` | Stop the proxy |
| `claude-proxy restart` | Restart the proxy |
| `claude-proxy status` | Check status |
| `claude-proxy logs -f` | View logs (live) |
| `claude-proxy test` | Test connectivity |

## API Endpoints

- `GET /health` - Health check
- `POST /v1/messages` - Messages API (Anthropic-compatible)

---

<div align="center">

### Contributing

PRs and issues are welcome!

### License

[MIT](./LICENSE) © 2025

</div>
