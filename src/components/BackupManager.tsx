import React, { useState, useEffect } from 'react';
import {
  performFullBackup,
  performIncrementalBackup,
  getBackupList,
  restoreFromBackup,
  removeBackup,
  getDataPath,
} from '../utils/tauri-db';
import type { BackupInfo } from '../utils/tauri-api';

export default function BackupManager() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [dataPath, setDataPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [backupList, path] = await Promise.all([
        getBackupList(),
        getDataPath()
      ]);
      setBackups(backupList);
      setDataPath(path);
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  };

  const handleFullBackup = async () => {
    setLoading(true);
    setMessage('');
    try {
      const backup = await performFullBackup();
      setMessage(`全量备份成功！大小: ${formatSize(backup.size)}`);
      await loadData();
    } catch (e) {
      setMessage(`备份失败: ${e}`);
    }
    setLoading(false);
  };

  const handleIncrementalBackup = async () => {
    setLoading(true);
    setMessage('');
    try {
      const backup = await performIncrementalBackup();
      if (backup) {
        setMessage(`增量备份成功！大小: ${formatSize(backup.size)}`);
      } else {
        setMessage('没有需要备份的新数据');
      }
      await loadData();
    } catch (e) {
      setMessage(`备份失败: ${e}`);
    }
    setLoading(false);
  };

  const handleRestore = async (backup: BackupInfo) => {
    if (!confirm(`确定要恢复备份 ${formatDate(backup.timestamp)} 吗？\n当前数据将被覆盖！`)) {
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await restoreFromBackup(backup.path);
      setMessage('恢复成功！请刷新页面');
    } catch (e) {
      setMessage(`恢复失败: ${e}`);
    }
    setLoading(false);
  };

  const handleDelete = async (backup: BackupInfo) => {
    if (!confirm('确定要删除此备份吗？')) {
      return;
    }
    setLoading(true);
    try {
      await removeBackup(backup.path);
      await loadData();
      setMessage('备份已删除');
    } catch (e) {
      setMessage(`删除失败: ${e}`);
    }
    setLoading(false);
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">数据备份与恢复</h2>

      {/* 数据存储位置 */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-medium mb-2">数据存储位置</h3>
        <code className="bg-gray-200 px-2 py-1 rounded text-sm break-all">{dataPath}</code>
        <p className="text-sm text-gray-500 mt-2">
          您的所有数据都存储在此目录中。建议定期备份此目录。
        </p>
      </div>

      {/* 备份操作按钮 */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleFullBackup}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '备份中...' : '全量备份'}
        </button>
        <button
          onClick={handleIncrementalBackup}
          disabled={loading}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? '备份中...' : '增量备份'}
        </button>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.includes('失败') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* 备份列表 */}
      <h3 className="font-bold text-lg mb-4">备份历史</h3>
      {backups.length === 0 ? (
        <p className="text-gray-500">暂无备份</p>
      ) : (
        <div className="space-y-3">
          {backups.map((backup, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs rounded ${
                    backup.backupType === 'full' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {backup.backupType === 'full' ? '全量' : '增量'}
                  </span>
                  <span className="font-medium">{formatDate(backup.timestamp)}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  大小: {formatSize(backup.size)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRestore(backup)}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  恢复
                </button>
                <button
                  onClick={() => handleDelete(backup)}
                  disabled={loading}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 备份说明 */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
        <h4 className="font-bold mb-2">备份说明</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>全量备份</strong>：备份所有数据文件，适合定期（如每周）执行</li>
          <li><strong>增量备份</strong>：只备份自上次备份后修改的文件，速度快，适合日常执行</li>
          <li>备份文件存储在数据目录的 backups 文件夹中</li>
          <li>恢复备份会覆盖当前所有数据，请谨慎操作</li>
        </ul>
      </div>
    </div>
  );
}
