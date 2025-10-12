const express = require('express');
const router = express.Router();
const path = require('path');
const { upload, saveBase64Image, calculateFileHash, deleteFile } = require('../utils/upload');
const { authMiddleware } = require('../middleware/auth');

// 上传单个文件
router.post('/single', authMiddleware, (req, res, next) => {
  req.uploadType = 'users'; // 设置上传子目录

  upload.single('file')(req, res, async (err) => {
    if (err) {
      return next(err);
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '未找到上传的文件'
      });
    }

    try {
      // 计算文件哈希
      const fileHash = await calculateFileHash(req.file.path);

      res.json({
        success: true,
        message: '上传成功',
        data: {
          file_name: req.file.filename,
          file_url: `/uploads/users/${req.file.filename}`,
          file_path: req.file.path,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          file_hash: fileHash
        }
      });
    } catch (error) {
      next(error);
    }
  });
});

// 上传多个文件
router.post('/multiple', authMiddleware, (req, res, next) => {
  req.uploadType = 'users';

  upload.array('files', 50)(req, res, async (err) => {
    if (err) {
      return next(err);
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '未找到上传的文件'
      });
    }

    try {
      const files = await Promise.all(
        req.files.map(async (file) => {
          const fileHash = await calculateFileHash(file.path);
          return {
            file_name: file.filename,
            file_url: `/uploads/users/${file.filename}`,
            file_path: file.path,
            file_size: file.size,
            mime_type: file.mimetype,
            file_hash: fileHash
          };
        })
      );

      res.json({
        success: true,
        message: `成功上传 ${files.length} 个文件`,
        data: {
          files
        }
      });
    } catch (error) {
      next(error);
    }
  });
});

// Base64上传
router.post('/base64', authMiddleware, async (req, res, next) => {
  try {
    const { base64, subDir = 'users' } = req.body;

    if (!base64) {
      return res.status(400).json({
        success: false,
        message: '缺少base64数据'
      });
    }

    const result = await saveBase64Image(base64, subDir);

    // 计算文件哈希
    const fileHash = await calculateFileHash(result.filePath);

    res.json({
      success: true,
      message: '上传成功',
      data: {
        ...result,
        file_hash: fileHash
      }
    });

  } catch (error) {
    next(error);
  }
});

// 批量Base64上传
router.post('/base64/batch', authMiddleware, async (req, res, next) => {
  try {
    const { images, subDir = 'users' } = req.body;

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供base64图片数组'
      });
    }

    if (images.length > 50) {
      return res.status(400).json({
        success: false,
        message: '单次最多上传50张图片'
      });
    }

    const results = await Promise.all(
      images.map(async (base64) => {
        try {
          const result = await saveBase64Image(base64, subDir);
          const fileHash = await calculateFileHash(result.filePath);
          return {
            ...result,
            file_hash: fileHash,
            success: true
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `成功上传 ${successCount} 张图片${failedCount > 0 ? `，${failedCount} 张失败` : ''}`,
      data: {
        files: results,
        summary: {
          total: images.length,
          success: successCount,
          failed: failedCount
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// 删除文件
router.delete('/:fileName', authMiddleware, async (req, res, next) => {
  try {
    const { fileName } = req.params;
    const { subDir = 'users' } = req.query;

    const filePath = path.join(
      process.env.UPLOAD_DIR || './uploads',
      subDir,
      fileName
    );

    const result = await deleteFile(filePath);

    if (result) {
      res.json({
        success: true,
        message: '文件删除成功'
      });
    } else {
      res.status(404).json({
        success: false,
        message: '文件不存在或删除失败'
      });
    }

  } catch (error) {
    next(error);
  }
});

module.exports = router;
