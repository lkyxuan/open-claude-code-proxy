/**
 * OpenCode 配置管理模块
 * 负责检测、备份和更新 OpenCode 配置文件
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * 获取 OpenCode 配置文件路径（跨平台）
 * @returns {string} 配置文件路径
 */
function getOpenCodeConfigPath() {
  const homedir = os.homedir();
  if (process.platform === 'win32') {
    return path.join(homedir, '.config', 'opencode', 'opencode.json');
  }
  // macOS / Linux
  return path.join(homedir, '.config', 'opencode', 'opencode.json');
}

/**
 * 检测 OpenCode 配置文件是否存在
 * @returns {{exists: boolean, path: string}}
 */
function detectOpenCodeConfig() {
  const configPath = getOpenCodeConfigPath();
  return {
    exists: fs.existsSync(configPath),
    path: configPath
  };
}

/**
 * 读取 OpenCode 配置
 * @returns {{success: boolean, config?: Object, error?: string, path: string}}
 */
function readOpenCodeConfig() {
  const configPath = getOpenCodeConfigPath();
  try {
    if (!fs.existsSync(configPath)) {
      return { success: false, error: '配置文件不存在', path: configPath };
    }
    const content = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(content);
    return { success: true, config, path: configPath };
  } catch (error) {
    return { success: false, error: error.message, path: configPath };
  }
}

/**
 * 创建备份文件
 * @param {string} configPath 配置文件路径
 * @returns {{success: boolean, backupPath?: string, error?: string}}
 */
function createBackup(configPath) {
  try {
    if (!fs.existsSync(configPath)) {
      return { success: false, error: '配置文件不存在' };
    }

    const dir = path.dirname(configPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const backupPath = path.join(dir, `opencode.json.backup.${timestamp}`);

    // 复制文件
    fs.copyFileSync(configPath, backupPath);

    // 清理旧备份，只保留最近 3 个
    cleanupOldBackups(dir, 3);

    return { success: true, backupPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 清理旧备份文件
 * @param {string} dir 目录路径
 * @param {number} keepCount 保留数量
 */
function cleanupOldBackups(dir, keepCount) {
  try {
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('opencode.json.backup.'))
      .map(f => ({
        name: f,
        path: path.join(dir, f),
        mtime: fs.statSync(path.join(dir, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime); // 按修改时间降序

    // 删除多余的备份
    for (let i = keepCount; i < files.length; i++) {
      fs.unlinkSync(files[i].path);
    }
  } catch (error) {
    // 清理失败不影响主流程
  }
}

/**
 * 更新 OpenCode 配置中的 baseURL
 * @param {number} port 端口号
 * @param {boolean} createBackupFirst 是否先创建备份
 * @returns {{success: boolean, message: string, backupPath?: string, configPath?: string}}
 */
function updateOpenCodeBaseURL(port, createBackupFirst = true) {
  const configPath = getOpenCodeConfigPath();
  const newBaseURL = `http://localhost:${port}`;

  try {
    // 检查文件是否存在
    if (!fs.existsSync(configPath)) {
      return {
        success: false,
        message: 'OpenCode 配置文件不存在',
        configPath
      };
    }

    // 读取现有配置
    const content = fs.readFileSync(configPath, 'utf8');
    let config;
    try {
      config = JSON.parse(content);
    } catch {
      return {
        success: false,
        message: 'OpenCode 配置文件 JSON 格式无效',
        configPath
      };
    }

    // 检查当前 baseURL
    const currentBaseURL = config?.provider?.anthropic?.options?.baseURL;
    if (currentBaseURL === newBaseURL) {
      return {
        success: true,
        message: `OpenCode 配置已是最新 (baseURL: ${newBaseURL})`,
        configPath
      };
    }

    // 创建备份
    let backupPath = null;
    if (createBackupFirst) {
      const backupResult = createBackup(configPath);
      if (!backupResult.success) {
        return {
          success: false,
          message: `备份失败: ${backupResult.error}`,
          configPath
        };
      }
      backupPath = backupResult.backupPath;
    }

    // 确保嵌套结构存在
    if (!config.provider) config.provider = {};
    if (!config.provider.anthropic) config.provider.anthropic = {};
    if (!config.provider.anthropic.options) config.provider.anthropic.options = {};

    // 更新 baseURL
    config.provider.anthropic.options.baseURL = newBaseURL;

    // 写回配置文件
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

    return {
      success: true,
      message: `OpenCode 配置已更新 (baseURL: ${newBaseURL})`,
      backupPath,
      configPath
    };
  } catch (error) {
    if (error.code === 'EACCES') {
      return {
        success: false,
        message: '权限不足，无法写入 OpenCode 配置文件',
        configPath
      };
    }
    return {
      success: false,
      message: `更新失败: ${error.message}`,
      configPath
    };
  }
}

/**
 * 获取手动配置指南
 * @param {number} port 端口号
 * @returns {string} 配置指南文本
 */
function getManualConfigGuide(port) {
  const configPath = getOpenCodeConfigPath();
  return `
手动配置 OpenCode:
1. 编辑配置文件: ${configPath}
2. 添加或修改以下配置:

{
  "provider": {
    "anthropic": {
      "options": {
        "baseURL": "http://localhost:${port}"
      }
    }
  }
}

3. 重启 OpenCode 使配置生效
`;
}

module.exports = {
  getOpenCodeConfigPath,
  detectOpenCodeConfig,
  readOpenCodeConfig,
  createBackup,
  updateOpenCodeBaseURL,
  getManualConfigGuide
};
