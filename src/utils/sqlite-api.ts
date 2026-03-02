// SQLite 数据库 API
import { invoke } from '@tauri-apps/api/core';

export interface SqliteNote {
  id: string;
  title: string;
  content: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface SqliteTodo {
  id: string;
  title: string;
  description?: string;
  completed: number;
  due_date?: number;
  priority: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface SqliteCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tags: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SqliteContract {
  id: string;
  customer_id: string;
  contract_number: string;
  amount: number;
  start_date: number;
  end_date: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AllData {
  version: string;
  export_time: string;
  notes: SqliteNote[];
  todos: SqliteTodo[];
  customers: SqliteCustomer[];
  contracts: SqliteContract[];
  follow_up_records: any[];
  mortgage_calcs: any[];
  income_calcs: any[];
}

export interface DbStats {
  note_count: number;
  todo_count: number;
  customer_count: number;
  contract_count: number;
}

// 导出所有数据
export async function exportAllDataFromSqlite(): Promise<AllData> {
  return await invoke('export_all_data') as AllData;
}

// 导入所有数据
export async function importAllDataToSqlite(data: AllData): Promise<void> {
  await invoke('import_all_data', { data });
}

// 获取数据库统计
export async function getDbStatistics(): Promise<DbStats> {
  return await invoke('get_db_stats') as DbStats;
}
