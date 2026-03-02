import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, CheckCircle2, Circle, Clock, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VirtualList, VIRTUAL_LIST_HEIGHTS } from '@/components/ui/virtual-list';
import { Checkbox } from '@/components/ui/checkbox';
import { db } from '@/db';
import type { Todo } from '@/types';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { useTauriAutoSave } from '@/hooks/useTauriAutoSave';

const priorityConfig = {
  'urgent-important': { label: '紧急重要', color: 'bg-red-500' },
  'urgent-not-important': { label: '紧急不重要', color: 'bg-orange-500' },
  'not-urgent-important': { label: '重要不紧急', color: 'bg-blue-500' },
  'not-urgent-not-important': { label: '不紧急不重要', color: 'bg-gray-500' }
};

export function TodoListOptimized() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // 加载待办数据
  const loadTodos = useCallback(async () => {
    setLoading(true);
    try {
      let data = await db.getActiveTodos();

      // 搜索过滤
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        data = data.filter(t =>
          t.title.toLowerCase().includes(lowerQuery) ||
          t.description?.toLowerCase().includes(lowerQuery)
        );
      }

      // 状态过滤
      if (filterStatus !== 'all') {
        data = data.filter(t => t.status === filterStatus);
      }

      // 优先级过滤
      if (filterPriority !== 'all') {
        data = data.filter(t => t.priority === filterPriority);
      }

      // 排序：超期的优先，然后按到期时间
      data.sort((a, b) => {
        const aOverdue = a.dueDate && isPast(a.dueDate) && a.status !== 'completed';
        const bOverdue = b.dueDate && isPast(b.dueDate) && b.status !== 'completed';

        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;

        const aDue = a.dueDate || Infinity;
        const bDue = b.dueDate || Infinity;
        return aDue - bDue;
      });

      setTodos(data);
    } catch (error) {
      console.error('加载待办失败:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatus, filterPriority]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // Tauri 自动保存
  useTauriAutoSave({
    key: 'todos',
    data: { todos, filterStatus, filterPriority },
    enabled: todos.length > 0,
    delay: 10000
  });

  // 切换完成状态
  const toggleComplete = async (todo: Todo) => {
    const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
    await db.todos.update(todo.id, {
      status: newStatus,
      updateTime: Date.now()
    });
    await loadTodos();
  };

  // 获取日期显示
  const getDateDisplay = (todo: Todo) => {
    if (!todo.dueDate) return null;

    const date = new Date(todo.dueDate);
    const isDone = todo.status === 'completed';
    const isOverdue = isPast(date) && !isDone;

    if (isToday(date)) {
      return (
        <Badge variant={isOverdue ? 'destructive' : 'default'} className="text-xs">
          今天
        </Badge>
      );
    }

    if (isTomorrow(date)) {
      return (
        <Badge variant="outline" className="text-xs">
          明天
        </Badge>
      );
    }

    if (isOverdue) {
      const daysPast = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      return (
        <Badge variant="destructive" className="text-xs">
          超期 {daysPast} 天
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-xs">
        {format(date, 'MM-dd')}
      </Badge>
    );
  };

  // 渲染待办项
  const renderTodoItem = useCallback((todo: Todo) => {
    const priority = priorityConfig[todo.priority];
    const isCompleted = todo.status === 'completed';
    const dateDisplay = getDateDisplay(todo);

    return (
      <div
        key={todo.id}
        className={`
          p-4 border rounded-lg hover:shadow-md transition-all
          ${isCompleted ? 'bg-gray-50 opacity-60' : 'bg-white'}
        `}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => toggleComplete(todo)}
            className="mt-1"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className={`
                font-medium truncate
                ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}
              `}>
                {todo.title}
              </h3>

              {priority && (
                <Badge className={`text-white text-xs ${priority.color} flex-shrink-0`}>
                  {priority.label}
                </Badge>
              )}
            </div>

            {todo.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {todo.description}
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {dateDisplay && <div className="flex items-center gap-1">{dateDisplay}</div>}

              {todo.relatedCustomerId && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  已关联客户
                </div>
              )}

              {todo.progress !== undefined && (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="text-xs text-gray-500">进度: {todo.progress}%</div>
                  <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${todo.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }, [toggleComplete]);

  // 统计信息
  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.status === 'completed').length,
    overdue: todos.filter(t => t.dueDate && isPast(t.dueDate) && t.status !== 'completed').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-gray-500">加载中...</div>
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <CheckCircle2 className="w-12 h-12 mb-2 opacity-50" />
        <p>{searchQuery ? '未找到匹配的待办' : '暂无待办事项'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>待办清单</CardTitle>
            <div className="flex gap-2 text-sm">
              <Badge variant="outline">总计: {stats.total}</Badge>
              <Badge variant="outline">已完成: {stats.completed}</Badge>
              {stats.overdue > 0 && (
                <Badge variant="destructive">超期: {stats.overdue}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索待办..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Badge
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilterStatus('all')}
            >
              全部
            </Badge>
            <Badge
              variant={filterStatus === 'pending' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilterStatus('pending')}
            >
              待办
            </Badge>
            <Badge
              variant={filterStatus === 'completed' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilterStatus('completed')}
            >
              已完成
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 虚拟滚动列表 - 当待办数量超过 30 时启用 */}
      {todos.length > 30 ? (
        <VirtualList
          items={todos}
          itemHeight={140}
          containerHeight={VIRTUAL_LIST_HEIGHTS.medium}
          renderItem={renderTodoItem}
          className="space-y-2"
        />
      ) : (
        <div className="space-y-2">
          {todos.map(todo => renderTodoItem(todo))}
        </div>
      )}
    </div>
  );
}
