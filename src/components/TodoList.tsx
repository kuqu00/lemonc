import { useEffect, useState, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Clock,
  LayoutGrid,
  List,
  Sparkles,
  ChevronDown,
  ChevronRight,
  User,
  CheckSquare,
  MoreHorizontal,
  Recycle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { db } from '@/db';
import { useAppStore } from '@/store';
import { useRecycleStore, createRecycleItem } from '@/store/recycle';
import type { Todo, Note, Customer, TodoPriority, TodoSubStep } from '@/types';
import { RecycleBinDialog } from './RecycleBinDialog';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

// 优先级配置
const priorityConfig = {
  'urgent-important': { label: '紧急重要', color: 'bg-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  'urgent-not-important': { label: '紧急不重要', color: 'bg-orange-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  'not-urgent-important': { label: '重要不紧急', color: 'bg-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  'not-urgent-not-important': { label: '不紧急不重要', color: 'bg-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' }
};

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'quadrant'>('quadrant');
  const [showDialog, setShowDialog] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [expandedTodos, setExpandedTodos] = useState<Set<string>>(new Set());
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  
  // 排序状态
  const [sortField, setSortField] = useState<'createTime' | 'updateTime' | 'dueDate' | 'title' | 'progress'>('createTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 表单状态
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<TodoPriority>('not-urgent-important');
  const [formDueDate, setFormDueDate] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSubSteps, setFormSubSteps] = useState<TodoSubStep[]>([]);
  const [formRelatedCustomer, setFormRelatedCustomer] = useState('');
  const [formRelatedNote, setFormRelatedNote] = useState('');
  const [subStepInput, setSubStepInput] = useState('');
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  const { addNotification } = useAppStore();
  const { addToRecycleBin } = useRecycleStore();

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      let todoData = await db.getActiveTodos();
      
      if (searchQuery) {
        todoData = await db.searchTodos(searchQuery);
      }
      
      if (filterPriority) {
        todoData = todoData.filter(t => t.priority === filterPriority);
      }
      
      if (filterStatus) {
        todoData = todoData.filter(t => t.status === filterStatus);
      }
      
      // 排序逻辑
      todoData.sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'dueDate':
            comparison = (a.dueDate || 0) - (b.dueDate || 0);
            break;
          case 'progress':
            comparison = (a.progress || 0) - (b.progress || 0);
            break;
          case 'updateTime':
            comparison = a.updateTime - b.updateTime;
            break;
          case 'createTime':
          default:
            comparison = a.createTime - b.createTime;
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
      
      setTodos(todoData);
      
      const [customerData, noteData] = await Promise.all([
        db.getActiveCustomers(),
        db.getActiveNotes()
      ]);
      setCustomers(customerData);
      setNotes(noteData);
    } catch (error) {
      console.error('Load todos error:', error);
    }
  }, [searchQuery, filterPriority, filterStatus, sortField, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 打开新建对话框
  const handleOpenCreate = () => {
    setEditingTodo(null);
    setFormTitle('');
    setFormDescription('');
    setFormPriority('not-urgent-important');
    setFormDueDate('');
    setFormCategory('');
    setFormSubSteps([]);
    setFormRelatedCustomer('');
    setFormRelatedNote('');
    setShowDialog(true);
  };

  // 打开编辑对话框
  const handleOpenEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setFormTitle(todo.title);
    setFormDescription(todo.description || '');
    setFormPriority(todo.priority);
    setFormDueDate(todo.dueDate ? format(todo.dueDate, 'yyyy-MM-dd') : '');
    setFormCategory(todo.category || '');
    setFormSubSteps(todo.subSteps || []);
    setFormRelatedCustomer(todo.relatedCustomerId || '');
    setFormRelatedNote(todo.relatedNoteId || '');
    setShowDialog(true);
  };

  // 计算进度
  const calculateProgress = (subSteps: TodoSubStep[]) => {
    if (subSteps.length === 0) return 0;
    const completed = subSteps.filter(s => s.completed).length;
    return Math.round((completed / subSteps.length) * 100);
  };

  // 保存待办
  const handleSave = async () => {
    if (!formTitle.trim()) {
      await addNotification({
        title: '验证失败',
        message: '请输入待办标题',
        type: 'error'
      });
      return;
    }

    try {
      const progress = calculateProgress(formSubSteps);
      const status = progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'pending';

      const todoData: Partial<Todo> = {
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        priority: formPriority,
        dueDate: formDueDate ? new Date(formDueDate).getTime() : undefined,
        category: formCategory || undefined,
        subSteps: formSubSteps,
        relatedCustomerId: formRelatedCustomer || undefined,
        relatedNoteId: formRelatedNote || undefined,
        progress,
        status,
        updateTime: Date.now()
      };

      if (editingTodo) {
        await db.todos.update(editingTodo.id, todoData);
        await addNotification({
          title: '更新成功',
          message: '待办事项已更新',
          type: 'success'
        });
      } else {
        const newTodo: Todo = {
          id: `todo-${Date.now()}`,
          ...todoData,
          status,
          createTime: Date.now(),
          isDeleted: false
        } as Todo;
        await db.todos.add(newTodo);
        await addNotification({
          title: '创建成功',
          message: '待办事项已创建',
          type: 'success'
        });
      }

      setShowDialog(false);
      await loadData();
    } catch (error) {
      console.error('Save todo error:', error);
      await addNotification({
        title: '保存失败',
        message: '请重试',
        type: 'error'
      });
    }
  };

  // 删除待办（移至回收站）
  const handleDelete = async (todoId: string) => {
    if (!confirm('确定要删除这条待办吗？\n\n删除后可在回收站中恢复（保留30天）')) return;
    
    try {
      // 获取待办完整数据
      const todoToDelete = todos.find(t => t.id === todoId);
      if (!todoToDelete) return;
      
      // 添加到回收站
      const recycleItem = createRecycleItem(
        'todo',
        todoToDelete,
        todoToDelete.title || '无标题待办',
        todoToDelete.description?.substring(0, 100) || '',
        'currentUser'
      );
      addToRecycleBin(recycleItem);
      
      // 软删除
      await db.softDeleteTodo(todoId);
      await loadData();
      
      await addNotification({
        title: '已移至回收站',
        message: '待办事项已删除，可在回收站中恢复（保留30天）',
        type: 'success'
      });
    } catch (error) {
      console.error('Delete todo error:', error);
      await addNotification({
        title: '删除失败',
        message: '请稍后重试',
        type: 'error'
      });
    }
  };

  // 切换子步骤完成状态
  const handleToggleSubStep = async (todo: Todo, subStepId: string) => {
    const newSubSteps = todo.subSteps.map(s => 
      s.id === subStepId ? { ...s, completed: !s.completed } : s
    );
    const progress = calculateProgress(newSubSteps);
    const status = progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : todo.status === 'completed' ? 'pending' : todo.status;

    await db.todos.update(todo.id, {
      subSteps: newSubSteps,
      progress,
      status,
      updateTime: Date.now()
    });

    // 如果关联了笔记，同步更新笔记状态
    if (todo.relatedNoteId && status === 'completed') {
      await db.notes.update(todo.relatedNoteId, { status: 'completed' });
    }

    await loadData();
  };

  // 切换待办完成状态
  const handleToggleTodoStatus = async (todo: Todo) => {
    const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
    const newSubSteps = newStatus === 'completed' 
      ? todo.subSteps.map(s => ({ ...s, completed: true }))
      : todo.subSteps.map(s => ({ ...s, completed: false }));
    const progress = newStatus === 'completed' ? 100 : 0;

    await db.todos.update(todo.id, {
      status: newStatus,
      subSteps: newSubSteps,
      progress,
      updateTime: Date.now()
    });

    // 如果关联了笔记，同步更新笔记状态
    if (todo.relatedNoteId) {
      await db.notes.update(todo.relatedNoteId, { status: newStatus });
    }

    await loadData();
  };

  // 添加子步骤
  const handleAddSubStep = () => {
    if (subStepInput.trim()) {
      setFormSubSteps([...formSubSteps, {
        id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: subStepInput.trim(),
        completed: false
      }]);
      setSubStepInput('');
    }
  };

  // 移除子步骤
  const handleRemoveSubStep = (stepId: string) => {
    setFormSubSteps(formSubSteps.filter(s => s.id !== stepId));
  };

  // 切换展开状态
  const toggleExpand = (todoId: string) => {
    const newExpanded = new Set(expandedTodos);
    if (newExpanded.has(todoId)) {
      newExpanded.delete(todoId);
    } else {
      newExpanded.add(todoId);
    }
    setExpandedTodos(newExpanded);
  };

  // 拖放事件处理
  const handleDragStart = (e: React.DragEvent, todoId: string) => {
    setDraggedTodoId(todoId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newPriority: TodoPriority) => {
    e.preventDefault();
    if (draggedTodoId) {
      try {
        await db.todos.update(draggedTodoId, {
          priority: newPriority,
          updateTime: Date.now()
        });
        await loadData();
        await addNotification({
          title: '移动成功',
          message: '待办事项已移动到新象限',
          type: 'success'
        });
      } catch (error) {
        console.error('Move todo error:', error);
      }
      setDraggedTodoId(null);
    }
  };

  // 获取到期日显示
  const getDueDateDisplay = (dueDate?: number) => {
    if (!dueDate) return null;
    
    if (isToday(dueDate)) {
      return <Badge variant="destructive" className="text-xs">今天</Badge>;
    }
    if (isTomorrow(dueDate)) {
      return <Badge variant="default" className="text-xs bg-orange-500">明天</Badge>;
    }
    if (isPast(dueDate)) {
      return <Badge variant="destructive" className="text-xs">已逾期</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{format(dueDate, 'MM-dd')}</Badge>;
  };

  // 渲染待办项
  const renderTodoItem = (todo: Todo, compact = false) => {
    const isExpanded = expandedTodos.has(todo.id);
    const hasSubSteps = todo.subSteps && todo.subSteps.length > 0;
    
    return (
      <div 
        key={todo.id}
        className={`group flex flex-col p-3 rounded-lg border hover:shadow-sm transition-all ${
          todo.status === 'completed' ? 'opacity-60 bg-accent/30' : 'bg-card'
        }`}
        draggable
        onDragStart={(e) => handleDragStart(e, todo.id)}
      >
        <div className="flex items-start gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); handleToggleTodoStatus(todo); }}
            className="mt-1 flex-shrink-0"
          >
            {todo.status === 'completed' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          
          {hasSubSteps && (
            <button 
              onClick={(e) => { e.stopPropagation(); toggleExpand(todo.id); }}
              className="mt-1 p-0.5 hover:bg-accent rounded"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          
          <div className="flex-1 min-w-0" onClick={() => handleOpenEdit(todo)}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium ${todo.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                {todo.title}
              </span>
              {getDueDateDisplay(todo.dueDate)}
            </div>
            
            {!compact && todo.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{todo.description}</p>
            )}
            
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge 
                className="text-xs" 
                style={{ 
                  backgroundColor: priorityConfig[todo.priority].color,
                  color: 'white'
                }}
              >
                {priorityConfig[todo.priority].label}
              </Badge>
              
              {todo.category && (
                <Badge variant="outline" className="text-xs">{todo.category}</Badge>
              )}
              
              {hasSubSteps && (
                <Badge variant="secondary" className="text-xs">
                  {todo.subSteps.filter(s => s.completed).length}/{todo.subSteps.length} 步骤
                </Badge>
              )}
              
              {todo.progress > 0 && (
                <span className="text-xs text-muted-foreground">{todo.progress}%</span>
              )}
              
              {todo.relatedCustomerId && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {customers.find(c => c.id === todo.relatedCustomerId)?.name || '关联客户'}
                </Badge>
              )}
              
              {todo.relatedNoteId && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                  关联笔记
                </Badge>
              )}
            </div>
            
            {hasSubSteps && (
              <div className="mt-2">
                <Progress value={todo.progress} className="h-1.5" />
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => handleDelete(todo.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
        
        {/* 子步骤列表 */}
        {isExpanded && hasSubSteps && (
          <div className="ml-8 mt-3 space-y-1">
            {todo.subSteps.map((step) => (
              <div 
                key={step.id} 
                className="flex items-center gap-2 p-2 bg-accent/50 rounded"
                onClick={(e) => { e.stopPropagation(); handleToggleSubStep(todo, step.id); }}
              >
                <Checkbox checked={step.completed} />
                <span className={`text-sm ${step.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 四象限视图
  const renderQuadrantView = () => {
    const quadrants = {
      'urgent-important': todos.filter(t => t.priority === 'urgent-important'),
      'urgent-not-important': todos.filter(t => t.priority === 'urgent-not-important'),
      'not-urgent-important': todos.filter(t => t.priority === 'not-urgent-important'),
      'not-urgent-not-important': todos.filter(t => t.priority === 'not-urgent-not-important')
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
        {Object.entries(quadrants).map(([priority, priorityTodos]) => {
          const config = priorityConfig[priority as keyof typeof priorityConfig];
          const activeTodos = priorityTodos.filter(t => t.status !== 'completed');
          const completedTodos = priorityTodos.filter(t => t.status === 'completed');
          
          return (
            <Card 
              key={priority} 
              className={`${config.bgColor} ${config.borderColor} border-2 transition-all hover:shadow-md`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, priority as TodoPriority)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${config.color}`} />
                    {config.label}
                    <Badge variant="secondary" className="text-xs">
                      {activeTodos.length}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {activeTodos.length === 0 && completedTodos.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">暂无待办</p>
                      </div>
                    ) : (
                      <>
                        {activeTodos.map(todo => renderTodoItem(todo, true))}
                        {completedTodos.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground mb-2">已完成 ({completedTodos.length})</p>
                            {completedTodos.slice(0, 3).map(todo => renderTodoItem(todo, true))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // 列表视图
  const renderListView = () => (
    <ScrollArea className="h-full">
      <div className="space-y-2">
        {todos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>暂无待办事项</p>
            <Button variant="outline" className="mt-4" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-1" />
              创建待办
            </Button>
          </div>
        ) : (
          todos.map(todo => renderTodoItem(todo))
        )}
      </div>
    </ScrollArea>
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索待办..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-transparent text-sm"
          >
            <option value="">全部优先级</option>
            {Object.entries(priorityConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-transparent text-sm"
          >
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="in-progress">进行中</option>
            <option value="completed">已完成</option>
          </select>
          
          {/* 排序 */}
          <div className="flex items-center gap-2">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as typeof sortField)}
              className="h-10 px-3 rounded-md border border-input bg-transparent text-sm"
            >
              <option value="createTime">创建时间</option>
              <option value="updateTime">更新时间</option>
              <option value="dueDate">截止日期</option>
              <option value="title">标题</option>
              <option value="progress">进度</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'quadrant' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('quadrant')}
              className="rounded-none rounded-l-md"
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              四象限
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none rounded-r-md"
            >
              <List className="h-4 w-4 mr-1" />
              列表
            </Button>
          </div>
          
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1" />
            新建待办
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowRecycleBin(true)}
            title="回收站"
          >
            <Recycle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 min-h-0">
        {viewMode === 'quadrant' ? renderQuadrantView() : renderListView()}
      </div>

      {/* 编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingTodo ? '编辑待办' : '新建待办'}</DialogTitle>
            <DialogDescription>
              {editingTodo ? '修改待办事项信息' : '创建新的待办事项'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>标题 *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="请输入待办标题"
              />
            </div>
            
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="可选：添加详细描述"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>优先级（四象限）</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(priorityConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setFormPriority(key as TodoPriority)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      formPriority === key 
                        ? `${config.bgColor} ${config.borderColor} border-2` 
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${config.color} mb-1`} />
                    <span className="text-sm font-medium">{config.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>截止日期</Label>
                <Input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>分类</Label>
                <Input
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="如：工作、个人"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>关联客户（弱关联）</Label>
              <select
                value={formRelatedCustomer}
                onChange={(e) => setFormRelatedCustomer(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-transparent text-sm"
              >
                <option value="">不关联</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>关联笔记</Label>
              <select
                value={formRelatedNote}
                onChange={(e) => setFormRelatedNote(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-transparent text-sm"
              >
                <option value="">不关联</option>
                {notes.map(n => (
                  <option key={n.id} value={n.id}>{n.title}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>子步骤</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={subStepInput}
                  onChange={(e) => setSubStepInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubStep();
                    }
                  }}
                  placeholder="输入子步骤按回车添加"
                />
                <Button type="button" onClick={handleAddSubStep} size="sm">
                  添加
                </Button>
              </div>
              <div className="space-y-1 mt-2">
                {formSubSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-2 p-2 bg-accent rounded">
                    <span className="text-sm text-muted-foreground">{index + 1}.</span>
                    <span className="flex-1 text-sm">{step.title}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveSubStep(step.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              {editingTodo ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 回收站对话框 */}
      <RecycleBinDialog
        open={showRecycleBin}
        onOpenChange={setShowRecycleBin}
        onRestore={async (item) => {
          // 恢复到数据库
          if (item.type === 'todo') {
            await db.restoreTodo(item.originalId);
          }
          // 刷新待办列表
          loadData();
        }}
      />
    </div>
  );
}
