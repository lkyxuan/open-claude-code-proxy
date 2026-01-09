#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 12346;
const LOG_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '/tmp', '.claude-proxy');
const LOG_FILE = path.join(LOG_DIR, 'proxy.log');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 日志函数 - 同时输出到控制台和文件
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  let logLine = `[${timestamp}] ${message}`;
  if (data) {
    logLine += ' ' + JSON.stringify(data, null, 2);
  }
  console.log(logLine);
  fs.appendFileSync(LOG_FILE, logLine + '\n');
}

// Claude Code → OpenCode 参数名映射（snake_case → camelCase）
const PARAM_MAPPING = {
  'file_path': 'filePath',
  'old_string': 'oldString',
  'new_string': 'newString',
  'replace_all': 'replaceAll'
};

// Claude Code → OpenCode 工具名映射
const TOOL_NAME_MAPPING = {
  // 大写 → 小写
  'Read': 'read',
  'Write': 'write',
  'Edit': 'edit',
  'Bash': 'bash',
  'Glob': 'glob',
  'Grep': 'grep',
  'Task': 'task',
  'TodoWrite': 'todowrite',
  // 特殊映射
  'WebSearch': 'websearch_exa_web_search_exa',
  'WebFetch': 'webfetch'
};

// 转换 tool_use 中的工具名和参数名（Claude Code 格式 → OpenCode 格式）
function convertToolUse(content) {
  if (!Array.isArray(content)) return content;

  return content.map(block => {
    if (block.type !== 'tool_use') return block;

    // 转换工具名
    const convertedName = TOOL_NAME_MAPPING[block.name] || block.name;

    // 转换参数名
    const convertedInput = {};
    if (block.input) {
      for (const [key, value] of Object.entries(block.input)) {
        const newKey = PARAM_MAPPING[key] || key;
        convertedInput[newKey] = value;
      }
    }

    return { ...block, name: convertedName, input: convertedInput };
  });
}

// 清理所有 cache_control - 因为 Claude Code CLI 会加自己的，我们不能再加
function sanitizeCacheControl(requestData) {
  let removedCount = 0;

  // 清理 system 中的 cache_control
  if (Array.isArray(requestData.system)) {
    for (const block of requestData.system) {
      if (block.cache_control) {
        delete block.cache_control;
        removedCount++;
      }
    }
  }

  // 清理 messages 中的 cache_control
  if (Array.isArray(requestData.messages)) {
    for (const message of requestData.messages) {
      if (Array.isArray(message.content)) {
        for (const block of message.content) {
          if (block.cache_control) {
            delete block.cache_control;
            removedCount++;
          }
        }
      }
    }
  }

  // 清理 tools 中的 cache_control
  if (Array.isArray(requestData.tools)) {
    for (const tool of requestData.tools) {
      if (tool.cache_control) {
        delete tool.cache_control;
        removedCount++;
      }
    }
  }

  if (removedCount > 0) {
    log(`清理了 ${removedCount} 个 cache_control（让 Claude Code 使用自己的缓存策略）`);
  }
}

// 启动时清空日志
fs.writeFileSync(LOG_FILE, `=== Claude Local Proxy 启动于 ${new Date().toISOString()} ===\n`);

// 创建 HTTP 服务器
const server = http.createServer(async (req, res) => {
  // CORS 支持
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, anthropic-version, x-api-key');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 健康检查
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'claude-local-proxy' }));
    return;
  }

  // 处理 /messages 和 /v1/messages 请求
  if (req.method === 'POST' && (req.url === '/v1/messages' || req.url === '/messages')) {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        // 提取 API Key（支持多种格式）
        const apiKey = req.headers['x-api-key'] ||
                      req.headers['authorization']?.replace('Bearer ', '') ||
                      req.headers['anthropic-api-key'] ||
                      'anonymous';

        const requestData = JSON.parse(body);

        // 清理 cache_control - Anthropic API 最多允许 4 个
        sanitizeCacheControl(requestData);

        // 限制日志大小，保留最近的请求（超过 100KB 截断）
        try {
          const stats = fs.statSync(LOG_FILE);
          if (stats.size > 100 * 1024) {
            const content = fs.readFileSync(LOG_FILE, 'utf8');
            // 保留最后 50KB
            fs.writeFileSync(LOG_FILE, content.slice(-50 * 1024));
          }
        } catch (e) { /* 文件不存在时忽略 */ }

        // 详细记录请求信息（用于调试）
        log('========== 收到请求 ==========');
        log('1️⃣ User-Agent', {
          'user-agent': req.headers['user-agent']
        });
        log('2️⃣ 必需 Headers', {
          'x-app': req.headers['x-app'],
          'anthropic-beta': req.headers['anthropic-beta'],
          'anthropic-version': req.headers['anthropic-version']
        });
        log('3️⃣ Stainless SDK Headers', {
          'x-stainless-retry-count': req.headers['x-stainless-retry-count'],
          'x-stainless-timeout': req.headers['x-stainless-timeout'],
          'x-stainless-lang': req.headers['x-stainless-lang'],
          'x-stainless-package-version': req.headers['x-stainless-package-version'],
          'x-stainless-os': req.headers['x-stainless-os'],
          'x-stainless-arch': req.headers['x-stainless-arch'],
          'x-stainless-runtime': req.headers['x-stainless-runtime'],
          'x-stainless-runtime-version': req.headers['x-stainless-runtime-version'],
          'anthropic-dangerous-direct-browser-access': req.headers['anthropic-dangerous-direct-browser-access']
        });
        log('4️⃣ Body metadata', {
          metadata: requestData.metadata,
          user_id_in_metadata: requestData.metadata?.user_id
        });
        log('5️⃣ System Prompt', {
          system: typeof requestData.system === 'string'
            ? requestData.system.substring(0, 200) + '...'
            : requestData.system || 'none'
        });
        log('6️⃣ 用户消息', {
          messages: requestData.messages?.map(m => ({
            role: m.role,
            content: typeof m.content === 'string'
              ? m.content.substring(0, 300)
              : Array.isArray(m.content)
                ? m.content.map(c => c.type === 'text' ? c.text?.substring(0, 300) : `[${c.type}]`).join(' ')
                : '[complex]'
          }))
        });
        log('7️⃣ Tools', {
          toolsCount: requestData.tools?.length || 0,
          toolNames: requestData.tools?.map(t => t.name) || []
        });
        // 记录完整的工具定义（用于研究映射）
        if (requestData.tools && requestData.tools.length > 0) {
          log('完整 Tools 定义', JSON.stringify(requestData.tools, null, 2));
        }
        log('其他信息', {
          apiKey: apiKey.substring(0, 20) + '...',
          model: requestData.model,
          messagesCount: requestData.messages?.length,
          stream: requestData.stream
        });
        log('================================');

        // 检查是否需要流式响应
        const isStream = requestData.stream === true;

        if (isStream) {
          await handleStreamRequest(requestData, res);
        } else {
          await handleNormalRequest(requestData, res);
        }
      } catch (error) {
        console.error('[错误]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: error.message } }));
      }
    });
  } else {
    // 记录未知请求，方便调试
    console.log(`[${new Date().toISOString()}] 未处理的请求: ${req.method} ${req.url}`);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Not Found' } }));
  }
});

// 处理普通请求（非流式）
async function handleNormalRequest(requestData, res) {
  const messages = requestData.messages || [];

  // 构建 prompt：把 messages 数组转成对话格式
  let prompt = buildPromptFromMessages(messages);

  // 如果有工具定义，在用户消息前面加上指令（而不是在 system prompt 中）
  if (requestData.tools && requestData.tools.length > 0) {
    const toolInstruction = `[PROXY MODE] You are being accessed through a proxy. For this request, use ONLY the following client-defined tools instead of any built-in tools:

${JSON.stringify(requestData.tools, null, 2)}

When you want to use one of these tools, respond with tool_use in your content array. Now here is the user's request:

`;
    prompt = toolInstruction + prompt;
  }

  return new Promise((resolve, reject) => {
    // 使用 JSON 输出格式，支持 tool_use
    const args = [
      '--print',
      '--output-format', 'json'
    ];

    args.push(prompt);

    const claude = spawn('claude', args, {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    claude.stdout.on('data', (data) => {
      output += data.toString();
    });

    claude.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    claude.on('close', (code) => {
      if (code !== 0) {
        console.error('[Claude 错误]', errorOutput);
      }

      try {
        // 解析 Claude 的 JSON 输出
        const claudeResponse = JSON.parse(output.trim());

        // 转换 tool_use 参数名（Claude Code → OpenCode 格式）
        const convertedContent = convertToolUse(claudeResponse.content);

        // 构建 Anthropic API 格式的响应
        const response = {
          id: claudeResponse.id || `msg_${Date.now()}`,
          type: 'message',
          role: 'assistant',
          content: convertedContent || [{ type: 'text', text: output.trim() }],
          model: requestData.model || 'claude-sonnet-4-20250514',
          stop_reason: claudeResponse.stop_reason || 'end_turn',
          stop_sequence: claudeResponse.stop_sequence || null,
          usage: claudeResponse.usage || {
            input_tokens: 0,
            output_tokens: 0
          }
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        resolve();
      } catch (parseError) {
        // 如果 JSON 解析失败，fallback 到纯文本模式
        console.error('[JSON 解析错误]', parseError);

        const response = {
          id: `msg_${Date.now()}`,
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: output.trim() }],
          model: requestData.model || 'claude-sonnet-4-20250514',
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: 0,
            output_tokens: 0
          }
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        resolve();
      }
    });

    claude.on('error', (error) => {
      console.error('[Spawn 错误]', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: error.message } }));
      reject(error);
    });
  });
}

// 处理流式请求
async function handleStreamRequest(requestData, res) {
  const messages = requestData.messages || [];

  // 如果有工具定义，构建工具指令前缀
  const toolInstruction = requestData.tools && requestData.tools.length > 0
    ? `[PROXY MODE] You are being accessed through a proxy. For this request, use ONLY the following client-defined tools instead of any built-in tools:

${JSON.stringify(requestData.tools, null, 2)}

When you want to use one of these tools, respond with tool_use in your content array. Now here is the user's request:

`
    : '';

  // 使用 stream-json 格式与 Claude Code 交互
  return new Promise((resolve, reject) => {
    const args = [
      '--print',
      '--input-format', 'stream-json',
      '--output-format', 'stream-json',
      '--verbose'
    ];

    const claude = spawn('claude', args, {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // 设置 SSE 响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // 发送消息开始事件
    const messageId = `msg_${Date.now()}`;
    sendSSE(res, 'message_start', {
      type: 'message_start',
      message: {
        id: messageId,
        type: 'message',
        role: 'assistant',
        content: [],
        model: requestData.model || 'claude-sonnet-4-20250514',
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 }
      }
    });

    // 发送 content block 开始
    sendSSE(res, 'content_block_start', {
      type: 'content_block_start',
      index: 0,
      content_block: { type: 'text', text: '' }
    });

    let buffer = '';
    let fullText = '';
    let contentBlockIndex = 0;
    let currentBlockType = null;

    claude.stdout.on('data', (data) => {
      buffer += data.toString();

      // 解析 JSON 行
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留不完整的行

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const json = JSON.parse(line);

          if (json.type === 'assistant' && json.message?.content) {
            for (const content of json.message.content) {
              // 处理文本内容
              if (content.type === 'text' && content.text) {
                // 增量发送文本
                const newText = content.text.slice(fullText.length);
                if (newText) {
                  fullText = content.text;
                  sendSSE(res, 'content_block_delta', {
                    type: 'content_block_delta',
                    index: 0,
                    delta: { type: 'text_delta', text: newText }
                  });
                }
              }

              // 处理工具调用
              if (content.type === 'tool_use') {
                // 发送前一个 block 结束（如果有）
                if (currentBlockType) {
                  sendSSE(res, 'content_block_stop', {
                    type: 'content_block_stop',
                    index: contentBlockIndex
                  });
                  contentBlockIndex++;
                }

                // 转换工具名（Claude Code → OpenCode 格式）
                const convertedName = TOOL_NAME_MAPPING[content.name] || content.name;

                // 转换参数名（Claude Code → OpenCode 格式）
                const convertedInput = {};
                if (content.input) {
                  for (const [key, value] of Object.entries(content.input)) {
                    const newKey = PARAM_MAPPING[key] || key;
                    convertedInput[newKey] = value;
                  }
                }

                // 发送新的 tool_use block 开始
                sendSSE(res, 'content_block_start', {
                  type: 'content_block_start',
                  index: contentBlockIndex,
                  content_block: {
                    type: 'tool_use',
                    id: content.id,
                    name: convertedName,
                    input: {}
                  }
                });

                // 发送工具输入（使用转换后的参数名）
                sendSSE(res, 'content_block_delta', {
                  type: 'content_block_delta',
                  index: contentBlockIndex,
                  delta: {
                    type: 'input_json_delta',
                    partial_json: JSON.stringify(convertedInput)
                  }
                });

                currentBlockType = 'tool_use';
              }
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    });

    claude.stderr.on('data', (data) => {
      console.error('[Claude stderr]', data.toString());
    });

    claude.on('close', (code) => {
      // 发送结束事件
      sendSSE(res, 'content_block_stop', {
        type: 'content_block_stop',
        index: contentBlockIndex
      });

      sendSSE(res, 'message_delta', {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn', stop_sequence: null },
        usage: { output_tokens: 0 }
      });

      sendSSE(res, 'message_stop', { type: 'message_stop' });

      res.end();
      resolve();
    });

    claude.on('error', (error) => {
      console.error('[Spawn 错误]', error);
      res.end();
      reject(error);
    });

    // 构建完整的对话历史作为 prompt（包括 tool_use 和 tool_result）
    let fullPrompt = buildPromptFromMessages(messages);

    // 在 prompt 前加上工具指令（如果有）
    if (toolInstruction) {
      fullPrompt = toolInstruction + fullPrompt;
    }

    if (fullPrompt) {
      const input = JSON.stringify({
        type: 'user',
        message: { role: 'user', content: fullPrompt }
      }) + '\n';

      claude.stdin.write(input);
      claude.stdin.end();
    } else {
      claude.stdin.end();
    }
  });
}

// 把 messages 数组转成对话格式的 prompt
function buildPromptFromMessages(messages) {
  if (!messages || messages.length === 0) {
    return '';
  }

  // 如果只有一条消息，直接返回内容
  if (messages.length === 1) {
    return getMessageContent(messages[0]);
  }

  // 多条消息，构建对话上下文
  let prompt = '以下是之前的对话历史：\n\n';

  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i];
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    prompt += `${role}: ${getMessageContent(msg)}\n\n`;
  }

  // 最后一条消息作为当前请求
  const lastMessage = messages[messages.length - 1];
  prompt += `\n请基于上述对话历史，回复以下消息：\n\n${getMessageContent(lastMessage)}`;

  return prompt;
}

// 获取消息内容（支持 string 和 array 格式，包括 tool_use 和 tool_result）
function getMessageContent(message) {
  if (typeof message.content === 'string') {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .map(c => {
        if (c.type === 'text') {
          return c.text;
        }
        if (c.type === 'tool_use') {
          return `[调用工具 ${c.name}，参数: ${JSON.stringify(c.input)}]`;
        }
        if (c.type === 'tool_result') {
          const content = typeof c.content === 'string' ? c.content : JSON.stringify(c.content);
          return `[工具 ${c.tool_use_id} 返回: ${content.substring(0, 500)}${content.length > 500 ? '...' : ''}]`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

// 发送 SSE 事件
function sendSSE(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// 启动服务器
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║       Claude Local Proxy 已启动                 ║
╠════════════════════════════════════════════════╣
║  监听地址: http://localhost:${PORT}              ║
║  API 端点: http://localhost:${PORT}/v1/messages  ║
╠════════════════════════════════════════════════╣
║  配置说明:                                      ║
║  • baseURL: "http://localhost:${PORT}"          ║
║  • API Key: 任意字符串（不验证）                 ║
║                                                 ║
║  示例配置 (opencode/cursor):                    ║
║  {                                              ║
║    "baseURL": "http://localhost:${PORT}",       ║
║    "apiKey": "sk-any-key-works"                 ║
║  }                                              ║
╚════════════════════════════════════════════════╝
  `);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在关闭服务...');
  server.close(() => {
    console.log('服务已关闭');
    process.exit(0);
  });
});
