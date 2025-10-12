import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface ImageItem {
  url: string;
  width?: number;
  height?: number;
  description?: string;
}

interface Work {
  work_id: string;
  type: string;
  status: string;
  images: ImageItem[];
  ai_description?: string;
  is_favorite?: boolean;
  created_at: string;
}

interface ImageGridProps {
  works: Work[];
  columns?: number; // 列数，默认根据屏幕大小自适应
  showActions?: boolean; // 是否显示操作按钮
  selectable?: boolean; // 是否可选择
  selectedIds?: Set<string>;
  onSelect?: (workId: string) => void;
  onView?: (work: Work) => void;
  onDownload?: (work: Work) => void;
  onFavorite?: (workId: string) => void;
  onDelete?: (workId: string) => void;
  emptyText?: string;
  loading?: boolean;
}

export default function ImageGrid({
  works,
  columns,
  showActions = true,
  selectable = false,
  selectedIds = new Set(),
  onSelect,
  onView,
  onDownload,
  onFavorite,
  onDelete,
  emptyText = '暂无作品',
  loading = false
}: ImageGridProps) {
  const [viewingImage, setViewingImage] = useState<{ work: Work; imageIndex: number } | null>(null);

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      fitting: '👗',
      photography: '📸',
      travel: '✈️'
    };
    return icons[type] || '🎨';
  };

  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      fitting: '试衣间',
      photography: '摄影',
      travel: '旅行'
    };
    return names[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; class: string }> = {
      pending: { label: '待处理', class: 'bg-yellow-100 text-yellow-800' },
      processing: { label: '处理中', class: 'bg-blue-100 text-blue-800' },
      completed: { label: '已完成', class: 'bg-green-100 text-green-800' },
      failed: { label: '失败', class: 'bg-red-100 text-red-800' }
    };
    const config = configs[status] || { label: status, class: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.class}`}>
        {config.label}
      </span>
    );
  };

  const handleImageClick = (work: Work, imageIndex: number = 0) => {
    if (onView) {
      onView(work);
    } else {
      setViewingImage({ work, imageIndex });
    }
  };

  const closeViewer = () => {
    setViewingImage(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!viewingImage) return;

    const { work, imageIndex } = viewingImage;
    const totalImages = work.images.length;

    let newIndex = imageIndex;
    if (direction === 'prev') {
      newIndex = imageIndex > 0 ? imageIndex - 1 : totalImages - 1;
    } else {
      newIndex = imageIndex < totalImages - 1 ? imageIndex + 1 : 0;
    }

    setViewingImage({ work, imageIndex: newIndex });
  };

  // 加载状态
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // 空状态
  if (works.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🎨</div>
        <p className="text-gray-600">{emptyText}</p>
      </div>
    );
  }

  // 网格布局类名
  const gridClass = columns
    ? `grid-cols-${columns}`
    : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  return (
    <>
      <div className={`grid ${gridClass} gap-4`}>
        {works.map(work => {
          const coverImage = work.images[0];
          const isSelected = selectedIds.has(work.work_id);

          return (
            <div
              key={work.work_id}
              className={`card p-0 overflow-hidden group transition-all ${
                isSelected ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              {/* 图片预览 */}
              <div className="relative aspect-square bg-gray-200">
                {coverImage ? (
                  <img
                    src={coverImage.url}
                    alt={work.ai_description || '作品'}
                    className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                    onClick={() => handleImageClick(work, 0)}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    暂无图片
                  </div>
                )}

                {/* 悬浮操作层 */}
                {showActions && work.status === 'completed' && (
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImageClick(work);
                        }}
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                        title="查看"
                      >
                        👁️
                      </button>
                      {onDownload && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload(work);
                          }}
                          className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                          title="下载"
                        >
                          ⬇️
                        </button>
                      )}
                      {onFavorite && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFavorite(work.work_id);
                          }}
                          className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                          title={work.is_favorite ? '取消收藏' : '收藏'}
                        >
                          {work.is_favorite ? '❤️' : '🤍'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 多图标识 */}
                {work.images.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                    {work.images.length} 张
                  </div>
                )}

                {/* 选择框 */}
                {selectable && onSelect && (
                  <div className="absolute top-2 left-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelect(work.work_id)}
                      className="w-5 h-5 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                {/* 收藏标识 */}
                {!selectable && work.is_favorite && (
                  <div className="absolute top-2 left-2 text-xl">
                    ❤️
                  </div>
                )}
              </div>

              {/* 作品信息 */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{getTypeIcon(work.type)}</span>
                    <span className="text-sm font-medium text-gray-700">
                      {getTypeName(work.type)}
                    </span>
                  </div>
                  {getStatusBadge(work.status)}
                </div>

                {work.ai_description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2" title={work.ai_description}>
                    {work.ai_description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{new Date(work.created_at).toLocaleDateString()}</span>
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(work.work_id);
                      }}
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 图片查看器 */}
      {viewingImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={closeViewer}
        >
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* 关闭按钮 */}
            <button
              onClick={closeViewer}
              className="absolute top-4 right-4 w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white text-2xl z-10"
            >
              ×
            </button>

            {/* 图片导航 */}
            {viewingImage.work.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage('prev');
                  }}
                  className="absolute left-4 w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white text-2xl z-10"
                >
                  ‹
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage('next');
                  }}
                  className="absolute right-4 w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white text-2xl z-10"
                >
                  ›
                </button>
              </>
            )}

            {/* 图片 */}
            <img
              src={viewingImage.work.images[viewingImage.imageIndex].url}
              alt="查看"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* 图片信息 */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg">
              <div className="text-sm">
                {viewingImage.imageIndex + 1} / {viewingImage.work.images.length}
              </div>
              {viewingImage.work.ai_description && (
                <div className="text-xs mt-1 opacity-80">
                  {viewingImage.work.ai_description}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
