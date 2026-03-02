import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, User, Phone, Building2, ChevronRight, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VirtualList, VIRTUAL_LIST_HEIGHTS } from '@/components/ui/virtual-list';
import { db } from '@/db';
import type { Customer } from '@/types';
import { format } from 'date-fns';

interface CustomerListProps {
  onCustomerSelect?: (customer: Customer) => void;
  multiSelect?: boolean;
  selectedIds?: string[];
}

export function CustomerList({ onCustomerSelect, multiSelect, selectedIds = [] }: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // 加载客户数据
  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      let data = await db.getActiveCustomers();

      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        data = data.filter(c =>
          c.name.toLowerCase().includes(lowerQuery) ||
          c.phone.includes(lowerQuery) ||
          c.code.toLowerCase().includes(lowerQuery) ||
          c.company?.toLowerCase().includes(lowerQuery)
        );
      }

      setCustomers(data);
    } catch (error) {
      console.error('加载客户失败:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // 渲染单个客户卡片
  const renderCustomerCard = useCallback((customer: Customer) => {
    const isSelected = selectedIds.includes(customer.id);
    const typeLabel = customer.type === 'personal' ? '个人' : '企业';
    const typeColor = customer.type === 'personal' ? 'bg-blue-500' : 'bg-purple-500';

    return (
      <div
        key={customer.id}
        className={`
          p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer
          ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200'}
        `}
        onClick={() => onCustomerSelect?.(customer)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{customer.name}</h3>
              <Badge className={`text-white text-xs ${typeColor}`}>
                {typeLabel}
              </Badge>
            </div>

            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span className="truncate">{customer.code}</span>
              </div>

              {customer.type === 'personal' ? (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <span>{customer.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span className="truncate">{customer.company}</span>
                </div>
              )}

              {customer.createTime && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>创建于 {format(customer.createTime, 'yyyy-MM-dd')}</span>
                </div>
              )}
            </div>

            {customer.tags && customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {customer.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {customer.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{customer.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {onCustomerSelect && (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
          )}
        </div>
      </div>
    );
  }, [selectedIds, onCustomerSelect]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-gray-500">加载中...</div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <User className="w-12 h-12 mb-2 opacity-50" />
        <p>{searchQuery ? '未找到匹配的客户' : '暂无客户数据'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索客户（姓名、电话、编号、公司）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-sm text-gray-600">
        共 {customers.length} 位客户
      </div>

      {/* 虚拟滚动列表 - 当客户数量超过 50 时启用 */}
      {customers.length > 50 ? (
        <VirtualList
          items={customers}
          itemHeight={120}
          containerHeight={VIRTUAL_LIST_HEIGHTS.medium}
          renderItem={renderCustomerCard}
        />
      ) : (
        <div className="space-y-2">
          {customers.map(customer => renderCustomerCard(customer))}
        </div>
      )}
    </div>
  );
}
