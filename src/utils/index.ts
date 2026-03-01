import { format, isToday, isTomorrow, isYesterday, differenceInDays, isWeekend } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 格式化日期
export function formatDate(timestamp: number, formatStr: string = 'yyyy-MM-dd'): string {
  return format(timestamp, formatStr, { locale: zhCN });
}

// 格式化日期时间
export function formatDateTime(timestamp: number): string {
  return format(timestamp, 'yyyy-MM-dd HH:mm', { locale: zhCN });
}

// 格式化相对时间
export function formatRelativeTime(timestamp: number): string {
  if (isToday(timestamp)) {
    return `今天 ${format(timestamp, 'HH:mm')}`;
  }
  if (isYesterday(timestamp)) {
    return `昨天 ${format(timestamp, 'HH:mm')}`;
  }
  if (isTomorrow(timestamp)) {
    return `明天 ${format(timestamp, 'HH:mm')}`;
  }
  return formatDateTime(timestamp);
}

// 获取到期状态文本
export function getDueStatus(dueDate: number): { text: string; type: 'normal' | 'warning' | 'danger' } {
  const now = Date.now();
  const diff = differenceInDays(dueDate, now);
  
  if (diff < 0) {
    return { text: `超期${Math.abs(diff)}天`, type: 'danger' };
  }
  if (diff === 0) {
    return { text: '今天到期', type: 'warning' };
  }
  if (diff === 1) {
    return { text: '明天到期', type: 'warning' };
  }
  return { text: `${diff}天后到期`, type: 'normal' };
}

// 生成客户编号
export function generateCustomerCode(): string {
  const prefix = 'C';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

// 生成合同编号
export function generateContractCode(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${year}-${random}`;
}

// 脱敏手机号
export function maskPhone(phone?: string): string {
  if (!phone || phone.length < 7) return phone || '';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

// 脱敏身份证
export function maskIdCard(idCard?: string): string {
  if (!idCard || idCard.length < 4) return idCard || '';
  return `****${idCard.slice(-4)}`;
}

// 人民币大写转换
export function numberToChinese(num: number): string {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const units = ['', '拾', '佰', '仟'];
  const bigUnits = ['', '万', '亿', '万亿'];
  
  if (num === 0) return '零元整';
  if (num < 0) return '负' + numberToChinese(-num);
  
  let result = '';
  let integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  
  // 处理整数部分
  let unitIndex = 0;
  while (integerPart > 0) {
    const section = integerPart % 10000;
    if (section > 0) {
      let sectionStr = '';
      let temp = section;
      let zeroFlag = false;
      for (let i = 0; i < 4 && temp > 0; i++) {
        const digit = temp % 10;
        if (digit === 0) {
          if (!zeroFlag && sectionStr.length > 0) {
            sectionStr = digits[0] + sectionStr;
            zeroFlag = true;
          }
        } else {
          sectionStr = digits[digit] + units[i] + sectionStr;
          zeroFlag = false;
        }
        temp = Math.floor(temp / 10);
      }
      result = sectionStr + bigUnits[unitIndex] + result;
    }
    integerPart = Math.floor(integerPart / 10000);
    unitIndex++;
  }
  
  result = result + '元';
  
  // 处理小数部分
  if (decimalPart === 0) {
    result += '整';
  } else {
    const jiao = Math.floor(decimalPart / 10);
    const fen = decimalPart % 10;
    if (jiao > 0) result += digits[jiao] + '角';
    if (fen > 0) result += digits[fen] + '分';
  }
  
  return result;
}

// 计算工作日
export function countWorkdays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    if (!isWeekend(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

// 添加工作日
export function addWorkdays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) {
      added++;
    }
  }
  
  return result;
}

// 计算贷款月供（等额本息）
export function calculateEqualInterest(
  principal: number,
  months: number,
  annualRate: number
): { monthlyPayment: number; totalInterest: number; totalPayment: number } {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);
  const totalPayment = monthlyPayment * months;
  const totalInterest = totalPayment - principal;
  
  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100
  };
}

// 计算贷款月供（等额本金）
export function calculateEqualPrincipal(
  principal: number,
  months: number,
  annualRate: number
): { firstMonthPayment: number; monthlyDecrease: number; totalInterest: number; totalPayment: number } {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPrincipal = principal / months;
  const firstMonthInterest = principal * monthlyRate;
  const firstMonthPayment = monthlyPrincipal + firstMonthInterest;
  const monthlyDecrease = monthlyPrincipal * monthlyRate;
  
  const totalInterest = ((principal * monthlyRate * (months + 1)) / 2);
  const totalPayment = principal + totalInterest;
  
  return {
    firstMonthPayment: Math.round(firstMonthPayment * 100) / 100,
    monthlyDecrease: Math.round(monthlyDecrease * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100
  };
}

// 智能计算收入（解析文本中的数字和运算符）
export function smartCalculate(input: string): { result: number; steps: string[] } {
  // 提取数字和运算符
  const cleaned = input.replace(/[^\d+\-*/().\s]/g, ' ');
  const tokens = cleaned.trim().split(/\s+/);
  
  const steps: string[] = [];
  let expression = tokens.join('');
  
  try {
    // 安全计算
    const result = Function('"use strict"; return (' + expression + ')')();
    
    // 生成步骤
    const numbers = expression.match(/\d+/g) || [];
    const operators = expression.match(/[+\-*/]/g) || [];
    
    let current = parseFloat(numbers[0] || '0');
    for (let i = 0; i < operators.length && i + 1 < numbers.length; i++) {
      const next = parseFloat(numbers[i + 1]);
      const op = operators[i];
      let stepResult = 0;
      
      switch (op) {
        case '+':
          stepResult = current + next;
          steps.push(`${current}+${next}=${stepResult}`);
          break;
        case '-':
          stepResult = current - next;
          steps.push(`${current}-${next}=${stepResult}`);
          break;
        case '*':
          stepResult = current * next;
          steps.push(`${current}*${next}=${stepResult}`);
          break;
        case '/':
          stepResult = current / next;
          steps.push(`${current}/${next}=${stepResult}`);
          break;
      }
      current = stepResult;
    }
    
    return { result: Math.round(result * 100) / 100, steps };
  } catch {
    return { result: 0, steps: ['计算错误'] };
  }
}

// 文件大小格式化
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 防抖函数
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 节流函数
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 深拷贝
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// 导出JSON文件
export function downloadJSON(data: any, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 导出Excel文件
export function downloadExcel(data: any[][], filename: string): void {
  // 简单的CSV导出
  const csv = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace('.xlsx', '.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
