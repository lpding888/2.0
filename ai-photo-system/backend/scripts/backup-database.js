#!/usr/bin/env node

/**
 * 数据库备份脚本
 * 支持Windows和Linux
 *
 * 使用方法：
 * node backup-database.js
 *
 * 或配置环境变量：
 * BACKUP_DIR=/path/to/backups node backup-database.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('❌ .env文件不存在，请先配置环境变量');
  process.exit(1);
}

// 配置
const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ai_photo',
  backupDir: process.env.BACKUP_DIR || path.join(__dirname, '../../backups/database'),
  maxBackups: parseInt(process.env.MAX_BACKUPS) || 30, // 保留30天
  isWindows: process.platform === 'win32'
};

// 确保备份目录存在
if (!fs.existsSync(config.backupDir)) {
  fs.mkdirSync(config.backupDir, { recursive: true });
  console.log(`✅ 创建备份目录: ${config.backupDir}`);
}

// 生成备份文件名
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                  new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
const backupFile = path.join(config.backupDir, `backup_${timestamp}.sql`);
const compressedFile = `${backupFile}.gz`;

// 构建mysqldump命令
function buildMysqldumpCommand() {
  const mysqldumpPath = config.isWindows
    ? 'mysqldump' // Windows通常在PATH中
    : 'mysqldump'; // Linux通常在PATH中

  // 基础命令
  let command = `${mysqldumpPath} -h ${config.host} -u ${config.user}`;

  // 添加密码（如果有）
  if (config.password) {
    // Windows和Linux密码处理方式相同
    command += ` -p${config.password}`;
  }

  // 添加选项
  command += ` --single-transaction --quick --lock-tables=false`;
  command += ` --routines --triggers --events`;
  command += ` ${config.database}`;

  // 输出到文件
  if (config.isWindows) {
    command += ` > "${backupFile}"`;
  } else {
    command += ` > "${backupFile}"`;
  }

  return command;
}

// 压缩备份文件
function compressBackup() {
  return new Promise((resolve, reject) => {
    console.log('📦 正在压缩备份文件...');

    // 检查是否有gzip（Linux）或7z（Windows）
    const compressCommand = config.isWindows
      ? `powershell Compress-Archive -Path "${backupFile}" -DestinationPath "${backupFile}.zip" -Force`
      : `gzip "${backupFile}"`;

    exec(compressCommand, (error, stdout, stderr) => {
      if (error) {
        console.warn('⚠️  压缩失败，保留未压缩文件');
        resolve(backupFile);
        return;
      }

      // 删除原始未压缩文件
      if (fs.existsSync(backupFile)) {
        fs.unlinkSync(backupFile);
      }

      const finalFile = config.isWindows ? `${backupFile}.zip` : `${backupFile}.gz`;
      console.log(`✅ 压缩完成: ${finalFile}`);
      resolve(finalFile);
    });
  });
}

// 清理旧备份
function cleanOldBackups() {
  try {
    const files = fs.readdirSync(config.backupDir);
    const backupFiles = files
      .filter(f => f.startsWith('backup_') && (f.endsWith('.sql') || f.endsWith('.gz') || f.endsWith('.zip')))
      .map(f => ({
        name: f,
        path: path.join(config.backupDir, f),
        time: fs.statSync(path.join(config.backupDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // 按时间降序

    // 删除超过maxBackups数量的备份
    if (backupFiles.length > config.maxBackups) {
      const filesToDelete = backupFiles.slice(config.maxBackups);

      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️  删除旧备份: ${file.name}`);
      });

      console.log(`✅ 清理完成，保留最近 ${config.maxBackups} 个备份`);
    }
  } catch (error) {
    console.error('❌ 清理旧备份失败:', error.message);
  }
}

// 获取备份文件大小
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    return `${sizeInMB}MB`;
  } catch (error) {
    return '未知';
  }
}

// 验证备份文件
function validateBackup(filePath) {
  try {
    const stats = fs.statSync(filePath);

    // 检查文件是否存在且大小大于0
    if (stats.size === 0) {
      throw new Error('备份文件为空');
    }

    // 简单验证：检查文件是否包含SQL关键字（如果未压缩）
    if (filePath.endsWith('.sql')) {
      const content = fs.readFileSync(filePath, 'utf8', { start: 0, end: 1000 });
      if (!content.includes('MySQL dump') && !content.includes('CREATE TABLE')) {
        throw new Error('备份文件内容无效');
      }
    }

    return true;
  } catch (error) {
    console.error(`❌ 备份验证失败: ${error.message}`);
    return false;
  }
}

// 执行备份
async function performBackup() {
  console.log('');
  console.log('='.repeat(60));
  console.log('🚀 开始数据库备份');
  console.log('='.repeat(60));
  console.log(`📅 时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`💾 数据库: ${config.database}`);
  console.log(`📁 备份目录: ${config.backupDir}`);
  console.log(`🖥️  平台: ${config.isWindows ? 'Windows' : 'Linux'}`);
  console.log('');

  const command = buildMysqldumpCommand();

  // 不显示密码的命令（用于日志）
  const safeCommand = command.replace(/-p[^\s]+/, '-p***');
  console.log(`📝 执行命令: ${safeCommand}`);
  console.log('');

  return new Promise((resolve, reject) => {
    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error('❌ 备份失败:', error.message);

        // 常见错误提示
        if (error.message.includes('Access denied')) {
          console.error('💡 提示: 数据库认证失败，请检查用户名和密码');
        } else if (error.message.includes('Unknown database')) {
          console.error('💡 提示: 数据库不存在，请检查数据库名称');
        } else if (error.message.includes('command not found') || error.message.includes('不是内部或外部命令')) {
          console.error('💡 提示: mysqldump命令不存在，请安装MySQL客户端工具');
        }

        reject(error);
        return;
      }

      // 验证备份
      if (!validateBackup(backupFile)) {
        reject(new Error('备份验证失败'));
        return;
      }

      console.log(`✅ 备份成功: ${backupFile}`);
      console.log(`📊 文件大小: ${getFileSize(backupFile)}`);

      // 压缩备份
      try {
        const finalFile = await compressBackup();
        console.log(`📊 压缩后大小: ${getFileSize(finalFile)}`);

        // 清理旧备份
        cleanOldBackups();

        console.log('');
        console.log('='.repeat(60));
        console.log('✅ 备份完成！');
        console.log('='.repeat(60));
        console.log('');

        resolve(finalFile);
      } catch (compressError) {
        console.error('⚠️  压缩失败，但备份文件已创建');
        resolve(backupFile);
      }
    });
  });
}

// 主函数
async function main() {
  try {
    // 检查必要配置
    if (!config.database) {
      throw new Error('数据库名称未配置');
    }

    await performBackup();
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ 备份失败');
    console.error('='.repeat(60));
    console.error(`错误: ${error.message}`);
    console.error('');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { performBackup, config };
