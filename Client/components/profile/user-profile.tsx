import { TerminalBox } from "@/components/ui/terminal-box";
import { TerminalHeader } from "@/components/ui/terminal-header";
import { useAuth } from "@/hooks/use-auth";
import { UserCircle } from "lucide-react";

interface UserProfileProps {
  className?: string;
}

export function UserProfile({ className }: UserProfileProps) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <TerminalBox className={className}>
      <TerminalHeader title="IDENTIFICATION@SYSTEM:~$" color="green" />
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-terminal-darkgray rounded-full flex items-center justify-center border border-terminal-green text-terminal-green">
          <UserCircle size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-terminal-purple">{user.username}</p>
          <div className="flex items-center text-xs text-gray-400">
            <span>Aura:</span>
            <span className={`ml-1 ${
              user.aura === "mystique" ? "text-terminal-green" :
              user.aura === "provocateur" ? "text-terminal-red" :
              user.aura === "sage" ? "text-terminal-blue" :
              user.aura === "poète" ? "text-terminal-yellow" :
              user.aura === "troll" ? "text-terminal-purple" :
              "text-gray-400"
            }`}>
              {user.aura.charAt(0).toUpperCase() + user.aura.slice(1)}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-2 border-t border-terminal-darkgray">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="text-gray-400">FOLLOWERS</p>
            <p className="text-terminal-blue font-semibold text-sm">{user.followerCount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400">IMPACT</p>
            <p className="text-terminal-yellow font-semibold text-sm">
              {Math.min(100, Math.max(0, Math.floor(user.followerCount / 10))).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-gray-400">RANG</p>
            <p className="text-terminal-purple font-semibold text-sm">#?</p>
          </div>
        </div>
      </div>
    </TerminalBox>
  );
}
