import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from './Button';

export function FormDrawer({
  open,
  onClose,
  title,
  onDelete,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  onDelete?: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60"
          />
          <motion.div
            role="dialog"
            aria-modal
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-panel"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-lg font-semibold text-ink-bright">{title}</h2>
              <div className="flex items-center gap-1">
                {onDelete && (
                  <IconButton onClick={onDelete} className="hover:text-coral" aria-label="Delete">
                    <Trash2 size={18} />
                  </IconButton>
                )}
                <IconButton onClick={onClose} aria-label="Close">
                  <X size={18} />
                </IconButton>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 no-scrollbar">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
