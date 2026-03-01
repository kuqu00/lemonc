import { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  Save,
  Clock,
  AlertCircle,
  CheckCircle,
  FileJson,
  HardDrive,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store';
import {
  exportAllData,
  downloadJSON,
  importData,
  readJSONFile,
  saveToLocalFile,
  loadFromLocalFile,
  getAutoBackupSettings,
  setAutoBackupSettings,
  performAutoBackup,
  getDailyBackupSettings,
  setDailyBackupSettings,
  type ExportData
} from '@/lib/dataExport';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function DataManager() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [autoBackup, setAutoBackup] = useState(getAutoBackupSettings());
  const [dailyBackup, setDailyBackup] = useState(getDailyBackupSettings());
  const [lastBackupSize, setLastBackupSize] = useState<number>(0);
  const { addNotification } = useAppStore();

  // 清除消息
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // 导出数据
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const json = JSON.stringify(data, null, 2);
      setLastBackupSize(new Blob([json]).size);
      
      // 使用 File System Access API 或传统下载
      await saveToLocalFile(data);
      
      setMessage({ type: 'success', text: '数据导出成功' });
      addNotification({
        title: '数据导出成功',
        message: `已导出 ${Object.keys(data).filter(k => k !== 'version' && k !== 'exportTime').length} 类数据`,
        type: 'success',
        category: 'system'
      });
    } catch (error) {
      setMessage({ type: 'error', text: '导出失败: ' + (error as Error).message });
    } finally {
      setIsExporting(false);
    }
  };

  // 导入数据
  const handleImport = async () => {
    if (!importFile) {
      setMessage({ type: 'error', text: '请选择备份文件' });
      return;
    }

    setIsImporting(true);
    try {
      const data = await readJSONFile(importFile);
      const result = await importData(data);
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        addNotification({
          title: '数据导入成功',
          message: '请刷新页面以查看导入的数据',
          type: 'success',
          category: 'system'
        });
        setShowImportDialog(false);
        setImportFile(null);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '导入失败: ' + (error as Error).message });
    } finally {
      setIsImporting(false);
    }
  };

  // 从文件选择导入
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  // 使用 File System Access API 选择文件
  const handleSelectFile = async () => {
    try {
      const data = await loadFromLocalFile();
      if (data) {
        const result = await importData(data);
        if (result.success) {
          setMessage({ type: 'success', text: result.message });
          addNotification({
            title: '数据导入成功',
            message: '请刷新页面以查看导入的数据',
            type: 'success',
            category: 'system'
          });
        } else {
          setMessage({ type: 'error', text: result.message });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: '导入失败: ' + (error as Error).message });
    }
  };

  // 切换自动备份
  const toggleAutoBackup = (enabled: boolean) => {
    const updated = { ...autoBackup, enabled };
    setAutoBackup(updated);
    setAutoBackupSettings(updated);
    
    if (enabled) {
      addNotification({
        title: '自动备份已开启',
        message: `系统将每 ${autoBackup.interval} 分钟自动备份一次`,
        type: 'info',
        category: 'system'
      });
    }
  };

  // 修改备份间隔
  const handleIntervalChange = (interval: number) => {
    const updated = { ...autoBackup, interval };
    setAutoBackup(updated);
    setAutoBackupSettings(updated);
  };

  // 立即执行自动备份
  const handleManualAutoBackup = async () => {
    setIsExporting(true);
    const success = await performAutoBackup();
    if (success) {
      setAutoBackup(getAutoBackupSettings());
      setMessage({ type: 'success', text: '自动备份执行成功' });
    } else {
      setMessage({ type: 'error', text: '自动备份失败' });
    }
    setIsExporting(false);
  };

  // 切换每日备份
  const toggleDailyBackup = (enabled: boolean) => {
    const updated = { ...dailyBackup, enabled };
    setDailyBackup(updated);
    setDailyBackupSettings(updated);
    
    if (enabled) {
      addNotification({
        title: '每日备份已开启',
        message: '每天首次打开应用时将自动备份数据',
        type: 'info',
        category: 'system'
      });
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">数据管理</h2>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* 数据导出 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            数据导出
          </CardTitle>
          <CardDescription>
            将所有数据导出为 JSON 文件，保存到本地磁盘
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-accent rounded-lg">
            <div className="flex items-center gap-3">
              <HardDrive className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">导出到本地文件</p>
                <p className="text-sm text-muted-foreground">
                  支持现代浏览器的文件系统访问 API，可选择保存位置
                </p>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? '导出中...' : '导出所有数据'}
          </Button>

          {lastBackupSize > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              上次导出大小: {formatFileSize(lastBackupSize)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 数据导入 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            数据导入
          </CardTitle>
          <CardDescription>
            从 JSON 备份文件恢复数据
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              导入数据将覆盖现有所有数据，请确保已备份当前数据！
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            {'showOpenFilePicker' in window ? (
              <Button 
                variant="outline" 
                onClick={handleSelectFile}
                disabled={isImporting}
                className="flex-1"
              >
                <HardDrive className="h-4 w-4 mr-2" />
                选择本地文件
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => setShowImportDialog(true)}
                disabled={isImporting}
                className="flex-1"
              >
                <FileJson className="h-4 w-4 mr-2" />
                选择备份文件
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 每日首次备份 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            每日首次备份
          </CardTitle>
          <CardDescription>
            每天第一次打开应用时自动备份数据
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              每天首次登录后自动备份，自动下载到浏览器默认下载目录
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>启用每日备份</Label>
              <p className="text-sm text-muted-foreground">
                每天首次打开时自动备份
              </p>
            </div>
            <Switch
              checked={dailyBackup.enabled}
              onCheckedChange={toggleDailyBackup}
            />
          </div>

          {dailyBackup.enabled && dailyBackup.lastBackupDate && (
            <p className="text-sm text-muted-foreground">
              上次每日备份: {dailyBackup.lastBackupDate}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 自动备份设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            定时自动备份
          </CardTitle>
          <CardDescription>
            按设定间隔自动下载备份文件
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              自动备份会自动下载文件到浏览器的默认下载目录，无需手动确认
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>启用定时备份</Label>
              <p className="text-sm text-muted-foreground">
                按设定间隔自动下载备份文件
              </p>
            </div>
            <Switch
              checked={autoBackup.enabled}
              onCheckedChange={toggleAutoBackup}
            />
          </div>

          {autoBackup.enabled && (
            <>
              <div className="space-y-2">
                <Label>备份间隔（分钟）</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="5"
                    max="1440"
                    value={autoBackup.interval}
                    onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 30)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">分钟</span>
                </div>
              </div>

              {autoBackup.lastBackupTime > 0 && (
                <p className="text-sm text-muted-foreground">
                  上次自动备份: {format(autoBackup.lastBackupTime, 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                </p>
              )}

              <Button 
                variant="outline" 
                onClick={handleManualAutoBackup}
                disabled={isExporting}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                立即执行备份
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* 导入对话框 */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导入数据</DialogTitle>
            <DialogDescription>
              选择之前导出的 JSON 备份文件
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
            />
            
            {importFile && (
              <div className="p-3 bg-accent rounded">
                <p className="text-sm">已选择: {importFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  大小: {formatFileSize(importFile.size)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!importFile || isImporting}
              variant="destructive"
            >
              {isImporting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isImporting ? '导入中...' : '确认导入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 数据存储说明 */}
      <Card className="bg-muted">
        <CardHeader>
          <CardTitle className="text-base">数据存储说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• 日常数据保存在浏览器 IndexedDB 中，自动持久化</p>
          <p>• 手动导出：可选择保存位置（支持 File System Access API 的浏览器）</p>
          <p>• 自动备份：自动下载到浏览器默认下载目录，无需确认</p>
          <p>• 建议定期整理下载目录中的备份文件</p>
        </CardContent>
      </Card>
    </div>
  );
}
