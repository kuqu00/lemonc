import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { 
  Note, 
  Todo, 
  Customer, 
  FollowUpRecord, 
  Contract,
  MortgageCalc, 
  IncomeCalc, 
  User, 
  AppSettings, 
  Notification, 
  QuickAction 
} from '@/types';

class BankOfficeDatabase extends Dexie {
  notes!: Table<Note>;
  todos!: Table<Todo>;
  customers!: Table<Customer>;
  followUpRecords!: Table<FollowUpRecord>;
  contracts!: Table<Contract>;
  mortgageCalcs!: Table<MortgageCalc>;
  incomeCalcs!: Table<IncomeCalc>;
  users!: Table<User>;
  settings!: Table<AppSettings>;
  notifications!: Table<Notification>;
  quickActions!: Table<QuickAction>;

  constructor() {
    super('BankOfficeDB');
    
    this.version(5).stores({
      notes: '++id, title, status, categoryLevel1, categoryLevel2, dueDate, createTime, updateTime, isDeleted',
      todos: '++id, title, priority, status, dueDate, progress, relatedCustomerId, createTime, updateTime, isDeleted',
      customers: '++id, name, code, phone, type, tags, createTime, updateTime, isDeleted',
      followUpRecords: '++id, customerId, time, type, nextFollowDate, createTime',
      contracts: '++id, customerId, code, amount, endDate, classify, status, createTime, updateTime',
      mortgageCalcs: '++id, createTime',
      incomeCalcs: '++id, createTime',
      users: '++id, username',
      settings: '++id',
      notifications: '++id, read, createTime',
      quickActions: '++id, order'
    });
  }

  // ==================== 初始化默认数据 ====================
  async initDefaultData() {
    // 检查是否已有用户
    const userCount = await this.users.count();
    if (userCount === 0) {
      await this.users.add({
        id: 'admin-001',
        username: 'admin',
        password: 'admin123',
        name: '管理员',
        role: 'admin',
        createdAt: Date.now()
      });
    }

    // 检查是否已有设置
    const settingsCount = await this.settings.count();
    if (settingsCount === 0) {
      await this.settings.add({
        id: 'default',
        theme: 'light',
        layout: 'sidebar',
        autoSave: true,
        autoSaveInterval: 30,
        todoReminder: true,
        contractReminder: true,
        reminderDays: 30,
        desktopNotification: false,
        followUpReminder: true,
        followUpDays: 7,
        autoLock: true,
        autoLockMinutes: 30,
        defaultTodoTags: ['工作', '客户', '合同', '其他'],
        defaultCustomerTags: ['VIP客户', '重点跟进', '普通客户', '潜在客户']
      } as AppSettings);
    }

    // 初始化默认快捷操作
    const quickActionCount = await this.quickActions.count();
    if (quickActionCount === 0) {
      const defaultActions = [
        { id: 'qa-1', name: '新建记事', icon: 'FileText', path: '/notebook', order: 1 },
        { id: 'qa-2', name: '新建待办', icon: 'CheckSquare', path: '/todo', order: 2 },
        { id: 'qa-3', name: '添加客户', icon: 'UserPlus', path: '/customers', order: 3 },
        { id: 'qa-4', name: '房贷计算', icon: 'Calculator', path: '/calculator', order: 4 },
        { id: 'qa-5', name: '收入计算', icon: 'TrendingUp', path: '/calculator/income', order: 5 }
      ];
      await this.quickActions.bulkAdd(defaultActions);
    }
  }

  // ==================== 软删除方法 ====================
  async softDeleteNote(id: string) {
    return await this.notes.update(id, { isDeleted: true, updateTime: Date.now() });
  }

  async softDeleteTodo(id: string) {
    return await this.todos.update(id, { isDeleted: true, updateTime: Date.now() });
  }

  async softDeleteCustomer(id: string) {
    return await this.customers.update(id, { isDeleted: true, updateTime: Date.now() });
  }

  // ==================== 恢复删除的数据 ====================
  async restoreNote(id: string) {
    return await this.notes.update(id, { isDeleted: false, updateTime: Date.now() });
  }

  async restoreTodo(id: string) {
    return await this.todos.update(id, { isDeleted: false, updateTime: Date.now() });
  }

  async restoreCustomer(id: string) {
    return await this.customers.update(id, { isDeleted: false, updateTime: Date.now() });
  }

  // ==================== 查询活动数据 ====================
  async getActiveNotes() {
    return await this.notes.filter(n => !n.isDeleted).toArray();
  }

  async getActiveTodos() {
    return await this.todos.filter(t => !t.isDeleted).toArray();
  }

  async getActiveCustomers() {
    return await this.customers.filter(c => !c.isDeleted).toArray();
  }

  // ==================== 搜索方法 ====================
  async searchNotes(keyword: string) {
    const lowerKeyword = keyword.toLowerCase();
    const notes = await this.getActiveNotes();
    return notes.filter(n => 
      n.title.toLowerCase().includes(lowerKeyword) ||
      n.content.toLowerCase().includes(lowerKeyword)
    );
  }

  async searchTodos(keyword: string) {
    const lowerKeyword = keyword.toLowerCase();
    const todos = await this.getActiveTodos();
    return todos.filter(t => 
      t.title.toLowerCase().includes(lowerKeyword) ||
      t.description?.toLowerCase().includes(lowerKeyword)
    );
  }

  async searchCustomers(keyword: string) {
    const lowerKeyword = keyword.toLowerCase();
    const customers = await this.getActiveCustomers();
    return customers.filter(c => 
      c.name.toLowerCase().includes(lowerKeyword) ||
      c.phone.includes(lowerKeyword) ||
      c.code.toLowerCase().includes(lowerKeyword) ||
      c.company?.toLowerCase().includes(lowerKeyword)
    );
  }

  // ==================== 客户相关查询 ====================
  async getCustomerFollowUps(customerId: string) {
    return await this.followUpRecords
      .where('customerId')
      .equals(customerId)
      .sortBy('time');
  }

  async getCustomerContracts(customerId: string) {
    return await this.contracts
      .where('customerId')
      .equals(customerId)
      .sortBy('createTime');
  }

  // ==================== 合同相关查询 ====================
  async getExpiringContracts(days: number = 30) {
    const now = Date.now();
    const futureDate = now + days * 24 * 60 * 60 * 1000;
    return await this.contracts.filter(c => {
      return c.endDate <= futureDate && c.endDate >= now;
    }).toArray();
  }

  async getContractsByClassify(classify: string) {
    return await this.contracts.where('classify').equals(classify).toArray();
  }

  async getContractsByStatus(status: string) {
    return await this.contracts.where('status').equals(status).toArray();
  }

  // ==================== 待办相关查询 ====================
  async getQuadrantTodos() {
    const todos = await this.getActiveTodos();
    return {
      urgentImportant: todos.filter(t => t.priority === 'urgent-important'),
      urgentNotImportant: todos.filter(t => t.priority === 'urgent-not-important'),
      notUrgentImportant: todos.filter(t => t.priority === 'not-urgent-important'),
      notUrgentNotImportant: todos.filter(t => t.priority === 'not-urgent-not-important')
    };
  }

  async getTodosByCustomer(customerId: string) {
    return await this.todos.where('relatedCustomerId').equals(customerId).toArray();
  }

  // ==================== 统计数据 ====================
  async getStatistics() {
    const [notes, todos, customers, contracts] = await Promise.all([
      this.getActiveNotes(),
      this.getActiveTodos(),
      this.getActiveCustomers(),
      this.contracts.toArray()
    ]);

    const completedTodos = todos.filter(t => t.status === 'completed').length;
    const expiringContracts = (await this.getExpiringContracts(30)).length;
    const followUps = await this.followUpRecords.count();

    return {
      totalNotes: notes.length,
      totalTodos: todos.length,
      completedTodos,
      totalCustomers: customers.length,
      totalContracts: contracts.length,
      expiringContracts,
      totalFollowUps: followUps
    };
  }

  // ==================== 生成客户编号 ====================
  async generateCustomerCode(): Promise<string> {
    const count = await this.customers.count();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const seq = String(count + 1).padStart(4, '0');
    return `C${year}${month}${seq}`;
  }
}

export const db = new BankOfficeDatabase();
