#!/usr/bin/env node

/**
 * Claude Local Proxy CLI
 * 交互式命令行入口
 */

const readline = require('readline');
const config = require('./lib/config');
const portUtils = require('./lib/port-utils');
const opencodeConfig = require('./lib/opencode-config');

const VERSION = '1.0.0';

/**
 * 解析命令行参数
 * @returns {{port: number|null, help: boolean, version: boolean, skipOpencode: boolean}}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    port: null,
    help: false,
    version: false,
    skipOpencode: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--version' || arg === '-v') {
      result.version = true;
    } else if (arg === '--skip-opencode') {
      result.skipOpencode = true;
    } else if (arg === '--port' || arg === '-p') {
      const portValue = args[++i];
      if (portValue) {
        result.port = parseInt(portValue, 10);
      }
    } else if (arg.startsWith('--port=')) {
      result.port = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('-p=')) {
      result.port = parseInt(arg.split('=')[1], 10);
    }
  }

  return result;
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
Claude Local Proxy - 本地代理服务器

用法:
  claude-local-proxy [选项]

选项:
  -p, --port <port>    指定服务器监听端口 (1024-65535)
  --skip-opencode      跳过 OpenCode 配置自动更新
  -h, --help           显示帮助信息
  -v, --version        显示版本号

端口优先级:
  1. 命令行参数 (--port)
  2. 配置文件 (~/.claude-proxy/config.json)
  3. 环境变量 (PORT)
  4. 默认值 (12346)

配置文件位置:
  ${config.CONFIG_FILE}

示例:
  claude-local-proxy                 # 使用默认端口或已保存的配置
  claude-local-proxy -p 8080         # 使用端口 8080
  claude-local-proxy --port=9000     # 使用端口 9000
  claude-local-proxy --skip-opencode # 跳过 OpenCode 配置更新
`);
}

/**
 * 创建 readline 接口
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * 异步询问用户输入
 * @param {readline.Interface} rl readline 接口
 * @param {string} question 问题
 * @returns {Promise<string>}
 */
function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * 交互式获取端口
 * @param {readline.Interface} rl readline 接口
 * @param {number} defaultPort 默认端口
 * @returns {Promise<number>}
 */
async function promptForPort(rl, defaultPort) {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const answer = await ask(rl, `请输入端口号 (默认: ${defaultPort}): `);

    if (!answer) {
      return defaultPort;
    }

    const port = parseInt(answer, 10);
    const validation = config.validatePort(port);

    if (validation.valid) {
      const available = await portUtils.isPortAvailable(port);
      if (available) {
        return port;
      } else {
        console.log(`\n${portUtils.getPortOccupiedMessage(port)}`);
        attempts++;
      }
    } else {
      console.log(`\n错误: ${validation.error}`);
      attempts++;
    }

    if (attempts < maxAttempts) {
      console.log(`请重新输入 (剩余尝试次数: ${maxAttempts - attempts})\n`);
    }
  }

  console.log(`\n已达到最大尝试次数，将使用默认端口 ${defaultPort}`);
  return defaultPort;
}

/**
 * 询问是否更新 OpenCode 配置
 * @param {readline.Interface} rl readline 接口
 * @returns {Promise<boolean>}
 */
async function askUpdateOpenCode(rl) {
  const answer = await ask(rl, '是否自动更新 OpenCode 配置? (Y/n): ');
  return answer.toLowerCase() !== 'n';
}

/**
 * 询问备份失败时是否继续
 * @param {readline.Interface} rl readline 接口
 * @returns {Promise<boolean>}
 */
async function askContinueWithoutBackup(rl) {
  const answer = await ask(rl, '备份失败，是否仍然继续更新配置? (y/N): ');
  return answer.toLowerCase() === 'y';
}

/**
 * 主函数
 */
async function main() {
  const args = parseArgs();

  // 显示版本
  if (args.version) {
    console.log(`claude-local-proxy v${VERSION}`);
    process.exit(0);
  }

  // 显示帮助
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // 验证 CLI 端口参数
  if (args.port !== null) {
    const validation = config.validatePort(args.port);
    if (!validation.valid) {
      console.error(`错误: ${validation.error}`);
      process.exit(1);
    }
  }

  let finalPort;
  let rl = null;

  try {
    // 确定端口
    if (args.port !== null) {
      // CLI 参数指定了端口
      finalPort = args.port;
    } else {
      // 获取配置的端口
      finalPort = config.getPort();

      // 检查端口是否可用
      const isAvailable = await portUtils.isPortAvailable(finalPort);

      if (!isAvailable) {
        console.log(`\n默认端口 ${finalPort} 已被占用。`);

        rl = createReadlineInterface();

        // 交互式获取新端口
        finalPort = await promptForPort(rl, config.DEFAULT_PORT);
      } else if (config.isFirstRun()) {
        // 首次运行，询问是否自定义端口
        console.log('\n欢迎使用 Claude Local Proxy!');
        console.log('这是首次运行，您可以自定义服务器端口。\n');

        rl = createReadlineInterface();

        const answer = await ask(rl, `使用默认端口 ${config.DEFAULT_PORT}? (Y/n): `);

        if (answer.toLowerCase() === 'n') {
          finalPort = await promptForPort(rl, config.DEFAULT_PORT);
        }
      }
    }

    // 再次检查最终端口是否可用
    const finalAvailable = await portUtils.isPortAvailable(finalPort);
    if (!finalAvailable) {
      console.error(`\n错误: 端口 ${finalPort} 不可用。`);
      console.log(portUtils.getPortOccupiedMessage(finalPort));
      if (rl) rl.close();
      process.exit(1);
    }

    // 保存端口配置
    config.savePort(finalPort);
    console.log(`\n端口配置已保存: ${finalPort}`);

    // OpenCode 配置更新
    if (!args.skipOpencode) {
      const opencodeDetect = opencodeConfig.detectOpenCodeConfig();

      if (opencodeDetect.exists) {
        let shouldUpdate = true;

        // 如果有交互能力，询问用户
        if (!rl && process.stdin.isTTY) {
          rl = createReadlineInterface();
        }

        if (rl) {
          shouldUpdate = await askUpdateOpenCode(rl);
        }

        if (shouldUpdate) {
          const updateResult = opencodeConfig.updateOpenCodeBaseURL(finalPort);

          if (updateResult.success) {
            console.log(`\n${updateResult.message}`);
            if (updateResult.backupPath) {
              console.log(`备份文件: ${updateResult.backupPath}`);
            }
            console.log('\n请重启 OpenCode 以使配置生效。');
          } else {
            console.log(`\n警告: ${updateResult.message}`);
            console.log(opencodeConfig.getManualConfigGuide(finalPort));
          }
        } else {
          console.log('\n跳过 OpenCode 配置更新。');
          console.log(opencodeConfig.getManualConfigGuide(finalPort));
        }
      } else {
        console.log('\n未检测到 OpenCode 配置文件。');
        console.log(opencodeConfig.getManualConfigGuide(finalPort));
      }
    }

    if (rl) {
      rl.close();
    }

    // 设置环境变量并启动服务器
    process.env.PORT = finalPort.toString();

    console.log('\n正在启动代理服务器...\n');

    // 加载并运行服务器
    require('./server');

  } catch (error) {
    console.error('启动失败:', error.message);
    if (rl) rl.close();
    process.exit(1);
  }
}

// 运行
main();
