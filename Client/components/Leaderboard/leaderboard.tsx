import { TerminalBox } from "@/components/ui/terminal-box";
import { TerminalHeader } from "@/components/ui/terminal-header";
import { useQuery } from "@tanstack/react-query";

interface User {
  id: number;
  username: string;
  followerCount: number;
}

interface BurnMessage {
  id: number;
  content: string;
  username: string;
  aura: string;
}

interface LeaderboardProps {
  className?: string;
}

export function Leaderboard({ className }: LeaderboardProps) {
  const { data: topUsers, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/leaderboard"],
  });

  const { data: burnOfTheDay, isLoading: isLoadingBurn } = useQuery<BurnMessage>({
    queryKey: ["/api/burn-of-the-day"],
  });

  return (
    <TerminalBox className={className}>
      <TerminalHeader title="LEADERBOARD@SYSTEM:~$" color="blue" />
      
      <h3 className="text-xs uppercase font-semibold text-terminal-green mb-2">Influenceurs du Verbe</h3>
      <div className="space-y-2">
        {isLoadingUsers ? (
          <div className="text-xs text-gray-400">Loading leaderboard...</div>
        ) : !topUsers || topUsers.length === 0 ? (
          <div className="text-xs text-gray-400">No users yet</div>
        ) : (
          topUsers.slice(0, 3).map((user, index) => (
            <div 
              key={user.id}
              className={`flex items-center justify-between py-1 px-2 rounded ${index % 2 === 0 ? 'bg-terminal-darkgray' : ''}`}
            >
              <div className="flex items-center">
                <span className={`text-sm font-semibold mr-2 ${
                  index === 0 ? "text-terminal-yellow" : 
                  index === 1 ? "text-gray-400" : 
                  "text-terminal-red"
                }`}>
                  #{index + 1}
                </span>
                <span className="text-sm">{user.username}</span>
              </div>
              <div className="text-xs text-terminal-green">{user.followerCount.toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
      
      <h3 className="text-xs uppercase font-semibold text-terminal-green mt-4 mb-2">Burn of the Day</h3>
      <div className="bg-terminal-darkgray rounded p-2 text-sm">
        {isLoadingBurn ? (
          <div className="text-xs text-gray-400">Loading burn of the day...</div>
        ) : !burnOfTheDay ? (
          <p className="text-gray-300 italic">
            "Les meilleurs burns n'ont pas encore été écrits... Sois celui qui fera l'histoire."
          </p>
        ) : (
          <>
            <p className="text-gray-300 italic">"{burnOfTheDay.content}"</p>
            <p className="text-xs text-terminal-purple mt-1">— {burnOfTheDay.username}</p>
          </>
        )}
      </div>
    </TerminalBox>
  );
}
