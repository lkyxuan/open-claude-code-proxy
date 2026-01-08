/**
 * 端口检测工具模块
 * 负责检测端口可用性
 */

const net = require('net');

/**
 * 检测端口是否可用
 * @param {number} port 端口号
 * @returns {Promise<boolean>} 端口是否可用
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    // 不指定地址，检测所有接口
    server.listen(port);
  });
}

/**
 * 查找可用端口（从指定端口开始递增查找）
 * @param {number} startPort 起始端口
 * @param {number} maxAttempts 最大尝试次数
 * @returns {Promise<number|null>} 可用端口或 null
 */
async function findAvailablePort(startPort, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (port > 65535) break;

    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  return null;
}

/**
 * 获取占用指定端口的进程信息（仅用于提示）
 * @param {number} port 端口号
 * @returns {string} 提示信息
 */
function getPortOccupiedMessage(port) {
  return `端口 ${port} 已被占用。请使用 \`lsof -i :${port}\` 或 \`netstat -an | grep ${port}\` 查看占用进程。`;
}

module.exports = {
  isPortAvailable,
  findAvailablePort,
  getPortOccupiedMessage
};
