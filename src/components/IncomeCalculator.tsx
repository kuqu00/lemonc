import { useState, useMemo } from 'react';
import { Calculator, Copy, Check, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAppStore } from '@/store';

interface CalculationStep {
  step: number;
  expression: string;
  result: number;
}

export function IncomeCalculator() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const [steps, setSteps] = useState<CalculationStep[]>([]);
  const [copied, setCopied] = useState(false);
  const { addNotification } = useAppStore();

  // 智能识别并提取数字和运算符
  const parseInput = (text: string): string => {
    // 移除所有空白字符
    let cleaned = text.replace(/\s+/g, '');

    // 中文数字映射
    const chineseNumbers: Record<string, number> = {
      '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
      '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
      '十': 10, '百': 100, '千': 1000, '万': 10000,
      '亿': 100000000
    };

    // 中文数字转阿拉伯数字
    cleaned = cleaned.replace(/([一二三四五六七八九十]+)/g, (match) => {
      const num = chineseNumbers[match];
      if (num !== undefined) return num.toString();
      return match;
    });

    // 只保留数字、运算符和括号
    cleaned = cleaned.replace(/[^\d+\-*/().]/g, '');

    return cleaned;
  };



  // 生成计算步骤 - 简化版本
  const generateSteps = (expression: string, finalResult: number): CalculationStep[] => {
    const steps: CalculationStep[] = [];

    // 简单方法：提取所有运算并按优先级展示
    const operations = expression.match(/(\d+\.?\d*)\s*([+\-*/])\s*(\d+\.?\d*)/g) || [];

    // 分析表达式结构，生成合理的计算步骤
    let tempExpression = expression;

    // 优先处理括号
    while (tempExpression.includes('(')) {
      const parenMatch = tempExpression.match(/\(([^()]+)\)/);
      if (parenMatch) {
        const innerExpr = parenMatch[1];
        const result = calculateExpression(innerExpr);
        const resultStr = result.toFixed(0);

        steps.push({
          step: steps.length + 1,
          expression: innerExpr,
          result: result
        });

        tempExpression = tempExpression.replace(parenMatch[0], resultStr);
      } else {
        break;
      }
    }

    // 处理乘除
    let tempExpr = tempExpression;
    while (tempExpr.includes('*') || tempExpr.includes('/')) {
      const match = tempExpr.match(/(\d+\.?\d*)\s*([*/])\s*(\d+\.?\d*)/);
      if (match) {
        const left = parseFloat(match[1]);
        const op = match[2];
        const right = parseFloat(match[3]);
        const result = op === '*' ? left * right : (right !== 0 ? left / right : 0);

        steps.push({
          step: steps.length + 1,
          expression: `${left} ${op} ${right}`,
          result: result
        });

        const resultStr = result.toFixed(0);
        tempExpr = tempExpr.replace(match[0], resultStr);
      } else {
        break;
      }
    }

    // 处理加减
    while (tempExpr.includes('+') || tempExpr.includes('-')) {
      const match = tempExpr.match(/(-?\d+\.?\d*)\s*([+\-])\s*(\d+\.?\d*)/);
      if (match) {
        const left = parseFloat(match[1]);
        const op = match[2];
        const right = parseFloat(match[3]);
        const result = op === '+' ? left + right : left - right;

        steps.push({
          step: steps.length + 1,
          expression: `${left} ${op} ${right}`,
          result: result
        });

        const resultStr = result.toFixed(0);
        tempExpr = tempExpr.replace(match[0], resultStr);
      } else {
        break;
      }
    }

    // 如果没有步骤，只显示最终结果
    if (steps.length === 0) {
      steps.push({
        step: 1,
        expression: expression,
        result: finalResult
      });
    }

    return steps;
  };

  // 安全计算表达式
  const calculateExpression = (expression: string): number => {
    // 使用 Function 构造器安全计算
    const safeExpression = expression.replace(/[^0-9+\-*/().]/g, '');
    const result = new Function('return ' + safeExpression)();
    return isNaN(result) ? 0 : result;
  };

  // 执行计算
  const handleCalculate = () => {
    if (!input.trim()) {
      addNotification({
        title: '提示',
        message: '请输入要计算的内容',
        type: 'warning'
      });
      return;
    }

    try {
      // 1. 解析输入
      const parsedExpression = parseInput(input);

      if (!parsedExpression) {
        addNotification({
          title: '错误',
          message: '未能识别有效数字，请检查输入',
          type: 'error'
        });
        return;
      }

      console.log('解析后的表达式:', parsedExpression);

      // 2. 计算最终结果
      const calcResult = calculateExpression(parsedExpression);
      console.log('最终结果:', calcResult);

      // 3. 生成计算步骤
      const calcSteps = generateSteps(parsedExpression, calcResult);
      console.log('计算步骤:', calcSteps);

      // 3. 计算最终结果
      const calcResult = calculateExpression(parsedExpression);
      console.log('最终结果:', calcResult);

      setResult(calcResult);
      setSteps(calcSteps);

      addNotification({
        title: '计算成功',
        message: `计算完成，结果：${calcResult.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Calculation error:', error);
      addNotification({
        title: '计算错误',
        message: '计算过程中出现错误，请检查输入格式',
        type: 'error'
      });
      setResult(null);
      setSteps([]);
    }
  };

  // 复制结果
  const handleCopy = () => {
    if (result !== null) {
      navigator.clipboard.writeText(result.toString());
      setCopied(true);
      addNotification({
        title: '复制成功',
        message: '已复制到剪贴板',
        type: 'success'
      });

      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 清空
  const handleClear = () => {
    setInput('');
    setResult(null);
    setSteps([]);
  };

  // 示例填充
  const handleExample = (example: string) => {
    setInput(example);
    handleCalculate();
  };

  const exampleTexts = [
    '工资5000+奖金3000*12+年终奖24000',
    '10*(10+3)',
    '月入8000*12+兼职2000*6',
    '底薪3000+绩效5000*0.2+补贴1500'
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            收入计算器
          </CardTitle>
          <CardDescription>
            智能识别文字中的数字，支持加减乘除、括号运算，显示详细计算过程
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 示例快捷按钮 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">快速示例：</p>
            <div className="flex flex-wrap gap-2">
              {exampleTexts.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleExample(example)}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>

          {/* 输入区域 */}
          <div className="space-y-2">
            <Textarea
              placeholder="请输入计算表达式，例如：工资5000+奖金3000*12+年终奖24000"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[120px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCalculate();
                }
              }}
            />
            <div className="flex gap-2">
              <Button onClick={handleCalculate} className="flex-1">
                <Calculator className="h-4 w-4 mr-2" />
                开始计算
              </Button>
              <Button onClick={handleClear} variant="outline">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button onClick={() => handleCalculate()} variant="outline">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 结果显示 */}
          {result !== null && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">计算结果</p>
                  <p className="text-3xl font-bold text-primary">
                    {result.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <Button onClick={handleCopy} variant="outline" size="lg">
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      📋 复制为纯数字
                    </>
                  )}
                </Button>
              </div>

              {/* 计算步骤 */}
              {steps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">计算步骤：</p>
                  <ScrollArea className="h-[200px] rounded-md border">
                    <div className="p-4 space-y-2">
                      {steps.map((step) => (
                        <div key={step.step} className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                          <Badge variant="secondary">{step.step}</Badge>
                          <div className="flex-1">
                            <p className="font-mono text-sm">{step.expression}</p>
                            <p className="text-sm text-muted-foreground">
                              = {step.result.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <Badge>最终</Badge>
                        <div className="flex-1">
                          <p className="font-medium text-lg">
                            = {result.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* 使用提示 */}
          <Alert>
            <Calculator className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1 text-sm">
                <p>• 支持的运算符：+ - * / ( )</p>
                <p>• 自动识别文字中的数字：如"工资5000"会提取为"5000"</p>
                <p>• 使用括号控制运算优先级：(5000+3000)*12</p>
                <p>• 按 Enter 键快速计算</p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
