import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// GLOBAL SCROLL-LOCK MANAGER (Handles nested dialogs, scroll position, and shift)
// ============================================================================

let scrollLockCount = 0;
let cleanupScrollListeners: (() => void) | null = null;

export function lockScroll(): void {
  if (typeof window === 'undefined') return;

  if (scrollLockCount === 0) {
    // Intercept scroll events at window level without mutating documentElement/body overflow,
    // which prevents breaking position:sticky on the sidebar and header.
    const preventBackgroundScroll = (e: WheelEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      // Allow scrolling if event originated inside a scrollable modal container
      if (target && target.closest('[data-modal-scrollable="true"]')) {
        return;
      }
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const preventKeyScroll = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (target && target.closest('[data-modal-scrollable="true"]')) {
        return;
      }
      const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
      if (scrollKeys.includes(e.key)) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', preventBackgroundScroll, { passive: false });
    window.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
    window.addEventListener('keydown', preventKeyScroll, { passive: false });

    cleanupScrollListeners = () => {
      window.removeEventListener('wheel', preventBackgroundScroll);
      window.removeEventListener('touchmove', preventBackgroundScroll);
      window.removeEventListener('keydown', preventKeyScroll);
    };
  }

  scrollLockCount++;
}

export function unlockScroll(): void {
  if (typeof window === 'undefined') return;

  scrollLockCount = Math.max(0, scrollLockCount - 1);

  if (scrollLockCount === 0 && cleanupScrollListeners) {
    cleanupScrollListeners();
    cleanupScrollListeners = null;
  }
}

/**
 * Reusable hook to lock/unlock background scrolling.
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [locked]);
}

// ============================================================================
// SHARED MODAL PORTAL (Attaches directly to document.body, full viewport)
// ============================================================================

export interface ModalPortalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  backdropClassName?: string;
  closeOnEscape?: boolean;
}

export const ModalPortal: React.FC<ModalPortalProps> = ({
  isOpen,
  onClose,
  children,
  backdropClassName = 'bg-slate-950/60 backdrop-blur-md',
  closeOnEscape = true,
}) => {
  useScrollLock(isOpen);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen || !closeOnEscape || !onClose) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          style={{
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            margin: 0,
          }}
        >
          {/* Viewport-filling Backdrop (Covers top, header, sidebar, and content) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`fixed inset-0 ${backdropClassName}`}
            style={{
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
            }}
            onClick={onClose}
          />

          {/* Centered Modal Content Container (Stays above backdrop, scrollable when long) */}
          <div className="relative z-10 w-full flex items-center justify-center pointer-events-none my-auto">
            <div
              data-modal-scrollable="true"
              className="pointer-events-auto w-full flex justify-center max-h-[92vh] overflow-y-auto"
              style={{ overscrollBehavior: 'contain' }}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ModalPortal;
