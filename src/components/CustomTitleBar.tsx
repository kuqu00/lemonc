import { X, Minus, Square } from 'lucide-react';
import { useState } from 'react';

interface CustomTitleBarProps {
  title: string;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

export function CustomTitleBar({
  title,
  onMinimize,
  onMaximize,
  onClose
}: CustomTitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
    onMaximize?.();
  };

  return (
    <div
      className="h-8 bg-background border-b flex items-center justify-between px-4 select-none"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 cursor-pointer transition-colors" />
        <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 cursor-pointer transition-colors" />
        <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 cursor-pointer transition-colors" />
      </div>

      <div className="text-sm font-medium text-foreground/70" data-tauri-drag-region>
        {title}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onMinimize}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
        >
          <Minus className="h-3 w-3" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
        >
          <Square className="h-3 w-3" />
        </button>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-500 hover:text-white transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
