import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useUserStore } from '../../lib/store';
import { worksAPI } from '../../lib/api';
import { toast } from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface Work {
  work_id: string;
  user_id: number;
  type: string;
  status: string;
  images: string;
  ai_description?: string;
  is_favorite: boolean;
  created_at: string;
}

interface ImageItem {
  url: string;
  width?: number;
  height?: number;
}

type FilterType = '' | 'fitting' | 'photography' | 'travel';
type FilterStatus = '' | 'pending' | 'processing' | 'completed' | 'failed';

export default function WorksPage() {
  const router = useRouter();
  const { user } = useUserStore();

  const [works, setWorks] = useState<Work[]>([]);
  const [filterType, setFilterType] = useState<FilterType>('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('completed');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at'>('created_at');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [selectedWorks, setSelectedWorks] = useState<Set<string>>(new Set());
  const [viewingWork, setViewingWork] = useState<Work | null>(null);
  const [downloadingWorkId, setDownloadingWorkId] = useState<string | null>(null);

  // 检查登录
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // 加载作品列表
  useEffect(() => {
    if (user) {
      loadWorks();
    }
  }, [user, filterType, filterStatus, sortBy, currentPage]);

  const loadWorks = async () => {
    setLoading(true);
    try {
      const response = await worksAPI.list({
        page: currentPage,
        pageSize: 20,
        type: filterType || undefined,
        status: filterStatus || undefined,
        sortBy: sortBy
      });

      if (response.success) {
        setWorks(response.data.works);
        setTotalPages(response.data.pagination.totalPages);
        setTotal(response.data.pagination.total);
      }
    } catch (error) {
      toast.error('加载作品失败');
    } finally {
      setLoading(false);
    }
  };

  // 切换收藏
  const toggleFavorite = async (workId: string) => {
    try {
      const work = works.find(w => w.work_id === workId);
      if (!work) return;

      await worksAPI.toggleFavorite(workId);

      setWorks(works.map(w =>
        w.work_id === workId ? { ...w, is_favorite: !w.is_favorite } : w
      ));

      toast.success(work.is_favorite ? '已取消收藏' : '已收藏');
    } catch (error) {
      toast.error('操作失败');
    }
  };

  // 删除作品
  const deleteWork = async (workId: string) => {
    if (!confirm('确定要删除这个作品吗？')) return;

    try {
      await worksAPI.delete(workId);
      toast.success('删除成功');
      loadWorks();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 批量删除
  const batchDelete = async () => {
    if (selectedWorks.size === 0) {
      toast.error('请先选择要删除的作品');
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedWorks.size} 个作品吗？`)) return;

    try {
      await worksAPI.batchDelete(Array.from(selectedWorks));
      toast.success('批量删除成功');
      setSelectedWorks(new Set());
      loadWorks();
    } catch (error) {
      toast.error('批量删除失败');
    }
  };

  // 下载作品
  const downloadWork = async (work: Work) => {
    setDownloadingWorkId(work.work_id);

    try {
      const images: ImageItem[] = JSON.parse(work.images);

      if (images.length === 1) {
        // 单张图片直接下载
        const response = await fetch(images[0].url);
        const blob = await response.blob();
        saveAs(blob, `work_${work.work_id}.jpg`);
      } else {
        // 多张图片打包下载
        const zip = new JSZip();

        toast.loading('正在打包下载...', { id: 'download' });

        for (let i = 0; i < images.length; i++) {
          const response = await fetch(images[i].url);
          const blob = await response.blob();
          zip.file(`image_${i + 1}.jpg`, blob);
        }

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `work_${work.work_id}.zip`);
        toast.success('下载完成', { id: 'download' });
      }
    } catch (error) {
      toast.error('下载失败');
    } finally {
      setDownloadingWorkId(null);
    }
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedWorks.size === works.length) {
      setSelectedWorks(new Set());
    } else {
      setSelectedWorks(new Set(works.map(w => w.work_id)));
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      fitting: '👗 试衣间',
      photography: '📸 摄影',
      travel: '✈️ 旅行'
    };
    return labels[type] || type;
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

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>我的作品 - AI摄影系统</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* 顶部导航 */}
        <nav className="bg-white shadow-sm sticky top-0 z-50">
          <div className="container-custom py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-2xl">📸</span>
                <span className="text-xl font-bold text-gray-800">AI摄影系统</span>
              </Link>

              <div className="flex items-center space-x-4">
                <Link href="/studio" className="text-gray-600 hover:text-gray-900">
                  创作工作室
                </Link>
                <Link href="/profile" className="text-gray-600 hover:text-gray-900">
                  个人中心
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="container-custom py-8">
          {/* 页面标题 */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">我的作品</h1>
            <p className="text-gray-600 mt-2">共 {total} 个作品</p>
          </div>

          {/* 筛选栏 */}
          <div className="card mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="text-sm text-gray-600 mr-2">类型:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as FilterType)}
                  className="border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">全部</option>
                  <option value="fitting">试衣间</option>
                  <option value="photography">摄影</option>
                  <option value="travel">旅行</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 mr-2">状态:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                  className="border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">全部</option>
                  <option value="pending">待处理</option>
                  <option value="processing">处理中</option>
                  <option value="completed">已完成</option>
                  <option value="failed">失败</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 mr-2">排序:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'created_at' | 'updated_at')}
                  className="border border-gray-300 rounded px-3 py-2"
                >
                  <option value="created_at">创建时间</option>
                  <option value="updated_at">更新时间</option>
                </select>
              </div>

              <div className="ml-auto flex gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="btn btn-outline"
                >
                  {selectedWorks.size === works.length ? '取消全选' : '全选'}
                </button>
                {selectedWorks.size > 0 && (
                  <button
                    onClick={batchDelete}
                    className="btn bg-red-600 text-white hover:bg-red-700"
                  >
                    删除选中 ({selectedWorks.size})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 作品列表 */}
          {loading ? (
            <div className="text-center py-20">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-gray-600">加载中...</p>
            </div>
          ) : works.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🎨</div>
              <p className="text-gray-600 mb-4">还没有作品</p>
              <Link href="/studio" className="btn btn-primary">
                去创作 →
              </Link>
            </div>
          ) : (
            <>
              <div className="image-grid">
                {works.map(work => {
                  const images: ImageItem[] = JSON.parse(work.images);
                  const coverImage = images[0]?.url;

                  return (
                    <div key={work.work_id} className="card p-0 overflow-hidden group">
                      {/* 图片预览 */}
                      <div className="relative aspect-square bg-gray-200">
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt="作品"
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setViewingWork(work)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            暂无图片
                          </div>
                        )}

                        {/* 悬浮操作 */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setViewingWork(work)}
                              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                              title="查看"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => downloadWork(work)}
                              disabled={downloadingWorkId === work.work_id}
                              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                              title="下载"
                            >
                              {downloadingWorkId === work.work_id ? '⏳' : '⬇️'}
                            </button>
                            <button
                              onClick={() => toggleFavorite(work.work_id)}
                              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                              title={work.is_favorite ? '取消收藏' : '收藏'}
                            >
                              {work.is_favorite ? '❤️' : '🤍'}
                            </button>
                          </div>
                        </div>

                        {/* 多图标识 */}
                        {images.length > 1 && (
                          <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                            {images.length} 张
                          </div>
                        )}

                        {/* 选择框 */}
                        <div className="absolute top-2 left-2">
                          <input
                            type="checkbox"
                            checked={selectedWorks.has(work.work_id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedWorks);
                              if (e.target.checked) {
                                newSelected.add(work.work_id);
                              } else {
                                newSelected.delete(work.work_id);
                              }
                              setSelectedWorks(newSelected);
                            }}
                            className="w-5 h-5"
                          />
                        </div>
                      </div>

                      {/* 作品信息 */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{getTypeLabel(work.type)}</span>
                          {getStatusBadge(work.status)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(work.created_at).toLocaleDateString()}
                        </div>
                        {work.ai_description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {work.ai_description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-4 mt-8">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn btn-outline disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <span className="text-gray-600">
                    第 {currentPage} / {totalPages} 页
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="btn btn-outline disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 查看作品模态框 */}
        {viewingWork && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
            onClick={() => setViewingWork(null)}
          >
            <div
              className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">作品详情</h3>
                  <button
                    onClick={() => setViewingWork(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>类型:</strong> {getTypeLabel(viewingWork.type)}</div>
                    <div><strong>状态:</strong> {getStatusBadge(viewingWork.status)}</div>
                    <div><strong>创建时间:</strong> {new Date(viewingWork.created_at).toLocaleString()}</div>
                    <div><strong>图片数量:</strong> {JSON.parse(viewingWork.images).length} 张</div>
                  </div>

                  {viewingWork.ai_description && (
                    <div>
                      <strong>AI描述:</strong>
                      <p className="text-gray-700 mt-1">{viewingWork.ai_description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 mt-6">
                    {JSON.parse(viewingWork.images).map((img: ImageItem, index: number) => (
                      <img
                        key={index}
                        src={img.url}
                        alt={`图片 ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                    ))}
                  </div>

                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <button
                      onClick={() => downloadWork(viewingWork)}
                      className="btn btn-primary"
                    >
                      下载作品
                    </button>
                    <button
                      onClick={() => deleteWork(viewingWork.work_id)}
                      className="btn bg-red-600 text-white hover:bg-red-700"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
