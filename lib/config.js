/**
 * 配置文件管理模块
 * 负责读写 ~/.claude-proxy/config.json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.claude-proxy');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const DEFAULT_PORT = 12346;

/**
 * 确保配置目录存在
 */
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * 读取配置文件
 * @returns {Object} 配置对象
 */
function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`警告: 配置文件读取失败 - ${error.message}`);
  }
  return {};
}

/**
 * 写入配置文件
 * @param {Object} config 配置对象
 */
function writeConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * 获取端口配置
 * 优先级: CLI 参数 > 配置文件 > 环境变量 > 默认值
 * @param {number|null} cliPort CLI 参数指定的端口
 * @returns {number} 端口号
 */
function getPort(cliPort = null) {
  // 1. CLI 参数优先级最高
  if (cliPort !== null && cliPort !== undefined) {
    return cliPort;
  }

  // 2. 配置文件
  const config = readConfig();
  if (config.port) {
    return config.port;
  }

  // 3. 环境变量
  if (process.env.PORT) {
    const envPort = parseInt(process.env.PORT, 10);
    if (!isNaN(envPort)) {
      return envPort;
    }
  }

  // 4. 默认值
  return DEFAULT_PORT;
}

/**
 * 保存端口配置
 * @param {number} port 端口号
 */
function savePort(port) {
  const config = readConfig();
  config.port = port;
  writeConfig(config);
}

/**
 * 检查是否首次运行（配置文件不存在）
 * @returns {boolean}
 */
function isFirstRun() {
  return !fs.existsSync(CONFIG_FILE);
}

/**
 * 验证端口号是否有效
 * @param {number} port 端口号
 * @returns {{valid: boolean, error?: string}}
 */
function validatePort(port) {
  const num = parseInt(port, 10);
  if (isNaN(num)) {
    return { valid: false, error: '端口必须是数字' };
  }
  if (num < 1024 || num > 65535) {
    return { valid: false, error: '端口范围必须在 1024-65535 之间' };
  }
  return { valid: true };
}

module.exports = {
  CONFIG_DIR,
  CONFIG_FILE,
  DEFAULT_PORT,
  readConfig,
  writeConfig,
  getPort,
  savePort,
  isFirstRun,
  validatePort
};
