import { useState, useEffect, useRef } from "react";
import { TerminalBox } from "@/components/ui/terminal-box";
import { TerminalHeader } from "@/components/ui/terminal-header";
import { MessageSquareText, Users } from "lucide-react";
import { ChatMessage } from "@/components/chat/chat-message";
import { MessageInput } from "@/components/chat/message-input";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";

interface Message {
  id: number;
  content: string;
  userId: number;
  username: string;
  aura: string;
  upvotes: number;
  downvotes: number;
  isOneShot: boolean;
  viewed: boolean;
  createdAt: string;
}

interface ChatRoomProps {
  roomId: number;
  roomName: string;
  roomDescription: string;
  roomColor: string;
  className?: string;
}

export function ChatRoom({ roomId, roomName, roomDescription, roomColor, className }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const ws = useWebSocket();
  
  const colorMap: Record<string, string> = {
    "green": "text-terminal-green",
    "blue": "text-terminal-blue",
    "red": "text-terminal-red",
    "yellow": "text-terminal-yellow",
    "purple": "text-terminal-purple",
    "gray": "text-gray-400"
  };
  
  const headerColor = roomColor in colorMap ? roomColor as keyof typeof colorMap : "green";
  
  // Fetch messages for this room
  const { data, isLoading } = useQuery<Message[]>({
    queryKey: [`/api/rooms/${roomId}/messages`],
    enabled: roomId > 0,
  });
  
  // Update messages when data changes
  useEffect(() => {
    if (data) {
      setMessages(data);
    }
  }, [data]);
  
  // Connect to WebSocket
  useEffect(() => {
    if (ws.status === "disconnected") {
      ws.connect();
    }
    
    return () => {
      if (ws.status === "connected") {
        ws.leaveRoom();
      }
    };
  }, [ws]);
  
  // Join the room when connected
  useEffect(() => {
    if (ws.status === "connected" && user) {
      ws.joinRoom(roomId, user.id);
      
      // Register event listeners
      const removeListener = ws.addMessageListener((message) => {
        switch (message.type) {
          case "NEW_MESSAGE":
            setMessages(prev => [message.payload, ...prev]);
            break;
          case "VOTE_UPDATE":
            setMessages(prev => 
              prev.map(msg => 
                msg.id === message.payload.messageId
                  ? { ...msg, upvotes: message.payload.upvotes, downvotes: message.payload.downvotes }
                  : msg
              )
            );
            break;
          case "ROOM_USERS_COUNT":
            setActiveUsers(message.payload.count);
            break;
          default:
            break;
        }
      });
      
      // Cleanup listener on unmount
      return removeListener;
    }
  }, [ws, ws.status, roomId, user]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const handleReply = (username: string) => {
    setReplyTo(username);
  };
  
  const clearReply = () => {
    setReplyTo(null);
  };

  return (
    <div className={className}>
      <TerminalBox className="mb-4">
        <div className="flex justify-between items-center">
          <h2 className={`text-md font-semibold ${colorMap[headerColor]}`}>
            <MessageSquareText size={16} className="inline mr-1" /> 
            <span>Salon: {roomName.toUpperCase()}</span>
          </h2>
          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <span><Users size={14} className="inline mr-1" /> {activeUsers || "?"}</span>
            <span className="bg-terminal-green w-2 h-2 rounded-full animate-pulse"></span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">{roomDescription}</p>
      </TerminalBox>
      
      <TerminalBox className="h-96 overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-terminal-green/40 scrollbar-track-terminal-darkgray">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-terminal-green animate-pulse">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-gray-400">No messages yet. Be the first to write something!</div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                id={message.id}
                content={message.content}
                username={message.username}
                aura={message.aura}
                upvotes={message.upvotes}
                downvotes={message.downvotes}
                createdAt={message.createdAt}
                isOneShot={message.isOneShot}
                onReply={handleReply}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </TerminalBox>
      
      <MessageInput 
        roomId={roomId} 
        replyTo={replyTo} 
        onClearReply={clearReply}
      />
    </div>
  );
}
