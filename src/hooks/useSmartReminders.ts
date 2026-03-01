import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store';
import { db } from '@/db';
import { notificationTemplates, sendDesktopNotification, shouldSendDesktopNotification } from '@/lib/notificationTemplates';
import type { Todo, Customer, Contract } from '@/types';
import { isToday, isTomorrow, isPast, differenceInDays, startOfDay } from 'date-fns';

// 最后检查时间存储键
const LAST_CHECK_KEY = 'smart_reminder_last_check';

// 检查间隔（分钟）
const CHECK_INTERVAL = 5;

export function useSmartReminders() {
  const { addNotification } = useAppStore();

  // 检查待办提醒
  const checkTodoReminders = useCallback(async () => {
    try {
      const todos = await db.getActiveTodos();
      const now = Date.now();
      const today = startOfDay(new Date()).getTime();

      for (const todo of todos) {
        if (todo.status === 'completed') continue;
        if (!todo.dueDate) continue;

        const dueDate = todo.dueDate;
        const daysDiff = differenceInDays(dueDate, today);

        // 今日到期
        if (isToday(dueDate)) {
          const template = todo.priority === 'urgent-important' 
            ? notificationTemplates.todo.urgent(todo.title)
            : notificationTemplates.todo.dueToday(todo.title);
          
          await addNotification(template);
          
          if (shouldSendDesktopNotification(template.category, template.type)) {
            sendDesktopNotification(template.title, { body: template.message });
          }
          continue;
        }

        // 明日到期且是紧急重要
        if (isTomorrow(dueDate) && todo.priority === 'urgent-important') {
          const template = notificationTemplates.todo.highPriority(todo.title);
          await addNotification(template);
          continue;
        }

        // 已逾期
        if (isPast(dueDate) && !isToday(dueDate)) {
          const daysOverdue = Math.abs(daysDiff);
          // 每天只提醒一次逾期的（通过检查是否是新的一天）
          if (daysOverdue <= 7) { // 只提醒最近7天的逾期
            const template = notificationTemplates.todo.overdue(todo.title, daysOverdue);
            await addNotification(template);
            
            if (shouldSendDesktopNotification(template.category, template.type)) {
              sendDesktopNotification(template.title, { body: template.message });
            }
          }
        }
      }
    } catch (error) {
      console.error('检查待办提醒失败:', error);
    }
  }, [addNotification]);

  // 检查客户跟进提醒
  const checkCustomerFollowUps = useCallback(async () => {
    try {
      const customers = await db.getActiveCustomers();
      const followUps = await db.followUpRecords.toArray();
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

      for (const customer of customers) {
        // 获取该客户的最后跟进记录
        const customerFollowUps = followUps
          .filter(f => f.customerId === customer.id)
          .sort((a, b) => b.time - a.time);

        const lastFollowUp = customerFollowUps[0];
        const lastFollowUpTime = lastFollowUp?.time || customer.createTime;

        // 超过7天未跟进
        if (lastFollowUpTime < sevenDaysAgo) {
          const daysSinceLastFollowUp = Math.floor((now - lastFollowUpTime) / (24 * 60 * 60 * 1000));
          
          // 每7天提醒一次
          if (daysSinceLastFollowUp % 7 === 0) {
            const template = notificationTemplates.customer.followUpNeeded(customer.name, daysSinceLastFollowUp);
            await addNotification(template);
          }
        }
      }
    } catch (error) {
      console.error('检查客户跟进提醒失败:', error);
    }
  }, [addNotification]);

  // 检查合同到期提醒
  const checkContractExpirations = useCallback(async () => {
    try {
      const contracts = await db.contracts.toArray();
      const now = Date.now();
      const thirtyDaysLater = now + 30 * 24 * 60 * 60 * 1000;

      for (const contract of contracts) {
        const endDate = contract.endDate;

        // 已过期
        if (endDate < now) {
          // 只提醒一次过期的（这里简化处理，实际需要记录已提醒）
          continue;
        }

        // 30天内到期
        if (endDate <= thirtyDaysLater) {
          const daysUntilExpiry = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000));
          
          // 30天、15天、7天、3天、1天提醒
          const reminderDays = [30, 15, 7, 3, 1];
          if (reminderDays.includes(daysUntilExpiry)) {
            const template = notificationTemplates.contract.expiringSoon(contract.code, daysUntilExpiry);
            await addNotification(template);
            
            if (shouldSendDesktopNotification(template.category, template.type)) {
              sendDesktopNotification(template.title, { body: template.message });
            }
          }
        }
      }
    } catch (error) {
      console.error('检查合同到期提醒失败:', error);
    }
  }, [addNotification]);

  // 执行所有检查
  const runAllChecks = useCallback(async () => {
    const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
    const now = Date.now();

    // 检查是否需要执行（避免过于频繁）
    if (lastCheck) {
      const lastCheckTime = parseInt(lastCheck);
      const minutesSinceLastCheck = (now - lastCheckTime) / (1000 * 60);
      
      if (minutesSinceLastCheck < CHECK_INTERVAL) {
        return;
      }
    }

    // 更新最后检查时间
    localStorage.setItem(LAST_CHECK_KEY, now.toString());

    // 执行各项检查
    await checkTodoReminders();
    await checkCustomerFollowUps();
    await checkContractExpirations();
  }, [checkTodoReminders, checkCustomerFollowUps, checkContractExpirations]);

  // 初始化时执行一次，然后定时执行
  useEffect(() => {
    // 延迟执行，避免页面加载时立即执行
    const timer = setTimeout(() => {
      runAllChecks();
    }, 5000);

    // 定时检查
    const interval = setInterval(() => {
      runAllChecks();
    }, CHECK_INTERVAL * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [runAllChecks]);

  // 页面可见性变化时检查
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runAllChecks();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [runAllChecks]);

  return { runAllChecks };
}
