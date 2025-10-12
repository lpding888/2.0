#!/usr/bin/env node

/**
 * 文件备份脚本
 * 备份uploads目录中的用户上传文件
 * 支持Windows和Linux
 *
 * 使用方法：
 * node backup-files.js
 *
 * 或配置环境变量：
 * BACKUP_DIR=/path/to/backups node backup-files.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const dotenv = require('dotenv');

// 加载环境变量
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// 配置
const config = {
  uploadsDir: path.join(__dirname, '../../uploads'),
  backupDir: process.env.BACKUP_DIR || path.join(__dirname, '../../backups/files'),
  maxBackups: parseInt(process.env.MAX_FILE_BACKUPS) || 7, // 保留7天文件备份
  isWindows: process.platform === 'win32'
};

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 获取目录大小
function getDirSize(dirPath) {
  let size = 0;

  function calculateSize(currentPath) {
    try {
      const stats = fs.statSync(currentPath);

      if (stats.isDirectory()) {
        const files = fs.readdirSync(currentPath);
        files.forEach(file => {
          calculateSize(path.join(currentPath, file));
        });
      } else {
        size += stats.size;
      }
    } catch (error) {
      console.warn(`⚠️  无法访问: ${currentPath}`);
    }
  }

  calculateSize(dirPath);
  return size;
}

// 格式化文件大小
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)}${units[unitIndex]}`;
}

// 统计文件数量
function countFiles(dirPath) {
  let count = 0;

  function countFilesRecursive(currentPath) {
    try {
      const stats = fs.statSync(currentPath);

      if (stats.isDirectory()) {
        const files = fs.readdirSync(currentPath);
        files.forEach(file => {
          countFilesRecursive(path.join(currentPath, file));
        });
      } else {
        count++;
      }
    } catch (error) {
      // 忽略错误
    }
  }

  countFilesRecursive(dirPath);
  return count;
}

// 创建压缩备份
function createArchive(sourceDir, targetFile) {
  return new Promise((resolve, reject) => {
    console.log('📦 正在创建压缩包...');

    let archiveCommand;

    if (config.isWindows) {
      // Windows使用PowerShell Compress-Archive
      archiveCommand = `powershell -command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${targetFile}.zip' -CompressionLevel Optimal -Force"`;
    } else {
      // Linux使用tar + gzip
      const tarFile = `${targetFile}.tar.gz`;
      archiveCommand = `tar -czf "${tarFile}" -C "${path.dirname(sourceDir)}" "${path.basename(sourceDir)}"`;
    }

    exec(archiveCommand, { maxBuffer: 1024 * 1024 * 100 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`压缩失败: ${error.message}`));
        return;
      }

      const finalFile = config.isWindows ? `${targetFile}.zip` : `${targetFile}.tar.gz`;

      if (!fs.existsSync(finalFile)) {
        reject(new Error('压缩文件未创建'));
        return;
      }

      console.log(`✅ 压缩完成: ${finalFile}`);
      console.log(`📊 压缩包大小: ${formatSize(fs.statSync(finalFile).size)}`);

      resolve(finalFile);
    });
  });
}

// 清理旧备份
function cleanOldBackups() {
  try {
    const files = fs.readdirSync(config.backupDir);
    const backupFiles = files
      .filter(f => f.startsWith('files_backup_') && (f.endsWith('.zip') || f.endsWith('.tar.gz')))
      .map(f => ({
        name: f,
        path: path.join(config.backupDir, f),
        time: fs.statSync(path.join(config.backupDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

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

// 增量备份（仅复制新增或修改的文件）
async function incrementalBackup(sourceDir, incrementalDir) {
  console.log('🔄 检查增量文件...');

  let copiedCount = 0;
  let copiedSize = 0;

  function copyIfNewer(sourcePath, targetPath) {
    try {
      const sourceStats = fs.statSync(sourcePath);

      if (sourceStats.isDirectory()) {
        // 确保目标目录存在
        if (!fs.existsSync(targetPath)) {
          fs.mkdirSync(targetPath, { recursive: true });
        }

        // 递归处理目录
        const files = fs.readdirSync(sourcePath);
        files.forEach(file => {
          copyIfNewer(
            path.join(sourcePath, file),
            path.join(targetPath, file)
          );
        });
      } else {
        // 检查文件是否需要复制
        let shouldCopy = false;

        if (!fs.existsSync(targetPath)) {
          shouldCopy = true;
        } else {
          const targetStats = fs.statSync(targetPath);
          if (sourceStats.mtime > targetStats.mtime || sourceStats.size !== targetStats.size) {
            shouldCopy = true;
          }
        }

        if (shouldCopy) {
          // 确保目标目录存在
          const targetDir = path.dirname(targetPath);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          fs.copyFileSync(sourcePath, targetPath);
          copiedCount++;
          copiedSize += sourceStats.size;
        }
      }
    } catch (error) {
      console.warn(`⚠️  复制失败: ${sourcePath} - ${error.message}`);
    }
  }

  copyIfNewer(sourceDir, incrementalDir);

  console.log(`✅ 增量备份完成: ${copiedCount} 个文件, ${formatSize(copiedSize)}`);
}

// 执行备份
async function performBackup() {
  console.log('');
  console.log('='.repeat(60));
  console.log('🚀 开始文件备份');
  console.log('='.repeat(60));
  console.log(`📅 时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`📁 源目录: ${config.uploadsDir}`);
  console.log(`📁 备份目录: ${config.backupDir}`);
  console.log(`🖥️  平台: ${config.isWindows ? 'Windows' : 'Linux'}`);
  console.log('');

  // 检查uploads目录是否存在
  if (!fs.existsSync(config.uploadsDir)) {
    console.log('⚠️  uploads目录不存在，跳过备份');
    return;
  }

  // 确保备份目录存在
  ensureDir(config.backupDir);

  // 统计源文件信息
  const sourceSize = getDirSize(config.uploadsDir);
  const fileCount = countFiles(config.uploadsDir);

  console.log(`📊 源文件统计:`);
  console.log(`   文件数量: ${fileCount}`);
  console.log(`   总大小: ${formatSize(sourceSize)}`);
  console.log('');

  if (fileCount === 0) {
    console.log('⚠️  没有文件需要备份');
    return;
  }

  // 生成备份文件名
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                    new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  const backupName = `files_backup_${timestamp}`;
  const backupPath = path.join(config.backupDir, backupName);

  try {
    // 先创建临时目录用于增量备份
    const tempDir = path.join(config.backupDir, `temp_${timestamp}`);
    ensureDir(tempDir);

    // 执行增量备份到临时目录
    await incrementalBackup(config.uploadsDir, tempDir);

    // 创建压缩包
    const archiveFile = await createArchive(tempDir, backupPath);

    // 删除临时目录
    console.log('🗑️  清理临时文件...');
    fs.rmSync(tempDir, { recursive: true, force: true });

    // 清理旧备份
    cleanOldBackups();

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ 文件备份完成！');
    console.log('='.repeat(60));
    console.log('');

    return archiveFile;
  } catch (error) {
    throw error;
  }
}

// 主函数
async function main() {
  try {
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
