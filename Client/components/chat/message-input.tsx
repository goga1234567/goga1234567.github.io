import { useState, useRef, useEffect, FormEvent } from "react";
import { TerminalBox } from "@/components/ui/terminal-box";
import { TerminalHeader } from "@/components/ui/terminal-header";
import { Send, Zap, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface MessageInputProps {
  roomId: number;
  replyTo: string | null;
  onClearReply: () => void;
  className?: string;
}

export function MessageInput({ roomId, replyTo, onClearReply, className }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isOneShot, setIsOneShot] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const MAX_LENGTH = 280;

  useEffect(() => {
    if (replyTo && textareaRef.current) {
      setMessage(`@${replyTo} `);
      textareaRef.current.focus();
    }
  }, [replyTo]);

  const createMessageMutation = useMutation({
    mutationFn: async (data: { content: string; roomId: number; isOneShot: boolean }) => {
      const res = await apiRequest("POST", "/api/messages", data);
      return await res.json();
    },
    onSuccess: () => {
      setMessage("");
      setIsOneShot(false);
      onClearReply();
      queryClient.invalidateQueries({ queryKey: [`/api/rooms/${roomId}/messages`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    
    if (!message.trim()) return;
    if (message.length > MAX_LENGTH) {
      toast({
        title: "Message too long",
        description: `Maximum ${MAX_LENGTH} characters allowed.`,
        variant: "destructive",
      });
      return;
    }
    
    createMessageMutation.mutate({
      content: message.trim(),
      roomId,
      isOneShot,
    });
  };

  const toggleMessageType = () => {
    setIsOneShot(!isOneShot);
  };

  return (
    <TerminalBox className={className}>
      <TerminalHeader title="INPUT@MESSAGE:~$" color="green" />
      <form onSubmit={handleSubmit} className="flex">
        <textarea 
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="bg-terminal-darkgray text-gray-200 rounded-l-md px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-terminal-green resize-none h-20 font-mono"
          placeholder="Tape ton message ici... Exprime-toi, mais choisis bien tes mots."
          disabled={!user || createMessageMutation.isPending}
        />
        <div className="bg-terminal-darkgray rounded-r-md border-l border-terminal-darkgray flex flex-col justify-between">
          <button 
            type="submit"
            disabled={!user || !message.trim() || createMessageMutation.isPending}
            className="text-terminal-green hover:bg-terminal-gray px-3 py-2 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
          <button 
            type="button"
            onClick={toggleMessageType}
            disabled={!user || createMessageMutation.isPending}
            className={`${isOneShot ? 'text-terminal-blue bg-terminal-gray' : 'text-terminal-blue'} hover:bg-terminal-gray px-3 py-2 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Zap size={16} />
          </button>
          <button 
            type="button"
            disabled={!user || createMessageMutation.isPending}
            className="text-terminal-purple hover:bg-terminal-gray px-3 py-2 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={16} />
          </button>
        </div>
      </form>
      <div className="flex justify-between mt-2 text-xs">
        <div className="text-gray-400">
          <button
            type="button"
            onClick={toggleMessageType}
            className={`${isOneShot ? 'text-gray-400' : 'text-terminal-green'}`}
          >
            NORMAL
          </button> | <button
            type="button"
            onClick={toggleMessageType}
            className={`${isOneShot ? 'text-terminal-blue' : 'text-gray-400'}`}
          >
            ONE-SHOT
          </button>
        </div>
        <div className="text-gray-400">
          <span className={message.length > MAX_LENGTH ? "text-terminal-red" : ""}>
            {message.length}
          </span>/{MAX_LENGTH} caractères
        </div>
      </div>
    </TerminalBox>
  );
}
