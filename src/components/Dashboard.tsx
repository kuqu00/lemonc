import { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  FileText, 
  CheckSquare, 
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  Plus,
  Calendar,
  Activity,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Tag,
  Lightbulb,
  Target,
  CheckCircle2,
  Timer,
  LayoutGrid
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db } from '@/db';
import { useAppStore } from '@/store';
import type { Note, Todo } from '@/types';
import { 
  format, isToday, isTomorrow, addDays, subDays, 
  eachDayOfInterval, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, isSameDay, parseISO,
  differenceInDays
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface DashboardProps {
  onPageChange: (page: string) => void;
}

type TimeRange = 'week' | 'month' | 'quarter';

// 图表颜色配置
const COLORS = {
  urgentImportant: '#ef4444',
  urgentNotImportant: '#f97316',
  notUrgentImportant: '#3b82f6',
  notUrgentNotImportant: '#6b7280',
  completed: '#10b981',
  pending: '#f59e0b',
  overdue: '#ef4444',
  notes: '#8b5cf6',
  todos: '#3b82f6'
};

export function Dashboard({ onPageChange }: DashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [stats, setStats] = useState({
    totalNotes: 0,
    totalTodos: 0,
    completedTodos: 0,
    overdueTodos: 0,
    notesChange: 0,
    todosChange: 0,
    completionRateChange: 0
  });
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [urgentTodos, setUrgentTodos] = useState<Todo[]>([]);
  const [todayTodos, setTodayTodos] = useState<Todo[]>([]);
  const [overdueTodos, setOverdueTodos] = useState<Todo[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [quadrantData, setQuadrantData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [tagData, setTagData] = useState<any[]>([]);
  const [heatMapData, setHeatMapData] = useState<Map<string, number>>(new Map());
  const [insights, setInsights] = useState<string[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // 根据时间范围计算日期区间
  const getDateRange = useCallback(() => {
    const now = new Date();
    switch (timeRange) {
      case 'week':
        return {
          start: subDays(now, 6),
          end: now,
          prevStart: subDays(now, 13),
          prevEnd: subDays(now, 7)
        };
      case 'month':
        return {
          start: subDays(now, 29),
          end: now,
          prevStart: subDays(now, 59),
          prevEnd: subDays(now, 30)
        };
      case 'quarter':
        return {
          start: subDays(now, 89),
          end: now,
          prevStart: subDays(now, 179),
          prevEnd: subDays(now, 90)
        };
    }
  }, [timeRange]);

  // 加载所有数据
  const loadData = useCallback(async () => {
    try {
      const now = new Date();
      const dateRange = getDateRange();
      
      // 获取当前数据
      const [notes, todos] = await Promise.all([
        db.getActiveNotes(),
        db.getActiveTodos()
      ]);

      // 计算统计数据
      const completedTodos = todos.filter(t => t.status === 'completed');
      const pendingTodos = todos.filter(t => t.status !== 'completed');
      const overdue = pendingTodos.filter(t => t.dueDate && t.dueDate < now.getTime() && !isToday(t.dueDate));

      // 计算环比
      const lastWeekNotes = notes.filter(n => n.createTime >= dateRange.start.getTime());
      const lastWeekTodos = todos.filter(t => t.createTime >= dateRange.start.getTime());
      const lastWeekCompleted = completedTodos.filter(t => t.updateTime >= dateRange.start.getTime());
      
      const prevWeekNotes = notes.filter(n => n.createTime >= dateRange.prevStart.getTime() && n.createTime < dateRange.start.getTime());
      const prevWeekTodos = todos.filter(t => t.createTime >= dateRange.prevStart.getTime() && t.createTime < dateRange.start.getTime());
      const prevWeekCompleted = completedTodos.filter(t => t.updateTime >= dateRange.prevStart.getTime() && t.updateTime < dateRange.start.getTime());

      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      setStats({
        totalNotes: notes.length,
        totalTodos: todos.length,
        completedTodos: completedTodos.length,
        overdueTodos: overdue.length,
        notesChange: calculateChange(lastWeekNotes.length, prevWeekNotes.length),
        todosChange: calculateChange(lastWeekTodos.length, prevWeekTodos.length),
        completionRateChange: calculateChange(lastWeekCompleted.length, prevWeekCompleted.length)
      });
      
      // 最近笔记
      setRecentNotes(notes.sort((a, b) => b.updateTime - a.updateTime).slice(0, 5));
      
      // 紧急待办
      const tomorrow = addDays(now, 1).getTime();
      setUrgentTodos(todos
        .filter(t => t.status !== 'completed' && t.dueDate && t.dueDate <= tomorrow)
        .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0))
        .slice(0, 5)
      );

      // 今日待办
      setTodayTodos(todos
        .filter(t => t.status !== 'completed' && t.dueDate && isToday(t.dueDate))
        .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0))
      );

      // 逾期待办
      setOverdueTodos(overdue.slice(0, 5));

      // 生成趋势数据
      const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
      const trendStats = days.map(day => {
        const dayStart = day.getTime();
        const dayEnd = addDays(day, 1).getTime();
        return {
          date: format(day, timeRange === 'week' ? 'MM-dd' : 'MM/dd'),
          completed: todos.filter(t => t.status === 'completed' && t.updateTime >= dayStart && t.updateTime < dayEnd).length,
          created: todos.filter(t => t.createTime >= dayStart && t.createTime < dayEnd).length,
          notes: notes.filter(n => n.createTime >= dayStart && n.createTime < dayEnd).length
        };
      });
      setWeeklyData(trendStats);

      // 四象限分布
      const quadrantStats = [
        { name: '紧急重要', value: todos.filter(t => t.priority === 'urgent-important').length, color: COLORS.urgentImportant },
        { name: '紧急不重要', value: todos.filter(t => t.priority === 'urgent-not-important').length, color: COLORS.urgentNotImportant },
        { name: '重要不紧急', value: todos.filter(t => t.priority === 'not-urgent-important').length, color: COLORS.notUrgentImportant },
        { name: '不紧急不重要', value: todos.filter(t => t.priority === 'not-urgent-not-important').length, color: COLORS.notUrgentNotImportant }
      ];
      setQuadrantData(quadrantStats);

      // 笔记分类统计
      const categoryCount: Record<string, number> = {};
      notes.forEach(note => {
        const cat = note.categoryLevel1 || '未分类';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });
      setCategoryData(Object.entries(categoryCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
      );

      // 标签统计
      const tagCount: Record<string, number> = {};
      notes.forEach(note => {
        note.tags?.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      });
      todos.forEach(todo => {
        todo.category?.split(',').forEach(tag => {
          if (tag.trim()) {
            tagCount[tag.trim()] = (tagCount[tag.trim()] || 0) + 1;
          }
        });
      });
      setTagData(Object.entries(tagCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
      );

      // 热力图数据（最近90天）
      const heatMapStart = subDays(now, 89);
      const heatMapDays = eachDayOfInterval({ start: heatMapStart, end: now });
      const heatMap = new Map<string, number>();
      heatMapDays.forEach(day => {
        const dayStart = day.getTime();
        const dayEnd = addDays(day, 1).getTime();
        const count = notes.filter(n => n.createTime >= dayStart && n.createTime < dayEnd).length +
                     todos.filter(t => t.createTime >= dayStart && t.createTime < dayEnd).length;
        heatMap.set(format(day, 'yyyy-MM-dd'), count);
      });
      setHeatMapData(heatMap);

      // 生成智能洞察
      generateInsights(notes, todos, completedTodos, overdue);

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Load dashboard data error:', error);
    }
  }, [getDateRange, timeRange]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  // 生成智能洞察
  const generateInsights = (notes: Note[], todos: Todo[], completed: Todo[], overdue: Todo[]) => {
    const insights: string[] = [];
    const now = new Date();

    // 完成率洞察
    const completionRate = todos.length > 0 ? (completed.length / todos.length) * 100 : 0;
    if (completionRate >= 80) {
      insights.push(`🎉 太棒了！您的待办完成率达到 ${completionRate.toFixed(0)}%，保持高效！`);
    } else if (completionRate < 50) {
      insights.push(`⚠️ 待办完成率较低（${completionRate.toFixed(0)}%），建议优先处理重要任务`);
    }

    // 逾期洞察
    if (overdue.length > 0) {
      insights.push(`🚨 您有 ${overdue.length} 个逾期待办，建议尽快处理`);
    }

    // 四象限洞察
    const urgentImportant = todos.filter(t => t.priority === 'urgent-important' && t.status !== 'completed');
    if (urgentImportant.length > 3) {
      insights.push(`🔥 有 ${urgentImportant.length} 个紧急重要任务待处理，建议立即行动`);
    }

    // 笔记活跃度洞察
    const last7DaysNotes = notes.filter(n => n.createTime >= subDays(now, 7).getTime());
    if (last7DaysNotes.length === 0) {
      insights.push(`📝 最近7天没有记录笔记，建议养成每日记录的习惯`);
    } else if (last7DaysNotes.length >= 5) {
      insights.push(`📚 笔记记录很活跃！最近7天记录了 ${last7DaysNotes.length} 篇笔记`);
    }

    // 效率趋势洞察
    const lastWeekCompleted = completed.filter(t => t.updateTime >= subDays(now, 7).getTime());
    const prevWeekCompleted = completed.filter(t => 
      t.updateTime >= subDays(now, 14).getTime() && 
      t.updateTime < subDays(now, 7).getTime()
    );
    if (lastWeekCompleted.length > prevWeekCompleted.length) {
      insights.push(`📈 效率提升！本周完成任务比上周多 ${lastWeekCompleted.length - prevWeekCompleted.length} 个`);
    } else if (lastWeekCompleted.length < prevWeekCompleted.length) {
      insights.push(`📉 本周完成任务比上周少，注意调整节奏`);
    }

    setInsights(insights.slice(0, 5));
  };

  // 快捷创建
  const handleQuickCreate = async (type: string) => {
    if (type === 'note') {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: '新建笔记',
        content: '',
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
      onPageChange('notebook');
    } else if (type === 'todo') {
      onPageChange('todo');
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent-important':
        return <Badge variant="destructive" className="text-xs">紧急重要</Badge>;
      case 'urgent-not-important':
        return <Badge className="bg-orange-500 text-xs">紧急不重要</Badge>;
      case 'not-urgent-important':
        return <Badge className="bg-blue-500 text-xs">重要不紧急</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">不紧急不重要</Badge>;
    }
  };

  const getDueDateText = (dueDate: number) => {
    if (isToday(dueDate)) return '今天';
    if (isTomorrow(dueDate)) return '明天';
    return format(dueDate, 'MM-dd');
  };

  // 统计卡片
  const statCards = [
    { 
      title: '工作笔记', 
      value: stats.totalNotes, 
      change: stats.notesChange,
      icon: FileText, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      onClick: () => onPageChange('notebook')
    },
    { 
      title: '待办事项', 
      value: stats.totalTodos, 
      subValue: `${stats.completedTodos} 已完成`,
      change: stats.todosChange,
      icon: CheckSquare, 
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      onClick: () => onPageChange('todo')
    },
    { 
      title: '完成率', 
      value: `${stats.totalTodos > 0 ? Math.round((stats.completedTodos / stats.totalTodos) * 100) : 0}%`, 
      subValue: `${stats.completedTodos} / ${stats.totalTodos}`,
      change: stats.completionRateChange,
      icon: TrendingUp, 
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      onClick: () => onPageChange('todo')
    },
    { 
      title: '逾期待办', 
      value: stats.overdueTodos, 
      subValue: '需立即处理',
      icon: AlertCircle, 
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      onClick: () => onPageChange('todo')
    },
  ];

  // 生成热力图
  const renderHeatMap = () => {
    const weeks = [];
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const now = new Date();
    const startDate = subDays(now, 89);
    
    // 生成12周的日期
    for (let w = 0; w < 13; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(startDate, w * 7 + d);
        if (date <= now) {
          const dateStr = format(date, 'yyyy-MM-dd');
          const count = heatMapData.get(dateStr) || 0;
          week.push({ date, count, dateStr });
        }
      }
      if (week.length > 0) weeks.push(week);
    }

    const getHeatColor = (count: number) => {
      if (count === 0) return 'bg-gray-100';
      if (count === 1) return 'bg-green-200';
      if (count === 2) return 'bg-green-300';
      if (count === 3) return 'bg-green-400';
      return 'bg-green-500';
    };

    return (
      <div className="space-y-2">
        <div className="flex gap-1">
          {days.map((day, i) => (
            <div key={i} className="w-4 text-xs text-center text-muted-foreground">{day}</div>
          ))}
        </div>
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={cn(
                    "w-4 h-4 rounded-sm cursor-pointer transition-colors",
                    getHeatColor(day.count)
                  )}
                  title={`${day.dateStr}: ${day.count} 项活动`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>少</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded-sm bg-gray-100" />
            <div className="w-4 h-4 rounded-sm bg-green-200" />
            <div className="w-4 h-4 rounded-sm bg-green-300" />
            <div className="w-4 h-4 rounded-sm bg-green-400" />
            <div className="w-4 h-4 rounded-sm bg-green-500" />
          </div>
          <span>多</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 头部区域 */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">欢迎回来，{useAppStore.getState().currentUser?.name || '用户'}</h2>
          <p className="text-muted-foreground mt-1">
            今天是 {format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            上次更新: {format(lastRefresh, 'HH:mm:ss')}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 快捷创建入口 */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="gap-2" onClick={() => handleQuickCreate('note')}>
          <FileText className="h-4 w-4 text-blue-500" />
          新建笔记
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => handleQuickCreate('todo')}>
          <CheckSquare className="h-4 w-4 text-green-500" />
          新建待办
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const isPositive = (card.change || 0) >= 0;
          return (
            <Card 
              key={card.title} 
              className={cn(
                "cursor-pointer hover:shadow-lg transition-all border-2",
                "hover:border-opacity-50",
                card.borderColor
              )}
              style={{ borderColor: 'transparent' }}
              onClick={card.onClick}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-3xl font-bold mt-2">{card.value}</p>
                    {card.subValue && (
                      <p className="text-xs text-muted-foreground mt-1">{card.subValue}</p>
                    )}
                    {card.change !== undefined && card.change !== 0 && (
                      <div className={cn(
                        "flex items-center gap-1 mt-2 text-xs",
                        isPositive ? "text-green-600" : "text-red-600"
                      )}>
                        {isPositive ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        <span>{Math.abs(card.change)}% 较上期</span>
                      </div>
                    )}
                  </div>
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', card.bgColor)}>
                    <Icon className={cn('h-6 w-6', card.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 智能洞察 */}
      {insights.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              智能洞察
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 趋势图表 - 带时间范围切换 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                趋势分析
              </CardTitle>
              <CardDescription>待办完成和创建趋势</CardDescription>
            </div>
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <TabsList>
                <TabsTrigger value="week">7天</TabsTrigger>
                <TabsTrigger value="month">30天</TabsTrigger>
                <TabsTrigger value="quarter">90天</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNotes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  name="完成待办"
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorCompleted)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="created" 
                  name="新建待办"
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorCreated)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="notes" 
                  name="新建笔记"
                  stroke="#8b5cf6" 
                  fillOpacity={1} 
                  fill="url(#colorNotes)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 数据分析区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 四象限分布 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-blue-500" />
              四象限分布
            </CardTitle>
            <CardDescription>待办事项优先级分布</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={quadrantData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {quadrantData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {quadrantData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 笔记分类统计 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              笔记分类
            </CardTitle>
            <CardDescription>按一级分类统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 标签云 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4 text-green-500" />
              常用标签
            </CardTitle>
            <CardDescription>笔记和待办标签统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex flex-wrap content-start gap-2 overflow-auto">
              {tagData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center w-full py-8">暂无标签数据</p>
              ) : (
                tagData.map((tag) => (
                  <Badge 
                    key={tag.name} 
                    variant="secondary"
                    className="text-sm py-1 px-3"
                    style={{ 
                      fontSize: `${Math.max(0.75, Math.min(1.25, 0.75 + tag.value * 0.05))}rem`,
                      opacity: Math.max(0.6, Math.min(1, 0.6 + tag.value * 0.05))
                    }}
                  >
                    {tag.name} ({tag.value})
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 活跃度热力图 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-500" />
            活跃度热力图
          </CardTitle>
          <CardDescription>最近90天笔记和待办创建情况</CardDescription>
        </CardHeader>
        <CardContent>
          {renderHeatMap()}
        </CardContent>
      </Card>

      {/* 主要内容区 - 三栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 今日待办 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-500" />
                  今日待办
                  {todayTodos.length > 0 && (
                    <Badge variant="destructive" className="text-xs">{todayTodos.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>今天需要完成的任务</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onPageChange('todo')}>
                查看全部
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {todayTodos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>今日暂无待办</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => onPageChange('todo')}>
                    创建待办
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayTodos.map((todo) => (
                    <div 
                      key={todo.id} 
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer group"
                      onClick={() => onPageChange('todo')}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{todo.title}</p>
                          {getPriorityBadge(todo.priority)}
                        </div>
                        {todo.subSteps.length > 0 && (
                          <div className="mt-2">
                            <Progress value={todo.progress} className="h-1.5" />
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          db.todos.update(todo.id, { status: 'completed', progress: 100 });
                          loadData();
                        }}
                      >
                        <CheckSquare className="h-4 w-4 text-green-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 逾期待办 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  逾期待办
                  {overdueTodos.length > 0 && (
                    <Badge variant="destructive" className="text-xs">{overdueTodos.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>已超过截止日期的任务</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onPageChange('todo')}>
                查看全部
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {overdueTodos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>暂无逾期待办</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {overdueTodos.map((todo) => (
                    <div 
                      key={todo.id} 
                      className="flex items-start gap-3 p-3 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors cursor-pointer"
                      onClick={() => onPageChange('todo')}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{todo.title}</p>
                          {getPriorityBadge(todo.priority)}
                        </div>
                        {todo.dueDate && (
                          <p className="text-xs text-red-600 mt-1">
                            逾期 {Math.ceil((Date.now() - todo.dueDate) / (1000 * 60 * 60 * 24))} 天
                          </p>
                        )}
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        逾期
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 最近笔记 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  最近笔记
                </CardTitle>
                <CardDescription>最近更新的工作笔记</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onPageChange('notebook')}>
                查看全部
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {recentNotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>暂无笔记</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => handleQuickCreate('note')}>
                    创建笔记
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentNotes.map((note) => (
                    <div 
                      key={note.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => onPageChange('notebook')}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{note.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{note.categoryLevel1}</Badge>
                          {note.categoryLevel2 && (
                            <span className="text-xs text-muted-foreground">{note.categoryLevel2}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {format(note.updateTime, 'MM-dd')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
