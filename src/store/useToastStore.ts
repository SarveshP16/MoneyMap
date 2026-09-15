import { create } from 'zustand';

// Equivalent to app_snackbar.dart's showAppSnackBar: a brief message with an
// optional "Undo" action, used after every delete throughout Finance.
export interface Toast {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, opts?: { actionLabel?: string; onAction?: () => void }) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, opts) => {
    const id = crypto.randomUUID();
    set({ toasts: [...get().toasts, { id, message, ...opts }] });
    setTimeout(() => get().dismiss(id), 5000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
