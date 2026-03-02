import { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Palette,
  Layout,
  Save,
  Monitor,
  CheckCircle2,
  Shield,
  Lock,
  FileSpreadsheet,
  Download,
  Upload
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAppStore } from '@/store';
import { db } from '@/db';
import type { ThemeType } from '@/types';
import { DataManager } from './DataManager';
import { DesktopDataManager } from './DesktopDataManager';
import { isElectron } from '@/lib/localDataStore';
import { format } from 'date-fns';
import { exportToExcel, importCustomersFromExcel, downloadCustomerTemplate } from '@/utils/excel';
import { getHotkeyList } from '@/hooks/useHotkeys';

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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 设置状态
  const [autoSave, setAutoSave] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(30);
  const [todoReminder, setTodoReminder] = useState(true);
  const [contractReminder, setContractReminder] = useState(true);
  const [reminderDays, setReminderDays] = useState(30);

  // 密码修改状态
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const { theme, setTheme, layout, setLayout, settings, loadSettings, updateSettings, addNotification, changePassword } = useAppStore();

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
        type: 'success',
        category: 'system'
      });
    } catch (error) {
      await addNotification({
        title: '保存失败',
        message: '请重试',
        type: 'error',
        category: 'system'
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
      type: 'success',
      category: 'system'
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
      type: 'success',
      category: 'system'
    });
  };

  // Excel 导出
  const handleExcelExport = async () => {
    setIsLoading(true);
    const result = await exportToExcel();
    setIsLoading(false);
    
    if (result.success) {
      await addNotification({
        title: '导出成功',
        message: '数据已导出到 Excel 文件',
        type: 'success',
        category: 'system'
      });
    } else {
      await addNotification({
        title: '导出失败',
        message: result.message,
        type: 'error',
        category: 'system'
      });
    }
  };

  // Excel 导入
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const result = await importCustomersFromExcel(file);
    setIsLoading(false);
    
    if (result.success) {
      await addNotification({
        title: '导入成功',
        message: result.message,
        type: 'success',
        category: 'system'
      });
    } else {
      await addNotification({
        title: '导入失败',
        message: result.message,
        type: 'error',
        category: 'system'
      });
    }

    // 清空 input
    e.target.value = '';
  };

  // 处理密码修改
  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('请填写所有密码字段');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('新密码长度至少为6位');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }

    setIsChangingPassword(true);
    const result = await changePassword(oldPassword, newPassword);
    setIsChangingPassword(false);

    if (result.success) {
      setPasswordSuccess(result.message);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await addNotification({
        title: '密码修改成功',
        message: '您的密码已更新',
        type: 'success',
        category: 'system'
      });
    } else {
      setPasswordError(result.message);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            外观
          </TabsTrigger>
          <TabsTrigger value="function">
            <SettingsIcon className="h-4 w-4 mr-2" />
            功能
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            安全
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

        {/* 安全设置 */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                修改密码
              </CardTitle>
              <CardDescription>
                定期更换密码可以提高账户安全性
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {passwordError && (
                <Alert variant="destructive">
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}
              {passwordSuccess && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-700">{passwordSuccess}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="old-password">原密码</Label>
                <Input
                  id="old-password"
                  type="password"
                  placeholder="请输入原密码"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">新密码</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="请输入新密码（至少6位）"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">确认新密码</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="请再次输入新密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleChangePassword} 
                disabled={isChangingPassword}
                className="w-full"
              >
                {isChangingPassword ? '修改中...' : '修改密码'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                安全提示
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• 建议密码长度至少为6位</p>
              <p>• 定期更换密码可以提高安全性</p>
              <p>• 系统会在30分钟无操作后自动锁定，需要重新输入密码</p>
              <p>• 请勿将密码告诉他人</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 数据管理 */}
        <TabsContent value="data" className="space-y-6">
          {/* Excel 导入导出 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Excel 导入导出
              </CardTitle>
              <CardDescription>
                将数据导出到 Excel 或从 Excel 导入客户数据
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 导出按钮 */}
              <div className="flex gap-3">
                <Button 
                  onClick={handleExcelExport} 
                  disabled={isLoading}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isLoading ? '导出中...' : '导出全部数据'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={downloadCustomerTemplate}
                  disabled={isLoading}
                >
                  下载导入模板
                </Button>
              </div>

              {/* 导入区域 */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">导入客户数据</p>
                <p className="text-xs text-muted-foreground mb-3">
                  支持 .xlsx 格式，建议使用模板文件
                </p>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    className="relative"
                    disabled={isLoading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    选择 Excel 文件
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelImport}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isLoading}
                    />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {isLoading ? '导入中...' : '支持 .xlsx, .xls 格式'}
                  </span>
                </div>
              </div>

              {/* 导入说明 */}
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• 导出文件包含：客户、合同、笔记、待办等所有数据</p>
                <p>• 导入仅支持客户数据，请先下载模板文件</p>
                <p>• 导入时会自动跳过重复的客户（根据手机号判断）</p>
              </div>
            </CardContent>
          </Card>

          {/* 快捷键说明 */}
          <Card>
            <CardHeader>
              <CardTitle>键盘快捷键</CardTitle>
              <CardDescription>
                使用快捷键可以快速操作系统功能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {getHotkeyList().map((hotkey) => (
                  <div 
                    key={hotkey.key} 
                    className="flex items-center justify-between p-2 rounded bg-muted"
                  >
                    <kbd className="px-2 py-1 bg-background rounded border text-xs font-mono">
                      {hotkey.key}
                    </kbd>
                    <span className="text-sm text-muted-foreground">{hotkey.description}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {isElectron() ? <DesktopDataManager /> : <DataManager />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
