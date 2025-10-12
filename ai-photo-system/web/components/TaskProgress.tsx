import { useState, useEffect } from 'react';
import { useTaskStore, Task } from '../lib/store';
import { wsManager } from '../lib/websocket';
import { tasksAPI } from '../lib/api';
import { toast } from 'react-hot-toast';

interface TaskProgressProps {
  taskId?: string; // 如果指定，只显示该任务；否则显示所有任务
  compact?: boolean; // 紧凑模式
  showHistory?: boolean; // 是否显示历史任务
  onComplete?: (taskId: string, result: any) => void;
  onError?: (taskId: string, error: string) => void;
}

export default function TaskProgress({
  taskId,
  compact = false,
  showHistory = false,
  onComplete,
  onError
}: TaskProgressProps) {
  const { tasks, addTask, updateTask, removeTask } = useTaskStore();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('active');

  useEffect(() => {
    // 监听WebSocket任务事件
    const handleProgress = (data: any) => {
      updateTask(data.task_id, {
        progress: data.progress,
        message: data.message
      });
    };

    const handleComplete = (data: any) => {
      updateTask(data.task_id, {
        status: 'completed',
        progress: 100,
        result: data.result
      });

      if (onComplete) {
        onComplete(data.task_id, data.result);
      }
    };

    const handleFailed = (data: any) => {
      updateTask(data.task_id, {
        status: 'failed',
        error: data.error
      });

      if (onError) {
        onError(data.task_id, data.error);
      }
    };

    wsManager.on('task_progress', handleProgress);
    wsManager.on('task_complete', handleComplete);
    wsManager.on('task_failed', handleFailed);

    return () => {
      wsManager.off('task_progress', handleProgress);
      wsManager.off('task_complete', handleComplete);
      wsManager.off('task_failed', handleFailed);
    };
  }, [updateTask, onComplete, onError]);

  // 获取要显示的任务列表
  const getDisplayTasks = () => {
    let taskList: Task[];

    if (taskId) {
      const task = tasks.get(taskId);
      taskList = task ? [task as Task] : [];
    } else {
      taskList = Array.from(tasks.values()) as Task[];
    }

    // 过滤
    if (filter === 'active') {
      taskList = taskList.filter(t => ['pending', 'processing'].includes(t.status));
    } else if (filter === 'completed') {
      taskList = taskList.filter(t => t.status === 'completed');
    } else if (filter === 'failed') {
      taskList = taskList.filter(t => t.status === 'failed');
    }

    // 排序：进行中的优先，然后按创建时间倒序
    return taskList.sort((a, b) => {
      if (a.status === 'processing' && b.status !== 'processing') return -1;
      if (a.status !== 'processing' && b.status === 'processing') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const displayTasks = getDisplayTasks();

  const cancelTask = async (taskId: string) => {
    if (!confirm('确定要取消该任务吗？已消耗的积分将退回。')) return;

    try {
      await tasksAPI.cancel(taskId);
      removeTask(taskId);
      toast.success('任务已取消');
    } catch (error) {
      toast.error('取消失败');
    }
  };

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
      fitting: 'AI试衣间',
      photography: 'AI摄影',
      travel: '全球旅行'
    };
    return names[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'text-yellow-600 bg-yellow-100',
      processing: 'text-blue-600 bg-blue-100',
      completed: 'text-green-600 bg-green-100',
      failed: 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: '等待中',
      processing: '处理中',
      completed: '已完成',
      failed: '失败'
    };
    return texts[status] || status;
  };

  if (displayTasks.length === 0) {
    return compact ? null : (
      <div className="text-center py-8 text-gray-500">
        {filter === 'active' ? '暂无进行中的任务' : '暂无任务'}
      </div>
    );
  }

  // 紧凑模式
  if (compact) {
    return (
      <div className="space-y-2">
        {displayTasks.map(task => (
          <div key={task.task_id} className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getTypeIcon(task.type)}</span>
                <span className="text-sm font-medium text-gray-700">
                  {task.task_id.substring(0, 8)}...
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${getStatusColor(task.status)}`}>
                {getStatusText(task.status)}
              </span>
            </div>

            {['pending', 'processing'].includes(task.status) && (
              <>
                <div className="progress-bar mb-1">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">{task.message || '处理中...'}</span>
                  <span className="text-xs font-medium text-gray-700">{task.progress}%</span>
                </div>
              </>
            )}

            {task.status === 'failed' && task.error && (
              <div className="text-xs text-red-600 mt-1">
                错误: {task.error}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 完整模式
  return (
    <div className="space-y-4">
      {/* 筛选器 */}
      {!taskId && showHistory && (
        <div className="flex space-x-2">
          {(['all', 'active', 'completed', 'failed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? '全部' : f === 'active' ? '进行中' : f === 'completed' ? '已完成' : '失败'}
            </button>
          ))}
        </div>
      )}

      {/* 任务列表 */}
      <div className="space-y-3">
        {displayTasks.map(task => (
          <div
            key={task.task_id}
            className="card border-l-4"
            style={{
              borderLeftColor: task.status === 'completed' ? '#10b981' :
                task.status === 'failed' ? '#ef4444' :
                task.status === 'processing' ? '#3b82f6' : '#f59e0b'
            }}
          >
            {/* 任务头部 */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{getTypeIcon(task.type)}</span>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900">{getTypeName(task.type)}</h4>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusColor(task.status)}`}>
                      {getStatusText(task.status)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    任务ID: {task.task_id.substring(0, 12)}...
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex space-x-2">
                {['pending', 'processing'].includes(task.status) && (
                  <button
                    onClick={() => cancelTask(task.task_id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    取消
                  </button>
                )}
                {task.status === 'completed' && (
                  <button
                    onClick={() => removeTask(task.task_id)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    移除
                  </button>
                )}
              </div>
            </div>

            {/* 进度条 */}
            {['pending', 'processing'].includes(task.status) && (
              <div className="mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-700">{task.message || '正在处理...'}</span>
                  <span className="text-sm font-semibold text-purple-600">{task.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${task.progress}%` }}
                  >
                    {task.progress > 10 && (
                      <span className="text-xs text-white px-2">{task.progress}%</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 完成信息 */}
            {task.status === 'completed' && task.result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center text-green-800">
                  <span className="mr-2">✓</span>
                  <span className="text-sm font-medium">生成完成！</span>
                </div>
                {task.result.images && (
                  <div className="text-xs text-green-700 mt-1">
                    共生成 {task.result.images.length} 张图片
                  </div>
                )}
              </div>
            )}

            {/* 错误信息 */}
            {task.status === 'failed' && task.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center text-red-800">
                  <span className="mr-2">✗</span>
                  <span className="text-sm font-medium">任务失败</span>
                </div>
                <div className="text-xs text-red-700 mt-1">
                  {task.error}
                </div>
              </div>
            )}

            {/* 时间信息 */}
            <div className="mt-3 pt-3 border-t text-xs text-gray-500">
              创建时间: {new Date(task.created_at).toLocaleString('zh-CN')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
