import { X } from 'lucide-react';
import { useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-neo-white border-4 border-neo-black shadow-neo w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b-4 border-neo-black bg-neo-main">
          <h3 className="text-xl font-black uppercase">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-neo-black hover:text-neo-white transition-colors border-2 border-transparent hover:border-neo-white">
            <X size={24} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

