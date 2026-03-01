import { useState, useEffect } from 'react';
import {
  Trash2,
  RotateCcw,
  X,
  AlertTriangle,
  Clock,
  FileText,
  CheckSquare,
  Users,
  Search,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRecycleStore } from '@/store/recycle';
import { useAppStore } from '@/store';
import type { RecycleItem, RecycleItemType } from '@/types/recycle';
import { getRemainingDays } from '@/types/recycle';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface RecycleBinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore?: (item: RecycleItem) => void;
}

const typeConfig: Record<RecycleItemType, { label: string; icon: typeof FileText; color: string }> = {
  note: { label: '笔记', icon: FileText, color: 'bg-blue-500' },
  todo: { label: '待办', icon: CheckSquare, color: 'bg-green-500' },
  customer: { label: '客户', icon: Users, color: 'bg-purple-500' },
};

export function RecycleBinDialog({ open, onOpenChange, onRestore }: RecycleBinDialogProps) {
  const {
    items,
    getAllItems,
    getItemsByType,
    getStats,
    getExpiringItems,
    restoreItem,
    permanentDelete,
    emptyRecycleBin,
    cleanupExpired,
  } = useRecycleStore();
  
  const { addNotification } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'all' | RecycleItemType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemToDelete, setItemToDelete] = useState<RecycleItem | null>(null);
  const [itemToRestore, setItemToRestore] = useState<RecycleItem | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  
  // 清理过期项目
  useEffect(() => {
    if (open) {
      const deleted = cleanupExpired();
      if (deleted > 0) {
        addNotification({
          title: '自动清理完成',
          message: `已自动清理 ${deleted} 个过期项目`,
          type: 'info',
        });
      }
    }
  }, [open]);
  
  // 获取显示的项目
  const getDisplayItems = () => {
    let filtered = activeTab === 'all' ? getAllItems() : getItemsByType(activeTab);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.content?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };
  
  const displayItems = getDisplayItems();
  const stats = getStats();
  const expiringItems = getExpiringItems(3);
  
  // 恢复项目
  const handleRestore = (item: RecycleItem) => {
    const restored = restoreItem(item.id);
    if (restored) {
      onRestore?.(restored);
      addNotification({
        title: '恢复成功',
        message: `「${item.title}」已恢复到原位置`,
        type: 'success',
      });
      setItemToRestore(null);
    } else {
      addNotification({
        title: '恢复失败',
        message: '项目可能已过期或被永久删除',
        type: 'error',
      });
    }
  };
  
  // 永久删除
  const handlePermanentDelete = (item: RecycleItem) => {
    permanentDelete(item.id);
    addNotification({
      title: '已永久删除',
      message: `「${item.title}」已永久删除，无法恢复`,
      type: 'info',
    });
    setItemToDelete(null);
  };
  
  // 清空回收站
  const handleEmptyRecycleBin = () => {
    emptyRecycleBin();
    addNotification({
      title: '回收站已清空',
      message: '所有项目已永久删除',
      type: 'info',
    });
    setShowEmptyConfirm(false);
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              回收站
            </DialogTitle>
            <DialogDescription>
              已删除的项目将在此保留30天，之后将自动永久删除
            </DialogDescription>
          </DialogHeader>
          
          {/* 统计信息 */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <Card className="p-3">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">总计</div>
            </Card>
            <Card className="p-3">
              <div className="text-2xl font-bold text-blue-600">{stats.byType.note}</div>
              <div className="text-xs text-muted-foreground">笔记</div>
            </Card>
            <Card className="p-3">
              <div className="text-2xl font-bold text-green-600">{stats.byType.todo}</div>
              <div className="text-xs text-muted-foreground">待办</div>
            </Card>
            <Card className="p-3">
              <div className="text-2xl font-bold text-purple-600">{stats.byType.customer}</div>
              <div className="text-xs text-muted-foreground">客户</div>
            </Card>
          </div>
          
          {/* 即将过期警告 */}
          {expiringItems.length > 0 && (
            <AlertDialog>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    有 {expiringItems.length} 个项目将在3天内永久删除
                  </p>
                </div>
              </div>
            </AlertDialog>
          )}
          
          {/* 搜索和筛选 */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索已删除的项目..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            {stats.total > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowEmptyConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                清空回收站
              </Button>
            )}
          </div>
          
          {/* 标签页 */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                全部 ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="note">
                笔记 ({stats.byType.note})
              </TabsTrigger>
              <TabsTrigger value="todo">
                待办 ({stats.byType.todo})
              </TabsTrigger>
              <TabsTrigger value="customer">
                客户 ({stats.byType.customer})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[300px]">
                {displayItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>回收站为空</p>
                    <p className="text-sm mt-1">删除的项目将显示在这里</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayItems.map((item) => {
                      const config = typeConfig[item.type];
                      const Icon = config.icon;
                      const remainingDays = getRemainingDays(item.expiresAt);
                      const isExpiringSoon = remainingDays <= 3;
                      
                      return (
                        <Card
                          key={item.id}
                          className="p-3 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-md ${config.color} text-white shrink-0`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium truncate">{item.title}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  {config.label}
                                </Badge>
                                {isExpiringSoon && (
                                  <Badge variant="destructive" className="text-xs">
                                    {remainingDays}天后删除
                                  </Badge>
                                )}
                              </div>
                              
                              {item.content && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {item.content}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  删除于 {format(item.deletedAt, 'MM-dd HH:mm', { locale: zhCN })}
                                </span>
                                <span>
                                  剩余 {remainingDays} 天
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setItemToRestore(item)}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                恢复
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => setItemToDelete(item)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 恢复确认对话框 */}
      <AlertDialog open={!!itemToRestore} onOpenChange={() => setItemToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              恢复项目
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要恢复「{itemToRestore?.title}」吗？<br />
              恢复后项目将回到原来的位置。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => itemToRestore && handleRestore(itemToRestore)}>
              恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* 永久删除确认对话框 */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              永久删除
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要永久删除「{itemToDelete?.title}」吗？<br />
              <span className="text-destructive font-medium">此操作不可撤销，数据将永久丢失！</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && handlePermanentDelete(itemToDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              永久删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* 清空回收站确认对话框 */}
      <AlertDialog open={showEmptyConfirm} onOpenChange={setShowEmptyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              清空回收站
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要清空回收站吗？<br />
              共有 {stats.total} 个项目将被永久删除，<span className="text-destructive font-medium">此操作不可撤销！</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmptyRecycleBin}
              className="bg-destructive hover:bg-destructive/90"
            >
              确认清空
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
