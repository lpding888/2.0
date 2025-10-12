import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useUserStore, useTaskStore, useUploadStore } from '../lib/store';
import { scenesAPI, tasksAPI, uploadAPI } from '../lib/api';
import { toast } from 'react-hot-toast';
import { wsManager } from '../lib/websocket';

interface Scene {
  scene_id: string;
  scene_name: string;
  category: string;
  description?: string;
  prompt_template: string;
  cover_image?: string;
  display_order: number;
  status: string;
}

type GenerationType = 'fitting' | 'photography' | 'travel';

export default function StudioPage() {
  const router = useRouter();
  const { user, token } = useUserStore();
  const { tasks, addTask, updateTask } = useTaskStore();
  const { files, addFiles, removeFile, clearFiles } = useUploadStore();

  const [generationType, setGenerationType] = useState<GenerationType>('fitting');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedScene, setSelectedScene] = useState<string>('');
  const [batchCount, setBatchCount] = useState<number>(10);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTasks, setCurrentTasks] = useState<string[]>([]);

  // 检查登录状态
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // 加载场景列表
  useEffect(() => {
    loadScenes();
  }, [generationType]);

  // 监听WebSocket任务进度
  useEffect(() => {
    if (!token) return;

    const handleTaskProgress = (data: any) => {
      updateTask(data.task_id, { progress: data.progress, message: data.message });
      toast.loading(`任务进度: ${data.progress}%`, { id: data.task_id });
    };

    const handleTaskComplete = (data: any) => {
      updateTask(data.task_id, { status: 'completed', progress: 100, result: data.result });
      toast.success('任务完成！', { id: data.task_id });
      setCurrentTasks(prev => prev.filter(id => id !== data.task_id));
    };

    const handleTaskFailed = (data: any) => {
      updateTask(data.task_id, { status: 'failed', error: data.error });
      toast.error(`任务失败: ${data.error}`, { id: data.task_id });
      setCurrentTasks(prev => prev.filter(id => id !== data.task_id));
    };

    wsManager.on('task_progress', handleTaskProgress);
    wsManager.on('task_complete', handleTaskComplete);
    wsManager.on('task_failed', handleTaskFailed);

    return () => {
      wsManager.off('task_progress', handleTaskProgress);
      wsManager.off('task_complete', handleTaskComplete);
      wsManager.off('task_failed', handleTaskFailed);
    };
  }, [token, updateTask]);

  const loadScenes = async () => {
    try {
      const response = await scenesAPI.list({ category: generationType === 'fitting' ? 'indoor' : 'outdoor', status: 'active' });
      if (response.success) {
        setScenes(response.data.scenes);
        if (response.data.scenes.length > 0) {
          setSelectedScene(response.data.scenes[0].scene_id);
        }
      }
    } catch (error) {
      toast.error('加载场景失败');
    }
  };

  // 文件上传处理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFiles(selectedFiles);
  };

  const handleFiles = (newFiles: File[]) => {
    // 验证文件类型
    const validFiles = newFiles.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} 不是有效的图片文件`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} 超过10MB大小限制`);
        return false;
      }
      return true;
    });

    // 检查数量限制
    if (files.length + validFiles.length > 50) {
      toast.error('最多只能上传50张图片');
      return;
    }

    addFiles(validFiles);
    toast.success(`已添加 ${validFiles.length} 张图片`);
  };

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  // 开始生成
  const handleGenerate = async () => {
    if (files.length === 0) {
      toast.error('请先上传图片');
      return;
    }

    if (!selectedScene) {
      toast.error('请选择场景');
      return;
    }

    if (batchCount < 1 || batchCount > 50) {
      toast.error('批量数量范围: 1-50');
      return;
    }

    setIsGenerating(true);

    try {
      // 上传图片
      const uploadPromises = files.map(uploadFile => {
        const formData = new FormData();
        formData.append('file', uploadFile.file);
        return uploadAPI.single(formData);
      });

      toast.loading('正在上传图片...', { id: 'upload' });
      const uploadResults = await Promise.all(uploadPromises);
      toast.success('图片上传完成', { id: 'upload' });

      const imageUrls = uploadResults.map(r => r.data.url);

      // 创建任务
      toast.loading('正在创建生成任务...', { id: 'create-task' });
      const taskResponse = await tasksAPI.create({
        type: generationType,
        images: imageUrls,
        scene_id: selectedScene,
        batch_count: batchCount,
        parameters: {}
      });

      if (taskResponse.success) {
        const taskId = taskResponse.data.task_id;
        addTask({
          task_id: taskId,
          type: generationType,
          status: 'pending',
          progress: 0,
          created_at: new Date().toISOString()
        });
        setCurrentTasks(prev => [...prev, taskId]);

        toast.success('任务已创建，正在处理...', { id: 'create-task' });
        clearFiles();
      }
    } catch (error: any) {
      toast.error(error.message || '创建任务失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const typeConfig = {
    fitting: { name: 'AI试衣间', icon: '👗', desc: '上传服装照片，AI自动生成穿搭效果' },
    photography: { name: 'AI摄影', icon: '📸', desc: '选择场景模板，生成专业摄影作品' },
    travel: { name: '全球旅行', icon: '✈️', desc: 'AI带您游遍全球，生成旅行打卡照' }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>创作工作室 - AI摄影系统</title>
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
                <Link href="/works" className="text-gray-600 hover:text-gray-900">
                  我的作品
                </Link>
                <div className="flex items-center space-x-2 px-4 py-2 bg-purple-50 rounded-lg">
                  <span className="text-sm text-gray-600">积分:</span>
                  <span className="text-lg font-bold text-purple-600">{user.credits || 0}</span>
                </div>
                <Link href="/profile" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  <span className="text-gray-700">{user.nickname}</span>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="container-custom py-8">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* 左侧：生成类型和场景选择 */}
            <div className="lg:col-span-1 space-y-6">
              {/* 生成类型 */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">选择生成类型</h3>
                <div className="space-y-2">
                  {(Object.keys(typeConfig) as GenerationType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setGenerationType(type);
                        setSelectedScene('');
                      }}
                      className={`w-full flex items-center space-x-3 p-4 rounded-lg border-2 transition-all ${
                        generationType === type
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-3xl">{typeConfig[type].icon}</span>
                      <div className="text-left flex-1">
                        <div className="font-semibold text-gray-900">{typeConfig[type].name}</div>
                        <div className="text-xs text-gray-600">{typeConfig[type].desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 场景选择 */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">选择场景模板</h3>
                {scenes.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">暂无场景</div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {scenes.map(scene => (
                      <button
                        key={scene.scene_id}
                        onClick={() => setSelectedScene(scene.scene_id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedScene === scene.scene_id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{scene.scene_name}</div>
                        {scene.description && (
                          <div className="text-xs text-gray-600 mt-1">{scene.description}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 批量设置 */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">批量生成设置</h3>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    每张图生成数量: {batchCount}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={batchCount}
                    onChange={(e) => setBatchCount(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1</span>
                    <span>50</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                  <div className="flex justify-between text-gray-700">
                    <span>需要积分:</span>
                    <span className="font-semibold">{files.length * batchCount * 1}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {files.length} 张图片 × {batchCount} 次生成 × 1 积分
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：图片上传和任务进度 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 上传区域 */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">上传图片</h3>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    isDragging
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-6xl mb-4">📁</div>
                  <p className="text-gray-700 font-medium mb-2">
                    拖拽图片到此处，或点击选择文件
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    支持 JPG、PNG 格式，单张最大 10MB，最多 50 张
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="fileInput"
                  />
                  <label htmlFor="fileInput" className="btn btn-outline cursor-pointer inline-block">
                    选择文件
                  </label>
                </div>

                {/* 已上传文件列表 */}
                {files.length > 0 && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-gray-700">已选择 {files.length} 张图片</span>
                      <button
                        onClick={clearFiles}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        清空
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {files.map((uploadFile) => (
                        <div key={uploadFile.id} className="relative group">
                          <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                            <img
                              src={uploadFile.preview}
                              alt={uploadFile.file.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            onClick={() => removeFile(uploadFile.id)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            ×
                          </button>
                          <div className="text-xs text-gray-600 mt-1 truncate">{uploadFile.file.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 生成按钮 */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || files.length === 0}
                  className="w-full mt-6 btn btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <span className="spinner mr-2"></span>
                      处理中...
                    </>
                  ) : (
                    `开始生成 (消耗 ${files.length * batchCount} 积分)`
                  )}
                </button>
              </div>

              {/* 任务进度 */}
              {currentTasks.length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">当前任务</h3>
                  <div className="space-y-4">
                    {currentTasks.map(taskId => {
                      const task = tasks.get(taskId);
                      if (!task) return null;

                      return (
                        <div key={taskId} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              任务 {taskId.substring(0, 8)}...
                            </span>
                            <span className="text-sm text-gray-600">{task.progress}%</span>
                          </div>
                          <div className="progress-bar mb-2">
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                          {task.message && (
                            <div className="text-xs text-gray-500">{task.message}</div>
                          )}
                        </div>
                      );
                    })}
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
