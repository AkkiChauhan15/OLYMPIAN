import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpRight,
  Dumbbell,
  RefreshCw,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

export function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
export function Panel({ children, className = "", ...props }) {
  return (
    <section className={`panel ${className}`} {...props}>
      {children}
    </section>
  );
}
export function PanelHeading({
  title,
  subtitle,
  to,
  linkText = "View all",
  children,
}) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {to ? (
        <Link className="text-link" to={to}>
          {linkText}
          <ArrowUpRight size={15} />
        </Link>
      ) : (
        children
      )}
    </div>
  );
}
export function Empty({
  icon: Icon = Dumbbell,
  title,
  description,
  to,
  action,
  compact = false,
}) {
  return (
    <div className={`empty-state ${compact ? "compact" : ""}`}>
      <div className="empty-icon">
        <Icon size={25} strokeWidth={1.5} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {to && (
        <Link className="button secondary small" to={to}>
          {action || "Get started"}
          <ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function ErrorState({ error, onRetry, compact = false }) {
  return (
    <div className={`error-state ${compact ? "compact" : ""}`} role="alert">
      <AlertCircle size={22} />
      <div>
        <h3>We couldn’t load this</h3>
        <p>{error?.message || "Something went wrong. Please try again."}</p>
      </div>
      {onRetry && (
        <button className="button secondary small" onClick={onRetry}>
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}
export function Skeleton({ lines = 3, className = "" }) {
  return (
    <div
      className={`skeleton-group ${className}`}
      role="status"
      aria-label="Loading data"
    >
      {Array.from({ length: lines }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
export function Resource({ resource, children, skeletonLines = 3 }) {
  if (resource.loading) return <Skeleton lines={skeletonLines} />;
  if (resource.error)
    return <ErrorState error={resource.error} onRetry={resource.reload} />;
  return children(resource.data);
}
export function Badge({ children, color = "lime" }) {
  return <span className={`badge ${color}`}>{children}</span>;
}
export function Avatar({ name, size = "" }) {
  const letters = (name || "Athlete")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("");
  return (
    <span className={`avatar ${size}`} aria-hidden="true">
      {letters}
    </span>
  );
}
export function PageTransition({ children }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.25 }}
    >
      {children}
    </motion.div>
  );
}
export function Modal({ title, description, children, onClose, busy = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const element = ref.current;
    const previousFocus = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) closeRef.current();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) closeRef.current();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">MAKE IT COUNT</p>
            <h2 id="modal-title">{title}</h2>
            {description && <p id="modal-description">{description}</p>}
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={busy}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
