import { createContext, useContext, useState, useEffect, useRef } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const remove = (id) =>
    setToasts((current) => current.filter((t) => t.id !== id));
  const notify = (message, type = "success") => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current.slice(-3), { id, message, type }]);
    timers.current.push(setTimeout(() => remove(id), 6000));
  };
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast ${t.type}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {t.type === "error" ? (
                <AlertCircle size={20} />
              ) : (
                <CheckCircle2 size={20} />
              )}
              <span>{t.message}</span>
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => remove(t.id)}
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
