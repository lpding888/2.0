import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // MB
  acceptedFormats?: string[];
  disabled?: boolean;
}

export default function UploadZone({
  onFilesSelected,
  maxFiles = 50,
  maxSize = 10,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/jpg'],
  disabled = false
}: UploadZoneProps) {
  const [previews, setPreviews] = useState<Array<{ file: File; preview: string }>>([]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // 处理拒绝的文件
    rejectedFiles.forEach(({ file, errors }) => {
      errors.forEach((error: any) => {
        if (error.code === 'file-too-large') {
          toast.error(`${file.name} 超过${maxSize}MB大小限制`);
        } else if (error.code === 'file-invalid-type') {
          toast.error(`${file.name} 格式不支持`);
        } else if (error.code === 'too-many-files') {
          toast.error(`最多只能上传${maxFiles}张图片`);
        }
      });
    });

    if (acceptedFiles.length === 0) return;

    // 检查总数量
    if (previews.length + acceptedFiles.length > maxFiles) {
      toast.error(`最多只能上传${maxFiles}张图片，当前已有${previews.length}张`);
      return;
    }

    // 创建预览
    const newPreviews = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setPreviews(prev => [...prev, ...newPreviews]);
    onFilesSelected([...previews.map(p => p.file), ...acceptedFiles]);

    toast.success(`成功添加 ${acceptedFiles.length} 张图片`);
  }, [previews, maxFiles, maxSize, onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFormats.reduce((acc, format) => ({ ...acc, [format]: [] }), {}),
    maxSize: maxSize * 1024 * 1024,
    maxFiles: maxFiles - previews.length,
    disabled
  });

  const removeFile = (index: number) => {
    // 释放预览URL
    URL.revokeObjectURL(previews[index].preview);

    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    onFilesSelected(newPreviews.map(p => p.file));

    toast.success('已移除');
  };

  const clearAll = () => {
    if (previews.length === 0) return;

    if (confirm(`确定要清空所有 ${previews.length} 张图片吗？`)) {
      // 释放所有预览URL
      previews.forEach(p => URL.revokeObjectURL(p.preview));
      setPreviews([]);
      onFilesSelected([]);
      toast.success('已清空');
    }
  };

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer ${
          isDragActive
            ? 'border-purple-500 bg-purple-50'
            : disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center">
          {/* 图标 */}
          <div className="text-6xl mb-4">
            {isDragActive ? '📥' : '📁'}
          </div>

          {/* 提示文字 */}
          <p className="text-gray-700 font-medium mb-2">
            {isDragActive ? '松开以上传文件' : '拖拽图片到此处，或点击选择文件'}
          </p>

          <p className="text-sm text-gray-500 mb-4">
            支持 {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')} 格式
            <br />
            单张最大 {maxSize}MB，最多 {maxFiles} 张
          </p>

          {/* 按钮 */}
          {!disabled && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={(e) => e.stopPropagation()}
            >
              选择文件
            </button>
          )}
        </div>
      </div>

      {/* 已选择的文件 */}
      {previews.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-gray-700">
              已选择 {previews.length} / {maxFiles} 张图片
            </span>
            <button
              onClick={clearAll}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              清空全部
            </button>
          </div>

          {/* 预览网格 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {previews.map((item, index) => (
              <div key={index} className="relative group">
                {/* 图片预览 */}
                <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-lg leading-none hover:bg-red-600"
                  title="删除"
                >
                  ×
                </button>

                {/* 文件名和大小 */}
                <div className="mt-1 px-1">
                  <div className="text-xs text-gray-600 truncate" title={item.file.name}>
                    {item.file.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(item.file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>

                {/* 序号 */}
                <div className="absolute top-1 left-1 w-6 h-6 bg-black bg-opacity-60 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>

          {/* 统计信息 */}
          <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
            <div className="flex justify-between text-gray-700">
              <span>总文件大小:</span>
              <span className="font-medium">
                {(previews.reduce((sum, p) => sum + p.file.size, 0) / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            {previews.length >= maxFiles && (
              <div className="mt-2 text-orange-600 text-xs">
                ⚠️ 已达到最大上传数量限制
              </div>
            )}
          </div>
        </div>
      )}

      {/* 使用提示 */}
      {previews.length === 0 && !disabled && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">💡 上传提示</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 支持拖拽上传，可一次选择多张图片</li>
            <li>• 建议使用高清图片，效果更好</li>
            <li>• 人像照片建议正面清晰，光线充足</li>
            <li>• 服装照片建议背景简洁，主体突出</li>
          </ul>
        </div>
      )}
    </div>
  );
}
