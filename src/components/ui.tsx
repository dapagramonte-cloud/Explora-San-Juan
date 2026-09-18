import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "ghost" | "danger" }) {
  const base = "px-3 py-1.5 rounded-md text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed";
  const styles: Record<string, string> = {
    default: "bg-studio-panel2 text-studio-text border border-studio-border hover:border-studio-accent",
    primary: "bg-gradient-to-r from-studio-accent to-studio-accent2 text-white hover:opacity-90",
    ghost: "text-studio-muted hover:text-studio-text",
    danger: "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20",
  };
  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`studio-panel rounded-lg p-4 ${className}`} {...props} />;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-xs uppercase tracking-wider text-studio-muted mb-2 font-semibold">{children}</h3>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-studio-muted text-xs">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`studio-input rounded-md px-3 py-2 text-sm ${props.className ?? ""}`} />;
}

export function SliderRow({
  label,
  value,
  min = -100,
  max = 100,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-studio-muted">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-studio-accent"
      />
    </div>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "accent" | "warning" | "success" }) {
  const tones: Record<string, string> = {
    default: "bg-studio-panel2 text-studio-muted",
    accent: "bg-studio-accent/20 text-studio-accent",
    warning: "bg-amber-500/15 text-amber-400",
    success: "bg-emerald-500/15 text-emerald-400",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 gap-2 text-studio-muted">
      <p className="text-studio-text font-medium">{title}</p>
      <p className="text-sm max-w-sm">{description}</p>
    </div>
  );
}
