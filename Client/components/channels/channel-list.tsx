import { TerminalBox } from "@/components/ui/terminal-box";
import { TerminalHeader } from "@/components/ui/terminal-header";
import { Hash } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Channel {
  id: number;
  name: string;
  color: string;
}

interface ChannelListProps {
  activeChannel: number;
  onChannelSelect: (channelId: number) => void;
  className?: string;
}

export function ChannelList({ activeChannel, onChannelSelect, className }: ChannelListProps) {
  const { data: channels, isLoading } = useQuery<Channel[]>({
    queryKey: ["/api/rooms"],
  });

  const getChannelColor = (color: string) => {
    switch (color) {
      case "green": return "text-terminal-green";
      case "blue": return "text-terminal-blue";
      case "red": return "text-terminal-red";
      case "purple": return "text-terminal-purple";
      case "yellow": return "text-terminal-yellow";
      default: return "text-gray-400";
    }
  };

  return (
    <TerminalBox className={className}>
      <TerminalHeader title="SALONS@ACTIFS:~$" color="yellow" />
      
      {isLoading ? (
        <div className="text-center py-4 text-gray-400">Loading channels...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {channels?.map(channel => (
            <div 
              key={channel.id}
              className={`
                bg-terminal-darkgray rounded px-3 py-2 flex justify-between items-center 
                group hover:bg-terminal-lightgray transition-colors duration-300 cursor-pointer
                ${channel.id === activeChannel ? 'bg-terminal-lightgray' : ''}
              `}
              onClick={() => onChannelSelect(channel.id)}
            >
              <div className="flex items-center">
                <Hash size={14} className={`${getChannelColor(channel.color)} mr-2`} />
                <span className="text-sm">{channel.name.toUpperCase()}</span>
              </div>
              <span className={`text-xs text-gray-400 group-hover:${getChannelColor(channel.color)} transition-colors duration-300`}>
                {Math.floor(Math.random() * 100)}
              </span>
            </div>
          ))}
        </div>
      )}
    </TerminalBox>
  );
}
