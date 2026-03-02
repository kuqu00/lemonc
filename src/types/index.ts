// ==================== 用户类型 ====================
export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
  createdAt: number;
}

// ==================== 客户档案类型 ====================
export type CustomerType = 'personal' | 'enterprise';

export interface Customer {
  id: string;
  type: CustomerType;
  name: string;
  code: string; // 客户编号自动生成
  phone: string;
  company?: string;
  idCardLast4?: string; // 身份证后四位
  address?: string;
  tags: string[]; // 完全自由，建议≤10个
  remark?: string;
  createTime: number;
  updateTime: number;
  isDeleted: boolean;

  // 客户分级
  valueLevel?: 'A' | 'B' | 'C' | 'D';
  priority?: 'high' | 'medium' | 'low';

  // 联系信息
  email?: string;
  wechat?: string;
  addressDetail?: string; // 详细地址

  // 个人客户专属
  gender?: 'male' | 'female';
  birthday?: number;
  maritalStatus?: 'single' | 'married' | 'divorced';
  education?: string;
  occupation?: string;

  // 企业客户专属
  legalPerson?: string; // 法人
  registerCapital?: string; // 注册资本
  establishDate?: number; // 成立日期
  industry?: string; // 所属行业
  businessScope?: string; // 经营范围

  // 业务信息
  firstContactDate?: number; // 首次接触时间
  lastContactDate?: number; // 最后联系时间
  followUpCount?: number; // 跟进次数
  source?: string; // 客户来源

  // 风险评估
  riskLevel?: 'low' | 'medium' | 'high';
  creditRating?: string;

  // 关联信息
  relatedCustomerIds?: string[]; // 关联客户
  relatedTodoIds?: string[]; // 关联待办
  relatedNoteIds?: string[]; // 关联笔记
}

// 跟进记录子表
export type FollowUpType = 'phone' | 'visit' | 'sms' | 'other';

export interface FollowUpRecord {
  id: string;
  customerId: string;
  time: number;
  type: FollowUpType;
  content: string;
  nextFollowDate?: number; // 下次跟进时间，到期生成待办
  createTime: number;
}

// 合同信息子表
export type LoanClassify = 'normal' | 'special' | 'subprime' | 'doubtful' | 'loss';
export type ContractStatus = 'normal' | 'litigation' | 'execution';

export interface Contract {
  id: string;
  customerId: string;
  code: string; // 合同编号
  amount: number; // 贷款金额（元）
  term: number; // 期限（月）
  startDate: number; // 放款日期
  endDate: number; // 到期日期
  product: string; // 贷款产品
  purpose?: string; // 用途
  classify: LoanClassify; // 五级分类
  guarantee?: string; // 担保方式
  status: ContractStatus;
  litigationDetail?: string; // 诉讼详情
  lawyer?: string; // 代理律师
  court?: string; // 受理法院
  caseNo?: string; // 案号
  remark?: string;
  createTime: number;
  updateTime: number;
}

// ==================== 工作记事本类型 ====================
export type NoteStatus = 'pending' | 'in-progress' | 'completed';

export interface Note {
  id: string;
  title: string;
  content: string;
  filePath?: string;
  startDate?: number; // 开始日期
  dueDate?: number; // 到期日期
  status: NoteStatus; // 如关联待办，则状态同步更新
  categoryLevel1: string;
  categoryLevel2: string;
  relatedTodos: string[];
  tags?: string[]; // 标签
  relatedCustomerIds?: string[]; // 关联客户
  attachments?: string[]; // 附件列表
  createTime: number;
  updateTime: number;
  isDeleted: boolean;
}

// ==================== 待办清单类型 ====================
export type TodoPriority = 'urgent-important' | 'urgent-not-important' | 'not-urgent-important' | 'not-urgent-not-important';
export type TodoStatus = 'pending' | 'in-progress' | 'completed';

// 子步骤
export interface TodoSubStep {
  id: string;
  title: string;
  completed: boolean;
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: TodoPriority;
  status: TodoStatus;
  dueDate?: number;
  category?: string;
  subSteps: TodoSubStep[]; // 子步骤
  relatedCustomerId?: string; // 弱关联客户档案
  relatedNoteId?: string; // 关联笔记
  progress: number; // 进度 0-100
  createTime: number;
  updateTime: number;
  isDeleted: boolean;
}

// ==================== 房贷计算记录 ====================
export interface MortgageCalc {
  id: string;
  customerName?: string;
  loanAmount: number; // 万元，支持小数点后2位
  loanTerm: number; // 期限（月）
  interestRate: number; // 年利率%
  repaymentType: 'equal-payment' | 'equal-principal' | 'n-month-principal' | 'flexible';
  nMonthValue?: number; // N月还本的N值
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  prepayments?: PrepaymentRecord[]; // 提前还款记录
  schedule: PaymentScheduleItem[]; // 还款计划
  createTime: number;
}

// 提前还款记录
export interface PrepaymentRecord {
  id: string;
  month: number; // 第几个月提前还款
  amount: number; // 提前还款金额
  type: 'reduce-term' | 'reduce-payment'; // 缩短期限或减少月供
  savedInterest: number; // 节省利息
}

// 还款计划项
export interface PaymentScheduleItem {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

// ==================== 收入计算记录 ====================
export interface IncomeCalc {
  id: string;
  customerName?: string;
  monthlyIncome: number;
  annualIncome: number;
  monthlyAvg: number;
  calculationMethod: 'simple' | 'weighted' | 'tax-adjusted';
  details: {
    months: number[];
    weights?: number[];
    taxRate?: number;
  };
  createTime: number;
}

// ==================== 主题和布局类型 ====================
export type ThemeType = 'light' | 'dark' | 'blue' | 'green' | 'purple';
export type LayoutType = 'sidebar' | 'topbar' | 'mixed';

// ==================== 应用设置 ====================
export interface AppSettings {
  theme: ThemeType;
  layout: LayoutType;
  autoSave: boolean;
  autoSaveInterval: number;
  todoReminder: boolean;
  contractReminder: boolean;
  reminderDays: number;
  desktopNotification?: boolean;
  followUpReminder?: boolean;
  followUpDays?: number;
  autoLock?: boolean;
  autoLockMinutes?: number;
  defaultTodoTags: string[];
  defaultCustomerTags: string[];
  saveToLocalEnabled?: boolean;
  localSavePath?: string;
}

// ==================== 通知类型 ====================
export type NotificationCategory = 'system' | 'todo' | 'customer' | 'contract' | 'general';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: NotificationCategory;
  read: boolean;
  createTime: number;
  link?: string; // 可选的跳转链接
}

// ==================== 快捷操作 ====================
export interface QuickAction {
  id: string;
  name: string;
  icon: string;
  path: string;
  order: number;
}

// ==================== 数据统计 ====================
export interface Statistics {
  totalNotes: number;
  totalTodos: number;
  completedTodos: number;
  totalCustomers: number;
  totalContracts: number;
  expiringContracts: number;
  totalFollowUps: number;
}

// ==================== 效率数据 ====================
export interface EfficiencyData {
  date: string;
  notesCreated: number;
  todosCompleted: number;
  customersAdded: number;
  contractsAdded: number;
}

// ==================== 数据分析类型 ====================
export interface CustomerAnalysis {
  totalCustomers: number;
  personalCount: number;
  enterpriseCount: number;
  tagDistribution: Record<string, number>;
  followUpStats: {
    total: number;
    thisMonth: number;
    pending: number;
  };
}

export interface ContractAnalysis {
  totalAmount: number;
  totalContracts: number;
  classifyDistribution: Record<LoanClassify, number>;
  statusDistribution: Record<ContractStatus, number>;
  monthlyTrend: { month: string; amount: number; count: number }[];
  expiringList: Contract[];
}

export interface TodoAnalysis {
  total: number;
  completed: number;
  pending: number;
  quadrantDistribution: Record<TodoPriority, number>;
  completionRate: number;
  avgProgress: number;
}
