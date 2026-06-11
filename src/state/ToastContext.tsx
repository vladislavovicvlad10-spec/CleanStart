import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import clsx from "clsx";

export type ToastTone = "info" | "success" | "warning" | "error";

export interface ToastInput {
  tone?: ToastTone;
  title: string;
  details?: string[];
}

interface ToastRecord extends ToastInput {
  id: number;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION = 4600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { ...input, id }]);
      window.setTimeout(() => dismiss(id), TOAST_DURATION);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-14 right-6 z-[80] flex w-[380px] flex-col gap-2">
        {toasts.map((item) => (
          <ToastCard key={item.id} toast={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastRecord; onDismiss: () => void }) {
  const tone = toast.tone ?? "info";
  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "warning"
        ? AlertTriangle
        : tone === "error"
          ? XCircle
          : Info;

  return (
    <button
      onClick={onDismiss}
      className="animate-toast pointer-events-auto w-full rounded-xl2 border border-edge/15 bg-surface-2 p-3.5 text-left shadow-pop"
    >
      <div className="flex items-start gap-3">
        <Icon
          className={clsx(
            "mt-0.5 h-5 w-5 shrink-0",
            tone === "success" && "text-success",
            tone === "warning" && "text-warning",
            tone === "error" && "text-danger",
            tone === "info" && "text-accent",
          )}
        />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">{toast.title}</div>
          {toast.details && toast.details.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs text-muted">
              {toast.details.slice(0, 5).map((detail) => (
                <li key={detail} className="truncate">
                  {detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </button>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
