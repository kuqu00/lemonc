import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Phone,
  Building2,
  User,
  Users,
  FileText,
  Calendar,
  MessageSquare,
  DollarSign,
  AlertCircle,
  ChevronRight,
  X,
  Save,
  History,
  Mail,
  Hash,
  Star,
  Download,
  Upload,
  Filter,
  Clock,
  TrendingUp,
  Shield,
  PhoneCall,
  MoreVertical,
  ChevronDown,
  ChevronLeft,
  Info,
  Copy,
  CheckCircle2,
  MapPin,
  CreditCard,
  Briefcase,
  GraduationCap,
  Heart,
  CalendarDays,
  UserCircle,
  Building,
  Landmark,
  Factory,
  Store,
  Wallet,
  Recycle
} from 'lucide-react';
import { useRecycleStore, createRecycleItem } from '@/store/recycle';
import { RecycleBinDialog } from './RecycleBinDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { db } from '@/db';
import { useAppStore } from '@/store';
import type { Customer, FollowUpRecord, Contract, CustomerType, FollowUpType, LoanClassify, ContractStatus } from '@/types';
import { format, isPast, addDays, differenceInDays, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

// 客户类型配置
const customerTypes: { value: CustomerType; label: string; color: string }[] = [
  { value: 'personal', label: '个人客户', color: 'bg-blue-500' },
  { value: 'enterprise', label: '企业客户', color: 'bg-purple-500' }
];

// 跟进类型配置
const followUpTypes: { value: FollowUpType; label: string; icon: any }[] = [
  { value: 'phone', label: '电话', icon: Phone },
  { value: 'visit', label: '拜访', icon: User },
  { value: 'sms', label: '短信', icon: MessageSquare },
  { value: 'other', label: '其他', icon: FileText }
];

// 五级分类配置
const loanClassifies: { value: LoanClassify; label: string; color: string }[] = [
  { value: 'normal', label: '正常', color: 'bg-green-500' },
  { value: 'special', label: '关注', color: 'bg-yellow-500' },
  { value: 'subprime', label: '次级', color: 'bg-orange-500' },
  { value: 'doubtful', label: '可疑', color: 'bg-red-500' },
  { value: 'loss', label: '损失', color: 'bg-red-600' }
];

// 合同状态配置
const contractStatuses: { value: ContractStatus; label: string; color: string }[] = [
  { value: 'normal', label: '正常', color: 'bg-green-500' },
  { value: 'litigation', label: '诉讼', color: 'bg-red-500' },
  { value: 'execution', label: '执行', color: 'bg-red-600' }
];

// 客户价值等级配置
const valueLevels: { value: 'A' | 'B' | 'C' | 'D'; label: string; color: string }[] = [
  { value: 'A', label: 'A级-高价值', color: 'text-red-500' },
  { value: 'B', label: 'B级-中价值', color: 'text-orange-500' },
  { value: 'C', label: 'C级-一般', color: 'text-yellow-500' },
  { value: 'D', label: 'D级-潜力', color: 'text-blue-500' }
];

// 优先级配置
const priorities: { value: 'high' | 'medium' | 'low'; label: string; color: string }[] = [
  { value: 'high', label: '高优先级', color: 'bg-red-500' },
  { value: 'medium', label: '中优先级', color: 'bg-yellow-500' },
  { value: 'low', label: '低优先级', color: 'bg-green-500' }
];

// 风险等级配置
const riskLevels: { value: 'low' | 'medium' | 'high'; label: string; color: string }[] = [
  { value: 'low', label: '低风险', color: 'bg-green-500' },
  { value: 'medium', label: '中风险', color: 'bg-yellow-500' },
  { value: 'high', label: '高风险', color: 'bg-red-500' }
];

// 预设标签
const presetTags = [
  { name: 'VIP客户', color: 'bg-red-500' },
  { name: '老客户', color: 'bg-blue-500' },
  { name: '新客户', color: 'bg-green-500' },
  { name: '潜在客户', color: 'bg-yellow-500' },
  { name: '高价值', color: 'bg-purple-500' },
  { name: '重点跟进', color: 'bg-orange-500' }
];

// 脱敏手机号
const maskPhone = (phone: string) => {
  if (phone.length !== 11) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(7);
};

// 获取标签颜色
const getTagColor = (tag: string) => {
  const preset = presetTags.find(t => t.name === tag);
  return preset?.color || 'bg-gray-500';
};

// 格式化金额
const formatAmount = (amount: number) => {
  if (amount >= 10000) {
    return `¥${(amount / 10000).toFixed(2)}万`;
  }
  return `¥${amount.toLocaleString()}`;
};

export function CustomerManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<CustomerType | ''>('');
  const [filterValueLevel, setFilterValueLevel] = useState<'A' | 'B' | 'C' | 'D' | ''>('');
  const [filterRiskLevel, setFilterRiskLevel] = useState<'low' | 'medium' | 'high' | ''>('');
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // 客户表单
  const [formType, setFormType] = useState<CustomerType>('personal');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formIdCardLast4, setFormIdCardLast4] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formAddressDetail, setFormAddressDetail] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formWechat, setFormWechat] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formRemark, setFormRemark] = useState('');
  const [formValueLevel, setFormValueLevel] = useState<'A' | 'B' | 'C' | 'D' | ''>('');
  const [formPriority, setFormPriority] = useState<'high' | 'medium' | 'low' | ''>('');
  const [formRiskLevel, setFormRiskLevel] = useState<'low' | 'medium' | 'high' | ''>('');
  const [formSource, setFormSource] = useState('');
  const [formCreditRating, setFormCreditRating] = useState('');

  // 个人客户专属字段
  const [formGender, setFormGender] = useState<'male' | 'female' | ''>('');
  const [formBirthday, setFormBirthday] = useState('');
  const [formMaritalStatus, setFormMaritalStatus] = useState<'single' | 'married' | 'divorced' | ''>('');
  const [formEducation, setFormEducation] = useState('');
  const [formOccupation, setFormOccupation] = useState('');

  // 企业客户专属字段
  const [formLegalPerson, setFormLegalPerson] = useState('');
  const [formRegisterCapital, setFormRegisterCapital] = useState('');
  const [formEstablishDate, setFormEstablishDate] = useState('');
  const [formIndustry, setFormIndustry] = useState('');
  const [formBusinessScope, setFormBusinessScope] = useState('');

  const [tagInput, setTagInput] = useState('');

  // 跟进记录
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [followUpType, setFollowUpType] = useState<FollowUpType>('phone');
  const [followUpContent, setFollowUpContent] = useState('');
  const [followUpNextDate, setFollowUpNextDate] = useState('');

  // 合同信息
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  // 合同表单
  const [contractCode, setContractCode] = useState('');
  const [contractAmount, setContractAmount] = useState('');
  const [contractTerm, setContractTerm] = useState('');
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [contractProduct, setContractProduct] = useState('');
  const [contractPurpose, setContractPurpose] = useState('');
  const [contractClassify, setContractClassify] = useState<LoanClassify>('normal');
  const [contractGuarantee, setContractGuarantee] = useState('');
  const [contractStatus, setContractStatus] = useState<ContractStatus>('normal');
  const [contractLitigationDetail, setContractLitigationDetail] = useState('');
  const [contractLawyer, setContractLawyer] = useState('');
  const [contractCourt, setContractCourt] = useState('');
  const [contractCaseNo, setContractCaseNo] = useState('');
  const [contractRemark, setContractRemark] = useState('');

  // 导入导出
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  const { addNotification } = useAppStore();
  const { addToRecycleBin } = useRecycleStore();

  // 加载客户数据
  const loadCustomers = useCallback(async () => {
    let data = await db.getActiveCustomers();

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        c.company?.toLowerCase().includes(query) ||
        c.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    // 类型过滤
    if (filterType) {
      data = data.filter(c => c.type === filterType);
    }

    // 价值等级过滤
    if (filterValueLevel) {
      data = data.filter(c => c.valueLevel === filterValueLevel);
    }

    // 风险等级过滤
    if (filterRiskLevel) {
      data = data.filter(c => c.riskLevel === filterRiskLevel);
    }

    data.sort((a, b) => b.updateTime - a.updateTime);
    setCustomers(data);
    setFilteredCustomers(data);
  }, [searchQuery, filterType, filterValueLevel, filterRiskLevel]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // 加载客户详情
  const loadCustomerDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
    const [followUpsData, contractsData] = await Promise.all([
      db.getCustomerFollowUps(customer.id),
      db.getCustomerContracts(customer.id)
    ]);
    setFollowUps(followUpsData);
    setContracts(contractsData);
  };

  // 获取客户统计数据
  const getCustomerStats = (customer: Customer) => {
    const customerFollowUps = followUps.filter(fu => fu.customerId === customer.id);
    const customerContracts = contracts.filter(c => c.customerId === customer.id);

    const totalAmount = customerContracts.reduce((sum, c) => sum + c.amount, 0);
    const lastFollowUp = customerFollowUps.length > 0 ? customerFollowUps[0].time : null;
    const expiringContracts = customerContracts.filter(c => c.endDate && isPast(addDays(c.endDate, -30)));

    return {
      followUpCount: customerFollowUps.length,
      contractCount: customerContracts.length,
      totalAmount,
      lastFollowUp,
      expiringCount: expiringContracts.length,
      classifySummary: {
        normal: customerContracts.filter(c => c.classify === 'normal').length,
        special: customerContracts.filter(c => c.classify === 'special').length,
        subprime: customerContracts.filter(c => c.classify === 'subprime').length,
        doubtful: customerContracts.filter(c => c.classify === 'doubtful').length,
        loss: customerContracts.filter(c => c.classify === 'loss').length
      }
    };
  };

  // 打开新建客户
  const handleOpenCreate = () => {
    setEditingCustomer(null);
    resetForm();
    setShowCustomerDialog(true);
  };

  // 重置表单
  const resetForm = () => {
    setFormType('personal');
    setFormName('');
    setFormPhone('');
    setFormCompany('');
    setFormIdCardLast4('');
    setFormAddress('');
    setFormAddressDetail('');
    setFormEmail('');
    setFormWechat('');
    setFormTags([]);
    setFormRemark('');
    setFormValueLevel('');
    setFormPriority('');
    setFormRiskLevel('');
    setFormSource('');
    setFormCreditRating('');

    // 个人客户字段
    setFormGender('');
    setFormBirthday('');
    setFormMaritalStatus('');
    setFormEducation('');
    setFormOccupation('');

    // 企业客户字段
    setFormLegalPerson('');
    setFormRegisterCapital('');
    setFormEstablishDate('');
    setFormIndustry('');
    setFormBusinessScope('');

    setTagInput('');
  };

  // 打开编辑客户
  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormType(customer.type);
    setFormName(customer.name);
    setFormPhone(customer.phone);
    setFormCompany(customer.company || '');
    setFormIdCardLast4(customer.idCardLast4 || '');
    setFormAddress(customer.address || '');
    setFormAddressDetail(customer.addressDetail || '');
    setFormEmail(customer.email || '');
    setFormWechat(customer.wechat || '');
    setFormTags(customer.tags);
    setFormRemark(customer.remark || '');
    setFormValueLevel(customer.valueLevel || '');
    setFormPriority(customer.priority || '');
    setFormRiskLevel(customer.riskLevel || '');
    setFormSource(customer.source || '');
    setFormCreditRating(customer.creditRating || '');

    // 个人客户字段
    setFormGender(customer.gender || '');
    setFormBirthday(customer.birthday ? format(customer.birthday, 'yyyy-MM-dd') : '');
    setFormMaritalStatus(customer.maritalStatus || '');
    setFormEducation(customer.education || '');
    setFormOccupation(customer.occupation || '');

    // 企业客户字段
    setFormLegalPerson(customer.legalPerson || '');
    setFormRegisterCapital(customer.registerCapital || '');
    setFormEstablishDate(customer.establishDate ? format(customer.establishDate, 'yyyy-MM-dd') : '');
    setFormIndustry(customer.industry || '');
    setFormBusinessScope(customer.businessScope || '');

    setShowCustomerDialog(true);
  };

  // 保存客户
  const handleSaveCustomer = async () => {
    if (!formName.trim() || !formPhone.trim()) {
      await addNotification({
        title: '验证失败',
        message: '请填写客户姓名和电话',
        type: 'error'
      });
      return;
    }

    try {
      const customerData = {
        type: formType,
        name: formName.trim(),
        phone: formPhone.trim(),
        company: formCompany.trim() || undefined,
        idCardLast4: formIdCardLast4.trim() || undefined,
        address: formAddress.trim() || undefined,
        addressDetail: formAddressDetail.trim() || undefined,
        email: formEmail.trim() || undefined,
        wechat: formWechat.trim() || undefined,
        tags: formTags,
        remark: formRemark.trim() || undefined,
        valueLevel: formValueLevel || undefined,
        priority: formPriority || undefined,
        riskLevel: formRiskLevel || undefined,
        source: formSource.trim() || undefined,
        creditRating: formCreditRating.trim() || undefined,
        updateTime: Date.now(),

        // 个人客户字段
        gender: formType === 'personal' ? (formGender || undefined) : undefined,
        birthday: formType === 'personal' && formBirthday ? new Date(formBirthday).getTime() : undefined,
        maritalStatus: formType === 'personal' ? (formMaritalStatus || undefined) : undefined,
        education: formType === 'personal' ? (formEducation.trim() || undefined) : undefined,
        occupation: formType === 'personal' ? (formOccupation.trim() || undefined) : undefined,

        // 企业客户字段
        legalPerson: formType === 'enterprise' ? (formLegalPerson.trim() || undefined) : undefined,
        registerCapital: formType === 'enterprise' ? (formRegisterCapital.trim() || undefined) : undefined,
        establishDate: formType === 'enterprise' && formEstablishDate ? new Date(formEstablishDate).getTime() : undefined,
        industry: formType === 'enterprise' ? (formIndustry.trim() || undefined) : undefined,
        businessScope: formType === 'enterprise' ? (formBusinessScope.trim() || undefined) : undefined
      };

      if (editingCustomer) {
        await db.customers.update(editingCustomer.id, customerData);
        await addNotification({ title: '更新成功', message: '客户信息已更新', type: 'success' });
      } else {
        const code = await db.generateCustomerCode();
        const newCustomer: Customer = {
          id: `customer-${Date.now()}`,
          ...customerData,
          code,
          createTime: Date.now(),
          isDeleted: false
        };
        await db.customers.add(newCustomer);
        await addNotification({ title: '创建成功', message: '新客户已添加', type: 'success' });
      }

      setShowCustomerDialog(false);
      await loadCustomers();
    } catch (error) {
      console.error('Save customer error:', error);
      await addNotification({ title: '保存失败', message: '请重试', type: 'error' });
    }
  };

  // 删除客户
  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('确定要删除这位客户吗？相关跟进记录和合同信息也将被删除。')) return;

    try {
      // 获取客户完整信息用于回收站
      const customerToDelete = customers.find(c => c.id === customerId);
      if (customerToDelete) {
        // 获取关联的跟进记录和合同
        const [customerFollowUps, customerContracts] = await Promise.all([
          db.getCustomerFollowUps(customerId),
          db.getCustomerContracts(customerId)
        ]);

        // 创建回收站项目
        const recycleItem = createRecycleItem(
          'customer',
          {
            ...customerToDelete,
            followUps: customerFollowUps,
            contracts: customerContracts
          },
          customerToDelete.name,
          `客户类型: ${customerToDelete.type === 'personal' ? '个人' : '企业'} | 电话: ${customerToDelete.phone}`,
          'currentUser'
        );
        addToRecycleBin(recycleItem);
      }

      await db.softDeleteCustomer(customerId);
      await db.followUpRecords.where('customerId').equals(customerId).delete();
      await db.contracts.where('customerId').equals(customerId).delete();
      await loadCustomers();
      await addNotification({ title: '删除成功', message: '客户已移至回收站，可在30天内恢复', type: 'success' });
    } catch (error) {
      console.error('Delete customer error:', error);
      await addNotification({ title: '删除失败', message: '请重试', type: 'error' });
    }
  };

  // 添加标签
  const handleAddTag = () => {
    if (tagInput.trim() && !formTags.includes(tagInput.trim()) && formTags.length < 10) {
      setFormTags([...formTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // 移除标签
  const handleRemoveTag = (tag: string) => {
    setFormTags(formTags.filter(t => t !== tag));
  };

  // 添加预设标签
  const handleAddPresetTag = (tag: string) => {
    if (!formTags.includes(tag) && formTags.length < 10) {
      setFormTags([...formTags, tag]);
    }
  };

  // 保存跟进记录
  const handleSaveFollowUp = async () => {
    if (!followUpContent.trim() || !selectedCustomer) return;

    const newFollowUp: FollowUpRecord = {
      id: `followup-${Date.now()}`,
      customerId: selectedCustomer.id,
      time: Date.now(),
      type: followUpType,
      content: followUpContent.trim(),
      nextFollowDate: followUpNextDate ? new Date(followUpNextDate).getTime() : undefined,
      createTime: Date.now()
    };

    await db.followUpRecords.add(newFollowUp);

    // 更新客户最后跟进时间
    await db.customers.update(selectedCustomer.id, {
      lastContactDate: Date.now(),
      followUpCount: (selectedCustomer.followUpCount || 0) + 1
    });

    // 如果有下次跟进时间，创建待办
    if (followUpNextDate) {
      const todo = {
        id: `todo-${Date.now()}`,
        title: `跟进客户：${selectedCustomer.name}`,
        description: followUpContent.trim(),
        priority: 'not-urgent-important' as const,
        status: 'pending' as const,
        dueDate: new Date(followUpNextDate).getTime(),
        subSteps: [],
        relatedCustomerId: selectedCustomer.id,
        progress: 0,
        createTime: Date.now(),
        updateTime: Date.now(),
        isDeleted: false
      };
      await db.todos.add(todo);
    }

    await loadCustomerDetail(selectedCustomer);
    setShowFollowUpDialog(false);
    setFollowUpContent('');
    setFollowUpNextDate('');
    await addNotification({ title: '保存成功', message: '跟进记录已保存', type: 'success' });
  };

  // 保存合同
  const handleSaveContract = async () => {
    if (!selectedCustomer) return;

    try {
      const contractData: Partial<Contract> = {
        customerId: selectedCustomer.id,
        code: contractCode.trim(),
        amount: parseFloat(contractAmount) * 10000,
        term: parseInt(contractTerm),
        startDate: contractStartDate ? new Date(contractStartDate).getTime() : Date.now(),
        endDate: contractEndDate ? new Date(contractEndDate).getTime() : undefined,
        product: contractProduct.trim(),
        purpose: contractPurpose.trim() || undefined,
        classify: contractClassify,
        guarantee: contractGuarantee.trim() || undefined,
        status: contractStatus,
        litigationDetail: contractLitigationDetail.trim() || undefined,
        lawyer: contractLawyer.trim() || undefined,
        court: contractCourt.trim() || undefined,
        caseNo: contractCaseNo.trim() || undefined,
        remark: contractRemark.trim() || undefined,
        updateTime: Date.now()
      };

      if (editingContract) {
        await db.contracts.update(editingContract.id, contractData);
      } else {
        await db.contracts.add({
          id: `contract-${Date.now()}`,
          ...contractData,
          createTime: Date.now()
        } as Contract);
      }

      await loadCustomerDetail(selectedCustomer);
      setShowContractDialog(false);
      await addNotification({ title: '保存成功', message: '合同信息已保存', type: 'success' });
    } catch (error) {
      console.error('Save contract error:', error);
      await addNotification({ title: '保存失败', message: '请重试', type: 'error' });
    }
  };

  // 打开合同对话框
  const handleOpenContractDialog = (contract?: Contract) => {
    if (contract) {
      setEditingContract(contract);
      setContractCode(contract.code);
      setContractAmount((contract.amount / 10000).toFixed(2));
      setContractTerm(contract.term.toString());
      setContractStartDate(contract.startDate ? format(contract.startDate, 'yyyy-MM-dd') : '');
      setContractEndDate(contract.endDate ? format(contract.endDate, 'yyyy-MM-dd') : '');
      setContractProduct(contract.product);
      setContractPurpose(contract.purpose || '');
      setContractClassify(contract.classify);
      setContractGuarantee(contract.guarantee || '');
      setContractStatus(contract.status);
      setContractLitigationDetail(contract.litigationDetail || '');
      setContractLawyer(contract.lawyer || '');
      setContractCourt(contract.court || '');
      setContractCaseNo(contract.caseNo || '');
      setContractRemark(contract.remark || '');
    } else {
      setEditingContract(null);
      setContractCode('');
      setContractAmount('');
      setContractTerm('');
      setContractStartDate('');
      setContractEndDate('');
      setContractProduct('');
      setContractPurpose('');
      setContractClassify('normal');
      setContractGuarantee('');
      setContractStatus('normal');
      setContractLitigationDetail('');
      setContractLawyer('');
      setContractCourt('');
      setContractCaseNo('');
      setContractRemark('');
    }
    setShowContractDialog(true);
  };

  // 导出单个客户
  const handleExportCustomer = async (customer: Customer) => {
    try {
      const stats = getCustomerStats(customer);
      const data = {
        '客户编号': customer.code,
        '客户类型': customer.type === 'personal' ? '个人' : '企业',
        '客户姓名': customer.name,
        '电话': customer.phone,
        '公司': customer.company || '',
        '邮箱': customer.email || '',
        '微信号': customer.wechat || '',
        '地址': customer.address || '',
        '详细地址': customer.addressDetail || '',
        '价值等级': customer.valueLevel || '',
        '优先级': customer.priority || '',
        '风险等级': customer.riskLevel || '',
        '客户来源': customer.source || '',
        '信用评级': customer.creditRating || '',
        '跟进次数': stats.followUpCount,
        '合同数量': stats.contractCount,
        '贷款总额': formatAmount(stats.totalAmount),
        '标签': customer.tags.join(', '),
        '备注': customer.remark || '',
        '创建时间': format(customer.createTime, 'yyyy-MM-dd HH:mm:ss'),
        '更新时间': format(customer.updateTime, 'yyyy-MM-dd HH:mm:ss')
      };

      const headers = Object.keys(data).join(',');
      const row = Object.values(data).map(v => `"${v}"`).join(',');
      const csv = `\uFEFF${headers}\n${row}`;

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `客户档案_${customer.name}_${customer.code}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      await addNotification({
        title: '导出成功',
        message: `客户 ${customer.name} 档案已导出`,
        type: 'success'
      });
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // 导出客户数据
  const handleExportCustomers = async () => {
    try {
      const data = filteredCustomers.map(c => {
        const stats = getCustomerStats(c);
        return {
          '客户编号': c.code,
          '客户类型': c.type === 'personal' ? '个人' : '企业',
          '客户姓名': c.name,
          '电话': c.phone,
          '公司': c.company || '',
          '邮箱': c.email || '',
          '微信号': c.wechat || '',
          '地址': c.address || '',
          '价值等级': c.valueLevel || '',
          '优先级': c.priority || '',
          '风险等级': c.riskLevel || '',
          '跟进次数': stats.followUpCount,
          '合同数量': stats.contractCount,
          '贷款总额': formatAmount(stats.totalAmount),
          '标签': c.tags.join(', '),
          '备注': c.remark || '',
          '创建时间': format(c.createTime, 'yyyy-MM-dd HH:mm:ss'),
          '更新时间': format(c.updateTime, 'yyyy-MM-dd HH:mm:ss')
        };
      });

      const headers = Object.keys(data[0] || {}).join(',');
      const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
      const csv = `\uFEFF${headers}\n${rows}`;

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `客户档案_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      await addNotification({
        title: '导出成功',
        message: `已导出 ${data.length} 条客户记录`,
        type: 'success'
      });
    } catch (error) {
      console.error('Export error:', error);
      await addNotification({
        title: '导出失败',
        message: '请重试',
        type: 'error'
      });
    }
  };

  // 导入客户数据
  const handleImportCustomers = async () => {
    if (!importFile) return;

    try {
      const text = await importFile.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const row: any = {};

        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });

        try {
          const code = await db.generateCustomerCode();
          const newCustomer: Customer = {
            id: `customer-${Date.now()}-${i}`,
            type: row['客户类型'] === '企业' ? 'enterprise' : 'personal',
            name: row['客户姓名'] || '',
            code,
            phone: row['电话'] || '',
            company: row['公司'] || undefined,
            email: row['邮箱'] || undefined,
            address: row['地址'] || undefined,
            tags: row['标签'] ? row['标签'].split(',').map((t: string) => t.trim()) : [],
            remark: row['备注'] || undefined,
            valueLevel: row['价值等级'] || undefined,
            priority: row['优先级'] || undefined,
            riskLevel: row['风险等级'] || undefined,
            createTime: Date.now(),
            updateTime: Date.now(),
            isDeleted: false
          };

          await db.customers.add(newCustomer);
          successCount++;
        } catch (error) {
          console.error('Import row error:', error);
          errorCount++;
        }
      }

      await loadCustomers();
      setShowImportDialog(false);
      setImportFile(null);

      await addNotification({
        title: '导入完成',
        message: `成功导入 ${successCount} 条，失败 ${errorCount} 条`,
        type: 'success'
      });
    } catch (error) {
      console.error('Import error:', error);
      await addNotification({
        title: '导入失败',
        message: '请检查文件格式',
        type: 'error'
      });
    }
  };

  // 快速操作 - 拨打电话
  const handleCallPhone = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  // 快速操作 - 发送短信
  const handleSendSms = (phone: string) => {
    window.open(`sms:${phone}`, '_self');
  };

  // 渲染客户卡片
  const renderCustomerCard = (customer: Customer) => {
    const stats = getCustomerStats(customer);
    const lastFollowUpDays = stats.lastFollowUp
      ? Math.floor((Date.now() - stats.lastFollowUp) / (1000 * 60 * 60 * 24))
      : null;

    const isNewCustomer = Date.now() - customer.createTime < 7 * 24 * 60 * 60 * 1000;
    const needsAttention = lastFollowUpDays !== null && lastFollowUpDays > 7;
    const isInactive = lastFollowUpDays !== null && lastFollowUpDays > 30;

    return (
      <Card
        key={customer.id}
        className="overflow-hidden transition-all duration-300 hover:shadow-xl border-l-4 group"
        style={{ 
          borderLeftColor: customer.valueLevel === 'A' ? '#ef4444' : 
                          customer.valueLevel === 'B' ? '#f97316' : 
                          customer.valueLevel === 'C' ? '#eab308' : '#9ca3af'
        }}
      >
        <div
          className="cursor-pointer"
          onClick={() => { loadCustomerDetail(customer); setShowDetailDialog(true); }}
        >
          {/* 卡片头部 - 渐变色背景 */}
          <div className={`p-4 ${customer.type === 'personal' 
            ? 'bg-gradient-to-r from-blue-50/50 to-transparent' 
            : 'bg-gradient-to-r from-purple-50/50 to-transparent'}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {/* 头像区域 */}
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md ${
                  customer.type === 'personal' 
                    ? 'bg-gradient-to-br from-blue-400 to-blue-600' 
                    : 'bg-gradient-to-br from-purple-400 to-purple-600'
                }`}>
                  {customer.type === 'personal' ? (
                    <User className="h-7 w-7 text-white" />
                  ) : (
                    <Building2 className="h-7 w-7 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-lg">{customer.name}</h3>
                    {/* 状态标识 */}
                    {isNewCustomer && (
                      <Badge className="bg-green-500 text-white text-xs">
                        新客户
                      </Badge>
                    )}
                    {needsAttention && !isInactive && (
                      <Badge className="bg-orange-500 text-white text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        需跟进
                      </Badge>
                    )}
                    {isInactive && (
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        休眠
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-[10px] h-5">
                      {customer.type === 'personal' ? '个人' : '企业'}
                    </Badge>
                    {customer.valueLevel && (
                      <Badge className={`text-[10px] h-5 ${valueLevels.find(v => v.value === customer.valueLevel)?.color.replace('text-', 'bg-').replace('500', '100')} ${valueLevels.find(v => v.value === customer.valueLevel)?.color}`}>
                        {customer.valueLevel}级
                      </Badge>
                    )}
                    {customer.priority && (
                      <Badge className={`text-[10px] h-5 ${priorities.find(p => p.value === customer.priority)?.color} text-white`}>
                        {priorities.find(p => p.value === customer.priority)?.label}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 快捷操作 - 悬停显示 */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600"
                  onClick={() => handleCallPhone(customer.phone)}
                  title="拨打电话"
                >
                  <PhoneCall className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 hover:bg-green-100 hover:text-green-600"
                  onClick={() => handleSendSms(customer.phone)}
                  title="发送短信"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 hover:bg-orange-100 hover:text-orange-600"
                  onClick={() => handleOpenEdit(customer)}
                  title="编辑客户"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 hover:bg-red-100 hover:text-red-600"
                  onClick={() => handleDeleteCustomer(customer.id)}
                  title="删除客户"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 联系信息 */}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 bg-background/80 px-2 py-1 rounded">
                <Hash className="h-3.5 w-3.5" />
                {customer.code}
              </span>
              <span className="flex items-center gap-1.5 bg-background/80 px-2 py-1 rounded">
                <Phone className="h-3.5 w-3.5" />
                {maskPhone(customer.phone)}
              </span>
              {customer.company && (
                <span className="flex items-center gap-1.5 bg-background/80 px-2 py-1 rounded truncate max-w-[150px]">
                  <Building2 className="h-3.5 w-3.5" />
                  {customer.company}
                </span>
              )}
            </div>
          </div>

          {/* 业务统计信息 - 大数字展示 */}
          <div className="grid grid-cols-4 gap-px bg-border">
            <div className="bg-accent/20 p-3 text-center hover:bg-accent/30 transition-colors">
              <p className="text-xs text-muted-foreground mb-1">贷款总额</p>
              <p className="text-lg font-bold text-green-600">{formatAmount(stats.totalAmount)}</p>
            </div>
            <div className="bg-accent/20 p-3 text-center hover:bg-accent/30 transition-colors">
              <p className="text-xs text-muted-foreground mb-1">合同数量</p>
              <p className="text-lg font-bold text-blue-600">{stats.contractCount} <span className="text-xs font-normal">份</span></p>
            </div>
            <div className="bg-accent/20 p-3 text-center hover:bg-accent/30 transition-colors">
              <p className="text-xs text-muted-foreground mb-1">跟进次数</p>
              <p className="text-lg font-bold text-orange-600">{stats.followUpCount} <span className="text-xs font-normal">次</span></p>
            </div>
            <div className="bg-accent/20 p-3 text-center hover:bg-accent/30 transition-colors">
              <p className="text-xs text-muted-foreground mb-1">最后跟进</p>
              <p className={`text-sm font-semibold ${needsAttention ? 'text-red-500' : 'text-muted-foreground'}`}>
                {lastFollowUpDays !== null ? `${lastFollowUpDays}天前` : '从未'}
              </p>
            </div>
          </div>

          {/* 标签区域 */}
          {customer.tags.length > 0 && (
            <div className="px-4 py-2 bg-muted/30 flex flex-wrap gap-1.5">
              {customer.tags.map((tag, idx) => (
                <Badge 
                  key={idx} 
                  className={`text-[10px] cursor-pointer hover:opacity-80 ${getTagColor(tag)} text-white`}
                  onClick={(e) => { e.stopPropagation(); }}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索客户姓名、编号、电话..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}>
            <Filter className="h-4 w-4 mr-1" />
            筛选
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowRecycleBin(true)}>
            <Recycle className="h-4 w-4 mr-1" />
            回收站
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4 mr-1" />
            导入
          </Button>
          <Button variant="outline" onClick={handleExportCustomers} disabled={filteredCustomers.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1" />
            添加客户
          </Button>
        </div>
      </div>

      {/* 高级筛选 */}
      {showAdvancedSearch && (
        <Card className="mb-4 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>客户类型</Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as CustomerType | '')}>
                <SelectTrigger>
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部类型</SelectItem>
                  {customerTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>价值等级</Label>
              <Select value={filterValueLevel} onValueChange={(v) => setFilterValueLevel(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="全部等级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部等级</SelectItem>
                  {valueLevels.map(v => (
                    <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>风险等级</Label>
              <Select value={filterRiskLevel} onValueChange={(v) => setFilterRiskLevel(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="全部风险" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部风险</SelectItem>
                  {riskLevels.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={() => {
                setFilterType('');
                setFilterValueLevel('');
                setFilterRiskLevel('');
              }}>
                重置筛选
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 客户列表 */}
      <ScrollArea className="flex-1">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">暂无客户</p>
            <p className="text-sm mb-4">点击上方"添加客户"按钮开始创建</p>
            <Button variant="outline" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-1" />
              添加客户
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCustomers.map(renderCustomerCard)}
          </div>
        )}
      </ScrollArea>

      {/* 客户编辑对话框 */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? '编辑客户' : '添加客户'}</DialogTitle>
            <DialogDescription>
              {editingCustomer ? '编辑客户基本信息和联系方式' : '填写客户信息创建新客户档案'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* 客户类型 */}
            <div className="space-y-2">
              <Label>
                客户类型
                {editingCustomer && <span className="text-xs text-muted-foreground font-normal ml-2">（编辑时不可修改）</span>}
              </Label>
              <div className="flex gap-2">
                {customerTypes.map(t => (
                  <button
                    key={t.value}
                    onClick={() => !editingCustomer && setFormType(t.value)}
                    disabled={!!editingCustomer}
                    className={cn(
                      'flex-1 p-4 rounded-lg border text-center transition-all duration-200',
                      formType === t.value
                        ? `border-2 ${t.color} ${t.color.replace('bg-', 'bg-opacity-10')} font-medium`
                        : 'hover:bg-accent',
                      editingCustomer && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className={cn('inline-flex p-2 rounded-lg mb-2', t.color)}>
                      {t.value === 'personal' ? <User className="h-5 w-5 text-white" /> : <Building2 className="h-5 w-5 text-white" />}
                    </div>
                    <div className="font-medium">{t.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">基本信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>姓名/企业名称 *</Label>
                    <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="请输入" />
                  </div>
                  <div className="space-y-2">
                    <Label>电话 *</Label>
                    <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="请输入" />
                  </div>
                  {formType === 'enterprise' && (
                    <>
                      <div className="space-y-2">
                        <Label>法人</Label>
                        <Input value={formLegalPerson} onChange={(e) => setFormLegalPerson(e.target.value)} placeholder="请输入" />
                      </div>
                      <div className="space-y-2">
                        <Label>注册资本</Label>
                        <Input value={formRegisterCapital} onChange={(e) => setFormRegisterCapital(e.target.value)} placeholder="请输入" />
                      </div>
                      <div className="space-y-2">
                        <Label>成立日期</Label>
                        <Input type="date" value={formEstablishDate} onChange={(e) => setFormEstablishDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>所属行业</Label>
                        <Input value={formIndustry} onChange={(e) => setFormIndustry(e.target.value)} placeholder="请输入" />
                      </div>
                      <div className="space-y-2">
                        <Label>经营范围</Label>
                        <Textarea value={formBusinessScope} onChange={(e) => setFormBusinessScope(e.target.value)} placeholder="请输入" rows={2} />
                      </div>
                    </>
                  )}
                  {formType === 'personal' && (
                    <>
                      <div className="space-y-2">
                        <Label>性别</Label>
                        <Select value={formGender} onValueChange={(v) => setFormGender(v as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">男</SelectItem>
                            <SelectItem value="female">女</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>身份证后四位</Label>
                        <Input value={formIdCardLast4} onChange={(e) => setFormIdCardLast4(e.target.value)} placeholder="请输入" maxLength={4} />
                      </div>
                      <div className="space-y-2">
                        <Label>生日</Label>
                        <Input type="date" value={formBirthday} onChange={(e) => setFormBirthday(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>婚姻状况</Label>
                        <Select value={formMaritalStatus} onValueChange={(v) => setFormMaritalStatus(v as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">未婚</SelectItem>
                            <SelectItem value="married">已婚</SelectItem>
                            <SelectItem value="divorced">离异</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>学历</Label>
                        <Input value={formEducation} onChange={(e) => setFormEducation(e.target.value)} placeholder="请输入" />
                      </div>
                      <div className="space-y-2">
                        <Label>职业</Label>
                        <Input value={formOccupation} onChange={(e) => setFormOccupation(e.target.value)} placeholder="请输入" />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 联系信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">联系信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>公司</Label>
                    <Input value={formCompany} onChange={(e) => setFormCompany(e.target.value)} placeholder="请输入" />
                  </div>
                  <div className="space-y-2">
                    <Label>邮箱</Label>
                    <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="请输入" />
                  </div>
                  <div className="space-y-2">
                    <Label>微信号</Label>
                    <Input value={formWechat} onChange={(e) => setFormWechat(e.target.value)} placeholder="请输入" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>地址</Label>
                    <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="请输入地址" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>详细地址</Label>
                    <Textarea value={formAddressDetail} onChange={(e) => setFormAddressDetail(e.target.value)} placeholder="请输入详细地址" rows={2} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 客户评估 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">客户评估</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>价值等级</Label>
                    <Select value={formValueLevel} onValueChange={(v) => setFormValueLevel(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择" />
                      </SelectTrigger>
                      <SelectContent>
                    {valueLevels.map(v => (
                      <SelectItem key={v.value} value={v.value.toString()}>{v.label}</SelectItem>
                    ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>优先级</Label>
                    <Select value={formPriority} onValueChange={(v) => setFormPriority(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择" />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map(p => (
                          <SelectItem key={p.value} value={p.value.toString()}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>风险等级</Label>
                    <Select value={formRiskLevel} onValueChange={(v) => setFormRiskLevel(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择" />
                      </SelectTrigger>
                      <SelectContent>
                        {riskLevels.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>客户来源</Label>
                    <Input value={formSource} onChange={(e) => setFormSource(e.target.value)} placeholder="如：朋友介绍、网络广告等" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>信用评级</Label>
                    <Input value={formCreditRating} onChange={(e) => setFormCreditRating(e.target.value)} placeholder="请输入" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 标签 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">标签</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>预设标签</Label>
                  <div className="flex flex-wrap gap-2">
                    {presetTags.map(tag => (
                      <button
                        key={tag.name}
                        onClick={() => handleAddPresetTag(tag.name)}
                        disabled={formTags.includes(tag.name)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm transition-all',
                          formTags.includes(tag.name)
                            ? `${tag.color} text-white cursor-not-allowed`
                            : `bg-gray-100 hover:bg-gray-200`
                        )}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>自定义标签</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
                      placeholder="输入标签按回车添加"
                      disabled={formTags.length >= 10}
                    />
                    <Button onClick={handleAddTag} disabled={formTags.length >= 10}>添加</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">最多可添加10个标签</p>
                  {formTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formTags.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1 cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                          {tag}
                          <X className="h-3 w-3" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 备注 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">备注</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea value={formRemark} onChange={(e) => setFormRemark(e.target.value)} placeholder="请输入备注信息" rows={4} />
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>取消</Button>
            <Button onClick={handleSaveCustomer}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 客户详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-[95vw] w-[1400px] max-h-[95vh] overflow-hidden p-0">
          {selectedCustomer && (
            <div className="flex h-[90vh]">
              {/* 左侧边栏 - 客户基本信息 */}
              <div className="w-[380px] flex-shrink-0 border-r bg-gradient-to-b from-muted/30 to-muted/10 overflow-auto">
                {/* 头部区域 - 渐变色背景 */}
                <div className={`p-6 text-center ${selectedCustomer.type === 'personal' 
                  ? 'bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-transparent' 
                  : 'bg-gradient-to-br from-purple-500/10 via-purple-400/5 to-transparent'}`}
                >
                  {/* 客户头像 */}
                  <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center shadow-lg mb-4 ${
                    selectedCustomer.type === 'personal' 
                      ? 'bg-gradient-to-br from-blue-400 to-blue-600' 
                      : 'bg-gradient-to-br from-purple-400 to-purple-600'
                  }`}>
                    {selectedCustomer.type === 'personal' ? (
                      <User className="h-12 w-12 text-white" />
                    ) : (
                      <Building2 className="h-12 w-12 text-white" />
                    )}
                  </div>
                  
                  {/* 客户名称和编号 */}
                  <h2 className="text-2xl font-bold mb-1">{selectedCustomer.name}</h2>
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    <span className="font-mono">{selectedCustomer.code}</span>
                  </div>
                  
                  {/* 客户等级和状态 */}
                  <div className="flex justify-center gap-2 mt-4 flex-wrap">
                    <Badge variant="outline" className="px-3 py-1">
                      {selectedCustomer.type === 'personal' ? '个人客户' : '企业客户'}
                    </Badge>
                    {selectedCustomer.valueLevel && (
                      <Badge className={`px-3 py-1 ${valueLevels.find(v => v.value === selectedCustomer.valueLevel)?.color.replace('text-', 'bg-').replace('500', '100')} ${valueLevels.find(v => v.value === selectedCustomer.valueLevel)?.color}`}>
                        <Star className="h-3 w-3 mr-1" />
                        {selectedCustomer.valueLevel}级价值
                      </Badge>
                    )}
                    {selectedCustomer.priority && (
                      <Badge className={`px-3 py-1 ${priorities.find(p => p.value === selectedCustomer.priority)?.color} text-white`}>
                        {priorities.find(p => p.value === selectedCustomer.priority)?.label}
                      </Badge>
                    )}
                    {selectedCustomer.riskLevel && (
                      <Badge variant="outline" className={`px-3 py-1 ${selectedCustomer.riskLevel === 'high' ? 'text-red-500 border-red-200' : selectedCustomer.riskLevel === 'medium' ? 'text-yellow-500 border-yellow-200' : 'text-green-500 border-green-200'}`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {riskLevels.find(r => r.value === selectedCustomer.riskLevel)?.label}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* 快捷操作 - 图标按钮 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">快捷操作</h3>
                    <div className="grid grid-cols-4 gap-2">
                      <Button 
                        variant="outline" 
                        className="flex flex-col items-center gap-1 h-auto py-3 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                        onClick={() => handleCallPhone(selectedCustomer.phone)}
                      >
                        <PhoneCall className="h-5 w-5" />
                        <span className="text-xs">电话</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex flex-col items-center gap-1 h-auto py-3 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                        onClick={() => handleSendSms(selectedCustomer.phone)}
                      >
                        <MessageSquare className="h-5 w-5" />
                        <span className="text-xs">短信</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex flex-col items-center gap-1 h-auto py-3 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                        onClick={() => setShowFollowUpDialog(true)}
                      >
                        <FileText className="h-5 w-5" />
                        <span className="text-xs">跟进</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex flex-col items-center gap-1 h-auto py-3 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200"
                        onClick={() => handleOpenContractDialog()}
                      >
                        <FileText className="h-5 w-5" />
                        <span className="text-xs">合同</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button 
                        variant="outline" 
                        className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-cyan-50 hover:text-cyan-600"
                        onClick={() => { navigator.clipboard.writeText(selectedCustomer.phone); }}
                      >
                        <Copy className="h-4 w-4" />
                        <span className="text-xs">复制电话</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-indigo-50 hover:text-indigo-600"
                        onClick={() => handleOpenEdit(selectedCustomer)}
                      >
                        <Edit2 className="h-4 w-4" />
                        <span className="text-xs">编辑</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleExportCustomer(selectedCustomer)}
                      >
                        <Download className="h-4 w-4" />
                        <span className="text-xs">导出</span>
                      </Button>
                    </div>
                  </div>

                  {/* 客户统计概览 - 大数字展示 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">客户概况</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-green-600">{formatAmount(contracts.reduce((sum, c) => sum + c.amount, 0))}</p>
                          <p className="text-xs text-green-700 mt-1">贷款总额</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-blue-600">{contracts.length}</p>
                          <p className="text-xs text-blue-700 mt-1">合同数量</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-orange-600">{followUps.length}</p>
                          <p className="text-xs text-orange-700 mt-1">跟进次数</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-purple-600">
                            {selectedCustomer.lastContactDate 
                              ? Math.floor((Date.now() - selectedCustomer.lastContactDate) / (1000 * 60 * 60 * 24)) + '天'
                              : '从未'}
                          </p>
                          <p className="text-xs text-purple-700 mt-1">最后跟进</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* 合同分类统计 */}
                  {contracts.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">合同分类</h3>
                      <div className="space-y-2">
                      {loanClassifies.map(lc => {
                        const count = contracts.filter(c => c.classify === lc.value).length;
                        return count > 0 ? (
                          <div key={lc.value} className="flex items-center gap-2">
                            <div className={cn('w-3 h-3 rounded-full', lc.color)} />
                            <span className="text-sm flex-1">{lc.label}</span>
                            <span className="text-sm font-semibold">{count} 份</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* 标签 */}
                {selectedCustomer.tags.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">标签</h3>
                    <div className="flex flex-wrap gap-1">
                      {selectedCustomer.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              </div>

              {/* 右侧内容区 */}
              <div className="flex-1 overflow-auto bg-background">
                <div className="p-8 space-y-6">
                  {/* 客户详情标签页 */}
                  <Tabs defaultValue="info">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="info">基本信息</TabsTrigger>
                      <TabsTrigger value="followups">跟进记录 ({followUps.length})</TabsTrigger>
                      <TabsTrigger value="contracts">合同信息 ({contracts.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-6 mt-6">
                      {/* 基本信息 */}
                      <Card>
                        <CardHeader className="bg-gradient-to-r from-blue-50/50 to-transparent">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <UserCircle className="h-5 w-5 text-blue-600" />
                            基本信息
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            <div className="group">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                客户类型
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">
                                  {selectedCustomer.type === 'personal' ? '个人客户' : '企业客户'}
                                </Badge>
                              </div>
                            </div>
                            <div className="group">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                客户编号
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="font-mono text-sm">{selectedCustomer.code}</p>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => { navigator.clipboard.writeText(selectedCustomer.code); }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="group">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                姓名/企业名称
                              </Label>
                              <p className="font-semibold mt-1">{selectedCustomer.name}</p>
                            </div>
                            <div className="group">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                电话
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-sm">{selectedCustomer.phone}</p>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => { navigator.clipboard.writeText(selectedCustomer.phone); }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {selectedCustomer.company && (
                              <div className="group">
                                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  公司
                                </Label>
                                <p className="mt-1">{selectedCustomer.company}</p>
                              </div>
                            )}
                            {selectedCustomer.email && (
                              <div className="space-y-1">
                                <Label>邮箱</Label>
                                <p>{selectedCustomer.email}</p>
                              </div>
                            )}
                            {selectedCustomer.wechat && (
                              <div className="space-y-1">
                                <Label>微信号</Label>
                                <p>{selectedCustomer.wechat}</p>
                              </div>
                            )}
                            {selectedCustomer.address && (
                              <div className="space-y-1 md:col-span-2">
                                <Label>地址</Label>
                                <p>{selectedCustomer.address}</p>
                              </div>
                            )}
                            {selectedCustomer.addressDetail && (
                              <div className="space-y-1 md:col-span-2">
                                <Label>详细地址</Label>
                                <p>{selectedCustomer.addressDetail}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* 个人客户专属信息 */}
                      {selectedCustomer.type === 'personal' && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">个人信息</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <Label>身份证后四位</Label>
                                <p>{selectedCustomer.idCardLast4 || '-'}</p>
                              </div>
                              <div className="space-y-1">
                                <Label>性别</Label>
                                <p>{selectedCustomer.gender === 'male' ? '男' : selectedCustomer.gender === 'female' ? '女' : '-'}</p>
                              </div>
                              {selectedCustomer.birthday && (
                                <div className="space-y-1">
                                  <Label>生日</Label>
                                  <p>{format(selectedCustomer.birthday, 'yyyy-MM-dd')}</p>
                                </div>
                              )}
                              {selectedCustomer.maritalStatus && (
                                <div className="space-y-1">
                                  <Label>婚姻状况</Label>
                                  <p>
                                    {selectedCustomer.maritalStatus === 'single' ? '未婚' :
                                     selectedCustomer.maritalStatus === 'married' ? '已婚' :
                                     selectedCustomer.maritalStatus === 'divorced' ? '离异' : '-'}
                                  </p>
                                </div>
                              )}
                              {selectedCustomer.education && (
                                <div className="space-y-1">
                                  <Label>学历</Label>
                                  <p>{selectedCustomer.education}</p>
                                </div>
                              )}
                              {selectedCustomer.occupation && (
                                <div className="space-y-1">
                                  <Label>职业</Label>
                                  <p>{selectedCustomer.occupation}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* 企业客户专属信息 */}
                      {selectedCustomer.type === 'enterprise' && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">企业信息</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                              {selectedCustomer.legalPerson && (
                                <div className="space-y-1">
                                  <Label>法人</Label>
                                  <p>{selectedCustomer.legalPerson}</p>
                                </div>
                              )}
                              {selectedCustomer.registerCapital && (
                                <div className="space-y-1">
                                  <Label>注册资本</Label>
                                  <p>{selectedCustomer.registerCapital}</p>
                                </div>
                              )}
                              {selectedCustomer.establishDate && (
                                <div className="space-y-1">
                                  <Label>成立日期</Label>
                                  <p>{format(selectedCustomer.establishDate, 'yyyy-MM-dd')}</p>
                                </div>
                              )}
                              {selectedCustomer.industry && (
                                <div className="space-y-1">
                                  <Label>所属行业</Label>
                                  <p>{selectedCustomer.industry}</p>
                                </div>
                              )}
                              {selectedCustomer.businessScope && (
                                <div className="space-y-1 md:col-span-2">
                                  <Label>经营范围</Label>
                                  <p>{selectedCustomer.businessScope}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* 客户评估 */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            客户评估
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            {selectedCustomer.valueLevel && (
                              <div className="space-y-1">
                                <Label>价值等级</Label>
                                <Badge className={valueLevels.find(v => v.value === selectedCustomer.valueLevel)?.color}>
                                  {selectedCustomer.valueLevel}级
                                </Badge>
                              </div>
                            )}
                            {selectedCustomer.priority && (
                              <div className="space-y-1">
                                <Label>优先级</Label>
                                <Badge variant={selectedCustomer.priority === 'high' ? 'destructive' : 'secondary'}>
                                  {priorities.find(p => p.value === selectedCustomer.priority)?.label}
                                </Badge>
                              </div>
                            )}
                            {selectedCustomer.riskLevel && (
                              <div className="space-y-1">
                                <Label>风险等级</Label>
                                <div className={cn('inline-flex items-center gap-1 px-2 py-1 rounded text-sm', riskLevels.find(r => r.value === selectedCustomer.riskLevel)?.color, 'text-white')}>
                                  <Shield className="h-4 w-4" />
                                  {riskLevels.find(r => r.value === selectedCustomer.riskLevel)?.label}
                                </div>
                              </div>
                            )}
                            {selectedCustomer.source && (
                              <div className="space-y-1">
                                <Label>客户来源</Label>
                                <p>{selectedCustomer.source}</p>
                              </div>
                            )}
                            {selectedCustomer.creditRating && (
                              <div className="space-y-1">
                                <Label>信用评级</Label>
                                <p>{selectedCustomer.creditRating}</p>
                              </div>
                            )}
                            {selectedCustomer.firstContactDate && (
                              <div className="space-y-1">
                                <Label>首次接触</Label>
                                <p>{format(selectedCustomer.firstContactDate, 'yyyy-MM-dd')}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* 备注 */}
                      {selectedCustomer.remark && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">备注</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm whitespace-pre-wrap">{selectedCustomer.remark}</p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="followups" className="space-y-4 mt-6">
                      <Button onClick={() => setShowFollowUpDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        添加跟进记录
                      </Button>

                      {followUps.length === 0 ? (
                        <Card>
                          <CardContent className="py-12 text-center text-muted-foreground">
                            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>暂无跟进记录</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-4">
                          {/* 时间线视图 */}
                          <div className="relative">
                            {followUps.map((fu, index) => {
                              const isLast = index === followUps.length - 1;
                              const Icon = followUpTypes.find(t => t.value === fu.type)?.icon || FileText;
                              const today = new Date();
                              const followUpDate = new Date(fu.time);
                              const isToday = followUpDate.toDateString() === today.toDateString();

                              return (
                                <div key={fu.id} className="relative pl-8 pb-8">
                                  {/* 时间线 */}
                                  <div className="absolute left-3 top-0 w-3 h-3 rounded-full bg-primary" />
                                  {!isLast && <div className="absolute left-[13px] top-6 bottom-0 w-0.5 bg-border" />}

                                  {/* 日期标签 */}
                                  {isToday && (
                                    <div className="absolute left-12 top-0 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                                      今天
                                    </div>
                                  )}

                                  <Card className="ml-4">
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <div className="p-1.5 rounded-full bg-accent">
                                            <Icon className="h-4 w-4" />
                                          </div>
                                          <Badge variant="outline">
                                            {followUpTypes.find(t => t.value === fu.type)?.label}
                                          </Badge>
                                          <span className="text-sm text-muted-foreground">
                                            {format(fu.time, 'yyyy-MM-dd HH:mm')}
                                          </span>
                                        </div>
                                        {fu.nextFollowDate && (
                                          <Badge variant="secondary" className="text-xs">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            下次：{format(fu.nextFollowDate, 'MM-dd')}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm whitespace-pre-wrap">{fu.content}</p>
                                    </CardContent>
                                  </Card>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="contracts" className="space-y-4 mt-6">
                      <Button onClick={() => handleOpenContractDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        添加合同
                      </Button>

                      {contracts.length === 0 ? (
                        <Card>
                          <CardContent className="py-12 text-center text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>暂无合同信息</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-4">
                          {contracts.map((contract) => {
                            const classifyInfo = loanClassifies.find(l => l.value === contract.classify);
                            const statusInfo = contractStatuses.find(s => s.value === contract.status);
                            const isExpiring = contract.endDate && isPast(addDays(contract.endDate, -30));
                            const daysToExpiry = contract.endDate ? differenceInDays(contract.endDate, new Date()) : null;

                            return (
                              <Card
                                key={contract.id}
                                className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                                style={{
                                  borderLeftColor: classifyInfo?.color.replace('bg-', '') || '#e5e7eb',
                                  borderLeftWidth: '4px'
                                }}
                                onClick={() => handleOpenContractDialog(contract)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-lg">{contract.code}</span>
                                      <Badge variant="outline">{contract.product}</Badge>
                                      <Badge className={statusInfo?.color}>{statusInfo?.label}</Badge>
                                    </div>
                                    {isExpiring && (
                                      <Badge variant="destructive" className="animate-pulse">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {daysToExpiry !== null && daysToExpiry > 0 ? `${daysToExpiry}天后到期` : '已到期'}
                                      </Badge>
                                    )}
                                  </div>

                                  {/* 进度条 - 显示合同状态 */}
                                  <div className="mb-3">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                      <span>贷款期限</span>
                                      <span>{contract.term}个月</span>
                                    </div>
                                    <Progress
                                      value={contract.endDate ? Math.min(100, ((Date.now() - contract.startDate) / (contract.endDate - contract.startDate)) * 100) : 0}
                                      className="h-2"
                                    />
                                  </div>

                                  <div className="grid grid-cols-3 gap-3 text-sm">
                                    <div>
                                      <span className="text-muted-foreground block text-xs">贷款金额</span>
                                      <span className="font-semibold text-green-600">{formatAmount(contract.amount)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground block text-xs">五级分类</span>
                                      <div className="flex items-center gap-1">
                                        <div className={cn('w-2 h-2 rounded-full', classifyInfo?.color)} />
                                        <span>{classifyInfo?.label}</span>
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground block text-xs">到期日期</span>
                                      <span>{contract.endDate ? format(contract.endDate, 'yyyy-MM-dd') : '-'}</span>
                                    </div>
                                  </div>

                                  {contract.purpose && (
                                    <div className="mt-2 pt-2 border-t text-sm">
                                      <span className="text-muted-foreground">用途：</span>
                                      <span>{contract.purpose}</span>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 跟进记录对话框 */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加跟进记录</DialogTitle>
            <DialogDescription>记录与客户的沟通情况，可设置下次跟进时间</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>跟进方式</Label>
              <div className="flex gap-2">
                {followUpTypes.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setFollowUpType(t.value)}
                      className={cn(
                        'flex-1 p-3 rounded-lg border text-center transition-all',
                        followUpType === t.value
                          ? 'border-2 border-primary bg-primary/5'
                          : 'hover:bg-accent'
                      )}
                    >
                      <Icon className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-sm">{t.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>跟进内容</Label>
              <Textarea
                value={followUpContent}
                onChange={(e) => setFollowUpContent(e.target.value)}
                placeholder="请输入跟进内容"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>下次跟进时间（可选）</Label>
              <Input
                type="date"
                value={followUpNextDate}
                onChange={(e) => setFollowUpNextDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFollowUpDialog(false)}>取消</Button>
            <Button onClick={handleSaveFollowUp}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 合同对话框 */}
      <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingContract ? '编辑合同' : '添加合同'}</DialogTitle>
            <DialogDescription>录入或修改客户的贷款合同信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>合同编号 *</Label>
                <Input value={contractCode} onChange={(e) => setContractCode(e.target.value)} placeholder="请输入" />
              </div>
              <div className="space-y-2">
                <Label>贷款金额（万元）*</Label>
                <Input type="number" step="0.01" value={contractAmount} onChange={(e) => setContractAmount(e.target.value)} placeholder="如：100.50" />
              </div>
              <div className="space-y-2">
                <Label>期限（月）*</Label>
                <Input type="number" value={contractTerm} onChange={(e) => setContractTerm(e.target.value)} placeholder="如：36" />
              </div>
              <div className="space-y-2">
                <Label>贷款产品 *</Label>
                <Input value={contractProduct} onChange={(e) => setContractProduct(e.target.value)} placeholder="如：个人住房贷款" />
              </div>
              <div className="space-y-2">
                <Label>放款日期</Label>
                <Input type="date" value={contractStartDate} onChange={(e) => setContractStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>到期日期</Label>
                <Input type="date" value={contractEndDate} onChange={(e) => setContractEndDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>五级分类</Label>
                <Select value={contractClassify} onValueChange={(v) => setContractClassify(v as LoanClassify)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loanClassifies.map(l => (
                      <SelectItem key={l.value} value={l.value}>
                        <div className={cn('w-2 h-2 rounded-full', l.color)} />
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>合同状态</Label>
                <Select value={contractStatus} onValueChange={(v) => setContractStatus(v as ContractStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contractStatuses.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        <div className={cn('w-2 h-2 rounded-full', s.color)} />
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>用途</Label>
              <Input value={contractPurpose} onChange={(e) => setContractPurpose(e.target.value)} placeholder="请输入" />
            </div>
            <div className="space-y-2">
              <Label>担保方式</Label>
              <Input value={contractGuarantee} onChange={(e) => setContractGuarantee(e.target.value)} placeholder="如：抵押、保证" />
            </div>
            {contractStatus !== 'normal' && (
              <>
                <div className="space-y-2">
                  <Label>诉讼详情</Label>
                  <Textarea value={contractLitigationDetail} onChange={(e) => setContractLitigationDetail(e.target.value)} placeholder="请输入" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>代理律师</Label>
                    <Input value={contractLawyer} onChange={(e) => setContractLawyer(e.target.value)} placeholder="请输入" />
                  </div>
                  <div className="space-y-2">
                    <Label>受理法院</Label>
                    <Input value={contractCourt} onChange={(e) => setContractCourt(e.target.value)} placeholder="请输入" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>案号</Label>
                    <Input value={contractCaseNo} onChange={(e) => setContractCaseNo(e.target.value)} placeholder="请输入" />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea value={contractRemark} onChange={(e) => setContractRemark(e.target.value)} placeholder="请输入" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContractDialog(false)}>取消</Button>
            <Button onClick={handleSaveContract}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导入对话框 */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导入客户数据</DialogTitle>
            <DialogDescription>上传CSV文件批量导入客户信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>选择文件</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                请上传CSV文件，文件需包含以下列：客户编号、客户类型、客户姓名、电话、公司、邮箱、地址、标签、备注
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>取消</Button>
            <Button onClick={handleImportCustomers} disabled={!importFile}>
              导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 回收站对话框 */}
      <RecycleBinDialog
        open={showRecycleBin}
        onOpenChange={setShowRecycleBin}
        onRestore={async (item) => {
          if (item.type === 'customer') {
            // 恢复客户数据
            await db.restoreCustomer(item.originalId);
            // 恢复关联的跟进记录
            if (item.data.followUps && item.data.followUps.length > 0) {
              for (const followUp of item.data.followUps) {
                await db.followUpRecords.put(followUp);
              }
            }
            // 恢复关联的合同
            if (item.data.contracts && item.data.contracts.length > 0) {
              for (const contract of item.data.contracts) {
                await db.contracts.put(contract);
              }
            }
            await loadCustomers();
          }
        }}
      />
    </div>
  );
}
