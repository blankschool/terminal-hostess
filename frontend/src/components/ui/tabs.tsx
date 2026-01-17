import * as React from "react";
import { cn } from "@/lib/utils";

type TabsValue = string;

interface TabsContextProps {
  value: TabsValue;
  setValue: (v: TabsValue) => void;
}

const TabsContext = React.createContext<TabsContextProps | null>(null);

export function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  children,
  className,
}: {
  defaultValue?: TabsValue;
  value?: TabsValue;
  onValueChange?: (v: TabsValue) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [uncontrolled, setUncontrolled] = React.useState<TabsValue>(
    controlled ?? defaultValue ?? ""
  );
  const value = controlled ?? uncontrolled;
  const setValue = (v: TabsValue) => {
    if (onValueChange) onValueChange(v);
    setUncontrolled(v);
  };
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-xl bg-secondary/60 p-1 border border-border",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: React.HTMLAttributes<HTMLButtonElement> & { value: string }) {
  const ctx = React.useContext(TabsContext);
  const isActive = ctx?.value === value;
  return (
    <button
      onClick={() => ctx?.setValue(value)}
      className={cn(
        "px-3 py-2 rounded-lg text-sm font-semibold transition border border-transparent",
        isActive
          ? "bg-primary text-primary-foreground shadow"
          : "text-foreground/80 hover:bg-secondary/60 border-border/70",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const ctx = React.useContext(TabsContext);
  if (ctx?.value !== value) return null;
  return <div className={cn("mt-4", className)}>{children}</div>;
}
