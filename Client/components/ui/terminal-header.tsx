import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TerminalHeaderProps {
  title: string;
  color?: "green" | "blue" | "red" | "yellow" | "purple";
  className?: string;
  children?: ReactNode;
}

export function TerminalHeader({ title, color = "green", className, children }: TerminalHeaderProps) {
  const colorClasses = {
    green: "text-terminal-green",
    blue: "text-terminal-blue",
    red: "text-terminal-red",
    yellow: "text-terminal-yellow",
    purple: "text-terminal-purple",
  };

  return (
    <div className={cn(
      "terminal-header pb-2 mb-3 border-b border-terminal-green/30 flex justify-between items-center",
      className
    )}>
      <p className={cn("text-xs", colorClasses[color])}>
        {title}
      </p>
      {children}
    </div>
  );
}
