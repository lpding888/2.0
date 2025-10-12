#!/usr/bin/env node

/**
 * 数据库恢复脚本
 * 支持Windows和Linux
 *
 * 使用方法：
 * node restore-database.js backup_2025-01-12_10-30-00.sql.gz
 *
 * 或指定完整路径：
 * node restore-database.js /path/to/backup.sql.gz
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const dotenv = require('dotenv');

// 加载环境变量
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('❌ .env文件不存在');
  process.exit(1);
}

// 配置
const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ai_photo',
  backupDir: process.env.BACKUP_DIR || path.join(__dirname, '../../backups/database'),
  isWindows: process.platform === 'win32'
};

// 创建readline接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 询问用户确认
function askConfirmation(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// 列出可用的备份文件
function listBackups() {
  try {
    const files = fs.readdirSync(config.backupDir);
    const backupFiles = files
      .filter(f => f.startsWith('backup_') && (f.endsWith('.sql') || f.endsWith('.gz') || f.endsWith('.zip')))
      .map(f => {
        const filePath = path.join(config.backupDir, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          size: (stats.size / (1024 * 1024)).toFixed(2) + 'MB',
          time: stats.mtime.toLocaleString('zh-CN')
        };
      })
      .sort((a, b) => fs.statSync(b.path).mtime.getTime() - fs.statSync(a.path).mtime.getTime());

    return backupFiles;
  } catch (error) {
    console.error('❌ 无法读取备份目录:', error.message);
    return [];
  }
}

// 解压备份文件
function decompressBackup(compressedFile) {
  return new Promise((resolve, reject) => {
    const sqlFile = compressedFile.replace(/\.(gz|zip)$/, '');

    console.log('📦 正在解压备份文件...');

    let decompressCommand;

    if (compressedFile.endsWith('.gz')) {
      // gzip压缩
      decompressCommand = config.isWindows
        ? `powershell -command "& {Import-Module Microsoft.PowerShell.Archive; Expand-Archive -Path '${compressedFile}' -DestinationPath '${path.dirname(sqlFile)}' -Force}"`
        : `gunzip -c "${compressedFile}" > "${sqlFile}"`;
    } else if (compressedFile.endsWith('.zip')) {
      // zip压缩
      decompressCommand = config.isWindows
        ? `powershell Expand-Archive -Path "${compressedFile}" -DestinationPath "${path.dirname(sqlFile)}" -Force`
        : `unzip -o "${compressedFile}" -d "${path.dirname(sqlFile)}"`;
    } else {
      // 不是压缩文件，直接使用
      resolve(compressedFile);
      return;
    }

    exec(decompressCommand, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`解压失败: ${error.message}`));
        return;
      }

      if (!fs.existsSync(sqlFile)) {
        reject(new Error('解压后的SQL文件不存在'));
        return;
      }

      console.log(`✅ 解压完成: ${sqlFile}`);
      resolve(sqlFile);
    });
  });
}

// 构建mysql恢复命令
function buildMysqlCommand(sqlFile) {
  const mysqlPath = config.isWindows ? 'mysql' : 'mysql';

  let command = `${mysqlPath} -h ${config.host} -u ${config.user}`;

  if (config.password) {
    command += ` -p${config.password}`;
  }

  command += ` ${config.database}`;

  // 从文件读取SQL
  if (config.isWindows) {
    command = `type "${sqlFile}" | ${command}`;
  } else {
    command += ` < "${sqlFile}"`;
  }

  return command;
}

// 执行恢复
async function performRestore(backupFile) {
  console.log('');
  console.log('='.repeat(60));
  console.log('🚀 开始数据库恢复');
  console.log('='.repeat(60));
  console.log(`📅 时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`💾 数据库: ${config.database}`);
  console.log(`📁 备份文件: ${backupFile}`);
  console.log(`🖥️  平台: ${config.isWindows ? 'Windows' : 'Linux'}`);
  console.log('');

  // 检查文件是否存在
  if (!fs.existsSync(backupFile)) {
    throw new Error(`备份文件不存在: ${backupFile}`);
  }

  // 警告：恢复会覆盖现有数据
  console.log('⚠️  警告: 此操作将覆盖现有数据库！');
  console.log('⚠️  建议在恢复前先备份当前数据库。');
  console.log('');

  const confirmed = await askConfirmation('确定要继续吗？(y/n): ');

  if (!confirmed) {
    console.log('❌ 操作已取消');
    return;
  }

  let sqlFile = backupFile;
  let needsCleanup = false;

  // 如果是压缩文件，先解压
  if (backupFile.endsWith('.gz') || backupFile.endsWith('.zip')) {
    try {
      sqlFile = await decompressBackup(backupFile);
      needsCleanup = true; // 标记需要清理解压的文件
    } catch (error) {
      throw new Error(`解压失败: ${error.message}`);
    }
  }

  // 构建恢复命令
  const command = buildMysqlCommand(sqlFile);
  const safeCommand = command.replace(/-p[^\s]+/, '-p***');

  console.log('');
  console.log(`📝 执行命令: ${safeCommand}`);
  console.log('');
  console.log('⏳ 正在恢复数据库，请稍候...');

  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      // 清理解压的临时文件
      if (needsCleanup && fs.existsSync(sqlFile)) {
        try {
          fs.unlinkSync(sqlFile);
          console.log('🗑️  清理临时文件');
        } catch (e) {
          console.warn('⚠️  清理临时文件失败');
        }
      }

      if (error) {
        console.error('');
        console.error('❌ 恢复失败:', error.message);

        if (error.message.includes('Access denied')) {
          console.error('💡 提示: 数据库认证失败，请检查用户名和密码');
        } else if (error.message.includes('Unknown database')) {
          console.error('💡 提示: 数据库不存在，请先创建数据库');
        }

        reject(error);
        return;
      }

      console.log('');
      console.log('='.repeat(60));
      console.log('✅ 数据库恢复完成！');
      console.log('='.repeat(60));
      console.log('');

      resolve();
    });
  });
}

// 主函数
async function main() {
  try {
    const backupFile = process.argv[2];

    if (!backupFile) {
      // 没有指定文件，列出可用备份
      console.log('');
      console.log('📋 可用的备份文件:');
      console.log('');

      const backups = listBackups();

      if (backups.length === 0) {
        console.log('❌ 没有找到备份文件');
        console.log('');
        process.exit(1);
      }

      backups.forEach((backup, index) => {
        console.log(`${index + 1}. ${backup.name}`);
        console.log(`   大小: ${backup.size}`);
        console.log(`   时间: ${backup.time}`);
        console.log('');
      });

      console.log('使用方法:');
      console.log(`  node restore-database.js ${backups[0].name}`);
      console.log('');

      rl.close();
      process.exit(0);
    }

    // 确定备份文件路径
    let fullPath;
    if (path.isAbsolute(backupFile)) {
      fullPath = backupFile;
    } else {
      fullPath = path.join(config.backupDir, backupFile);
    }

    await performRestore(fullPath);

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ 恢复失败');
    console.error('='.repeat(60));
    console.error(`错误: ${error.message}`);
    console.error('');

    rl.close();
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { performRestore, config };
