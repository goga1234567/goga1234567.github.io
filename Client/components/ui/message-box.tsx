import { useState } from "react";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { ArrowUp, ArrowDown, Reply } from "lucide-react";

interface MessageBoxProps {
  id: number;
  username: string;
  content: string;
  timestamp: string;
  aura: string;
  upvotes: number;
  downvotes: number;
  isOneShot?: boolean;
  selfDestructMessage?: string;
  onReply?: (username: string) => void;
  className?: string;
}

export function MessageBox({
  id,
  username,
  content,
  timestamp,
  aura,
  upvotes,
  downvotes,
  isOneShot = false,
  selfDestructMessage,
  onReply,
  className
}: MessageBoxProps) {
  const { user } = useAuth();
  const [voteState, setVoteState] = useState({
    upvotes,
    downvotes
  });

  const auraColors = {
    mystique: "text-terminal-green border-terminal-green",
    provocateur: "text-terminal-red border-terminal-red",
    sage: "text-terminal-blue border-terminal-blue",
    poète: "text-terminal-yellow border-terminal-yellow",
    troll: "text-terminal-purple border-terminal-purple",
  };

  const auraColor = auraColors[aura as keyof typeof auraColors] || "text-gray-400 border-gray-400";

  const voteMutation = useMutation({
    mutationFn: async ({ messageId, isUpvote }: { messageId: number, isUpvote: boolean }) => {
      const res = await apiRequest("POST", `/api/messages/${messageId}/vote`, { isUpvote });
      return await res.json();
    },
    onSuccess: (data) => {
      setVoteState({
        upvotes: data.upvotes,
        downvotes: data.downvotes
      });
    }
  });

  const handleVote = (isUpvote: boolean) => {
    if (!user || user.username === username) return; // Can't vote on your own messages
    voteMutation.mutate({ messageId: id, isUpvote });
  };

  const handleReply = () => {
    if (onReply) {
      onReply(username);
    }
  };

  return (
    <div className={cn("message-box mb-4", className)}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-2 text-xs text-gray-400">[{timestamp}]</div>
        <div className="w-full">
          <div className="flex items-center">
            <span className={cn("font-semibold mr-1", {
              "text-terminal-green": aura === "mystique",
              "text-terminal-red": aura === "provocateur",
              "text-terminal-blue": aura === "sage",
              "text-terminal-yellow": aura === "poète",
              "text-terminal-purple": aura === "troll",
            })}>
              {username}
            </span>
            <span className={cn("text-xs px-1 rounded border", auraColor)}>
              {aura}
            </span>
          </div>
          
          {isOneShot ? (
            <div className="bg-terminal-darkgray border-l-2 border-terminal-green p-2 rounded text-sm text-gray-300 mt-1">
              <p className="text-xs italic">ONE-SHOT MESSAGE:</p>
              <p>{content}</p>
              {selfDestructMessage && (
                <p className="text-xs text-gray-400 mt-1 text-right">{selfDestructMessage}</p>
              )}
            </div>
          ) : (
            <p className="text-sm mt-1">{content}</p>
          )}
          
          <div className="flex items-center mt-1 space-x-3 text-xs">
            <button 
              onClick={() => handleVote(true)}
              disabled={!user || user.username === username || voteMutation.isPending}
              className={cn(
                "flex items-center gap-1 transition-colors", 
                user && user.username !== username 
                  ? "hover:text-terminal-green cursor-pointer" 
                  : "cursor-not-allowed opacity-50"
              )}
            >
              <ArrowUp size={12} className="text-terminal-green" />
              <span className="text-terminal-green">{voteState.upvotes}</span>
            </button>
            
            <button 
              onClick={() => handleVote(false)}
              disabled={!user || user.username === username || voteMutation.isPending}
              className={cn(
                "flex items-center gap-1 transition-colors", 
                user && user.username !== username 
                  ? "hover:text-terminal-red cursor-pointer" 
                  : "cursor-not-allowed opacity-50"
              )}
            >
              <ArrowDown size={12} className="text-terminal-red" />
              <span className="text-terminal-red">{voteState.downvotes}</span>
            </button>
            
            <button 
              onClick={handleReply}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <Reply size={12} />
              <span>Reply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
