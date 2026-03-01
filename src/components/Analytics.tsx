import { useEffect, useState, useCallback } from 'react';
import { 
  FileText, 
  CheckSquare, 
  Users, 
  BarChart3,
  Activity,
  DollarSign,
  AlertCircle,
  Phone,
  FileCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { db } from '@/db';
import type { Note, Todo, Customer, Contract, FollowUpRecord } from '@/types';
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart
} from 'recharts';

// 图表颜色
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// 五级分类颜色
const CLASSIFY_COLORS = {
  'normal': '#10b981',
  'special': '#f59e0b',
  'subprime': '#f97316',
  'doubtful': '#ef4444',
  'loss': '#7c2d12'
};

export function Analytics() {
  const [activeTab, setActiveTab] = useState('overview');
  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // 加载数据
  const loadData = useCallback(async () => {
    const [notesData, todosData, customersData, contractsData, followUpsData] = await Promise.all([
      db.getActiveNotes(),
      db.getActiveTodos(),
      db.getActiveCustomers(),
      db.contracts.toArray(),
      db.followUpRecords.toArray()
    ]);

    setNotes(notesData);
    setTodos(todosData);
    setCustomers(customersData);
    setContracts(contractsData);
    setFollowUps(followUpsData);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 获取日期范围
  const getDateRange = () => {
    const end = new Date();
    const start = {
      '7d': subDays(end, 7),
      '30d': subDays(end, 30),
      '90d': subDays(end, 90),
      '1y': subDays(end, 365)
    }[dateRange];
    return { start, end };
  };

  // ==================== 概览统计 ====================
  const overviewStats = {
    totalNotes: notes.length,
    totalTodos: todos.length,
    completedTodos: todos.filter(t => t.status === 'completed').length,
    totalCustomers: customers.length,
    totalContracts: contracts.length,
    totalContractAmount: contracts.reduce((sum, c) => sum + c.amount, 0),
    expiringContracts: contracts.filter(c => {
      const days30 = 30 * 24 * 60 * 60 * 1000;
      return c.endDate <= Date.now() + days30 && c.endDate >= Date.now();
    }).length,
    totalFollowUps: followUps.length,
    personalCustomers: customers.filter(c => c.type === 'personal').length,
    enterpriseCustomers: customers.filter(c => c.type === 'enterprise').length
  };

  // ==================== 待办分析 ====================
  const todoPriorityData = [
    { name: '紧急重要', value: todos.filter(t => t.priority === 'urgent-important').length, color: '#ef4444' },
    { name: '紧急不重要', value: todos.filter(t => t.priority === 'urgent-not-important').length, color: '#f59e0b' },
    { name: '重要不紧急', value: todos.filter(t => t.priority === 'not-urgent-important').length, color: '#3b82f6' },
    { name: '不紧急不重要', value: todos.filter(t => t.priority === 'not-urgent-not-important').length, color: '#6b7280' }
  ].filter(d => d.value > 0);

  const todoStatusData = [
    { name: '待处理', value: todos.filter(t => t.status === 'pending').length, color: '#6b7280' },
    { name: '进行中', value: todos.filter(t => t.status === 'in-progress').length, color: '#3b82f6' },
    { name: '已完成', value: todos.filter(t => t.status === 'completed').length, color: '#10b981' }
  ].filter(d => d.value > 0);

  const todoCompletionRate = todos.length > 0 ? Math.round((overviewStats.completedTodos / todos.length) * 100) : 0;
  const todoAvgProgress = todos.length > 0 ? Math.round(todos.reduce((sum, t) => sum + t.progress, 0) / todos.length) : 0;

  // ==================== 客户分析 ====================
  const customerTypeData = [
    { name: '个人客户', value: overviewStats.personalCustomers },
    { name: '企业客户', value: overviewStats.enterpriseCustomers }
  ].filter(d => d.value > 0);

  // 客户标签分布
  const customerTagCounts: Record<string, number> = {};
  customers.forEach(c => {
    c.tags.forEach(tag => {
      customerTagCounts[tag] = (customerTagCounts[tag] || 0) + 1;
    });
  });
  const customerTagData = Object.entries(customerTagCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // 跟进统计
  const followUpTypeData = [
    { name: '电话', value: followUps.filter(f => f.type === 'phone').length },
    { name: '拜访', value: followUps.filter(f => f.type === 'visit').length },
    { name: '短信', value: followUps.filter(f => f.type === 'sms').length },
    { name: '其他', value: followUps.filter(f => f.type === 'other').length }
  ].filter(d => d.value > 0);

  // ==================== 合同分析 ====================
  const contractClassifyData = [
    { name: '正常', value: contracts.filter(c => c.classify === 'normal').length, color: CLASSIFY_COLORS.normal },
    { name: '关注', value: contracts.filter(c => c.classify === 'special').length, color: CLASSIFY_COLORS.special },
    { name: '次级', value: contracts.filter(c => c.classify === 'subprime').length, color: CLASSIFY_COLORS.subprime },
    { name: '可疑', value: contracts.filter(c => c.classify === 'doubtful').length, color: CLASSIFY_COLORS.doubtful },
    { name: '损失', value: contracts.filter(c => c.classify === 'loss').length, color: CLASSIFY_COLORS.loss }
  ].filter(d => d.value > 0);

  const contractStatusData = [
    { name: '正常', value: contracts.filter(c => c.status === 'normal').length, color: '#10b981' },
    { name: '诉讼', value: contracts.filter(c => c.status === 'litigation').length, color: '#f59e0b' },
    { name: '执行', value: contracts.filter(c => c.status === 'execution').length, color: '#ef4444' }
  ].filter(d => d.value > 0);

  // 合同金额分布
  const contractAmountRanges = [
    { name: '50万以下', min: 0, max: 500000 },
    { name: '50-100万', min: 500000, max: 1000000 },
    { name: '100-200万', min: 1000000, max: 2000000 },
    { name: '200-500万', min: 2000000, max: 5000000 },
    { name: '500万以上', min: 5000000, max: Infinity }
  ];
  const contractAmountData = contractAmountRanges.map(range => ({
    name: range.name,
    value: contracts.filter(c => c.amount >= range.min && c.amount < range.max).length
  })).filter(d => d.value > 0);

  // 月度趋势（最近12个月）
  const last12Months = eachMonthOfInterval({
    start: subMonths(new Date(), 11),
    end: new Date()
  });

  const monthlyTrendData = last12Months.map(month => {
    const monthStart = startOfMonth(month).getTime();
    const monthEnd = endOfMonth(month).getTime();
    
    return {
      month: format(month, 'yyyy-MM'),
      contracts: contracts.filter(c => c.createTime >= monthStart && c.createTime <= monthEnd).length,
      amount: contracts.filter(c => c.createTime >= monthStart && c.createTime <= monthEnd).reduce((sum, c) => sum + c.amount, 0) / 10000,
      customers: customers.filter(c => c.createTime >= monthStart && c.createTime <= monthEnd).length,
      notes: notes.filter(n => n.createTime >= monthStart && n.createTime <= monthEnd).length
    };
  });

  // 即将到期合同
  const expiringContracts = contracts
    .filter(c => c.endDate > Date.now())
    .sort((a, b) => a.endDate - b.endDate)
    .slice(0, 10);

  // ==================== 效率趋势 ====================
  const { start, end } = getDateRange();
  const days = eachDayOfInterval({ start, end });

  const efficiencyData = days.map(day => {
    const dayStart = day.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    
    return {
      date: format(day, 'MM-dd'),
      notes: notes.filter(n => n.createTime >= dayStart && n.createTime < dayEnd).length,
      todos: todos.filter(t => t.status === 'completed' && t.updateTime >= dayStart && t.updateTime < dayEnd).length,
      customers: customers.filter(c => c.createTime >= dayStart && c.createTime < dayEnd).length,
      followUps: followUps.filter(f => f.time >= dayStart && f.time < dayEnd).length
    };
  });

  return (
    <div className="space-y-6">
      {/* 日期范围选择 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">数据分析</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">时间范围：</span>
          <div className="flex border rounded-md">
            {[
              { value: '7d', label: '7天' },
              { value: '30d', label: '30天' },
              { value: '90d', label: '90天' },
              { value: '1y', label: '1年' }
            ].map(r => (
              <button
                key={r.value}
                onClick={() => setDateRange(r.value as any)}
                className={`px-3 py-1 text-sm transition-colors ${
                  dateRange === r.value ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            概览
          </TabsTrigger>
          <TabsTrigger value="customer">
            <Users className="h-4 w-4 mr-2" />
            客户
          </TabsTrigger>
          <TabsTrigger value="contract">
            <FileCheck className="h-4 w-4 mr-2" />
            合同
          </TabsTrigger>
          <TabsTrigger value="efficiency">
            <Activity className="h-4 w-4 mr-2" />
            效率
          </TabsTrigger>
        </TabsList>

        {/* 概览 */}
        <TabsContent value="overview" className="space-y-6">
          {/* 核心指标 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">客户总数</p>
                    <p className="text-3xl font-bold">{overviewStats.totalCustomers}</p>
                  </div>
                  <Users className="h-10 w-10 text-blue-500 opacity-50" />
                </div>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="text-muted-foreground">个人: {overviewStats.personalCustomers}</span>
                  <span className="text-muted-foreground">企业: {overviewStats.enterpriseCustomers}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">合同总额</p>
                    <p className="text-3xl font-bold">¥{(overviewStats.totalContractAmount / 10000).toFixed(0)}万</p>
                  </div>
                  <DollarSign className="h-10 w-10 text-green-500 opacity-50" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">共 {overviewStats.totalContracts} 笔合同</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">待办完成率</p>
                    <p className="text-3xl font-bold">{todoCompletionRate}%</p>
                  </div>
                  <CheckSquare className="h-10 w-10 text-purple-500 opacity-50" />
                </div>
                <Progress value={todoCompletionRate} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">到期预警</p>
                    <p className="text-3xl font-bold text-orange-500">{overviewStats.expiringContracts}</p>
                  </div>
                  <AlertCircle className="h-10 w-10 text-orange-500 opacity-50" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">30天内到期合同</p>
              </CardContent>
            </Card>
          </div>

          {/* 图表区 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 待办优先级分布 */}
            <Card>
              <CardHeader>
                <CardTitle>待办优先级分布</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie
                      data={todoPriorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {todoPriorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 待办状态分布 */}
            <Card>
              <CardHeader>
                <CardTitle>待办状态分布</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie
                      data={todoStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {todoStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 月度趋势 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>月度业务趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="contracts" name="合同数" fill="#3b82f6" />
                    <Bar yAxisId="left" dataKey="customers" name="新客户" fill="#10b981" />
                    <Line yAxisId="right" type="monotone" dataKey="amount" name="合同金额(万)" stroke="#f59e0b" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 客户分析 */}
        <TabsContent value="customer" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 客户类型分布 */}
            <Card>
              <CardHeader>
                <CardTitle>客户类型分布</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie
                      data={customerTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {customerTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 客户标签分布 */}
            <Card>
              <CardHeader>
                <CardTitle>客户标签分布（Top 8）</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={customerTagData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 跟进方式分布 */}
            <Card>
              <CardHeader>
                <CardTitle>跟进方式分布</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={followUpTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 跟进统计 */}
            <Card>
              <CardHeader>
                <CardTitle>跟进统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-accent rounded-lg">
                    <p className="text-3xl font-bold">{overviewStats.totalFollowUps}</p>
                    <p className="text-sm text-muted-foreground">总跟进次数</p>
                  </div>
                  <div className="text-center p-4 bg-accent rounded-lg">
                    <p className="text-3xl font-bold">
                      {followUps.filter(f => f.nextFollowDate && f.nextFollowDate > Date.now()).length}
                    </p>
                    <p className="text-sm text-muted-foreground">待跟进</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 合同分析 */}
        <TabsContent value="contract" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 五级分类分布 */}
            <Card>
              <CardHeader>
                <CardTitle>五级分类分布</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie
                      data={contractClassifyData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {contractClassifyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 合同状态分布 */}
            <Card>
              <CardHeader>
                <CardTitle>合同状态分布</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie
                      data={contractStatusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {contractStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 合同金额分布 */}
            <Card>
              <CardHeader>
                <CardTitle>合同金额分布</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={contractAmountData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 即将到期合同 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  即将到期合同
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {expiringContracts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">暂无即将到期合同</p>
                  ) : (
                    <div className="space-y-2">
                      {expiringContracts.map(contract => {
                        const customer = customers.find(c => c.id === contract.customerId);
                        const daysLeft = Math.ceil((contract.endDate - Date.now()) / (1000 * 60 * 60 * 24));
                        return (
                          <div key={contract.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                            <div>
                              <p className="font-medium">{contract.code}</p>
                              <p className="text-sm text-muted-foreground">
                                {customer?.name} | ¥{(contract.amount / 10000).toFixed(2)}万
                              </p>
                            </div>
                            <Badge variant={daysLeft <= 7 ? 'destructive' : 'default'}>
                              {daysLeft}天后到期
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 效率分析 */}
        <TabsContent value="efficiency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>工作效率趋势</CardTitle>
              <CardDescription>记录创建、待办完成、客户新增、跟进次数趋势</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={efficiencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="notes" name="新建笔记" fill="#3b82f6" />
                  <Bar dataKey="todos" name="完成待办" fill="#10b981" />
                  <Bar dataKey="customers" name="新增客户" fill="#f59e0b" />
                  <Line type="monotone" dataKey="followUps" name="跟进次数" stroke="#8b5cf6" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>本周统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <span>新建笔记</span>
                    <span className="font-bold">
                      {efficiencyData.reduce((sum, d) => sum + d.notes, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <span>完成待办</span>
                    <span className="font-bold">
                      {efficiencyData.reduce((sum, d) => sum + d.todos, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <span>新增客户</span>
                    <span className="font-bold">
                      {efficiencyData.reduce((sum, d) => sum + d.customers, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <span>跟进次数</span>
                    <span className="font-bold">
                      {efficiencyData.reduce((sum, d) => sum + d.followUps, 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>待办进度概览</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="w-32 h-32">
                      <circle className="text-gray-200" strokeWidth="10" stroke="currentColor" fill="transparent" r="58" cx="64" cy="64" />
                      <circle
                        className="text-green-500"
                        strokeWidth="10"
                        strokeDasharray={365}
                        strokeDashoffset={365 - (365 * todoCompletionRate / 100)}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="58"
                        cx="64"
                        cy="64"
                      />
                    </svg>
                    <span className="absolute text-2xl font-bold">{todoCompletionRate}%</span>
                  </div>
                  <p className="text-muted-foreground mt-4">
                    已完成 {overviewStats.completedTodos} / {todos.length} 项待办
                  </p>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">平均进度</p>
                  <Progress value={todoAvgProgress} />
                  <p className="text-right text-sm mt-1">{todoAvgProgress}%</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>业务概览</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">工作笔记</p>
                      <p className="text-xl font-bold">{overviewStats.totalNotes}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                    <Users className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">客户档案</p>
                      <p className="text-xl font-bold">{overviewStats.totalCustomers}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                    <FileCheck className="h-5 w-5 text-purple-500" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">合同总数</p>
                      <p className="text-xl font-bold">{overviewStats.totalContracts}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                    <Phone className="h-5 w-5 text-orange-500" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">跟进记录</p>
                      <p className="text-xl font-bold">{overviewStats.totalFollowUps}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
