import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/Header';
import { useUserStore } from '../../lib/store';
import { worksAPI } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { FiDownload, FiHeart, FiTrash2, FiShare2, FiArrowLeft, FiImage, FiCalendar, FiTag } from 'react-icons/fi';
import { saveAs } from 'file-saver';

interface Work {
  work_id: string;
  type: string;
  scene_id?: string;
  scene_name?: string;
  result_url: string;
  is_favorite: boolean;
  created_at: string;
  parameters?: any;
  photographer_says?: string;
}

export default function WorkDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUserStore();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (id) {
      loadWorkDetail();
    }
  }, [id, user, router]);

  const loadWorkDetail = async () => {
    setLoading(true);
    try {
      const response = await worksAPI.getDetail(id as string);
      if (response.success) {
        setWork(response.data);
        setIsFavorite(response.data.is_favorite);
      } else {
        toast.error('作品不存在');
        router.push('/works');
      }
    } catch (error) {
      console.error('加载作品详情失败:', error);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!work) return;

    setDownloading(true);
    try {
      toast.loading('正在下载...', { id: 'download' });

      const response = await fetch(work.result_url);
      const blob = await response.blob();

      const ext = work.result_url.split('.').pop()?.split('?')[0] || 'jpg';
      const timestamp = new Date(work.created_at).getTime();
      const filename = `${work.type}_${timestamp}.${ext}`;

      saveAs(blob, filename);
      toast.success('下载成功！', { id: 'download' });
    } catch (error) {
      console.error('下载失败:', error);
      toast.error('下载失败，请重试', { id: 'download' });
    } finally {
      setDownloading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!work) return;

    try {
      const response = await worksAPI.toggleFavorite(work.work_id);
      if (response.success) {
        setIsFavorite(!isFavorite);
        toast.success(isFavorite ? '已取消收藏' : '已收藏');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleDelete = async () => {
    if (!work) return;

    if (!confirm('确定要删除这个作品吗？删除后无法恢复。')) {
      return;
    }

    try {
      const response = await worksAPI.delete(work.work_id);
      if (response.success) {
        toast.success('删除成功');
        router.push('/works');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleShare = async () => {
    if (!work) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI摄影作品',
          text: work.photographer_says || '看看我的AI摄影作品！',
          url: window.location.href,
        });
      } catch (error) {
        console.log('分享取消');
      }
    } else {
      // 复制链接
      navigator.clipboard.writeText(window.location.href);
      toast.success('链接已复制到剪贴板');
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      fitting: 'AI试衣间',
      photography: 'AI摄影',
      travel: '全球旅行',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      fitting: 'bg-purple-100 text-purple-700',
      photography: 'bg-blue-100 text-blue-700',
      travel: 'bg-green-100 text-green-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>作品详情 - AI摄影系统</title>
        </Head>
        <div className="min-h-screen bg-beige">
          <Header />
          <div className="container-custom py-12 text-center">
            <div className="spinner-primary mx-auto mb-4"></div>
            <p className="text-gray-500">加载中...</p>
          </div>
        </div>
      </>
    );
  }

  if (!work) {
    return null;
  }

  return (
    <>
      <Head>
        <title>作品详情 - AI摄影系统</title>
      </Head>

      <div className="min-h-screen bg-beige">
        <Header />

        <div className="container-custom py-8">
          {/* 返回按钮 */}
          <Link
            href="/works"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span>返回作品列表</span>
          </Link>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* 图片展示 */}
            <div className="lg:col-span-2">
              <div className="card p-0 overflow-hidden animate-fade-in-up">
                <div className="relative aspect-square bg-gray-100">
                  <img
                    src={work.result_url}
                    alt="AI Generated Work"
                    className="w-full h-full object-contain"
                  />

                  {/* 图片操作按钮 */}
                  <div className="absolute bottom-4 right-4 flex space-x-2">
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="p-3 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white transition-colors"
                      title="下载"
                    >
                      {downloading ? (
                        <div className="spinner-primary"></div>
                      ) : (
                        <FiDownload className="w-5 h-5 text-gray-700" />
                      )}
                    </button>
                    <button
                      onClick={handleToggleFavorite}
                      className={`p-3 rounded-full backdrop-blur-sm shadow-lg transition-all ${
                        isFavorite
                          ? 'bg-red-500 text-white'
                          : 'bg-white/90 text-gray-700 hover:bg-white'
                      }`}
                      title={isFavorite ? '取消收藏' : '收藏'}
                    >
                      <FiHeart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* 摄影师说 */}
                {work.photographer_says && (
                  <div className="p-6 bg-gradient-to-r from-primary-50 to-accent-50">
                    <div className="flex items-start space-x-3">
                      <div className="text-3xl">💬</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">摄影师说</h4>
                        <p className="text-gray-700 leading-relaxed">{work.photographer_says}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 详细信息 */}
            <div className="lg:col-span-1 space-y-6">
              {/* 基本信息 */}
              <div className="card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <h3 className="text-xl font-bold text-gray-900 mb-4">作品信息</h3>

                <div className="space-y-4">
                  {/* 类型 */}
                  <div>
                    <label className="text-sm text-gray-600 flex items-center mb-2">
                      <FiTag className="mr-2" />
                      类型
                    </label>
                    <span className={`badge ${getTypeColor(work.type)}`}>
                      {getTypeLabel(work.type)}
                    </span>
                  </div>

                  {/* 场景 */}
                  {work.scene_name && (
                    <div>
                      <label className="text-sm text-gray-600 flex items-center mb-2">
                        <FiImage className="mr-2" />
                        场景
                      </label>
                      <p className="text-gray-900">{work.scene_name}</p>
                    </div>
                  )}

                  {/* 创建时间 */}
                  <div>
                    <label className="text-sm text-gray-600 flex items-center mb-2">
                      <FiCalendar className="mr-2" />
                      创建时间
                    </label>
                    <p className="text-gray-900">
                      {new Date(work.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <h3 className="text-xl font-bold text-gray-900 mb-4">操作</h3>

                <div className="space-y-3">
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-full btn-primary"
                  >
                    {downloading ? (
                      <>
                        <span className="spinner mr-2"></span>
                        下载中...
                      </>
                    ) : (
                      <>
                        <FiDownload className="inline mr-2" />
                        下载作品
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleShare}
                    className="w-full btn-accent"
                  >
                    <FiShare2 className="inline mr-2" />
                    分享作品
                  </button>

                  <button
                    onClick={handleDelete}
                    className="w-full btn border-2 border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
                  >
                    <FiTrash2 className="inline mr-2" />
                    删除作品
                  </button>
                </div>
              </div>

              {/* 生成参数 */}
              {work.parameters && Object.keys(work.parameters).length > 0 && (
                <div className="card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">生成参数</h3>
                  <div className="space-y-2">
                    {Object.entries(work.parameters).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-600">{key}</span>
                        <span className="text-gray-900 font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
