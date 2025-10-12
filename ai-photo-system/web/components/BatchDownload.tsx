import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'react-hot-toast';
import { FiDownload, FiX } from 'react-icons/fi';

interface BatchDownloadProps {
  workIds: string[];
  works: any[];
  onClose?: () => void;
}

export default function BatchDownload({ workIds, works, onClose }: BatchDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    if (workIds.length === 0) {
      toast.error('请先选择要下载的作品');
      return;
    }

    setIsDownloading(true);
    setProgress(0);

    try {
      const zip = new JSZip();
      const selectedWorks = works.filter(work => workIds.includes(work.work_id));

      toast.loading(`正在准备下载 ${selectedWorks.length} 个作品...`, { id: 'batch-download' });

      // 下载所有图片并添加到ZIP
      for (let i = 0; i < selectedWorks.length; i++) {
        const work = selectedWorks[i];
        const progress = Math.round(((i + 1) / selectedWorks.length) * 100);
        setProgress(progress);

        try {
          // 获取图片数据
          const response = await fetch(work.result_url);
          const blob = await response.blob();

          // 生成文件名
          const ext = work.result_url.split('.').pop()?.split('?')[0] || 'jpg';
          const timestamp = new Date(work.created_at).getTime();
          const filename = `${work.type}_${timestamp}_${work.work_id.substring(0, 8)}.${ext}`;

          // 添加到ZIP
          zip.file(filename, blob);
        } catch (error) {
          console.error(`下载作品 ${work.work_id} 失败:`, error);
          toast.error(`作品 ${work.work_id} 下载失败`);
        }
      }

      // 生成ZIP文件
      toast.loading('正在打包文件...', { id: 'batch-download' });
      const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        const progress = Math.round(metadata.percent);
        setProgress(progress);
      });

      // 下载ZIP文件
      const timestamp = new Date().getTime();
      const filename = `AI作品_${timestamp}.zip`;
      saveAs(content, filename);

      toast.success(`成功下载 ${selectedWorks.length} 个作品！`, { id: 'batch-download' });

      // 关闭对话框
      if (onClose) {
        setTimeout(onClose, 1000);
      }
    } catch (error) {
      console.error('批量下载失败:', error);
      toast.error('批量下载失败，请重试', { id: 'batch-download' });
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* 内容 */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 animate-scale-in">
        {/* 关闭按钮 */}
        {onClose && !isDownloading && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}

        {/* 标题 */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
            <FiDownload className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">批量下载</h3>
            <p className="text-sm text-gray-600">将作品打包为 ZIP 文件</p>
          </div>
        </div>

        {/* 信息 */}
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center p-4 bg-beige-100 rounded-xl">
            <span className="text-sm text-gray-700">已选择作品</span>
            <span className="text-lg font-bold text-primary">{workIds.length} 个</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl">
            <span className="text-sm text-gray-700">预计文件大小</span>
            <span className="text-lg font-semibold text-blue-600">
              ~{Math.round(workIds.length * 2)} MB
            </span>
          </div>
        </div>

        {/* 进度条 */}
        {isDownloading && (
          <div className="mb-6 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">下载进度</span>
              <span className="text-sm font-semibold text-primary">{progress}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              正在处理中，请稍候...
            </p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex space-x-3">
          {onClose && (
            <button
              onClick={onClose}
              disabled={isDownloading}
              className="flex-1 btn-outline"
            >
              取消
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={isDownloading || workIds.length === 0}
            className="flex-1 btn-primary"
          >
            {isDownloading ? (
              <>
                <span className="spinner mr-2"></span>
                下载中...
              </>
            ) : (
              <>
                <FiDownload className="inline mr-2" />
                开始下载
              </>
            )}
          </button>
        </div>

        {/* 提示信息 */}
        <div className="mt-4 p-3 bg-yellow-50 rounded-xl">
          <p className="text-xs text-yellow-800">
            💡 下载大量作品可能需要较长时间，请耐心等待
          </p>
        </div>
      </div>
    </div>
  );
}
