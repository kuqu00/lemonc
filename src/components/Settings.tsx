import { useEffect, useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Layout, 
  Save,
  Monitor,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store';
import { db } from '@/db';
import type { ThemeType } from '@/types';
import { DataManager } from './DataManager';
import { DesktopDataManager } from './DesktopDataManager';
import { isElectron } from '@/lib/localDataStore';
import { format } from 'date-fns';

const themes: { value: ThemeType; label: string; color: string }[] = [
  { value: 'light', label: '浅色主题', color: 'bg-gray-100' },
  { value: 'dark', label: '深色主题', color: 'bg-gray-800' },
  { value: 'blue', label: '蓝色主题', color: 'bg-blue-500' },
  { value: 'green', label: '绿色主题', color: 'bg-green-500' },
  { value: 'purple', label: '紫色主题', color: 'bg-purple-500' }
];

const layouts = [
  { value: 'sidebar', label: '侧边栏布局', description: '左侧显示导航菜单，适合宽屏显示器' },
  { value: 'topbar', label: '顶部栏布局', description: '顶部显示导航菜单，内容区域更宽' },
  { value: 'mixed', label: '混合布局', description: '顶部显示工具栏，左侧显示图标菜单' }
];

export function Settings() {
  const [activeTab, setActiveTab] = useState('appearance');
  const [isSaving, setIsSaving] = useState(false);
  
  // 设置状态
  const [autoSave, setAutoSave] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(30);
  const [todoReminder, setTodoReminder] = useState(true);
  const [contractReminder, setContractReminder] = useState(true);
  const [reminderDays, setReminderDays] = useState(30);
  
  const { theme, setTheme, layout, setLayout, settings, loadSettings, updateSettings, addNotification } = useAppStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settings) {
      setAutoSave(settings.autoSave);
      setAutoSaveInterval(settings.autoSaveInterval);
      setTodoReminder(settings.todoReminder);
      setContractReminder(settings.contractReminder);
      setReminderDays(settings.reminderDays);
    }
  }, [settings]);

  // 保存设置
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        autoSave,
        autoSaveInterval,
        todoReminder,
        contractReminder,
        reminderDays
      });
      
      await addNotification({
        title: '保存成功',
        message: '系统设置已更新',
        type: 'success'
      });
    } catch (error) {
      await addNotification({
        title: '保存失败',
        message: '请重试',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 数据管理
  const handleExportData = async () => {
    const data = {
      notes: await db.getActiveNotes(),
      todos: await db.getActiveTodos(),
      customers: await db.getActiveCustomers(),
      contracts: await db.contracts.toArray(),
      followUpRecords: await db.followUpRecords.toArray(),
      exportTime: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank-office-backup-${format(new Date(), 'yyyyMMdd-HHmmss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    await addNotification({
      title: '导出成功',
      message: '数据已导出到文件',
      type: 'success'
    });
  };

  const handleClearData = async () => {
    if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) return;
    if (!confirm('再次确认：您真的要删除所有数据吗？')) return;

    await Promise.all([
      db.notes.clear(),
      db.todos.clear(),
      db.customers.clear(),
      db.contracts.clear(),
      db.followUpRecords.clear(),
      db.mortgageCalcs.clear(),
      db.incomeCalcs.clear()
    ]);

    await addNotification({
      title: '清空完成',
      message: '所有数据已清空',
      type: 'success'
    });
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            外观
          </TabsTrigger>
          <TabsTrigger value="function">
            <SettingsIcon className="h-4 w-4 mr-2" />
            功能
          </TabsTrigger>
          <TabsTrigger value="data">
            <Monitor className="h-4 w-4 mr-2" />
            数据
          </TabsTrigger>
        </TabsList>

        {/* 外观设置 */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>主题设置</CardTitle>
              <CardDescription>选择您喜欢的主题颜色</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {themes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      theme === t.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full ${t.color} mx-auto mb-2`} />
                    <p className="font-medium text-sm">{t.label}</p>
                    {theme === t.value && (
                      <Badge variant="default" className="mt-2">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        当前
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>布局设置</CardTitle>
              <CardDescription>选择适合您的界面布局</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {layouts.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLayout(l.value as any)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      layout === l.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Layout className="h-6 w-6 mb-2" />
                    <p className="font-medium">{l.label}</p>
                    <p className="text-sm text-muted-foreground mt-1">{l.description}</p>
                    {layout === l.value && (
                      <Badge variant="default" className="mt-2">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        当前
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 功能设置 */}
        <TabsContent value="function" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>自动保存</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">启用自动保存</p>
                  <p className="text-sm text-muted-foreground">编辑内容时自动保存到本地</p>
                </div>
                <Switch checked={autoSave} onCheckedChange={setAutoSave} />
              </div>
              
              {autoSave && (
                <div className="space-y-2">
                  <Label>自动保存间隔（秒）</Label>
                  <Input
                    type="number"
                    value={autoSaveInterval}
                    onChange={(e) => setAutoSaveInterval(parseInt(e.target.value) || 30)}
                    min={10}
                    max={300}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>提醒设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">待办提醒</p>
                  <p className="text-sm text-muted-foreground">到期前提醒待办事项</p>
                </div>
                <Switch checked={todoReminder} onCheckedChange={setTodoReminder} />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">合同到期提醒</p>
                  <p className="text-sm text-muted-foreground">合同到期前提醒</p>
                </div>
                <Switch checked={contractReminder} onCheckedChange={setContractReminder} />
              </div>
              
              {contractReminder && (
                <div className="space-y-2">
                  <Label>提前提醒天数</Label>
                  <Input
                    type="number"
                    value={reminderDays}
                    onChange={(e) => setReminderDays(parseInt(e.target.value) || 30)}
                    min={1}
                    max={90}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? '保存中...' : '保存设置'}
            </Button>
          </div>
        </TabsContent>

        {/* 数据管理 */}
        <TabsContent value="data" className="space-y-6">
          {isElectron() ? <DesktopDataManager /> : <DataManager />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
