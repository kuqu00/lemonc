import { useState, useEffect, useMemo } from 'react';
import { 
  Calculator as CalculatorIcon, 
  Save, 
  Trash2,
  Copy,
  Plus,
  X,
  BarChart3,
  ArrowRightLeft,
  Target,
  Download,
  GitCompare,
  Check,
  Home,
  Wallet,
  TrendingDown,
  Clock,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

import { cn } from '@/lib/utils';
import { db } from '@/db';
import { useAppStore } from '@/store';
import type { MortgageCalc, PaymentScheduleItem, PrepaymentRecord } from '@/types';
import { format } from 'date-fns';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart
} from 'recharts';

// 还款方式定义
type RepaymentType = 
  | 'equal-payment'      // 等额本息
  | 'equal-principal'    // 等额本金
  | 'n-month-principal'  // 每N月还本
  | 'interest-only'      // 先息后本
  | 'balloon'            // 气球贷
  | 'flexible';          // 自由还款

interface RepaymentTypeConfig {
  value: RepaymentType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const repaymentTypeConfigs: RepaymentTypeConfig[] = [
  { 
    value: 'equal-payment', 
    label: '等额本息', 
    description: '每月还款额固定，适合收入稳定的工薪族',
    icon: <Wallet className="h-4 w-4" />,
    color: '#3b82f6'
  },
  { 
    value: 'equal-principal', 
    label: '等额本金', 
    description: '每月本金固定，利息递减，总利息较少',
    icon: <TrendingDown className="h-4 w-4" />,
    color: '#10b981'
  },
  { 
    value: 'n-month-principal', 
    label: '每N月还本', 
    description: '每月还息，每N个月还一次本金，适合经营周转',
    icon: <Calendar className="h-4 w-4" />,
    color: '#f59e0b'
  },
  { 
    value: 'interest-only', 
    label: '先息后本', 
    description: '每月只还利息，到期一次性还本金，前期压力最小',
    icon: <Clock className="h-4 w-4" />,
    color: '#8b5cf6'
  },
  { 
    value: 'balloon', 
    label: '气球贷', 
    description: '前期按长期限计算月供，到期一次性还剩余本金',
    icon: <Home className="h-4 w-4" />,
    color: '#ec4899'
  },
  { 
    value: 'flexible', 
    label: '自由还款', 
    description: '设定最低还款额，每月可自由多还，灵活性最高',
    icon: <Target className="h-4 w-4" />,
    color: '#06b6d4'
  }
];

// 计算结果类型
interface CalculationResult {
  type: RepaymentType;
  label: string;
  monthlyPayment: number;
  firstMonthPayment?: number;
  lastMonthPayment?: number;
  monthlyDecrease?: number;
  minPayment?: number;      // 自由还款最低还款额
  totalInterest: number;
  totalPayment: number;
  savedInterest: number;
  schedule: PaymentScheduleItem[];
  prepayments: PrepaymentRecord[];
  nValue?: number;
  balloonPayment?: number;  // 气球贷到期一次性还款
  params?: any;             // 额外参数
}

// 方案类型
interface LoanScheme {
  id: string;
  name: string;
  loanAmount: string;
  loanTermValue: string;
  loanTermUnit: 'year' | 'month';
  interestRate: string;
  nMonthValue: string;
  balloonTerm: string;      // 气球贷期限
  minPaymentRate: string;   // 自由还款最低比例
  selectedTypes: RepaymentType[];
  isCombinedLoan: boolean;
  fundAmount: string;
  fundRate: string;
  commercialAmount: string;
  commercialRate: string;
  prepayments: PrepaymentRecord[];
  results: CalculationResult[];
  createTime: number;
}

export function Calculator() {
  const [activeTab, setActiveTab] = useState('calculator');
  
  // 房贷计算状态
  const [loanAmount, setLoanAmount] = useState('');
  const [loanTermValue, setLoanTermValue] = useState('30');
  const [loanTermUnit, setLoanTermUnit] = useState<'year' | 'month'>('year');
  const [interestRate, setInterestRate] = useState('3.85');
  const [customerName, setCustomerName] = useState('');
  
  // 各还款方式的额外参数
  const [nMonthValue, setNMonthValue] = useState('3');
  const [balloonTerm, setBalloonTerm] = useState('5');  // 气球贷期限（年）
  const [minPaymentRate, setMinPaymentRate] = useState('30'); // 自由还款最低比例（%）
  
  // 组合贷状态
  const [isCombinedLoan, setIsCombinedLoan] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [fundRate, setFundRate] = useState('2.85');
  const [commercialAmount, setCommercialAmount] = useState('');
  const [commercialRate, setCommercialRate] = useState('3.30');
  
  // 还款方式选择
  const [selectedTypes, setSelectedTypes] = useState<RepaymentType[]>(['equal-payment', 'equal-principal']);
  
  // 提前还款
  const [prepayments, setPrepayments] = useState<PrepaymentRecord[]>([]);
  const [showPrepaymentDialog, setShowPrepaymentDialog] = useState(false);
  const [prepayMonth, setPrepayMonth] = useState('');
  const [prepayAmount, setPrepayAmount] = useState('');
  const [prepayType, setPrepayType] = useState<'reduce-term' | 'reduce-payment'>('reduce-term');
  
  // 计算结果
  const [calculationResults, setCalculationResults] = useState<CalculationResult[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  
  // 方案对比
  const [schemes, setSchemes] = useState<LoanScheme[]>([]);
  const [showSchemeDialog, setShowSchemeDialog] = useState(false);
  const [schemeName, setSchemeName] = useState('');
  const [comparisonSchemes, setComparisonSchemes] = useState<string[]>([]);
  
  // 历史记录
  const [mortgageHistory, setMortgageHistory] = useState<MortgageCalc[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState('trend');

  const { addNotification } = useAppStore();

  // 加载历史记录
  useEffect(() => {
    loadHistory();
    loadSchemes();
  }, []);

  const loadHistory = async () => {
    const mortgageData = await db.mortgageCalcs.orderBy('createTime').reverse().limit(10).toArray();
    setMortgageHistory(mortgageData);
  };

  const loadSchemes = async () => {
    const savedSchemes = localStorage.getItem('loanSchemes_v2');
    if (savedSchemes) {
      setSchemes(JSON.parse(savedSchemes));
    }
  };

  const saveSchemesToStorage = (newSchemes: LoanScheme[]) => {
    localStorage.setItem('loanSchemes_v2', JSON.stringify(newSchemes));
    setSchemes(newSchemes);
  };

  // 获取贷款期限（月）
  const getLoanMonths = () => {
    const value = parseInt(loanTermValue) || 0;
    return loanTermUnit === 'year' ? value * 12 : value;
  };

  // 核心计算函数
  const calculateLoan = (
    principal: number,
    months: number,
    annualRate: number,
    type: RepaymentType,
    prepayRecords: PrepaymentRecord[],
    params: { nValue?: number; balloonTerm?: number; minPaymentRate?: number } = {}
  ): CalculationResult => {
    const rate = annualRate / 100 / 12;
    let schedule: PaymentScheduleItem[] = [];
    let monthlyPayment = 0;
    let firstMonthPayment = 0;
    let lastMonthPayment = 0;
    let monthlyDecrease = 0;
    let minPayment = 0;
    let totalInterest = 0;
    let totalPayment = 0;
    let balloonPayment = 0;

    switch (type) {
      case 'equal-payment': {
        monthlyPayment = principal * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
        let balance = principal;
        
        for (let i = 1; i <= months; i++) {
          const interest = balance * rate;
          const principalPaid = monthlyPayment - interest;
          balance -= principalPaid;
          
          const prepayment = prepayRecords.find(p => p.month === i);
          if (prepayment) {
            balance -= prepayment.amount;
            if (prepayment.type === 'reduce-term' && balance > 0) {
              const remainingMonths = months - i;
              if (remainingMonths > 0) {
                monthlyPayment = balance * (rate * Math.pow(1 + rate, remainingMonths)) / (Math.pow(1 + rate, remainingMonths) - 1);
              }
            }
          }
          
          schedule.push({
            month: i,
            payment: monthlyPayment + (prepayment?.amount || 0),
            principal: principalPaid + (prepayment?.amount || 0),
            interest: interest,
            balance: Math.max(0, balance)
          });
          
          if (balance <= 0) break;
        }
        
        totalPayment = schedule.reduce((sum, s) => sum + s.payment, 0);
        totalInterest = totalPayment - principal;
        break;
      }

      case 'equal-principal': {
        const monthlyPrincipal = principal / months;
        monthlyDecrease = monthlyPrincipal * rate;
        let balance = principal;
        
        for (let i = 1; i <= months; i++) {
          const interest = balance * rate;
          const payment = monthlyPrincipal + interest;
          balance -= monthlyPrincipal;
          
          const prepayment = prepayRecords.find(p => p.month === i);
          if (prepayment) {
            balance -= prepayment.amount;
          }
          
          if (i === 1) firstMonthPayment = payment;
          if (i === months || balance <= 0) lastMonthPayment = payment;
          
          schedule.push({
            month: i,
            payment: payment + (prepayment?.amount || 0),
            principal: monthlyPrincipal + (prepayment?.amount || 0),
            interest: interest,
            balance: Math.max(0, balance)
          });
          
          if (balance <= 0) break;
        }
        
        totalPayment = schedule.reduce((sum, s) => sum + s.payment, 0);
        totalInterest = totalPayment - principal;
        break;
      }

      case 'n-month-principal': {
        const n = Math.max(1, Math.min(params.nValue || 3, months));
        const principalPerPeriod = principal / Math.ceil(months / n);
        let balance = principal;
        let month = 1;
        
        while (balance > 0 && month <= months) {
          const interest = balance * rate;
          let principalPaid = 0;
          
          if ((month - 1) % n === 0) {
            principalPaid = Math.min(balance, principalPerPeriod);
          }
          
          const payment = interest + principalPaid;
          balance -= principalPaid;
          totalPayment += payment;
          totalInterest += interest;
          
          if (month === 1) firstMonthPayment = payment;
          
          schedule.push({
            month: month,
            payment: payment,
            principal: principalPaid,
            interest: interest,
            balance: Math.max(0, balance)
          });
          
          month++;
          if (balance <= 0) break;
        }
        
        monthlyPayment = schedule.length > 0 ? schedule[0].payment : 0;
        break;
      }

      case 'interest-only': {
        // 先息后本：每月只还利息，最后一期还本金+利息
        let balance = principal;
        const monthlyInterest = principal * rate;
        
        for (let i = 1; i <= months; i++) {
          const isLastMonth = i === months;
          const interest = balance * rate;
          const principalPaid = isLastMonth ? balance : 0;
          const payment = interest + principalPaid;
          
          balance -= principalPaid;
          totalPayment += payment;
          totalInterest += interest;
          
          schedule.push({
            month: i,
            payment: payment,
            principal: principalPaid,
            interest: interest,
            balance: Math.max(0, balance)
          });
        }
        
        monthlyPayment = monthlyInterest;
        firstMonthPayment = monthlyInterest;
        lastMonthPayment = monthlyInterest + principal;
        break;
      }

      case 'balloon': {
        // 气球贷：按长期限计算月供，到期一次性还剩余本金
        const balloonMonths = (params.balloonTerm || 5) * 12;
        const amortizationMonths = Math.max(months, balloonMonths * 2); // 按更长期限摊销
        
        monthlyPayment = principal * (rate * Math.pow(1 + rate, amortizationMonths)) / (Math.pow(1 + rate, amortizationMonths) - 1);
        
        let balance = principal;
        for (let i = 1; i <= months; i++) {
          const interest = balance * rate;
          const principalPaid = monthlyPayment - interest;
          balance -= principalPaid;
          
          const prepayment = prepayRecords.find(p => p.month === i);
          if (prepayment) {
            balance -= prepayment.amount;
          }
          
          schedule.push({
            month: i,
            payment: monthlyPayment + (prepayment?.amount || 0),
            principal: principalPaid + (prepayment?.amount || 0),
            interest: interest,
            balance: Math.max(0, balance)
          });
          
          if (i === months) {
            balloonPayment = balance;
          }
          
          if (balance <= 0) break;
        }
        
        totalPayment = schedule.reduce((sum, s) => sum + s.payment, 0) + balloonPayment;
        totalInterest = totalPayment - principal;
        break;
      }

      case 'flexible': {
        // 自由还款：设定最低还款额，每月还利息+最低本金
        const minRate = (params.minPaymentRate || 30) / 100;
        minPayment = principal * rate + (principal / months) * minRate;
        
        let balance = principal;
        for (let i = 1; i <= months; i++) {
          const interest = balance * rate;
          const minPrincipal = (principal / months) * minRate;
          const payment = interest + minPrincipal;
          
          balance -= minPrincipal;
          totalPayment += payment;
          totalInterest += interest;
          
          const prepayment = prepayRecords.find(p => p.month === i);
          if (prepayment) {
            balance -= prepayment.amount;
            totalPayment += prepayment.amount;
          }
          
          if (i === 1) firstMonthPayment = payment;
          
          schedule.push({
            month: i,
            payment: payment + (prepayment?.amount || 0),
            principal: minPrincipal + (prepayment?.amount || 0),
            interest: interest,
            balance: Math.max(0, balance)
          });
          
          if (balance <= 0) break;
        }
        
        monthlyPayment = firstMonthPayment;
        break;
      }
    }

    const originalInterest = principal * rate * months;
    const savedInterest = Math.max(0, originalInterest - totalInterest);

    return {
      type,
      label: repaymentTypeConfigs.find(c => c.value === type)?.label || type,
      monthlyPayment,
      firstMonthPayment,
      lastMonthPayment,
      monthlyDecrease,
      minPayment,
      totalInterest,
      totalPayment,
      savedInterest,
      schedule,
      prepayments: prepayRecords,
      nValue: type === 'n-month-principal' ? params.nValue : undefined,
      balloonPayment: type === 'balloon' ? balloonPayment : undefined,
      params
    };
  };

  // 计算房贷
  const calculateMortgage = () => {
    let principal: number;
    let rate: number;

    if (isCombinedLoan) {
      principal = (parseFloat(fundAmount) + parseFloat(commercialAmount)) * 10000;
      const fundPrincipal = parseFloat(fundAmount) * 10000;
      const commercialPrincipal = parseFloat(commercialAmount) * 10000;
      // 加权平均利率
      rate = (parseFloat(fundRate) * fundPrincipal + parseFloat(commercialRate) * commercialPrincipal) / principal;
    } else {
      principal = parseFloat(loanAmount) * 10000;
      rate = parseFloat(interestRate);
    }

    const months = getLoanMonths();

    if (!principal || !months || !rate || isNaN(principal) || isNaN(months) || isNaN(rate)) {
      addNotification({
        title: '输入错误',
        message: '请填写完整的贷款信息',
        type: 'error',
        category: 'general'
      });
      return;
    }

    // 计算选中的还款方式
    const results: CalculationResult[] = [];
    
    for (const type of selectedTypes) {
      const result = calculateLoan(principal, months, rate, type, prepayments, {
        nValue: parseInt(nMonthValue),
        balloonTerm: parseInt(balloonTerm),
        minPaymentRate: parseInt(minPaymentRate)
      });
      results.push(result);
    }

    setCalculationResults(results);
    setSelectedResultIndex(0);
  };

  // 切换还款方式选择
  const toggleRepaymentType = (type: RepaymentType) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter(t => t !== type));
      }
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  // 保存方案
  const saveScheme = () => {
    if (!calculationResults.length) {
      addNotification({
        title: '错误',
        message: '请先计算贷款方案',
        type: 'error',
        category: 'general'
      });
      return;
    }

    const name = schemeName.trim() || `方案 ${schemes.length + 1}`;
    const newScheme: LoanScheme = {
      id: `scheme-${Date.now()}`,
      name,
      loanAmount,
      loanTermValue,
      loanTermUnit,
      interestRate,
      nMonthValue,
      balloonTerm,
      minPaymentRate,
      selectedTypes: [...selectedTypes],
      isCombinedLoan,
      fundAmount,
      fundRate,
      commercialAmount,
      commercialRate,
      prepayments: [...prepayments],
      results: calculationResults,
      createTime: Date.now()
    };

    const updatedSchemes = [...schemes, newScheme];
    saveSchemesToStorage(updatedSchemes);
    setShowSchemeDialog(false);
    setSchemeName('');
    
    addNotification({
      title: '保存成功',
      message: `方案「${name}」已保存`,
      type: 'success',
      category: 'general'
    });
  };

  // 删除方案
  const deleteScheme = (id: string) => {
    const updatedSchemes = schemes.filter(s => s.id !== id);
    saveSchemesToStorage(updatedSchemes);
  };

  // 加载方案
  const loadScheme = (scheme: LoanScheme) => {
    setLoanAmount(scheme.loanAmount);
    setLoanTermValue(scheme.loanTermValue);
    setLoanTermUnit(scheme.loanTermUnit);
    setInterestRate(scheme.interestRate);
    setNMonthValue(scheme.nMonthValue || '3');
    setBalloonTerm(scheme.balloonTerm || '5');
    setMinPaymentRate(scheme.minPaymentRate || '30');
    setSelectedTypes(scheme.selectedTypes);
    setIsCombinedLoan(scheme.isCombinedLoan);
    setFundAmount(scheme.fundAmount || '');
    setFundRate(scheme.fundRate || '2.85');
    setCommercialAmount(scheme.commercialAmount || '');
    setCommercialRate(scheme.commercialRate || '3.30');
    setPrepayments(scheme.prepayments);
    setCalculationResults(scheme.results);
    setSelectedResultIndex(0);
    setActiveTab('calculator');
  };

  // 添加提前还款
  const handleAddPrepayment = () => {
    const month = parseInt(prepayMonth);
    const amount = parseFloat(prepayAmount) * 10000;
    
    if (!month || !amount || month <= 0 || amount <= 0) {
      addNotification({
        title: '输入错误',
        message: '请输入有效的期数和金额',
        type: 'error',
        category: 'general'
      });
      return;
    }

    const newPrepayment: PrepaymentRecord = {
      id: `prepay-${Date.now()}`,
      month,
      amount,
      type: prepayType,
      savedInterest: 0
    };

    setPrepayments([...prepayments, newPrepayment].sort((a, b) => a.month - b.month));
    setShowPrepaymentDialog(false);
    setPrepayMonth('');
    setPrepayAmount('');
  };

  // 删除提前还款
  const handleRemovePrepayment = (id: string) => {
    setPrepayments(prepayments.filter(p => p.id !== id));
  };

  // 复制月供
  const copyMonthlyPayment = (amount: number) => {
    const value = amount.toFixed(2);
    navigator.clipboard.writeText(value);
    addNotification({
      title: '已复制',
      message: `月供金额 ${value} 已复制到剪贴板`,
      type: 'success',
      category: 'general'
    });
  };

  // 导出还款计划
  const exportSchedule = (result: CalculationResult) => {
    const headers = ['期数', '月供(元)', '本金(元)', '利息(元)', '剩余本金(元)'];
    const rows = result.schedule.map(item => [
      item.month,
      item.payment.toFixed(2),
      item.principal.toFixed(2),
      item.interest.toFixed(2),
      item.balance.toFixed(2)
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `还款计划_${result.label}_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();

    addNotification({
      title: '导出成功',
      message: '还款计划已导出',
      type: 'success',
      category: 'general'
    });
  };

  // 准备图表数据
  const chartData = useMemo(() => {
    if (!calculationResults.length) return [];
    const result = calculationResults[selectedResultIndex];
    if (!result) return [];
    
    return result.schedule.map((item) => ({
      month: item.month,
      payment: Math.round(item.payment),
      principal: Math.round(item.principal),
      interest: Math.round(item.interest),
      balance: Math.round(item.balance / 100) / 100
    }));
  }, [calculationResults, selectedResultIndex]);

  // 对比图表数据
  const comparisonChartData = useMemo(() => {
    if (calculationResults.length < 2) return [];
    
    const maxMonths = Math.max(...calculationResults.map(r => r.schedule.length));
    
    return Array.from({ length: Math.min(maxMonths, 60) }, (_, i) => {
      const month = i + 1;
      const data: any = { month };
      
      calculationResults.forEach((result, idx) => {
        const payment = result.schedule.find(s => s.month === month);
        data[`payment${idx}`] = payment?.payment || 0;
        data[`balance${idx}`] = payment ? Math.round(payment.balance / 10000 * 100) / 100 : 0;
      });
      
      return data;
    });
  }, [calculationResults]);

  // 饼图数据
  const pieData = useMemo(() => {
    if (!calculationResults.length) return [];
    const result = calculationResults[selectedResultIndex];
    if (!result) return [];
    
    const principal = isCombinedLoan ? 
      (parseFloat(fundAmount) + parseFloat(commercialAmount)) * 10000 :
      parseFloat(loanAmount) * 10000;
    
    return [
      { name: '贷款本金', value: Math.round(principal), color: '#3b82f6' },
      { name: '支付利息', value: Math.round(result.totalInterest), color: '#f59e0b' }
    ];
  }, [calculationResults, selectedResultIndex, loanAmount, fundAmount, commercialAmount, isCombinedLoan]);

  // 选中的结果
  const selectedResult = calculationResults[selectedResultIndex];

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="calculator">
            <CalculatorIcon className="h-4 w-4 mr-2" />
            房贷计算器
          </TabsTrigger>
          <TabsTrigger value="schemes">
            <GitCompare className="h-4 w-4 mr-2" />
            方案对比 ({schemes.length})
          </TabsTrigger>
        </TabsList>

        {/* 房贷计算器 */}
        <TabsContent value="calculator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 输入区 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalculatorIcon className="h-5 w-5" />
                  贷款信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>客户姓名（可选）</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="输入客户姓名"
                  />
                </div>

                {/* 组合贷切换 */}
                <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                  <Checkbox
                    id="combined"
                    checked={isCombinedLoan}
                    onCheckedChange={(checked) => setIsCombinedLoan(checked as boolean)}
                  />
                  <label htmlFor="combined" className="text-sm cursor-pointer flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    公积金组合贷款
                  </label>
                </div>

                {isCombinedLoan ? (
                  // 组合贷输入
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>公积金贷款（万元）</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={fundAmount}
                          onChange={(e) => setFundAmount(e.target.value)}
                          placeholder="如：60"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>公积金利率（%）</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={fundRate}
                          onChange={(e) => setFundRate(e.target.value)}
                          placeholder="如：2.85"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>商业贷款（万元）</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={commercialAmount}
                          onChange={(e) => setCommercialAmount(e.target.value)}
                          placeholder="如：60"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>商业贷款利率（%）</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={commercialRate}
                          onChange={(e) => setCommercialRate(e.target.value)}
                          placeholder="如：3.30"
                        />
                      </div>
                    </div>
                    {fundAmount && commercialAmount && (
                      <div className="p-2 bg-primary/10 rounded text-sm">
                        <p>贷款总额：<strong>{(parseFloat(fundAmount) + parseFloat(commercialAmount)).toFixed(2)}万</strong></p>
                        <p className="text-muted-foreground">
                          综合利率：{((parseFloat(fundRate) * parseFloat(fundAmount) + parseFloat(commercialRate) * parseFloat(commercialAmount)) / (parseFloat(fundAmount) + parseFloat(commercialAmount))).toFixed(2)}%
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  // 普通贷款输入
                  <>
                    <div className="space-y-2">
                      <Label>贷款金额（万元）</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(e.target.value)}
                        placeholder="如：100.50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>年利率（%）</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        placeholder="如：3.85"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>贷款期限</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={loanTermValue}
                      onChange={(e) => setLoanTermValue(e.target.value)}
                      placeholder="如：30"
                      className="flex-1"
                    />
                    <select
                      value={loanTermUnit}
                      onChange={(e) => setLoanTermUnit(e.target.value as 'year' | 'month')}
                      className="h-10 px-3 rounded-md border border-input bg-transparent text-sm"
                    >
                      <option value="year">年</option>
                      <option value="month">月</option>
                    </select>
                  </div>
                </div>

                {/* 还款方式选择 */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">选择要对比的还款方式（多选）</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {repaymentTypeConfigs.map((config) => (
                      <button
                        key={config.value}
                        onClick={() => toggleRepaymentType(config.value)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-lg border text-center transition-all",
                          selectedTypes.includes(config.value)
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:bg-accent opacity-60"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          selectedTypes.includes(config.value) ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          {selectedTypes.includes(config.value) ? <Check className="h-4 w-4" /> : config.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            <span className="font-medium text-sm">{config.label}</span>
                            {selectedTypes.includes(config.value) && (
                              <Badge variant="default" className="text-[10px] px-1 py-0">已选</Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{config.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 特殊参数设置 */}
                {selectedTypes.includes('n-month-principal') && (
                  <div className="space-y-2 p-3 bg-accent rounded-lg">
                    <Label>每N月还本 - N值设置</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        value={nMonthValue}
                        onChange={(e) => setNMonthValue(e.target.value)}
                        placeholder="如：3"
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">个月还一次本金</span>
                    </div>
                  </div>
                )}

                {selectedTypes.includes('balloon') && (
                  <div className="space-y-2 p-3 bg-accent rounded-lg">
                    <Label>气球贷 - 到期期限</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={balloonTerm}
                        onChange={(e) => setBalloonTerm(e.target.value)}
                        placeholder="如：5"
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">年后到期</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      到期需一次性还清剩余本金
                    </p>
                  </div>
                )}

                {selectedTypes.includes('flexible') && (
                  <div className="space-y-2 p-3 bg-accent rounded-lg">
                    <Label>自由还款 - 最低还款比例</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="10"
                        max="100"
                        value={minPaymentRate}
                        onChange={(e) => setMinPaymentRate(e.target.value)}
                        placeholder="如：30"
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      每月最低还款为等额本金的{minPaymentRate}%
                    </p>
                  </div>
                )}

                {/* 提前还款 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>提前还款计划</Label>
                    <Button variant="outline" size="sm" onClick={() => setShowPrepaymentDialog(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      添加
                    </Button>
                  </div>
                  {prepayments.length > 0 && (
                    <div className="space-y-1">
                      {prepayments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2 bg-accent rounded text-sm">
                          <span>第{p.month}期: ¥{(p.amount / 10000).toFixed(2)}万</span>
                          <Badge variant={p.type === 'reduce-term' ? 'default' : 'secondary'} className="text-xs">
                            {p.type === 'reduce-term' ? '缩短期限' : '减少月供'}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemovePrepayment(p.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={calculateMortgage} className="w-full">
                  计算选中的 {selectedTypes.length} 种还款方式
                </Button>
              </CardContent>
            </Card>

            {/* 结果区 */}
            <div className="space-y-4">
              {calculationResults.length > 0 && (
                <>
                  {/* 还款方式对比卡片 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <ArrowRightLeft className="h-5 w-5" />
                          {calculationResults.length}种还款方式对比
                        </span>
                        <Button variant="outline" size="sm" onClick={() => setShowSchemeDialog(true)}>
                          <Save className="h-4 w-4 mr-1" />
                          保存方案
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {calculationResults.map((result, index) => {
                        const config = repaymentTypeConfigs.find(c => c.value === result.type);
                        return (
                          <div 
                            key={result.type}
                            className={cn(
                              "p-4 rounded-lg border-2 cursor-pointer transition-all",
                              selectedResultIndex === index 
                                ? "border-primary bg-primary/5" 
                                : "border-transparent bg-accent hover:bg-accent/80"
                            )}
                            onClick={() => setSelectedResultIndex(index)}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                                  style={{ backgroundColor: config?.color }}
                                >
                                  {config?.icon}
                                </div>
                                <h4 className="font-bold text-lg">{result.label}</h4>
                              </div>
                              <Badge variant={selectedResultIndex === index ? 'default' : 'outline'}>
                                {selectedResultIndex === index ? '已选中' : '点击选中'}
                              </Badge>
                            </div>
                            
                            <div className="text-center p-4 bg-background rounded-lg mb-3">
                              <p className="text-sm text-muted-foreground mb-1">
                                {result.type === 'interest-only' ? '每月利息' : 
                                 result.type === 'flexible' ? '最低月供' : '每月还款'}
                              </p>
                              <div className="flex items-center justify-center gap-2">
                                <p className="text-3xl font-bold">
                                  ¥{result.monthlyPayment.toFixed(2)}
                                </p>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); copyMonthlyPayment(result.monthlyPayment); }}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              {result.type === 'equal-principal' && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  首月¥{result.firstMonthPayment?.toFixed(2)} → 末月¥{result.lastMonthPayment?.toFixed(2)}
                                  <span className="text-green-600 ml-2">递减¥{result.monthlyDecrease?.toFixed(2)}/月</span>
                                </p>
                              )}
                              
                              {result.type === 'interest-only' && (
                                <p className="text-xs text-orange-600 mt-1">
                                  最后一期需还本金¥{(parseFloat(loanAmount) * 10000).toFixed(0)} + 利息
                                </p>
                              )}
                              
                              {result.type === 'balloon' && result.balloonPayment && (
                                <p className="text-xs text-pink-600 mt-1">
                                  到期一次性还¥{(result.balloonPayment / 10000).toFixed(2)}万
                                </p>
                              )}
                              
                              {result.type === 'n-month-principal' && (
                                <p className="text-xs text-amber-600 mt-1">
                                  每{result.nValue}个月还一次本金
                                </p>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div className="text-center p-2 bg-background rounded">
                                <p className="text-muted-foreground text-xs">总利息</p>
                                <p className="font-semibold">¥{(result.totalInterest / 10000).toFixed(2)}万</p>
                              </div>
                              <div className="text-center p-2 bg-background rounded">
                                <p className="text-muted-foreground text-xs">总还款</p>
                                <p className="font-semibold">¥{(result.totalPayment / 10000).toFixed(2)}万</p>
                              </div>
                              <div className="text-center p-2 bg-background rounded">
                                <p className="text-muted-foreground text-xs">节省利息</p>
                                <p className="font-semibold text-green-600">¥{(result.savedInterest / 10000).toFixed(2)}万</p>
                              </div>
                            </div>
                            
                            {index > 0 && calculationResults[0] && (
                              <div className="mt-3 p-2 bg-green-50 rounded text-sm">
                                <p className="text-green-700">
                                  比{calculationResults[0].label}{result.totalInterest < calculationResults[0].totalInterest ? '节省' : '多付'} 
                                  <strong>¥{(Math.abs(calculationResults[0].totalInterest - result.totalInterest) / 10000).toFixed(2)}万</strong> 利息
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* 可视化图表 */}
                  {selectedResult && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          {selectedResult.label} - 可视化分析
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Tabs value={activeChartTab} onValueChange={setActiveChartTab}>
                          <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="trend">月供趋势</TabsTrigger>
                            <TabsTrigger value="structure">本息占比</TabsTrigger>
                            <TabsTrigger value="balance">剩余本金</TabsTrigger>
                            <TabsTrigger value="comparison">方式对比</TabsTrigger>
                          </TabsList>

                          <TabsContent value="trend" className="h-72 mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData.slice(0, 60)}>
                                <defs>
                                  <linearGradient id="colorPayment" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" tickFormatter={(v) => `${v}期`} />
                                <YAxis tickFormatter={(v) => `¥${v}`} />
                                <Tooltip formatter={(v: number) => `¥${v.toFixed(2)}`} />
                                <Area 
                                  type="monotone" 
                                  dataKey="payment" 
                                  name="月供"
                                  stroke="#3b82f6" 
                                  fill="url(#colorPayment)" 
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </TabsContent>

                          <TabsContent value="structure" className="h-72 mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData.slice(0, 24)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" tickFormatter={(v) => `${v}期`} />
                                <YAxis tickFormatter={(v) => `¥${v}`} />
                                <Tooltip formatter={(v: number) => `¥${v.toFixed(2)}`} />
                                <Legend />
                                <Bar dataKey="principal" name="本金" fill="#3b82f6" stackId="a" />
                                <Bar dataKey="interest" name="利息" fill="#f59e0b" stackId="a" />
                              </BarChart>
                            </ResponsiveContainer>
                          </TabsContent>

                          <TabsContent value="balance" className="h-72 mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData}>
                                <defs>
                                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" tickFormatter={(v) => `${v}期`} />
                                <YAxis tickFormatter={(v) => `¥${v}万`} />
                                <Tooltip formatter={(v: number) => `¥${v}万`} />
                                <Area 
                                  type="monotone" 
                                  dataKey="balance" 
                                  name="剩余本金"
                                  stroke="#8b5cf6" 
                                  fill="url(#colorBalance)" 
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </TabsContent>

                          <TabsContent value="comparison" className="h-72 mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={comparisonChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" tickFormatter={(v) => `${v}期`} />
                                <YAxis yAxisId="left" tickFormatter={(v) => `¥${v}`} />
                                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `¥${v}万`} />
                                <Tooltip />
                                <Legend />
                                {calculationResults.map((result, idx) => (
                                  <Bar 
                                    key={idx}
                                    yAxisId="left" 
                                    dataKey={`payment${idx}`} 
                                    name={result.label} 
                                    fill={repaymentTypeConfigs.find(c => c.value === result.type)?.color} 
                                  />
                                ))}
                              </ComposedChart>
                            </ResponsiveContainer>
                          </TabsContent>
                        </Tabs>

                        {/* 饼图 */}
                        <div className="mt-6 h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                                label={({name, percent}) => `${name} ${(percent * 100).toFixed(1)}%`}
                              >
                                {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(v: number) => `¥${(v / 10000).toFixed(2)}万`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <Button variant="outline" className="w-full mt-4" onClick={() => setShowSchedule(!showSchedule)}>
                          {showSchedule ? '隐藏' : '显示'}详细还款计划
                        </Button>

                        {showSchedule && selectedResult.schedule.length > 0 && (
                          <ScrollArea className="h-64 mt-4">
                            <table className="w-full text-sm">
                              <thead className="bg-accent sticky top-0">
                                <tr>
                                  <th className="p-2 text-left">期数</th>
                                  <th className="p-2 text-right">月供</th>
                                  <th className="p-2 text-right">本金</th>
                                  <th className="p-2 text-right">利息</th>
                                  <th className="p-2 text-right">剩余</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedResult.schedule.map((data) => (
                                  <tr key={data.month} className={cn(
                                    "border-b",
                                    prepayments.some(p => p.month === data.month) && "bg-yellow-50"
                                  )}>
                                    <td className="p-2">
                                      {data.month}
                                      {prepayments.some(p => p.month === data.month) && (
                                        <Badge variant="destructive" className="ml-2 text-xs">提前还</Badge>
                                      )}
                                    </td>
                                    <td className="p-2 text-right font-medium">¥{data.payment.toFixed(2)}</td>
                                    <td className="p-2 text-right">¥{data.principal.toFixed(2)}</td>
                                    <td className="p-2 text-right">¥{data.interest.toFixed(2)}</td>
                                    <td className="p-2 text-right">¥{(data.balance / 10000).toFixed(2)}万</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </ScrollArea>
                        )}

                        <Button 
                          variant="outline" 
                          className="w-full mt-2" 
                          onClick={() => exportSchedule(selectedResult)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          导出还款计划 (CSV)
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* 历史记录 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        计算历史
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-48">
                        {mortgageHistory.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">暂无历史记录</p>
                        ) : (
                          <div className="space-y-2">
                            {mortgageHistory.map((calc) => (
                              <div key={calc.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                                <div>
                                  <p className="font-medium">
                                    {calc.customerName || '匿名'} - {calc.loanAmount.toFixed(0)}万
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {calc.loanTerm}月 | {calc.interestRate}% | {calc.monthlyPayment.toFixed(0)}/月
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {format(calc.createTime, 'MM-dd HH:mm')}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={async () => {
                                      await db.mortgageCalcs.delete(calc.id);
                                      loadHistory();
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>

          {/* 提前还款对话框 */}
          <Dialog open={showPrepaymentDialog} onOpenChange={setShowPrepaymentDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加提前还款</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>还款期数</Label>
                  <Input
                    type="number"
                    value={prepayMonth}
                    onChange={(e) => setPrepayMonth(e.target.value)}
                    placeholder="如：12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>还款金额（万元）</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={prepayAmount}
                    onChange={(e) => setPrepayAmount(e.target.value)}
                    placeholder="如：20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>还款方式</Label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPrepayType('reduce-term')}
                      className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
                        prepayType === 'reduce-term' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                      }`}
                    >
                      <div className="font-medium">缩短期限</div>
                      <div className="text-xs text-muted-foreground">保持月供不变，提前还清</div>
                    </button>
                    <button
                      onClick={() => setPrepayType('reduce-payment')}
                      className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
                        prepayType === 'reduce-payment' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                      }`}
                    >
                      <div className="font-medium">减少月供</div>
                      <div className="text-xs text-muted-foreground">保持期限不变，降低月供</div>
                    </button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPrepaymentDialog(false)}>取消</Button>
                <Button onClick={handleAddPrepayment}>添加</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 保存方案对话框 */}
          <Dialog open={showSchemeDialog} onOpenChange={setShowSchemeDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>保存贷款方案</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>方案名称</Label>
                  <Input
                    value={schemeName}
                    onChange={(e) => setSchemeName(e.target.value)}
                    placeholder="如：客户张三方案A"
                  />
                </div>
                <div className="p-3 bg-accent rounded-lg text-sm space-y-1">
                  <p>贷款金额：{isCombinedLoan ? `${fundAmount}万(公积金) + ${commercialAmount}万(商业)` : `${loanAmount}万`}</p>
                  <p>贷款期限：{loanTermValue}{loanTermUnit === 'year' ? '年' : '个月'}</p>
                  <p>年利率：{isCombinedLoan ? `公积金${fundRate}% / 商业${commercialRate}%` : `${interestRate}%`}</p>
                  <p>还款方式：{calculationResults.map(r => r.label).join('、')}</p>
                  {prepayments.length > 0 && (
                    <p>提前还款：{prepayments.length}笔计划</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSchemeDialog(false)}>取消</Button>
                <Button onClick={saveScheme}>保存</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* 方案对比页面 */}
        <TabsContent value="schemes" className="space-y-6">
          {schemes.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <GitCompare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">暂无保存的方案</h3>
                <p className="text-muted-foreground mb-4">在计算器页面计算并保存方案后，可以在这里进行对比</p>
                <Button onClick={() => setActiveTab('calculator')}>
                  去计算器创建方案
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 方案列表 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schemes.map((scheme) => (
                  <Card key={scheme.id} className={cn(
                    "transition-all",
                    comparisonSchemes.includes(scheme.id) && "ring-2 ring-primary"
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{scheme.name}</CardTitle>
                        <Checkbox
                          checked={comparisonSchemes.includes(scheme.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setComparisonSchemes([...comparisonSchemes, scheme.id]);
                            } else {
                              setComparisonSchemes(comparisonSchemes.filter(id => id !== scheme.id));
                            }
                          }}
                        />
                      </div>
                      <CardDescription>
                        {format(scheme.createTime, 'yyyy-MM-dd HH:mm')}保存
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm space-y-1">
                        <p>贷款金额：<span className="font-medium">
                          {scheme.isCombinedLoan ? 
                            `${scheme.fundAmount}万(公积金)+${scheme.commercialAmount}万(商业)` : 
                            `${scheme.loanAmount}万`}
                        </span></p>
                        <p>贷款期限：<span className="font-medium">{scheme.loanTermValue}{scheme.loanTermUnit === 'year' ? '年' : '个月'}</span></p>
                        <p>年利率：<span className="font-medium">
                          {scheme.isCombinedLoan ? 
                            `公积金${scheme.fundRate}% / 商业${scheme.commercialRate}%` : 
                            `${scheme.interestRate}%`}
                        </span></p>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {scheme.selectedTypes.map(type => {
                          const config = repaymentTypeConfigs.find(c => c.value === type);
                          return (
                            <Badge key={type} style={{ backgroundColor: config?.color }} className="text-white text-xs">
                              {config?.label}
                            </Badge>
                          );
                        })}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => loadScheme(scheme)}>
                          加载
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteScheme(scheme.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 方案对比分析 */}
              {comparisonSchemes.length >= 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GitCompare className="h-5 w-5" />
                      方案对比分析 ({comparisonSchemes.length}个方案)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const selectedSchemes = schemes.filter(s => comparisonSchemes.includes(s.id));
                      
                      return (
                        <div className="space-y-6">
                          {/* 对比表格 */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-accent">
                                <tr>
                                  <th className="p-3 text-left">对比项</th>
                                  {selectedSchemes.map(s => (
                                    <th key={s.id} className="p-3 text-center">{s.name}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b">
                                  <td className="p-3 font-medium">贷款金额</td>
                                  {selectedSchemes.map(s => (
                                    <td key={s.id} className="p-3 text-center">
                                      {s.isCombinedLoan ? 
                                        `${(parseFloat(s.fundAmount) + parseFloat(s.commercialAmount)).toFixed(0)}万` : 
                                        `${s.loanAmount}万`}
                                    </td>
                                  ))}
                                </tr>
                                <tr className="border-b">
                                  <td className="p-3 font-medium">贷款期限</td>
                                  {selectedSchemes.map(s => (
                                    <td key={s.id} className="p-3 text-center">{s.loanTermValue}{s.loanTermUnit === 'year' ? '年' : '个月'}</td>
                                  ))}
                                </tr>
                                <tr className="border-b">
                                  <td className="p-3 font-medium">年利率</td>
                                  {selectedSchemes.map(s => (
                                    <td key={s.id} className="p-3 text-center">
                                      {s.isCombinedLoan ? 
                                        `${((parseFloat(s.fundRate) * parseFloat(s.fundAmount) + parseFloat(s.commercialRate) * parseFloat(s.commercialAmount)) / (parseFloat(s.fundAmount) + parseFloat(s.commercialAmount))).toFixed(2)}%` : 
                                        `${s.interestRate}%`}
                                    </td>
                                  ))}
                                </tr>
                                {selectedSchemes[0]?.results.map((result, idx) => (
                                  <tr key={idx} className="border-b bg-primary/5">
                                    <td colSpan={selectedSchemes.length + 1} className="p-2 font-medium text-primary">
                                      {result.label}
                                    </td>
                                  </tr>
                                ))}
                                {selectedSchemes[0]?.results.map((_, resultIdx) => (
                                  <>
                                    <tr key={`payment-${resultIdx}`} className="border-b">
                                      <td className="p-3 pl-6">每月还款</td>
                                      {selectedSchemes.map(s => (
                                        <td key={s.id} className="p-3 text-center font-semibold">
                                          ¥{s.results[resultIdx]?.monthlyPayment.toFixed(2)}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr key={`interest-${resultIdx}`} className="border-b">
                                      <td className="p-3 pl-6">总利息</td>
                                      {selectedSchemes.map(s => (
                                        <td key={s.id} className="p-3 text-center">
                                          ¥{(s.results[resultIdx]?.totalInterest / 10000).toFixed(2)}万
                                        </td>
                                      ))}
                                    </tr>
                                  </>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* 对比图表 */}
                          <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={selectedSchemes.map(s => ({
                                name: s.name,
                                ...s.results.reduce((acc, result, idx) => ({
                                  ...acc,
                                  [`interest${idx}`]: result.totalInterest / 10000
                                }), {})
                              }))}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(v) => `¥${v}万`} />
                                <Tooltip formatter={(v: number) => `¥${v.toFixed(2)}万`} />
                                <Legend />
                                {selectedSchemes[0]?.results.map((result, idx) => (
                                  <Bar 
                                    key={idx}
                                    dataKey={`interest${idx}`} 
                                    name={result.label} 
                                    fill={repaymentTypeConfigs.find(c => c.value === result.type)?.color} 
                                  />
                                ))}
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
