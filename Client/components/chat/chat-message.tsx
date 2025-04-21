import { MessageBox } from "@/components/ui/message-box";
import { format } from "date-fns";

interface ChatMessageProps {
  id: number;
  content: string;
  username: string;
  aura: string;
  upvotes: number;
  downvotes: number;
  createdAt: Date | string;
  isOneShot: boolean;
  onReply: (username: string) => void;
}

export function ChatMessage({
  id,
  content,
  username,
  aura,
  upvotes,
  downvotes,
  createdAt,
  isOneShot,
  onReply
}: ChatMessageProps) {
  // Format the timestamp
  const timestamp = typeof createdAt === 'string'
    ? format(new Date(createdAt), "HH:mm")
    : format(createdAt, "HH:mm");

  return (
    <MessageBox
      id={id}
      username={username}
      content={content}
      timestamp={timestamp}
      aura={aura}
      upvotes={upvotes}
      downvotes={downvotes}
      isOneShot={isOneShot}
      selfDestructMessage={isOneShot ? "Ce message s'autodétruira après lecture" : undefined}
      onReply={onReply}
    />
  );
}
