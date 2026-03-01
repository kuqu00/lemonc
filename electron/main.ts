import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据存储路径
const getDataPath = () => {
  const userDataPath = app.getPath('userData');
  const dataDir = path.join(userDataPath, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
};

// 备份目录路径
const getBackupPath = () => {
  const userDataPath = app.getPath('userData');
  const backupDir = path.join(userDataPath, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
};

// 主数据文件路径
const getDataFilePath = () => path.join(getDataPath(), 'data.json');

// 增量备份文件路径
const getIncrementalBackupPath = (timestamp: string) => 
  path.join(getBackupPath(), `incremental_${timestamp}.json`);

// 全量备份文件路径
const getFullBackupPath = (timestamp: string) => 
  path.join(getBackupPath(), `full_${timestamp}.json`);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: '银行信贷管理系统',
    icon: path.join(__dirname, '../public/icon.png'),
  });

  // 加载应用
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC 处理 - 读取数据
ipcMain.handle('data:read', async () => {
  try {
    const dataPath = getDataFilePath();
    if (!fs.existsSync(dataPath)) {
      // 返回默认数据结构
      return {
        success: true,
        data: {
          version: '1.0',
          notes: [],
          todos: [],
          customers: [],
          contracts: [],
          followUpRecords: [],
          mortgageCalcs: [],
          incomeCalcs: [],
          users: [],
          settings: [],
          notifications: [],
          quickActions: []
        }
      };
    }
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// IPC 处理 - 保存数据
ipcMain.handle('data:save', async (_, data: any) => {
  try {
    const dataPath = getDataFilePath();
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// IPC 处理 - 获取数据目录路径
ipcMain.handle('data:getPath', async () => {
  return { success: true, path: getDataPath() };
});

// IPC 处理 - 全量备份
ipcMain.handle('backup:full', async (_, data: any) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = getFullBackupPath(timestamp);
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, path: backupPath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// IPC 处理 - 增量备份
ipcMain.handle('backup:incremental', async (_, changes: any) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = getIncrementalBackupPath(timestamp);
    
    const backupData = {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      changes
    };
    
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
    return { success: true, path: backupPath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// IPC 处理 - 获取备份列表
ipcMain.handle('backup:list', async () => {
  try {
    const backupDir = getBackupPath();
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(backupDir, f));
        return {
          name: f,
          path: path.join(backupDir, f),
          size: stat.size,
          created: stat.birthtime
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());
    return { success: true, files };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// IPC 处理 - 恢复备份
ipcMain.handle('backup:restore', async (_, backupPath: string) => {
  try {
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: '备份文件不存在' };
    }
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    
    // 如果是增量备份，提取 changes 部分
    const restoreData = data.changes || data;
    
    // 保存为当前数据
    const dataPath = getDataFilePath();
    fs.writeFileSync(dataPath, JSON.stringify(restoreData, null, 2), 'utf-8');
    
    return { success: true, data: restoreData };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// IPC 处理 - 导出到指定目录
ipcMain.handle('export:toDirectory', async (_, data: any, defaultName?: string) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: defaultName || `银行信贷系统备份_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.json`,
      filters: [
        { name: 'JSON 文件', extensions: ['json'] }
      ]
    });
    
    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }
    
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, path: result.filePath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// IPC 处理 - 从文件导入
ipcMain.handle('import:fromFile', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'JSON 文件', extensions: ['json'] }
      ]
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    
    const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8'));
    return { success: true, data, path: result.filePaths[0] };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// IPC 处理 - 删除备份
ipcMain.handle('backup:delete', async (_, backupPath: string) => {
  try {
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// IPC 处理 - 清理旧备份
ipcMain.handle('backup:cleanup', async (_, keepCount: number) => {
  try {
    const backupDir = getBackupPath();
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        created: fs.statSync(path.join(backupDir, f)).birthtime
      }))
      .sort((a, b) => b.created.getTime() - a.created.getTime());
    
    // 保留最新的 keepCount 个，删除其余的
    const toDelete = files.slice(keepCount);
    for (const file of toDelete) {
      fs.unlinkSync(file.path);
    }
    
    return { success: true, deleted: toDelete.length };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});
