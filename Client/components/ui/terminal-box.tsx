import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TerminalBoxProps {
  children: ReactNode;
  className?: string;
}

export function TerminalBox({ children, className }: TerminalBoxProps) {
  return (
    <div className={cn(
      "bg-terminal-gray rounded-md p-4 border border-terminal-green/30 relative overflow-hidden terminal-box",
      className
    )}>
      {children}
    </div>
  );
}
