import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Save, 
  FolderOpen,
  Sparkles,
  CheckSquare,
  X,
  MoreVertical,
  Clock,
  FileText,
  Calendar,
  CheckCircle2,
  Circle,
  Loader2,
  LayoutGrid,
  List,
  Table,
  Tag,
  User,
  Building2,
  Paperclip,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Link2,
  Hash,
  AlignLeft,
  Type,
  Trash,
  Recycle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { db } from '@/db';
import { useAppStore } from '@/store';
import { useRecycleStore, createRecycleItem } from '@/store/recycle';
import type { Note, Todo, NoteStatus, Customer } from '@/types';
import { RecycleBinDialog } from './RecycleBinDialog';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 一级分类
const categoryLevel1Options = ['工作笔记', '会议纪要', '客户资料', '业务分析', '其他'];

// 二级分类
const categoryLevel2Map: Record<string, string[]> = {
  '工作笔记': ['日常记录', '工作总结', '问题反馈'],
  '会议纪要': ['部门会议', '客户会议', '项目会议'],
  '客户资料': ['客户信息', '沟通记录', '需求分析'],
  '业务分析': ['数据分析', '市场分析', '风险评估'],
  '其他': ['其他']
};

// 状态配置
const statusConfig: Record<NoteStatus, { label: string; color: string; icon: typeof Circle; bgColor: string }> = {
  'pending': { label: '待处理', color: 'bg-gray-500', icon: Circle, bgColor: 'bg-gray-100' },
  'in-progress': { label: '进行中', color: 'bg-blue-500', icon: Loader2, bgColor: 'bg-blue-100' },
  'completed': { label: '已完成', color: 'bg-green-500', icon: CheckCircle2, bgColor: 'bg-green-100' }
};

// 预设标签颜色
const tagColors = [
  { name: '重要', color: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700' },
  { name: '紧急', color: 'bg-orange-500', bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
  { name: '待跟进', color: 'bg-yellow-500', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
  { name: '已完成', color: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700' },
  { name: '客户相关', color: 'bg-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
  { name: '会议', color: 'bg-purple-500', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
  { name: '待办', color: 'bg-pink-500', bgColor: 'bg-pink-50', textColor: 'text-pink-700' },
  { name: '资料', color: 'bg-cyan-500', bgColor: 'bg-cyan-50', textColor: 'text-cyan-700' },
];

export function Notebook() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<NoteStatus | ''>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [_isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showAnalyzeDialog, setShowAnalyzeDialog] = useState(false);
  const [analyzedTodos, setAnalyzedTodos] = useState<string[]>([]);
  const [relatedTodos, setRelatedTodos] = useState<Todo[]>([]);
  const [relatedCustomers, setRelatedCustomers] = useState<Customer[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'table'>('list');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  
  // 排序状态
  const [sortField, setSortField] = useState<'updateTime' | 'createTime' | 'startDate' | 'dueDate' | 'title'>('updateTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 编辑状态
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editFilePath, setEditFilePath] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState<NoteStatus>('pending');
  const [editCategory1, setEditCategory1] = useState('工作笔记');
  const [editCategory2, setEditCategory2] = useState('日常记录');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editRelatedCustomerIds, setEditRelatedCustomerIds] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { settings, addNotification } = useAppStore();
  const { addToRecycleBin } = useRecycleStore();

  // 加载笔记列表
  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      let data = await db.getActiveNotes();
      
      if (searchQuery) {
        data = await db.searchNotes(searchQuery);
      }
      
      if (filterCategory) {
        data = data.filter(n => n.categoryLevel1 === filterCategory);
      }
      
      if (filterStatus) {
        data = data.filter(n => n.status === filterStatus);
      }

      if (filterTag) {
        data = data.filter(n => n.tags?.includes(filterTag));
      }
      
      // 排序逻辑
      data.sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'createTime':
            comparison = a.createTime - b.createTime;
            break;
          case 'startDate':
            comparison = (a.startDate || 0) - (b.startDate || 0);
            break;
          case 'dueDate':
            comparison = (a.dueDate || 0) - (b.dueDate || 0);
            break;
          case 'updateTime':
          default:
            comparison = a.updateTime - b.updateTime;
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
      
      setNotes(data);
    } catch (error) {
      console.error('Load notes error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterCategory, filterStatus, filterTag, sortField, sortOrder]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // 加载客户列表
  const loadCustomers = useCallback(async () => {
    try {
      const data = await db.getActiveCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Load customers error:', error);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // 加载关联数据
  const loadRelatedData = useCallback(async (noteId: string) => {
    const todos = await db.getActiveTodos();
    const related = todos.filter(t => t.relatedNoteId === noteId);
    setRelatedTodos(related);

    // 加载关联客户
    const note = await db.notes.get(noteId);
    if (note?.relatedCustomerIds?.length) {
      const relatedCusts = await Promise.all(
        note.relatedCustomerIds.map(id => db.customers.get(id))
      );
      setRelatedCustomers(relatedCusts.filter(Boolean) as Customer[]);
    } else {
      setRelatedCustomers([]);
    }
  }, []);

  // 选择笔记
  const handleSelectNote = async (note: Note) => {
    if (saveStatus === 'unsaved' && selectedNote) {
      await handleSave();
    }
    
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditFilePath(note.filePath || '');
    setEditStartDate(note.startDate ? format(note.startDate, 'yyyy-MM-dd') : '');
    setEditDueDate(note.dueDate ? format(note.dueDate, 'yyyy-MM-dd') : '');
    setEditStatus(note.status);
    setEditCategory1(note.categoryLevel1);
    setEditCategory2(note.categoryLevel2);
    setEditTags(note.tags || []);
    setEditRelatedCustomerIds(note.relatedCustomerIds || []);
    setSaveStatus('saved');
    
    await loadRelatedData(note.id);
  };

  // 创建新笔记
  const handleCreateNote = async () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: '新建笔记',
      content: '',
      filePath: '',
      status: 'pending',
      categoryLevel1: '工作笔记',
      categoryLevel2: '日常记录',
      relatedTodos: [],
      tags: [],
      relatedCustomerIds: [],
      attachments: [],
      createTime: Date.now(),
      updateTime: Date.now(),
      isDeleted: false
    };
    
    await db.notes.add(newNote);
    await loadNotes();
    await handleSelectNote(newNote);
    
    await addNotification({
      title: '创建成功',
      message: '新笔记已创建',
      type: 'success'
    });
  };

  // 自动保存
  const autoSave = useCallback(async () => {
    if (!selectedNote || saveStatus !== 'unsaved') return;
    
    setSaveStatus('saving');
    try {
      await db.notes.update(selectedNote.id, {
        title: editTitle,
        content: editContent,
        filePath: editFilePath,
        startDate: editStartDate ? new Date(editStartDate).getTime() : undefined,
        dueDate: editDueDate ? new Date(editDueDate).getTime() : undefined,
        status: editStatus,
        categoryLevel1: editCategory1,
        categoryLevel2: editCategory2,
        tags: editTags,
        relatedCustomerIds: editRelatedCustomerIds,
        updateTime: Date.now()
      });
      setSaveStatus('saved');
      await loadNotes();
    } catch (error) {
      console.error('Auto save error:', error);
      setSaveStatus('unsaved');
    }
  }, [selectedNote, editTitle, editContent, editFilePath, editStartDate, editDueDate, editStatus, editCategory1, editCategory2, editTags, editRelatedCustomerIds, saveStatus]);

  // 设置自动保存
  useEffect(() => {
    if (settings?.autoSave && saveStatus === 'unsaved') {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        autoSave();
      }, (settings.autoSaveInterval || 30) * 1000);
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [settings, saveStatus, autoSave]);

  // 内容变化时标记为未保存
  const handleContentChange = (value: string) => {
    setEditContent(value);
    setSaveStatus('unsaved');
  };

  const handleTitleChange = (value: string) => {
    setEditTitle(value);
    setSaveStatus('unsaved');
  };

  const handleFilePathChange = (value: string) => {
    setEditFilePath(value);
    setSaveStatus('unsaved');
  };

  const handleStartDateChange = (value: string) => {
    setEditStartDate(value);
    setSaveStatus('unsaved');
  };

  const handleDueDateChange = (value: string) => {
    setEditDueDate(value);
    setSaveStatus('unsaved');
  };

  const handleStatusChange = (value: NoteStatus) => {
    setEditStatus(value);
    setSaveStatus('unsaved');
  };

  const handleCategory1Change = (value: string) => {
    setEditCategory1(value);
    setEditCategory2(categoryLevel2Map[value]?.[0] || '');
    setSaveStatus('unsaved');
  };

  const handleCategory2Change = (value: string) => {
    setEditCategory2(value);
    setSaveStatus('unsaved');
  };

  // 标签管理
  const handleAddTag = (tagName: string) => {
    if (!editTags.includes(tagName)) {
      setEditTags([...editTags, tagName]);
      setSaveStatus('unsaved');
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagName: string) => {
    setEditTags(editTags.filter(t => t !== tagName));
    setSaveStatus('unsaved');
  };

  const handleAddCustomTag = () => {
    if (tagInput.trim() && !editTags.includes(tagInput.trim())) {
      setEditTags([...editTags, tagInput.trim()]);
      setSaveStatus('unsaved');
      setTagInput('');
    }
  };

  // 关联客户管理
  const handleAddRelatedCustomer = (customerId: string) => {
    if (!editRelatedCustomerIds.includes(customerId)) {
      setEditRelatedCustomerIds([...editRelatedCustomerIds, customerId]);
      setSaveStatus('unsaved');
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setRelatedCustomers([...relatedCustomers, customer]);
      }
    }
  };

  const handleRemoveRelatedCustomer = (customerId: string) => {
    setEditRelatedCustomerIds(editRelatedCustomerIds.filter(id => id !== customerId));
    setRelatedCustomers(relatedCustomers.filter(c => c.id !== customerId));
    setSaveStatus('unsaved');
  };

  // 手动保存
  const handleSave = async () => {
    if (!selectedNote) return;
    
    setSaveStatus('saving');
    try {
      await db.notes.update(selectedNote.id, {
        title: editTitle,
        content: editContent,
        filePath: editFilePath,
        startDate: editStartDate ? new Date(editStartDate).getTime() : undefined,
        dueDate: editDueDate ? new Date(editDueDate).getTime() : undefined,
        status: editStatus,
        categoryLevel1: editCategory1,
        categoryLevel2: editCategory2,
        tags: editTags,
        relatedCustomerIds: editRelatedCustomerIds,
        updateTime: Date.now()
      });
      setSaveStatus('saved');
      await loadNotes();
      
      await addNotification({
        title: '保存成功',
        message: '笔记已保存',
        type: 'success'
      });
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('unsaved');
    }
  };

  // 删除笔记（移至回收站）
  const handleDelete = async (noteId: string) => {
    if (!confirm('确定要删除这条笔记吗？\n\n删除后可在回收站中恢复（保留30天）')) return;
    
    try {
      // 获取笔记完整数据
      const noteToDelete = notes.find(n => n.id === noteId);
      if (!noteToDelete) return;
      
      // 添加到回收站
      const recycleItem = createRecycleItem(
        'note',
        noteToDelete,
        noteToDelete.title || '无标题笔记',
        noteToDelete.content?.substring(0, 100) + (noteToDelete.content?.length > 100 ? '...' : ''),
        'currentUser'
      );
      addToRecycleBin(recycleItem);
      
      // 软删除
      await db.softDeleteNote(noteId);
      
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
        setEditTitle('');
        setEditContent('');
        setEditFilePath('');
        setEditStartDate('');
        setEditDueDate('');
        setEditTags([]);
        setEditRelatedCustomerIds([]);
      }
      await loadNotes();
      
      await addNotification({
        title: '已移至回收站',
        message: '笔记已删除，可在回收站中恢复（保留30天）',
        type: 'success'
      });
    } catch (error) {
      console.error('Delete error:', error);
      await addNotification({
        title: '删除失败',
        message: '请稍后重试',
        type: 'error'
      });
    }
  };

  // 智能分析
  const handleAnalyze = () => {
    const todos: string[] = [];
    const lines = editContent.split('\n');
    
    lines.forEach(line => {
      const patterns = [
        /待办[：:]\s*(.+)/i,
        /TODO[：:]\s*(.+)/i,
        /【待办】\s*(.+)/,
        /\[待办\]\s*(.+)/
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          todos.push(match[1].trim());
          break;
        }
      }
    });
    
    setAnalyzedTodos(todos);
    setShowAnalyzeDialog(true);
  };

  // 创建分析的待办
  const handleCreateAnalyzedTodos = async () => {
    if (!selectedNote || analyzedTodos.length === 0) return;
    
    for (const todoTitle of analyzedTodos) {
      const newTodo: Todo = {
        id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: todoTitle,
        priority: 'not-urgent-important',
        status: 'pending',
        subSteps: [],
        relatedNoteId: selectedNote.id,
        progress: 0,
        createTime: Date.now(),
        updateTime: Date.now(),
        isDeleted: false
      };
      await db.todos.add(newTodo);
    }
    
    // 更新笔记状态为进行中
    await db.notes.update(selectedNote.id, { status: 'in-progress' });
    setEditStatus('in-progress');
    
    setShowAnalyzeDialog(false);
    await loadRelatedData(selectedNote.id);
    await loadNotes();
    
    await addNotification({
      title: '创建成功',
      message: `已创建 ${analyzedTodos.length} 条待办事项`,
      type: 'success'
    });
  };

  // 获取保存状态显示
  const getSaveStatusDisplay = () => {
    switch (saveStatus) {
      case 'saving':
        return <span className="text-blue-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> 保存中...</span>;
      case 'unsaved':
        return <span className="text-orange-500">未保存</span>;
      default:
        return <span className="text-green-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> 已保存</span>;
    }
  };

  // 获取到期日显示
  const getDueDateBadge = (dueDate?: number) => {
    if (!dueDate) return null;
    if (isToday(dueDate)) return <Badge variant="destructive" className="text-xs">今天</Badge>;
    if (isTomorrow(dueDate)) return <Badge className="bg-orange-500 text-xs">明天</Badge>;
    if (isPast(dueDate)) return <Badge variant="destructive" className="text-xs">逾期</Badge>;
    return <Badge variant="outline" className="text-xs">{format(dueDate, 'MM-dd')}</Badge>;
  };

  // 获取标签样式
  const getTagStyle = (tagName: string) => {
    const preset = tagColors.find(t => t.name === tagName);
    if (preset) return preset;
    return { name: tagName, color: 'bg-gray-500', bgColor: 'bg-gray-100', textColor: 'text-gray-700' };
  };

  // 获取内容预览
  const getContentPreview = (content: string, maxLength: number = 60) => {
    const plainText = content.replace(/\n/g, ' ').trim();
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + '...';
  };

  // 获取所有使用过的标签
  const getAllTags = useCallback(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => {
      note.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [notes]);

  return (
    <div className={`flex gap-0 h-[calc(100vh-8rem)] ${isFullscreen ? 'fixed inset-0 z-50 bg-background h-screen' : ''}`}>
      {/* 左侧笔记列表 */}
      <Card className={`${!showEditor ? 'w-full' : isFullscreen ? 'w-96' : 'w-80'} flex-shrink-0 flex flex-col rounded-none border-y-0 border-l-0 h-full transition-all duration-300`}>
          <CardHeader className="pb-3 space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                工作记事本
              </CardTitle>

            </div>
            
            {/* 视图切换和新建 */}
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-md flex-1">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none rounded-l-md flex-1 h-8"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none flex-1 h-8"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-none rounded-r-md flex-1 h-8"
                >
                  <Table className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button size="sm" onClick={handleCreateNote} className="h-8">
                <Plus className="h-4 w-4 mr-1" />
                新建
              </Button>
              {selectedNote && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8"
                  onClick={() => setShowEditor(!showEditor)}
                >
                  {showEditor ? '关闭编辑' : '展开编辑'}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setShowRecycleBin(true)}
                title="回收站"
              >
                <Recycle className="h-4 w-4" />
              </Button>
            </div>

            {/* 搜索 */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索笔记标题或内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            {/* 筛选器和排序 */}
            <div className="flex gap-2 flex-wrap">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="flex-1 min-w-[70px] h-8 px-2 rounded-md border border-input bg-transparent text-xs"
              >
                <option value="">全部分类</option>
                {categoryLevel1Options.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as NoteStatus | '')}
                className="flex-1 min-w-[70px] h-8 px-2 rounded-md border border-input bg-transparent text-xs"
              >
                <option value="">全部状态</option>
                <option value="pending">待处理</option>
                <option value="in-progress">进行中</option>
                <option value="completed">已完成</option>
              </select>
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="flex-1 min-w-[70px] h-8 px-2 rounded-md border border-input bg-transparent text-xs"
              >
                <option value="">全部标签</option>
                {getAllTags().map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            {/* 排序 */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>排序:</span>
              </div>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as typeof sortField)}
                className="h-8 px-2 rounded-md border border-input bg-transparent text-xs flex-1"
              >
                <option value="updateTime">更新时间</option>
                <option value="createTime">创建时间</option>
                <option value="startDate">开始日期</option>
                <option value="dueDate">到期日期</option>
                <option value="title">标题</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              {viewMode === 'list' ? (
                <div className="space-y-1 px-3 pb-4">
                  {notes.map((note) => {
                    const isSelected = selectedNote?.id === note.id;
                    const tagStyle = note.tags?.[0] ? getTagStyle(note.tags[0]) : null;
                    return (
                      <div
                        key={note.id}
                        onClick={() => handleSelectNote(note)}
                        onDoubleClick={() => { handleSelectNote(note); setShowEditor(true); }}
                        className={`p-3 rounded-lg cursor-pointer transition-all group ${
                          isSelected 
                            ? 'bg-primary text-primary-foreground shadow-md' 
                            : 'hover:bg-accent border border-transparent hover:border-border'
                        }`}
                      >
                        {/* 标题行 */}
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-medium truncate flex-1 text-sm ${isSelected ? 'text-primary-foreground' : ''}`}>
                            {note.title}
                          </p>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${statusConfig[note.status].color}`} />
                        </div>
                        
                        {/* 内容预览 - 编辑区关闭时显示更多 */}
                        {note.content && (
                          <p className={`text-xs mt-1.5 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'} ${!showEditor ? 'line-clamp-3' : 'line-clamp-2'}`}>
                            {getContentPreview(note.content, !showEditor ? 150 : 80)}
                          </p>
                        )}
                        
                        {/* 标签和分类 */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <Badge variant={isSelected ? 'secondary' : 'outline'} className="text-[10px] px-1.5 py-0 h-4">
                            {note.categoryLevel1}
                          </Badge>
                          <Badge variant={isSelected ? 'secondary' : 'outline'} className="text-[10px] px-1.5 py-0 h-4">
                            {note.categoryLevel2}
                          </Badge>
                          {note.tags?.slice(0, !showEditor ? 4 : 2).map((tag, idx) => {
                            const style = getTagStyle(tag);
                            return (
                              <span 
                                key={idx} 
                                className={`text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-primary-foreground/20' : style.bgColor + ' ' + style.textColor}`}
                              >
                                {tag}
                              </span>
                            );
                          })}
                          {note.tags && note.tags.length > (!showEditor ? 4 : 2) && (
                            <span className={`text-[10px] ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              +{note.tags.length - (!showEditor ? 4 : 2)}
                            </span>
                          )}
                        </div>
                        
                        {/* 编辑区关闭时显示更多信息 */}
                        {!showEditor && (
                          <div className="mt-2 space-y-1">
                            {note.filePath && (
                              <div className={`flex items-center gap-1 text-[10px] ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                <FolderOpen className="h-3 w-3" />
                                <span className="truncate">{note.filePath}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <div className={`flex items-center gap-2 text-[10px] ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                <span>创建: {format(note.createTime, 'yyyy-MM-dd')}</span>
                                <span>更新: {format(note.updateTime, 'yyyy-MM-dd HH:mm')}</span>
                                <span>{note.content?.length || 0} 字</span>
                              </div>
                              {note.dueDate && (
                                <span className={`text-[10px] ${isPast(note.dueDate) && !isToday(note.dueDate) ? 'text-red-500' : ''}`}>
                                  到期: {format(note.dueDate, 'yyyy-MM-dd')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* 日期信息 */}
                        <div className="flex items-center gap-3 mt-2">
                          {note.startDate && (
                            <span className={`text-[10px] flex items-center gap-1 ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              <Calendar className="h-3 w-3" />
                              开始: {format(note.startDate, 'MM-dd')}
                            </span>
                          )}
                          {note.dueDate && (
                            <span className={`text-[10px] flex items-center gap-1 ${isSelected ? 'text-primary-foreground/70' : isPast(note.dueDate) && !isToday(note.dueDate) ? 'text-red-500' : 'text-muted-foreground'}`}>
                              <Clock className="h-3 w-3" />
                              截止: {format(note.dueDate, 'MM-dd')}
                            </span>
                          )}
                          {!note.startDate && !note.dueDate && (
                            <span className={`text-[10px] ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {format(note.updateTime, 'MM-dd HH:mm')}
                            </span>
                          )}
                        </div>

                        {/* 悬停操作 */}
                        <div className={`flex justify-end gap-1 mt-2 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                          {!showEditor && (
                            <Button 
                              variant={isSelected ? 'secondary' : 'ghost'}
                              size="sm" 
                              className="h-6 text-xs"
                              onClick={(e) => { e.stopPropagation(); handleSelectNote(note); setShowEditor(true); }}
                            >
                              编辑
                            </Button>
                          )}
                          <Button 
                            variant={isSelected ? 'secondary' : 'ghost'}
                            size="icon" 
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {notes.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">暂无笔记</p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={handleCreateNote}>
                        <Plus className="h-4 w-4 mr-1" />
                        创建笔记
                      </Button>
                    </div>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                <div className={`grid gap-2 p-3 ${!showEditor ? 'grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'}`}>
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      onDoubleClick={() => { handleSelectNote(note); setShowEditor(true); }}
                      className={`p-3 rounded-lg cursor-pointer transition-all border ${
                        selectedNote?.id === note.id 
                          ? 'border-primary bg-primary text-primary-foreground' 
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-sm truncate flex-1">{note.title}</p>
                        <div className={`w-2 h-2 rounded-full ${statusConfig[note.status].color}`} />
                      </div>
                      {note.content && (
                        <p className={`text-xs ${!showEditor ? 'line-clamp-4' : 'line-clamp-2'} mb-2 ${selectedNote?.id === note.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {getContentPreview(note.content, !showEditor ? 120 : 50)}
                        </p>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={selectedNote?.id === note.id ? 'secondary' : 'outline'} className="text-[10px]">
                          {note.categoryLevel1}
                        </Badge>
                        <span className={`text-[10px] ${selectedNote?.id === note.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {format(note.updateTime, 'MM-dd')}
                        </span>
                      </div>
                      {/* 编辑区关闭时显示更多信息 */}
                      {!showEditor && note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {note.tags.slice(0, 3).map((tag, idx) => {
                            const style = getTagStyle(tag);
                            return (
                              <span 
                                key={idx} 
                                className={`text-[9px] px-1.5 py-0.5 rounded ${selectedNote?.id === note.id ? 'bg-primary-foreground/20' : style.bgColor + ' ' + style.textColor}`}
                              >
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {!showEditor && note.dueDate && (
                        <div className={`mt-2 text-[10px] ${isPast(note.dueDate) && !isToday(note.dueDate) ? 'text-red-500' : 'text-muted-foreground'}`}>
                          到期: {format(note.dueDate, 'yyyy-MM-dd')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3">
                  <table className="w-full text-xs">
                    <thead className="bg-accent sticky top-0">
                      <tr>
                        <th className="p-2 text-left font-medium min-w-[150px]">标题</th>
                        <th className="p-2 text-left font-medium">分类</th>
                        <th className="p-2 text-left font-medium">状态</th>
                        <th className="p-2 text-left font-medium">标签</th>
                        <th className="p-2 text-left font-medium">开始日期</th>
                        <th className="p-2 text-left font-medium">结束日期</th>
                        <th className="p-2 text-right font-medium">更新时间</th>
                        <th className="p-2 text-center font-medium w-16">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notes.map((note) => (
                        <tr 
                          key={note.id}
                          onClick={() => handleSelectNote(note)}
                          onDoubleClick={() => { handleSelectNote(note); setShowEditor(true); }}
                          className={`cursor-pointer hover:bg-accent ${selectedNote?.id === note.id ? 'bg-primary text-primary-foreground' : 'border-b'}`}
                        >
                          <td className="p-2">
                            <div className="font-medium truncate max-w-[200px]">{note.title}</div>
                            {note.content && (
                              <div className={`truncate max-w-[200px] text-[10px] ${selectedNote?.id === note.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {getContentPreview(note.content, 40)}
                              </div>
                            )}
                          </td>
                          <td className="p-2">
                            <Badge variant={selectedNote?.id === note.id ? 'secondary' : 'outline'} className="text-[10px]">
                              {note.categoryLevel1}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${statusConfig[note.status].color}`} />
                              <span className={selectedNote?.id === note.id ? 'text-primary-foreground' : 'text-muted-foreground'}>
                                {statusConfig[note.status].label}
                              </span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1">
                              {note.tags?.slice(0, 2).map((tag, idx) => {
                                const style = getTagStyle(tag);
                                return (
                                  <span 
                                    key={idx} 
                                    className={`text-[9px] px-1.5 py-0.5 rounded ${selectedNote?.id === note.id ? 'bg-primary-foreground/20' : style.bgColor + ' ' + style.textColor}`}
                                  >
                                    {tag}
                                  </span>
                                );
                              })}
                              {note.tags && note.tags.length > 2 && (
                                <span className={`text-[9px] ${selectedNote?.id === note.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                  +{note.tags.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2">
                            {note.startDate ? (
                              <span className="text-[10px]">
                                {format(note.startDate, 'yyyy-MM-dd')}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-2">
                            {note.dueDate ? (
                              <span className={`text-[10px] ${isPast(note.dueDate) && !isToday(note.dueDate) ? 'text-red-500' : ''}`}>
                                {format(note.dueDate, 'yyyy-MM-dd')}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-2 text-right text-[10px]">
                            {format(note.updateTime, 'MM-dd HH:mm')}
                          </td>
                          <td className="p-2 text-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

      {/* 中间编辑区 */}
      {showEditor && selectedNote && (
        <div className="flex-1 flex flex-col min-w-0 bg-background border-l">
          <>
            {/* 顶部工具栏 */}
            <div className="border-b px-4 py-3">
              {/* 第一行：标题和主要操作 */}
              <div className="flex items-center gap-3 mb-3">
                <Input
                  value={editTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-xl font-bold border-0 px-0 focus-visible:ring-0 flex-1 min-w-0"
                  placeholder="笔记标题"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {getSaveStatusDisplay()}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAnalyze}
                    className="h-8"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    智能分析
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSave}
                    disabled={saveStatus === 'saved' || saveStatus === 'saving'}
                    className="h-8"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    保存
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setShowEditor(false)}
                    title="关闭编辑区"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* 第二行：所有字段 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 文件路径 */}
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    value={editFilePath}
                    onChange={(e) => handleFilePathChange(e.target.value)}
                    placeholder="文件路径"
                    className="h-8 text-sm"
                  />
                </div>
                
                {/* 一级分类 */}
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                  <select
                    value={editCategory1}
                    onChange={(e) => handleCategory1Change(e.target.value)}
                    className="h-8 px-2 rounded-md border border-input bg-transparent text-sm flex-1"
                  >
                    {categoryLevel1Options.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                {/* 二级分类 */}
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <select
                    value={editCategory2}
                    onChange={(e) => handleCategory2Change(e.target.value)}
                    className="h-8 px-2 rounded-md border border-input bg-transparent text-sm flex-1"
                  >
                    {(categoryLevel2Map[editCategory1] || []).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* 状态选择 */}
                <div className="flex items-center gap-1">
                  {(Object.keys(statusConfig) as NoteStatus[]).map(status => {
                    const config = statusConfig[status];
                    const Icon = config.icon;
                    return (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors flex-1 justify-center ${
                          editStatus === status 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-accent hover:bg-accent/80'
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </button>
                    );
                  })}
                </div>

                {/* 开始日期 */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="h-8 text-sm flex-1"
                  />
                </div>

                {/* 结束日期 */}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    className="h-8 text-sm flex-1"
                  />
                </div>

                {/* 标签输入 */}
                <div className="flex items-center gap-2 lg:col-span-2">
                  <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex flex-wrap gap-1 flex-1 items-center">
                    {editTags.map((tag, idx) => {
                      const style = getTagStyle(tag);
                      return (
                        <Badge 
                          key={idx} 
                          variant="secondary"
                          className={`cursor-pointer ${style.bgColor} ${style.textColor} border-0 hover:opacity-80 text-xs`}
                          onClick={() => handleRemoveTag(tag)}
                        >
                          {tag}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      );
                    })}
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
                      placeholder="添加标签"
                      className="h-8 text-sm min-w-[100px] flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* 编辑区域 */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <Textarea
                value={editContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="在此输入笔记内容..."
                className="w-full flex-1 resize-none border-0 rounded-none focus-visible:ring-0 p-4 text-base leading-relaxed"
              />
            </div>
            
            {/* 底部状态栏 */}
            <div className="border-t px-4 py-2 flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{editContent.length} 字</span>
                <span className="border-l pl-4">创建: {format(selectedNote.createTime, 'yyyy-MM-dd HH:mm')}</span>
                <span>更新: {format(selectedNote.updateTime, 'yyyy-MM-dd HH:mm')}</span>
              </div>

              {/* 关联待办预览 */}
              {relatedTodos.length > 0 && (
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    关联待办 {relatedTodos.filter(t => t.status === 'completed').length}/{relatedTodos.length}
                  </span>
                </div>
              )}
            </div>
          </>
        </div>
      )}



      {/* 客户选择对话框 */}
      <Dialog open={showCustomerSelector} onOpenChange={setShowCustomerSelector}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>关联客户</DialogTitle>
            <DialogDescription>选择要关联到此笔记的客户</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索客户..." className="pl-8" />
            </div>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {customers.filter(c => !editRelatedCustomerIds.includes(c.id)).map(customer => (
                  <div 
                    key={customer.id}
                    onClick={() => {
                      handleAddRelatedCustomer(customer.id);
                      setShowCustomerSelector(false);
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      customer.type === 'personal' ? 'bg-blue-100' : 'bg-purple-100'
                    }`}>
                      {customer.type === 'personal' ? (
                        <User className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Building2 className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    </div>
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
                {customers.filter(c => !editRelatedCustomerIds.includes(c.id)).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">没有可关联的客户</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* 智能分析对话框 */}
      <Dialog open={showAnalyzeDialog} onOpenChange={setShowAnalyzeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              智能分析结果
            </DialogTitle>
            <DialogDescription>
              从笔记内容中提取的待办事项
            </DialogDescription>
          </DialogHeader>
          
          {analyzedTodos.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-auto">
              {analyzedTodos.map((todo, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-accent rounded">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span>{todo}</span>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                未检测到待办事项。您可以在笔记中使用以下格式标记待办：
                <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside">
                  <li>待办：xxx</li>
                  <li>TODO: xxx</li>
                  <li>【待办】xxx</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnalyzeDialog(false)}>
              取消
            </Button>
            {analyzedTodos.length > 0 && (
              <Button onClick={handleCreateAnalyzedTodos}>
                创建 {analyzedTodos.length} 条待办
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 回收站对话框 */}
      <RecycleBinDialog
        open={showRecycleBin}
        onOpenChange={setShowRecycleBin}
        onRestore={async (item) => {
          // 恢复笔记到数据库
          if (item.type === 'note') {
            await db.restoreNote(item.originalId);
          }
          // 刷新笔记列表
          loadNotes();
        }}
      />
    </div>
  );
}
