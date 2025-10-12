import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiVideo, FiMusic, FiClock, FiX, FiPlay } from 'react-icons/fi';

interface VideoAlbumProps {
  images: string[];
  onClose?: () => void;
  onComplete?: (videoUrl: string) => void;
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface Music {
  id: string;
  name: string;
  url: string;
  duration: number;
}

export default function VideoAlbum({ images, onClose, onComplete }: VideoAlbumProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [selectedMusic, setSelectedMusic] = useState('gentle');
  const [duration, setDuration] = useState(3); // 每张图片显示时长（秒）

  const templates: Template[] = [
    { id: 'classic', name: '经典淡入淡出', description: '温馨舒适的过渡效果', icon: '🎬' },
    { id: 'modern', name: '现代风格', description: '动感十足的切换', icon: '✨' },
    { id: 'romantic', name: '浪漫风格', description: '柔美浪漫的效果', icon: '💝' },
    { id: 'dynamic', name: '动感风格', description: '活力四射的转场', icon: '⚡' },
  ];

  const musicList: Music[] = [
    { id: 'gentle', name: '温柔时光', url: '/music/gentle.mp3', duration: 180 },
    { id: 'cheerful', name: '欢快旋律', url: '/music/cheerful.mp3', duration: 200 },
    { id: 'romantic', name: '浪漫情怀', url: '/music/romantic.mp3', duration: 220 },
    { id: 'epic', name: '史诗配乐', url: '/music/epic.mp3', duration: 240 },
  ];

  const handleGenerate = async () => {
    if (images.length === 0) {
      toast.error('请先选择图片');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      toast.loading('正在生成视频相册...', { id: 'video-album' });

      // 模拟视频生成进度
      const totalSteps = 10;
      for (let i = 0; i < totalSteps; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setProgress(Math.round(((i + 1) / totalSteps) * 100));
      }

      // TODO: 实际调用后端API生成视频
      // const response = await videoAPI.generate({
      //   images,
      //   template: selectedTemplate,
      //   music: selectedMusic,
      //   duration
      // });

      // 模拟生成完成
      const videoUrl = '/videos/sample-album.mp4';

      toast.success('视频相册生成成功！', { id: 'video-album' });

      if (onComplete) {
        onComplete(videoUrl);
      }

      if (onClose) {
        setTimeout(onClose, 1000);
      }
    } catch (error) {
      console.error('视频生成失败:', error);
      toast.error('视频生成失败，请重试', { id: 'video-album' });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const estimatedDuration = images.length * duration;
  const selectedMusicData = musicList.find(m => m.id === selectedMusic);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isGenerating ? undefined : onClose}
      ></div>

      {/* 内容 */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* 关闭按钮 */}
        {onClose && !isGenerating && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors z-10"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}

        {/* 标题 */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-secondary flex items-center justify-center">
            <FiVideo className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">视频相册生成</h3>
            <p className="text-sm text-gray-600">将照片制作成精美的视频相册</p>
          </div>
        </div>

        {/* 图片预览 */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">已选择图片 ({images.length})</h4>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-xl">
            {images.map((img, index) => (
              <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                <img src={img} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* 模板选择 */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            <FiPlay className="inline mr-2" />
            选择模板
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                disabled={isGenerating}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedTemplate === template.id
                    ? 'border-primary bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">{template.icon}</div>
                <div className="font-medium text-gray-900">{template.name}</div>
                <div className="text-xs text-gray-600">{template.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 背景音乐选择 */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            <FiMusic className="inline mr-2" />
            背景音乐
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {musicList.map((music) => (
              <button
                key={music.id}
                onClick={() => setSelectedMusic(music.id)}
                disabled={isGenerating}
                className={`p-3 rounded-xl border-2 transition-all text-left ${
                  selectedMusic === music.id
                    ? 'border-secondary bg-secondary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{music.name}</div>
                <div className="text-xs text-gray-600">{music.duration}s</div>
              </button>
            ))}
          </div>
        </div>

        {/* 时长设置 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">
              <FiClock className="inline mr-2" />
              每张图片显示时长
            </h4>
            <span className="text-sm font-medium text-primary">{duration} 秒</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            disabled={isGenerating}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1秒</span>
            <span>10秒</span>
          </div>
        </div>

        {/* 信息卡片 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-4 bg-blue-50 rounded-xl">
            <div className="text-xs text-gray-600 mb-1">预计时长</div>
            <div className="text-lg font-bold text-blue-600">{estimatedDuration}s</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl">
            <div className="text-xs text-gray-600 mb-1">消耗积分</div>
            <div className="text-lg font-bold text-purple-600">{images.length * 2}</div>
          </div>
        </div>

        {/* 进度条 */}
        {isGenerating && (
          <div className="mb-6 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">生成进度</span>
              <span className="text-sm font-semibold text-primary">{progress}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill bg-gradient-secondary"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              正在处理 {images.length} 张图片，请耐心等待...
            </p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex space-x-3">
          {onClose && (
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="flex-1 btn-outline"
            >
              取消
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || images.length === 0}
            className="flex-1 btn-secondary"
          >
            {isGenerating ? (
              <>
                <span className="spinner mr-2"></span>
                生成中...
              </>
            ) : (
              <>
                <FiVideo className="inline mr-2" />
                开始生成
              </>
            )}
          </button>
        </div>

        {/* 提示 */}
        <div className="mt-4 p-3 bg-yellow-50 rounded-xl">
          <p className="text-xs text-yellow-800">
            💡 视频生成需要一定时间，建议图片数量在 10-30 张之间效果最佳
          </p>
        </div>
      </div>
    </div>
  );
}
