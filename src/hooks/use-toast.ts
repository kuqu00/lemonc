import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    if (options.variant === 'destructive') {
      sonnerToast.error(options.title, {
        description: options.description,
        duration: options.duration || 5000,
      });
    } else {
      sonnerToast.success(options.title, {
        description: options.description,
        duration: options.duration || 5000,
      });
    }
  };

  return { toast };
}
