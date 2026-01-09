# Open Claude Code Proxy - Installation Guide for AI Agents

This guide is designed for AI agents to follow step-by-step.

## Prerequisites Check

First, verify the environment:

```bash
# Check Node.js version (must be 18+)
node -v

# Check npm
npm -v
```

If Node.js is not installed or version < 18, stop and ask the user to install Node.js first.

## Step 1: Install Claude Code CLI

```bash
npm install -g @anthropic-ai/claude-code
```

Verify installation:
```bash
claude --version
```

## Step 2: Login to Claude Code

**IMPORTANT**: This step requires user interaction.

Tell the user to run:
```bash
claude auth login
```

Wait for the user to complete the login process before continuing.

## Step 3: Install the Proxy

```bash
npm install -g open-claude-code-proxy
```

## Step 4: Start the Proxy

```bash
claude-local-proxy
```

On first run, it will prompt for port configuration. Default is 12346.

## Step 5: Configure the AI Tool

After the proxy is running, configure the user's AI tool (OpenCode, Cursor, etc.):

**For OpenCode** (`~/.config/opencode/opencode.json`):
```json
{
  "provider": {
    "anthropic": {
      "options": {
        "baseURL": "http://localhost:12346"
      }
    }
  }
}
```

**For other tools**, set:
- Base URL: `http://localhost:12346`
- API Key: Any string (e.g., `sk-any-key-works`)

## Verification

Test the proxy is working:
```bash
curl http://localhost:12346/health
```

Expected response:
```json
{"status":"ok","service":"claude-local-proxy"}
```

## Background Mode (Optional)

For running as a background service:

```bash
claude-proxy start    # Start in background
claude-proxy stop     # Stop the service
claude-proxy status   # Check status
claude-proxy logs -f  # View live logs
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `claude: command not found` | Run `npm install -g @anthropic-ai/claude-code` |
| Login required | Run `claude auth login` |
| Port in use | Use `claude-local-proxy -p 12347` |
| Connection refused | Check if proxy is running with `claude-proxy status` |

## Summary

After completing all steps, the user should have:
1. Claude Code CLI installed and logged in
2. Open Claude Code Proxy running on port 12346
3. Their AI tool configured to use the proxy

The proxy allows any Anthropic API-compatible tool to use Claude through the user's Claude Code subscription.
