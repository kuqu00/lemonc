import { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Image as ImageIcon,
  Upload,
  Download,
  Trash2,
  AlertCircle,
  Minimize2,
  Settings,
  Zap,
  TrendingUp,
  Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAppStore } from '@/store';
import { PDFDocument } from 'pdf-lib';
import { jsPDF } from 'jspdf';

// 动态导入 pdfjs-dist 以避免 worker 路径问题
let pdfjsLib: typeof import('pdfjs-dist');
let pdfjsLoaded = false;

const loadPdfJs = async () => {
  if (pdfjsLoaded) return pdfjsLib;
  try {
    pdfjsLib = await import('pdfjs-dist');
    // 设置本地 worker（离线）
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
    pdfjsLoaded = true;
    console.log('PDF.js 加载成功');
    return pdfjsLib;
  } catch (error) {
    console.error('PDF.js 加载失败:', error);
    throw error;
  }
};



interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  compressedSize?: number;
  estimatedSize?: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
}

// 图片压缩档位配置 - 20档
const imageCompressionLevels = Array.from({ length: 20 }, (_, i) => {
  const quality = 1 - (i * 0.05); // 1.0, 0.95, 0.90, ... 0.05
  let label: string;
  let description: string;
  
  if (i === 0) {
    label = '原图';
    description = '不压缩，保持原图质量';
  } else if (i <= 3) {
    label = '极低';
    description = '轻微压缩，几乎无损';
  } else if (i <= 7) {
    label = '低';
    description = '轻度压缩，画质良好';
  } else if (i <= 11) {
    label = '中';
    description = '中度压缩，平衡画质和大小';
  } else if (i <= 15) {
    label = '高';
    description = '较高压缩，画质一般';
  } else if (i <= 18) {
    label = '极高';
    description = '高度压缩，画质较低';
  } else {
    label = '最低';
    description = '最大压缩，画质最差';
  }
  
  return { 
    value: i + 1, 
    label, 
    quality: Math.round(quality * 100) / 100, 
    description: `${description} (${Math.round(quality * 100)}%)` 
  };
});

// PDF压缩档位配置 - 10档
const pdfCompressionLevels = Array.from({ length: 10 }, (_, i) => {
  const quality = 1 - (i * 0.1);
  const labels = ['原质', '轻微', '轻度', '轻中', '中等', '中高', '高度', '极高', '最大', '最低'];
  return {
    value: i + 1,
    label: labels[i],
    quality: Math.round(quality * 100) / 100,
    description: `${labels[i]}压缩 (${Math.round(quality * 100)}%)`
  };
});

export function ToolBox() {
  const [activeTab, setActiveTab] = useState('pdf');
  
  // 图片压缩状态 - 独立
  const [imageFiles, setImageFiles] = useState<FileItem[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [imageCompressionLevel, setImageCompressionLevel] = useState(10); // 默认第10档
  const [imageTargetSize, setImageTargetSize] = useState<string>('');
  const [compressedImageResults, setCompressedImageResults] = useState<Map<string, Blob>>(new Map());
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  
  // PDF压缩状态 - 独立
  const [pdfFiles, setPdfFiles] = useState<FileItem[]>([]);
  const [isProcessingPdfs, setIsProcessingPdfs] = useState(false);
  const [pdfCompressionLevel, setPdfCompressionLevel] = useState(5); // 默认第5档
  const [pdfTargetSize, setPdfTargetSize] = useState<string>('');
  const [compressedPdfResults, setCompressedPdfResults] = useState<Map<string, Blob>>(new Map());
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  
  // 收入计算状态
  const [incomeInput, setIncomeInput] = useState('');
  const [incomeResult, setIncomeResult] = useState<number | null>(null);
  const [calculationSteps, setCalculationSteps] = useState<string[]>([]);
  
  const { addNotification } = useAppStore();

  // ========== 图片压缩相关函数 ==========
  
  // 图片文件选择
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: FileItem[] = Array.from(selectedFiles).map(file => ({
      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0
    }));

    setImageFiles(prev => [...prev, ...newFiles]);
  };

  // 删除图片文件
  const removeImageFile = (id: string) => {
    setImageFiles(prev => prev.filter(f => f.id !== id));
    const newResults = new Map(compressedImageResults);
    newResults.delete(id);
    setCompressedImageResults(newResults);
  };

  // 清空图片文件
  const clearImageFiles = () => {
    setImageFiles([]);
    setCompressedImageResults(new Map());
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = '';
    }
  };

  // 计算图片预计压缩后大小
  const getImageEstimatedSize = (originalSize: number, level: number) => {
    const quality = imageCompressionLevels.find(l => l.value === level)?.quality || 0.5;
    // 更精确的估算：图片压缩后大小 ≈ 原大小 * (quality^0.7 * 0.9 + 0.05)
    // 使用指数函数让低质量时压缩更明显
    const estimatedRatio = Math.pow(quality, 0.7) * 0.9 + 0.05;
    return Math.round(originalSize * estimatedRatio);
  };

  // 根据目标大小自动选择图片档位
  const autoSelectImageLevel = (originalSize: number, targetMB: number) => {
    const targetBytes = targetMB * 1024 * 1024;
    for (let i = imageCompressionLevels.length - 1; i >= 0; i--) {
      const estimated = getImageEstimatedSize(originalSize, imageCompressionLevels[i].value);
      if (estimated <= targetBytes) {
        return imageCompressionLevels[i].value;
      }
    }
    return 20; // 默认最高压缩
  };

  // 压缩图片
  const compressImage = async (file: File, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('无法创建canvas上下文'));
        return;
      }

      img.onload = () => {
        // 限制最大尺寸
        let { width, height } = img;
        const maxDimension = 4096;
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        
        // 填充白色背景（处理透明图片）
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // 确定输出格式
        const isPNG = file.type === 'image/png';
        // 如果原图是 PNG 且质量要求较低(quality < 0.85)，转换为 JPEG
        const outputType = (isPNG && quality < 0.85) ? 'image/jpeg' : file.type;
        
        if (outputType === 'image/jpeg') {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('压缩失败'));
              }
            },
            outputType,
            quality
          );
        } else {
          // PNG 或其他格式
          try {
            const dataUrl = canvas.toDataURL(outputType, quality);
            const byteString = atob(dataUrl.split(',')[1]);
            const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeString });
            resolve(blob);
          } catch (error) {
            reject(new Error('PNG 压缩失败: ' + (error as Error).message));
          }
        }
      };

      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = URL.createObjectURL(file);
    });
  };

  // 处理图片压缩
  const handleCompressImages = async () => {
    if (imageFiles.length === 0) {
      addNotification({
        title: '提示',
        message: '请选择要压缩的图片',
        type: 'warning'
      });
      return;
    }

    setIsProcessingImages(true);
    const newResults = new Map(compressedImageResults);

    for (const fileItem of imageFiles) {
      if (fileItem.status === 'completed') continue;

      setImageFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, status: 'processing' as const } : f
      ));

      try {
        let level = imageCompressionLevel;
        
        if (imageTargetSize) {
          const targetMB = parseFloat(imageTargetSize);
          if (!isNaN(targetMB) && targetMB > 0) {
            level = autoSelectImageLevel(fileItem.size, targetMB);
          }
        }

        const quality = imageCompressionLevels.find(l => l.value === level)?.quality || 0.5;
        
        const compressedBlob = await compressImage(fileItem.file, quality);
        
        newResults.set(fileItem.id, compressedBlob);
        
        setImageFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { 
            ...f, 
            status: 'completed' as const, 
            compressedSize: compressedBlob.size,
            progress: 100 
          } : f
        ));
      } catch (error) {
        console.error('Compression error:', error);
        setImageFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'error' as const } : f
        ));
      }
    }

    setCompressedImageResults(newResults);
    setIsProcessingImages(false);
    
    addNotification({
      title: '压缩完成',
      message: '图片压缩已完成',
      type: 'success'
    });
  };

  // 下载压缩后的图片
  const downloadImageFile = (fileItem: FileItem) => {
    const blob = compressedImageResults.get(fileItem.id);
    if (!blob) {
      console.error('No compressed blob found for file:', fileItem.id);
      return;
    }

    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      // 生成安全的文件名（移除特殊字符）
      const nameParts = fileItem.name.split('.');
      const originalExt = nameParts.pop() || 'jpg';
      // 根据 blob 类型确定扩展名
      const ext = blob.type === 'image/jpeg' ? 'jpg' : 
                  blob.type === 'image/png' ? 'png' : 
                  blob.type === 'image/gif' ? 'gif' : 
                  blob.type === 'image/webp' ? 'webp' : originalExt;
      const baseName = nameParts.join('.').replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
      const filename = `${baseName}_compressed.${ext}`;
      
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      
      // 使用 MouseEvent 触发点击
      const clickEvent = new MouseEvent('click', {
        bubbles: false,
        cancelable: true,
        view: window
      });
      a.dispatchEvent(clickEvent);
      
      // 延迟清理
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      addNotification({
        title: '下载已开始',
        message: `文件 "${filename}" 正在下载`,
        type: 'success'
      });
    } catch (error) {
      console.error('Download failed:', error);
      addNotification({
        title: '下载失败',
        message: '请重试或检查浏览器设置',
        type: 'error'
      });
    }
  };

  // ========== PDF压缩相关函数 ==========

  // PDF文件选择
  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: FileItem[] = Array.from(selectedFiles).map(file => ({
      id: `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0
    }));

    setPdfFiles(prev => [...prev, ...newFiles]);
  };

  // 删除PDF文件
  const removePdfFile = (id: string) => {
    setPdfFiles(prev => prev.filter(f => f.id !== id));
    const newResults = new Map(compressedPdfResults);
    newResults.delete(id);
    setCompressedPdfResults(newResults);
  };

  // 清空PDF文件
  const clearPdfFiles = () => {
    setPdfFiles([]);
    setCompressedPdfResults(new Map());
    if (pdfFileInputRef.current) {
      pdfFileInputRef.current.value = '';
    }
  };

  // PDF 压缩模式
  type PdfCompressionMode = 'light' | 'heavy';
  const [pdfCompressionMode, setPdfCompressionMode] = useState<PdfCompressionMode>('light');
  const [pdfTargetSizeMB, setPdfTargetSizeMB] = useState<string>('');

  // 计算PDF预计压缩后大小
  const getPdfEstimatedSize = (originalSize: number, level: number): number => {
    if (pdfCompressionMode === 'light') {
      // 轻度压缩通常减少 0-15%
      return Math.round(originalSize * 0.92);
    }
    // 强力压缩：根据档位估算
    // level 1: 90%, level 5: 50%, level 10: 25%
    const ratio = 0.9 - (level - 1) * 0.065;
    return Math.round(originalSize * Math.max(0.2, ratio));
  };

  // 根据目标大小自动计算最佳档位
  const calculateBestLevel = (originalSize: number, targetMB: number): number => {
    const targetBytes = targetMB * 1024 * 1024;
    // 从高档位往低档位试，找到能满足目标大小的最高档位
    for (let level = 10; level >= 1; level--) {
      const estimated = getPdfEstimatedSize(originalSize, level);
      if (estimated <= targetBytes) {
        return level;
      }
    }
    return 10; // 默认最高压缩
  };

  // 当 PDF 压缩设置改变时，更新预计大小
  useEffect(() => {
    setPdfFiles(prev => prev.map(f => {
      let newLevel = pdfCompressionLevel;
      
      // 如果有设置目标大小，自动计算档位
      if (pdfTargetSizeMB && pdfCompressionMode === 'heavy') {
        const targetMB = parseFloat(pdfTargetSizeMB);
        if (!isNaN(targetMB) && targetMB > 0) {
          newLevel = calculateBestLevel(f.size, targetMB);
        }
      }
      
      return {
        ...f,
        estimatedSize: getPdfEstimatedSize(f.size, newLevel),
        // 重置压缩状态，允许重新压缩
        compressedSize: undefined,
        status: 'pending' as const
      };
    }));
  }, [pdfCompressionMode, pdfCompressionLevel, pdfTargetSizeMB]);

  // 轻度压缩 - 只优化 PDF 结构，保留文本
  const compressPDFLight = async (file: File): Promise<Blob> => {
    try {
      console.log('开始轻度压缩:', file.name);
      const arrayBuffer = await file.arrayBuffer();
      
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        updateMetadata: false,
        ignoreEncryption: true,
      });
      
      // 移除元数据
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');
      
      const optimizedBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false
      });
      
      console.log('轻度压缩完成:', file.name, '原大小:', file.size, '压缩后:', optimizedBytes.byteLength);
      return new Blob([optimizedBytes.buffer], { type: 'application/pdf' });
    } catch (error) {
      console.error('PDF 轻度压缩失败:', error);
      throw error;
    }
  };

  // 强力压缩 - 转为图像，文件更小
  const compressPDFHeavy = async (file: File, level: number): Promise<Blob> => {
    try {
      console.log('开始强力压缩:', file.name, '档位:', level);
      
      // 动态加载 PDF.js
      const pdf = await loadPdfJs();
      
      const arrayBuffer = await file.arrayBuffer();
      
      // 加载 PDF
      const loadingTask = pdf.getDocument({ data: arrayBuffer });
      const pdfDocument = await loadingTask.promise;
      const numPages = pdfDocument.numPages;
      
      console.log('PDF 页数:', numPages);
      
      // 根据档位设置参数 - 更保守的设置
      const quality = Math.max(0.3, 1 - (level - 1) * 0.07); // 1.0 -> 0.37
      const scale = Math.max(1.0, 2.5 - (level - 1) * 0.15); // 2.5 -> 1.15
      
      // 创建新的 PDF - 使用 A4 尺寸
      const newPdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      for (let i = 1; i <= numPages; i++) {
        console.log(`处理第 ${i}/${numPages} 页...`);
        
        const page = await pdfDocument.getPage(i);
        const viewport = page.getViewport({ scale });
        
        // 创建 canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('无法创建 canvas 上下文');
        }
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // 渲染页面
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        // 压缩图像 - 降低分辨率
        const compressedCanvas = document.createElement('canvas');
        const ctx = compressedCanvas.getContext('2d');
        if (!ctx) continue;
        
        // 根据档位降低分辨率
        const maxWidth = 1600 - (level - 1) * 120; // 1600 -> 520
        let width = canvas.width;
        let height = canvas.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        compressedCanvas.width = width;
        compressedCanvas.height = height;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(canvas, 0, 0, width, height);
        
        const imageData = compressedCanvas.toDataURL('image/jpeg', quality);
        
        if (i > 1) {
          newPdf.addPage();
        }
        
        // 添加图像到 PDF - 填满页面
        const pageWidth = newPdf.internal.pageSize.getWidth();
        const pageHeight = newPdf.internal.pageSize.getHeight();
        
        newPdf.addImage(imageData, 'JPEG', 0, 0, pageWidth, pageHeight);
      }
      
      const pdfBlob = new Blob([newPdf.output('arraybuffer')], { type: 'application/pdf' });
      
      console.log('强力压缩完成:', file.name, '原大小:', file.size, '压缩后:', pdfBlob.size);
      
      // 如果压缩后更大，返回原文件
      if (pdfBlob.size >= file.size * 0.95) {
        console.log('压缩后大小未减小，使用原文件');
        return file;
      }
      
      return pdfBlob;
    } catch (error) {
      console.error('PDF 强力压缩失败:', error);
      throw error;
    }
  };

  // 智能压缩 - 迭代尝试直到达到目标大小或最高档位
  const compressPDFWithTarget = async (
    file: File, 
    targetBytes: number,
    onProgress?: (level: number, size: number) => void
  ): Promise<{ blob: Blob; finalLevel: number; attempts: number }> => {
    let currentLevel = 1;
    let bestBlob: Blob = file;
    let bestSize: number = file.size;
    let attempts = 0;
    const maxAttempts = 10;
    
    // 从低档位开始尝试
    for (currentLevel = 1; currentLevel <= 10; currentLevel++) {
      attempts++;
      
      try {
        const blob = await compressPDFHeavy(file, currentLevel);
        const size = blob.size;
        
        if (onProgress) {
          onProgress(currentLevel, size);
        }
        
        console.log(`档位 ${currentLevel}: ${formatFileSize(size)}`);
        
        // 记录最佳结果（最接近目标但不超过目标的 1.5 倍）
        if (size < bestSize) {
          bestBlob = blob;
          bestSize = size;
        }
        
        // 如果已经达到目标大小，返回
        if (size <= targetBytes) {
          return { blob, finalLevel: currentLevel, attempts };
        }
        
        // 如果已经最高档还达不到，返回最佳结果
        if (currentLevel === 10) {
          break;
        }
        
        // 如果大小变化很小，提前停止
        if (attempts > 1 && size > bestSize * 0.95) {
          console.log('大小变化很小，停止尝试');
          break;
        }
      } catch (error) {
        console.error(`档位 ${currentLevel} 压缩失败:`, error);
        continue;
      }
    }
    
    return { blob: bestBlob, finalLevel: currentLevel, attempts };
  };

  // 处理PDF压缩
  const handleCompressPdfs = async () => {
    if (pdfFiles.length === 0) {
      addNotification({
        title: '提示',
        message: '请选择要压缩的PDF文件',
        type: 'warning'
      });
      return;
    }

    setIsProcessingPdfs(true);
    const newResults = new Map(compressedPdfResults);
    let successCount = 0;
    let errorCount = 0;

    for (const fileItem of pdfFiles) {
      // 允许重新压缩已完成的文件
      setPdfFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, status: 'processing' as const, compressedSize: undefined } : f
      ));

      try {
        let compressedBlob: Blob;
        let finalLevel = pdfCompressionLevel;
        let attempts = 1;
        
        // 如果有目标大小且是强力压缩，使用智能迭代压缩
        if (pdfTargetSizeMB && pdfCompressionMode === 'heavy') {
          const targetMB = parseFloat(pdfTargetSizeMB);
          if (!isNaN(targetMB) && targetMB > 0) {
            const targetBytes = targetMB * 1024 * 1024;
            
            addNotification({
              title: '智能压缩',
              message: `正在尝试不同档位以达到 ${targetMB}MB 目标...`,
              type: 'info'
            });
            
            const result = await compressPDFWithTarget(
              fileItem.file, 
              targetBytes,
              (level, size) => {
                // 更新进度
                setPdfFiles(prev => prev.map(f => 
                  f.id === fileItem.id 
                    ? { ...f, status: 'processing' as const, estimatedSize: size } 
                    : f
                ));
              }
            );
            
            compressedBlob = result.blob;
            finalLevel = result.finalLevel;
            attempts = result.attempts;
            
            // 检查结果
            if (compressedBlob.size > targetBytes * 1.5) {
              addNotification({
                title: '压缩提示',
                message: `已尽力压缩到 ${formatFileSize(compressedBlob.size)}，但无法达到 ${targetMB}MB 目标`,
                type: 'warning'
              });
            } else if (compressedBlob.size <= targetBytes) {
              addNotification({
                title: '目标达成',
                message: `成功压缩到 ${formatFileSize(compressedBlob.size)}，使用 ${finalLevel} 档`,
                type: 'success'
              });
            }
          } else {
            // 目标大小无效，使用普通压缩
            compressedBlob = await compressPDFHeavy(fileItem.file, pdfCompressionLevel);
          }
        } else if (pdfCompressionMode === 'light') {
          // 轻度压缩 - 只优化结构
          compressedBlob = await compressPDFLight(fileItem.file);
        } else {
          // 强力压缩 - 转为图像（无目标）
          compressedBlob = await compressPDFHeavy(fileItem.file, pdfCompressionLevel);
        }
        
        newResults.set(fileItem.id, compressedBlob);
        
        setPdfFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { 
            ...f, 
            status: 'completed' as const, 
            compressedSize: compressedBlob.size,
            progress: 100 
          } : f
        ));
        
        successCount++;
      } catch (error) {
        console.error('PDF Compression error:', error);
        setPdfFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'error' as const } : f
        ));
        errorCount++;
        addNotification({
          title: 'PDF压缩失败',
          message: fileItem.name + ': ' + (error as Error).message,
          type: 'error'
        });
      }
    }

    setCompressedPdfResults(newResults);
    setIsProcessingPdfs(false);
    
    if (successCount > 0) {
      let message = `成功 ${successCount} 个${errorCount > 0 ? `，失败 ${errorCount} 个` : ''}`;
      if (pdfCompressionMode === 'heavy' && pdfTargetSizeMB) {
        message += ` (智能迭代)`;
      }
      addNotification({
        title: '压缩完成',
        message: message,
        type: 'success'
      });
    } else if (errorCount > 0) {
      addNotification({
        title: '压缩失败',
        message: '所有文件压缩失败，请查看控制台错误信息',
        type: 'error'
      });
    }
  };

  // 下载压缩后的PDF
  const downloadPdfFile = (fileItem: FileItem) => {
    const blob = compressedPdfResults.get(fileItem.id);
    if (!blob) {
      console.error('No compressed blob found for file:', fileItem.id);
      return;
    }

    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      // 生成安全的文件名
      const nameParts = fileItem.name.split('.');
      nameParts.pop(); // 移除原扩展名
      const baseName = nameParts.join('.').replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
      const filename = `${baseName}_compressed.pdf`;
      
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      
      // 使用 MouseEvent 触发点击
      const clickEvent = new MouseEvent('click', {
        bubbles: false,
        cancelable: true,
        view: window
      });
      a.dispatchEvent(clickEvent);
      
      // 延迟清理
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      addNotification({
        title: '下载已开始',
        message: `文件 "${filename}" 正在下载`,
        type: 'success'
      });
    } catch (error) {
      console.error('Download failed:', error);
      addNotification({
        title: '下载失败',
        message: '请重试或检查浏览器设置',
        type: 'error'
      });
    }
  };

  // ========== 通用函数 ==========

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 智能识别文字中的数字
  const extractNumbers = (input: string): string => {
    return input.replace(/[^\d+\-*\/()\s]/g, '');
  };

  // 计算表达式
  const calculateExpression = (expression: string): { result: number; steps: string[] } => {
    try {
      const cleanExpr = expression.replace(/\s/g, '');
      const result = eval(cleanExpr);
      const steps: string[] = [];
      
      if (cleanExpr.includes('+')) {
        const parts = cleanExpr.split('+');
        let tempResult = 0;
        for (let i = 0; i < parts.length; i++) {
          const partResult = eval(parts[i]);
          tempResult += partResult;
          if (i === 0) {
            steps.push(`${partResult}`);
          } else {
            steps.push(`${steps[steps.length - 1]}+${partResult}=${tempResult}`);
          }
        }
      } else if (cleanExpr.includes('*')) {
        const parts = cleanExpr.split('*');
        let tempResult = 1;
        for (let i = 0; i < parts.length; i++) {
          const partResult = eval(parts[i]);
          tempResult *= partResult;
          if (i === 0) {
            steps.push(`${partResult}`);
          } else {
            steps.push(`${steps[steps.length - 1]}*${partResult}=${tempResult}`);
          }
        }
      } else {
        steps.push(`${cleanExpr}=${result}`);
      }
      
      return { result, steps };
    } catch (error) {
      throw new Error('计算表达式出错');
    }
  };

  // 计算收入
  const calculateIncome = () => {
    if (!incomeInput.trim()) {
      addNotification({
        title: '输入错误',
        message: '请输入收入计算表达式',
        type: 'error'
      });
      return;
    }

    try {
      const expression = extractNumbers(incomeInput);
      const { result, steps } = calculateExpression(expression);
      
      setIncomeResult(result);
      setCalculationSteps(steps);
    } catch (error) {
      addNotification({
        title: '计算错误',
        message: '表达式格式错误，请检查输入',
        type: 'error'
      });
    }
  };

  // 复制结果
  const copyResult = () => {
    if (incomeResult !== null) {
      navigator.clipboard.writeText(incomeResult.toString());
      addNotification({
        title: '已复制',
        message: `结果 ${incomeResult} 已复制到剪贴板`,
        type: 'success'
      });
    }
  };

  // 渲染图片文件列表
  const renderImageFileList = () => (
    <div className="space-y-2">
      {imageFiles.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>点击或拖拽图片到此处</p>
          <p className="text-sm">支持 JPG、PNG、GIF 等格式</p>
        </div>
      ) : (
        <div className="space-y-2">
          {imageFiles.map((file) => (
            <div key={file.id} className={`flex items-center justify-between p-3 rounded-lg ${
              file.status === 'completed' ? 'bg-green-50 border border-green-200' : 
              file.status === 'error' ? 'bg-red-50 border border-red-200' : 
              'bg-accent'
            }`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <ImageIcon className="h-5 w-5 text-blue-500" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>原：{formatFileSize(file.size)}</span>
                    {file.status === 'pending' && file.estimatedSize && (
                      <>
                        <span>→</span>
                        <span className="text-amber-600">
                          预计：{formatFileSize(file.estimatedSize)}
                        </span>
                      </>
                    )}
                    {file.compressedSize && (
                      <>
                        <span>→</span>
                        <span className="text-green-600">
                          压后：{formatFileSize(file.compressedSize)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          -{Math.round((1 - file.compressedSize / file.size) * 100)}%
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {file.status === 'completed' && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      downloadImageFile(file);
                    }}
                    type="button"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    removeImageFile(file.id);
                  }}
                  type="button"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                clearImageFiles();
              }} 
              className="flex-1"
              type="button"
            >
              清空
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                imageFileInputRef.current?.click();
              }} 
              className="flex-1"
              type="button"
            >
              添加更多
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // 渲染PDF文件列表
  const renderPdfFileList = () => (
    <div className="space-y-2">
      {pdfFiles.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>点击或拖拽PDF到此处</p>
          <p className="text-sm">支持 PDF 格式</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pdfFiles.map((file) => (
            <div key={file.id} className={`flex items-center justify-between p-3 rounded-lg ${
              file.status === 'completed' ? 'bg-green-50 border border-green-200' : 
              file.status === 'error' ? 'bg-red-50 border border-red-200' : 
              'bg-accent'
            }`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="h-5 w-5 text-red-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>原：{formatFileSize(file.size)}</span>
                    
                    {/* 显示预计大小（当不在处理中且没有压缩结果时） */}
                    {file.status !== 'processing' && !file.compressedSize && (
                      <>
                        <span>→</span>
                        <span className="text-amber-600">
                          预计：{formatFileSize(getPdfEstimatedSize(file.size, pdfCompressionLevel))}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {pdfCompressionMode === 'light' ? '轻度' : `强力${pdfCompressionLevel}档`}
                        </Badge>
                      </>
                    )}
                    
                    {file.status === 'processing' && (
                      <Badge variant="outline" className="text-xs">压缩中...</Badge>
                    )}
                    {file.status === 'error' && (
                      <Badge variant="destructive" className="text-xs">失败</Badge>
                    )}
                    {file.compressedSize && (
                      <>
                        <span>→</span>
                        {file.compressedSize >= file.size ? (
                          <>
                            <span className="text-amber-600">
                              压后：{formatFileSize(file.compressedSize)}
                            </span>
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                              已是最小
                            </Badge>
                          </>
                        ) : (
                          <>
                            <span className="text-green-600">
                              压后：{formatFileSize(file.compressedSize)}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              -{Math.round((1 - file.compressedSize / file.size) * 100)}%
                            </Badge>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {file.status === 'completed' && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      downloadPdfFile(file);
                    }}
                    type="button"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    removePdfFile(file.id);
                  }}
                  type="button"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                clearPdfFiles();
              }} 
              className="flex-1"
              type="button"
            >
              清空
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                pdfFileInputRef.current?.click();
              }} 
              className="flex-1"
              type="button"
            >
              添加更多
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="income">
            <Zap className="h-4 w-4 mr-2" />
            收入计算
          </TabsTrigger>
          <TabsTrigger value="pdf">
            <FileText className="h-4 w-4 mr-2" />
            PDF压缩
          </TabsTrigger>
          <TabsTrigger value="image">
            <ImageIcon className="h-4 w-4 mr-2" />
            图片压缩
          </TabsTrigger>
        </TabsList>

        {/* 收入计算 */}
        <TabsContent value="income" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                收入计算
              </CardTitle>
              <CardDescription>智能识别文字中的数字，支持加减乘除和括号计算</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>计算表达式</Label>
                <Input
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(e.target.value)}
                  placeholder="例如：工资5000+奖金3000*12+年终奖24000"
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  支持数字、运算符(+,-,*,/)、括号()，智能识别文字中的数字
                </p>
              </div>

              <Button onClick={calculateIncome} className="w-full">
                计算
              </Button>

              {incomeResult !== null && (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">计算结果</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyResult}
                        className="flex items-center gap-1"
                      >
                        <Copy className="h-4 w-4" />
                        复制为纯数字
                      </Button>
                    </div>
                    <p className="text-3xl font-bold text-primary">
                      {incomeResult}
                    </p>
                  </div>

                  {calculationSteps.length > 0 && (
                    <div className="p-4 bg-accent rounded-lg">
                      <h3 className="font-medium mb-2">计算步骤</h3>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        {calculationSteps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PDF压缩 */}
        <TabsContent value="pdf" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Minimize2 className="h-5 w-5" />
                  PDF压缩
                </span>
                <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                  <Settings className="h-4 w-4 mr-1" />
                  设置
                </Button>
              </CardTitle>
              <CardDescription>压缩PDF文件大小，支持10档压缩率选择</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="file"
                ref={pdfFileInputRef}
                onChange={handlePdfFileSelect}
                accept=".pdf"
                multiple
                className="hidden"
              />
              
              <Alert variant="default" className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <p className="font-medium">选择压缩方式：</p>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                    <li><strong>轻度压缩</strong>：优化 PDF 结构，保留文本可选，速度较快</li>
                    <li><strong>强力压缩</strong>：转为压缩图像，文件更小，但无法选中文本</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div 
                onClick={(e) => {
                  // 如果点击的是按钮或其子元素，不触发文件选择
                  if ((e.target as HTMLElement).closest('button')) {
                    return;
                  }
                  if (!isProcessingPdfs) {
                    pdfFileInputRef.current?.click();
                  }
                }}
                className="cursor-pointer"
              >
                {renderPdfFileList()}
              </div>

              {pdfFiles.length > 0 && (
                <>
                  {/* 压缩模式选择 */}
                  <div className="p-4 bg-accent rounded-lg space-y-3">
                    <Label className="text-sm font-medium">压缩方式</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={pdfCompressionMode === 'light' ? 'default' : 'outline'}
                        className="h-auto py-3 flex flex-col items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setPdfCompressionMode('light');
                        }}
                        type="button"
                      >
                        <span className="font-medium">轻度压缩</span>
                        <span className="text-xs opacity-80">保留格式，速度较快</span>
                      </Button>
                      <Button
                        variant={pdfCompressionMode === 'heavy' ? 'default' : 'outline'}
                        className="h-auto py-3 flex flex-col items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setPdfCompressionMode('heavy');
                        }}
                        type="button"
                      >
                        <span className="font-medium">强力压缩</span>
                        <span className="text-xs opacity-80">转为图像，文件更小</span>
                      </Button>
                    </div>
                  </div>

                  {/* 目标大小输入 */}
                  <div className="p-4 bg-accent rounded-lg space-y-3">
                    <Label className="text-sm font-medium">目标文件大小（MB，可选）</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={pdfTargetSizeMB}
                        onChange={(e) => setPdfTargetSizeMB(e.target.value)}
                        placeholder="如：1"
                        className="flex-1"
                      />
                      {pdfTargetSizeMB && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPdfTargetSizeMB('')}
                          className="shrink-0"
                        >
                          清除
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      输入目标大小后，系统将自动计算合适的压缩档位
                    </p>
                  </div>

                  {/* 强力压缩时显示档位选择 */}
                  {pdfCompressionMode === 'heavy' && (
                    <div className="p-4 bg-accent rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">压缩强度</span>
                        <div className="flex items-center gap-2">
                          <Badge>{pdfCompressionLevels.find(l => l.value === pdfCompressionLevel)?.label}</Badge>
                          {pdfTargetSizeMB && (
                            <span className="text-xs text-muted-foreground">自动</span>
                          )}
                        </div>
                      </div>
                      <Slider
                        value={[pdfCompressionLevel]}
                        onValueChange={(v) => {
                          setPdfCompressionLevel(v[0]);
                          // 手动调整时清除目标大小
                          if (pdfTargetSizeMB) {
                            setPdfTargetSizeMB('');
                          }
                        }}
                        min={1}
                        max={10}
                        step={1}
                        className="mb-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>高质量</span>
                        <span>中等</span>
                        <span>最小文件</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {pdfCompressionLevels.find(l => l.value === pdfCompressionLevel)?.description}
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={handleCompressPdfs} 
                    disabled={isProcessingPdfs}
                    className="w-full"
                  >
                    {isProcessingPdfs ? '压缩中...' : (pdfCompressionMode === 'light' ? '轻度压缩' : '强力压缩')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 图片压缩 */}
        <TabsContent value="image" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  图片压缩
                </span>
                <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                  <Settings className="h-4 w-4 mr-1" />
                  设置
                </Button>
              </CardTitle>
              <CardDescription>压缩图片文件，支持20档精细压缩调节</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="file"
                ref={imageFileInputRef}
                onChange={handleImageFileSelect}
                accept="image/*"
                multiple
                className="hidden"
              />
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  图片压缩支持20档调节，档位1为原图，档位20为最大压缩。
                  PNG格式在高压缩时会转换为JPEG以获得更好效果。
                </AlertDescription>
              </Alert>

              <div 
                onClick={(e) => {
                  // 如果点击的是按钮或其子元素，不触发文件选择
                  if ((e.target as HTMLElement).closest('button')) {
                    return;
                  }
                  if (!isProcessingImages) {
                    imageFileInputRef.current?.click();
                  }
                }}
                className="cursor-pointer"
              >
                {renderImageFileList()}
              </div>

              {imageFiles.length > 0 && (
                <>
                  <div className="p-4 bg-accent rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">压缩档位</span>
                      <div className="flex items-center gap-2">
                        <Badge>{imageCompressionLevels.find(l => l.value === imageCompressionLevel)?.label}</Badge>
                        <span className="text-xs text-muted-foreground">
                          第{imageCompressionLevel}档
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>原图</span>
                        <span>10</span>
                        <span>20(最大压缩)</span>
                      </div>
                      <Slider
                        value={[imageCompressionLevel]}
                        onValueChange={(v) => {
                          const newLevel = v[0];
                          setImageCompressionLevel(newLevel);
                          // 更新所有待处理文件的预计大小
                          const quality = imageCompressionLevels.find(l => l.value === newLevel)?.quality || 0.5;
                          setImageFiles(prev => prev.map(f => {
                            if (f.status === 'pending') {
                              return { ...f, estimatedSize: getImageEstimatedSize(f.size, newLevel) };
                            }
                            return f;
                          }));
                        }}
                        min={1}
                        max={20}
                        step={1}
                      />
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {imageCompressionLevels.find(l => l.value === imageCompressionLevel)?.description}
                    </p>
                    
                    {/* 显示预计压缩后大小汇总 */}
                    {imageFiles.some(f => f.status === 'pending') && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">
                          预计总大小：
                          <span className="font-medium text-foreground">
                            {formatFileSize(imageFiles
                              .filter(f => f.status === 'pending')
                              .reduce((sum, f) => sum + (f.estimatedSize || getImageEstimatedSize(f.size, imageCompressionLevel)), 0))}
                          </span>
                          <span className="mx-1">/</span>
                          <span>{formatFileSize(imageFiles
                            .filter(f => f.status === 'pending')
                            .reduce((sum, f) => sum + f.size, 0))}</span>
                          {(() => {
                            const original = imageFiles.filter(f => f.status === 'pending').reduce((sum, f) => sum + f.size, 0);
                            const estimated = imageFiles.filter(f => f.status === 'pending').reduce((sum, f) => sum + (f.estimatedSize || getImageEstimatedSize(f.size, imageCompressionLevel)), 0);
                            return original > 0 ? (
                              <Badge variant="secondary" className="ml-2">
                                预计节省 {Math.round((1 - estimated / original) * 100)}%
                              </Badge>
                            ) : null;
                          })()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>目标大小（MB，可选）</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={imageTargetSize}
                      onChange={(e) => setImageTargetSize(e.target.value)}
                      placeholder="如：1"
                    />
                    <p className="text-xs text-muted-foreground">
                      设置目标大小后，系统将自动选择合适的压缩档位
                    </p>
                  </div>

                  <Button 
                    onClick={handleCompressImages} 
                    disabled={isProcessingImages}
                    className="w-full"
                  >
                    {isProcessingImages ? '压缩中...' : '开始压缩'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 压缩设置对话框 */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>压缩设置说明</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* 图片压缩档位 */}
            <div className="space-y-2">
              <Label className="text-base font-medium">图片压缩档位（20档）</Label>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {imageCompressionLevels.map((level) => (
                  <div key={level.value} className="flex items-start gap-2 p-2 bg-accent rounded text-sm">
                    <Badge variant={imageCompressionLevel === level.value ? 'default' : 'secondary'} className="shrink-0">
                      {level.value}
                    </Badge>
                    <div>
                      <p className="font-medium">{level.label}</p>
                      <p className="text-xs text-muted-foreground">{level.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* PDF压缩档位 */}
            <div className="space-y-2">
              <Label className="text-base font-medium">PDF压缩档位（10档）</Label>
              <div className="grid grid-cols-2 gap-2">
                {pdfCompressionLevels.map((level) => (
                  <div key={level.value} className="flex items-start gap-2 p-2 bg-accent rounded text-sm">
                    <Badge variant={pdfCompressionLevel === level.value ? 'default' : 'secondary'} className="shrink-0">
                      {level.value}
                    </Badge>
                    <div>
                      <p className="font-medium">{level.label}</p>
                      <p className="text-xs text-muted-foreground">{level.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSettings(false)}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
