import * as XLSX from 'xlsx';
import { db } from '@/db';

// 导出数据到 Excel
export async function exportToExcel() {
  try {
    // 获取所有数据
    const customers = await db.customers.toArray();
    const contracts = await db.contracts.toArray();
    const notes = await db.notes.toArray();
    const todos = await db.todos.toArray();
    const followUpRecords = await db.followUpRecords.toArray();

    // 创建工作簿
    const wb = XLSX.utils.book_new();

    // 客户表
    if (customers.length > 0) {
      const customerData = customers.map(c => ({
        '客户名称': c.name,
        '联系电话': c.phone,
        '邮箱': c.email || '',
        '地址': c.address || '',
        '公司名称': c.company || '',
        '备注': c.remark || '',
        '创建时间': new Date(c.createTime).toLocaleString('zh-CN'),
      }));
      const ws1 = XLSX.utils.json_to_sheet(customerData);
      XLSX.utils.book_append_sheet(wb, ws1, '客户列表');
    }

    // 合同表
    if (contracts.length > 0) {
      const contractData = contracts.map(c => ({
        '合同编号': c.code,
        '贷款金额': c.amount,
        '贷款期限': c.term + '个月',
        '开始日期': new Date(c.startDate).toLocaleDateString('zh-CN'),
        '结束日期': new Date(c.endDate).toLocaleDateString('zh-CN'),
        '状态': c.status === 'normal' ? '正常' : c.status === 'litigation' ? '诉讼中' : '执行中',
        '备注': c.remark || '',
      }));
      const ws2 = XLSX.utils.json_to_sheet(contractData);
      XLSX.utils.book_append_sheet(wb, ws2, '合同列表');
    }

    // 笔记表
    if (notes.length > 0) {
      const noteData = notes.filter(n => !n.isDeleted).map(n => ({
        '标题': n.title,
        '内容': n.content.substring(0, 100) + (n.content.length > 100 ? '...' : ''),
        '分类': n.categoryLevel1 + (n.categoryLevel2 ? '/' + n.categoryLevel2 : ''),
        '创建时间': new Date(n.createTime).toLocaleString('zh-CN'),
        '更新时间': new Date(n.updateTime).toLocaleString('zh-CN'),
      }));
      const ws3 = XLSX.utils.json_to_sheet(noteData);
      XLSX.utils.book_append_sheet(wb, ws3, '笔记列表');
    }

    // 待办表
    if (todos.length > 0) {
      const priorityMap: Record<string, string> = {
        'urgent-important': '重要且紧急',
        'urgent-not-important': '紧急不重要',
        'not-urgent-important': '重要不紧急',
        'not-urgent-not-important': '不重要不紧急'
      };
      const statusMap: Record<string, string> = {
        'pending': '待办',
        'in-progress': '进行中',
        'completed': '已完成'
      };
      const todoData = todos.filter(t => !t.isDeleted).map(t => ({
        '标题': t.title,
        '描述': t.description || '',
        '优先级': priorityMap[t.priority] || t.priority,
        '状态': statusMap[t.status] || t.status,
        '截止日期': t.dueDate ? new Date(t.dueDate).toLocaleDateString('zh-CN') : '',
        '创建时间': new Date(t.createTime).toLocaleString('zh-CN'),
      }));
      const ws4 = XLSX.utils.json_to_sheet(todoData);
      XLSX.utils.book_append_sheet(wb, ws4, '待办列表');
    }

    // 下载文件
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `财务管理系统数据导出_${date}.xlsx`);
    
    return { success: true, message: '导出成功' };
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, message: '导出失败：' + (error as Error).message };
  }
}

// 从 Excel 导入客户数据
export async function importCustomersFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // 读取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          resolve({ success: false, message: 'Excel 文件为空' });
          return;
        }

        let importedCount = 0;
        
        for (const row of jsonData as any[]) {
          const customer = {
            id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'personal' as const,
            name: row['客户名称'] || row['name'] || '',
            code: `C${Date.now().toString(36).toUpperCase()}`,
            phone: row['联系电话'] || row['phone'] || '',
            email: row['邮箱'] || row['email'] || '',
            address: row['地址'] || row['address'] || '',
            company: row['公司名称'] || row['company'] || '',
            remark: row['备注'] || row['notes'] || '',
            tags: [] as string[],
            createTime: Date.now(),
            updateTime: Date.now(),
            isDeleted: false,
          };

          if (customer.name && customer.phone) {
            await db.customers.add(customer);
            importedCount++;
          }
        }

        resolve({ success: true, message: `成功导入 ${importedCount} 条客户数据`, count: importedCount });
      } catch (error) {
        console.error('Import error:', error);
        resolve({ success: false, message: '导入失败：' + (error as Error).message });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, message: '文件读取失败' });
    };

    reader.readAsBinaryString(file);
  });
}

// 导出客户导入模板
export function downloadCustomerTemplate() {
  const template = [
    {
      '客户名称': '张三',
      '联系电话': '13800138000',
      '邮箱': 'zhangsan@example.com',
      '地址': '北京市朝阳区',
      '公司名称': 'ABC公司',
      '备注': '重要客户',
    },
    {
      '客户名称': '李四',
      '联系电话': '13900139000',
      '邮箱': 'lisi@example.com',
      '地址': '上海市浦东新区',
      '公司名称': 'XYZ公司',
      '备注': '',
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(template);
  XLSX.utils.book_append_sheet(wb, ws, '客户导入模板');
  XLSX.writeFile(wb, '客户导入模板.xlsx');
}
