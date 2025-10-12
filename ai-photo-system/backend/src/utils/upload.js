const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// 确保上传目录存在
async function ensureUploadDir() {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const dirs = [
    uploadDir,
    path.join(uploadDir, 'users'),
    path.join(uploadDir, 'works'),
    path.join(uploadDir, 'temp')
  ];

  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  return uploadDir;
}

// 文件过滤器
function fileFilter(req, file, cb) {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg').split(',');

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
  }
}

// 生成文件名
function generateFileName(originalName) {
  const ext = path.extname(originalName);
  const hash = crypto.createHash('md5').update(uuidv4()).digest('hex').substring(0, 16);
  const timestamp = Date.now();
  return `${timestamp}_${hash}${ext}`;
}

// Multer存储配置
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = await ensureUploadDir();
    const subDir = req.uploadType || 'temp';
    const destPath = path.join(uploadDir, subDir);

    try {
      await fs.access(destPath);
    } catch {
      await fs.mkdir(destPath, { recursive: true });
    }

    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const fileName = generateFileName(file.originalname);
    cb(null, fileName);
  }
});

// Multer实例
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 默认10MB
    files: 50 // 最多50个文件
  }
});

// 计算文件哈希（用于去重）
async function calculateFileHash(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash('md5').update(buffer).digest('hex');
}

// Base64转Buffer
function base64ToBuffer(base64String) {
  // 支持 data:image/png;base64,xxx 格式
  const matches = base64String.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
  if (matches) {
    return {
      buffer: Buffer.from(matches[2], 'base64'),
      mimeType: `image/${matches[1]}`
    };
  }

  // 纯base64字符串
  return {
    buffer: Buffer.from(base64String, 'base64'),
    mimeType: 'image/jpeg'
  };
}

// 保存Base64图片
async function saveBase64Image(base64String, subDir = 'temp') {
  const uploadDir = await ensureUploadDir();
  const { buffer, mimeType } = base64ToBuffer(base64String);

  const ext = mimeType.split('/')[1];
  const fileName = generateFileName(`image.${ext}`);
  const filePath = path.join(uploadDir, subDir, fileName);

  await fs.writeFile(filePath, buffer);

  return {
    fileName,
    filePath,
    fileUrl: `/uploads/${subDir}/${fileName}`,
    fileSize: buffer.length,
    mimeType
  };
}

// 删除文件
async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('❌ 删除文件失败:', error.message);
    return false;
  }
}

// 批量删除文件
async function deleteFiles(filePaths) {
  const results = await Promise.allSettled(
    filePaths.map(fp => fs.unlink(fp))
  );

  const deleted = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return { deleted, failed };
}

module.exports = {
  upload,
  ensureUploadDir,
  calculateFileHash,
  base64ToBuffer,
  saveBase64Image,
  deleteFile,
  deleteFiles,
  generateFileName
};
