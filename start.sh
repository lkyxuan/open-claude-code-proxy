#!/bin/bash

# Claude Local Proxy 启动脚本

cd "$(dirname "$0")"

# 检查 Claude Code 是否安装
# 直接测试 claude 命令是否可用（支持 npm 和 native 安装）
if ! claude --help &> /dev/null; then
    echo "❌ 错误: Claude Code 未安装或不在 PATH 中"
    echo ""
    echo "安装方式："
    echo "  1. npm 安装: npm install -g @anthropic-ai/claude-code"
    echo "  2. 或确保 native 安装的 claude 在 PATH 中"
    echo ""
    echo "提示: 如果已安装但找不到，请检查 PATH 环境变量"
    exit 1
fi

# 显示找到的 claude 路径
CLAUDE_PATH=$(which claude 2>/dev/null || command -v claude 2>/dev/null || echo "claude")
echo "✓ 找到 Claude Code: $CLAUDE_PATH"

# 检查 Claude Code 环境变量
if [ -z "$ANTHROPIC_BASE_URL" ]; then
    echo "⚠️  提示: ANTHROPIC_BASE_URL 未设置"
    echo "如需使用中转服务，请先设置环境变量:"
    echo "  export ANTHROPIC_BASE_URL=\"https://your-relay-service.com/v1\""
    echo "  export ANTHROPIC_API_KEY=\"your-api-key\""
    echo ""
fi

echo "🚀 启动 Claude Local Proxy..."
node server.js
