import { useEffect } from 'react';

/** Đóng popup khi click/touch bên ngoài phần tử ref (nav-hub, menu tài khoản, …). */
export const useCloseOnClickOutside = (ref, isOpen, onClose) => {
  useEffect(() => {
    if (!isOpen || !onClose) return undefined;

    const handlePointerDown = (event) => {
      const root = ref.current;
      if (!root || root.contains(event.target)) return;
      onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen, onClose, ref]);
};
