import { useState, useEffect } from "react";
import { Link } from "wouter";
import { UserProfile } from "@/components/profile/user-profile";
import { Leaderboard } from "@/components/leaderboard/leaderboard";
import { ChatRoom } from "@/components/chat/chat-room";
import { ChannelList } from "@/components/channels/channel-list";
import { AuraSelector } from "@/components/profile/aura-selector";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, User, Trophy, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TerminalBox } from "@/components/ui/terminal-box";
import { TerminalHeader } from "@/components/ui/terminal-header";

interface ChatRoom {
  id: number;
  name: string;
  description: string;
  color: string;
}

export default function HomePage() {
  const [activeRoomId, setActiveRoomId] = useState<number>(0);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const { user, logoutMutation } = useAuth();
  
  const { data: rooms } = useQuery<ChatRoom[]>({
    queryKey: ["/api/rooms"],
  });
  
  // Set the first room as active by default
  useEffect(() => {
    if (rooms && rooms.length > 0 && activeRoomId === 0) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);
  
  // Update active room when activeRoomId changes
  useEffect(() => {
    if (rooms && activeRoomId > 0) {
      const room = rooms.find(r => r.id === activeRoomId);
      if (room) {
        setActiveRoom(room);
      }
    }
  }, [rooms, activeRoomId]);
  
  const handleChannelSelect = (channelId: number) => {
    setActiveRoomId(channelId);
  };

  return (
    <div className="min-h-screen bg-terminal-black">
      {/* Navigation */}
      <nav className="bg-terminal-gray border-b border-terminal-lightgray p-4 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl lg:text-2xl font-mono font-bold tracking-tighter text-terminal-green animate-glow">
              <span className="glitch-effect">THE ONE CHAT</span>
              <span className="ml-1 animate-blink">_</span>
            </h1>
          </div>
          <div className="hidden md:flex space-x-6 text-sm">
            <Link href="/" className="text-gray-300 hover:text-terminal-blue hover:underline transition duration-300">
              SALONS
            </Link>
            <Link href="/profile" className="text-gray-300 hover:text-terminal-blue hover:underline transition duration-300">
              PROFIL
            </Link>
            <Link href="#" className="text-gray-300 hover:text-terminal-blue hover:underline transition duration-300">
              CLASSEMENTS
            </Link>
            <Link href="#" className="text-gray-300 hover:text-terminal-blue hover:underline transition duration-300">
              À PROPOS
            </Link>
          </div>
          <div className="flex items-center">
            {user && (
              <span className="hidden md:inline-block px-3 py-1 mr-2 bg-terminal-darkgray text-terminal-green border border-terminal-green text-xs">
                <i className="fa fa-signal"></i> CONNECTÉ: {user.username}
              </span>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => logoutMutation.mutate()}
              className="text-terminal-red hover:text-terminal-red/80"
            >
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <UserProfile />
            <Leaderboard />
            <TerminalBox>
              <TerminalHeader title="LIVE@FOLLOWERS:~$" color="red" />
              <div className="bg-terminal-darkgray rounded p-2 font-mono">
                <div className="text-xs text-gray-400">
                  <p>{'>'} Follower count: <span className="text-terminal-green font-semibold">{user?.followerCount || 0}</span></p>
                  <p>{'>'} Last gain: <span className="text-terminal-green">+0</span> (waiting...)</p>
                  <p>{'>'} Last loss: <span className="text-terminal-red">-0</span> (waiting...)</p>
                  <p>{'>'} Daily trend: <span className="text-terminal-green">+0</span></p>
                  <div className="mt-2 h-4 bg-terminal-black rounded-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-full w-3/4 bg-terminal-green bg-opacity-30"></div>
                    <div className="absolute top-0 left-0 h-full w-1/2 bg-terminal-green"></div>
                  </div>
                </div>
              </div>
            </TerminalBox>
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {activeRoom ? (
              <ChatRoom 
                roomId={activeRoom.id}
                roomName={activeRoom.name}
                roomDescription={activeRoom.description}
                roomColor={activeRoom.color}
              />
            ) : (
              <div className="flex justify-center items-center h-64">
                <div className="text-terminal-green animate-pulse">
                  Loading chat room...
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Channel List and Aura Selector */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <ChannelList 
            activeChannel={activeRoomId}
            onChannelSelect={handleChannelSelect}
            className="md:col-span-2"
          />
          <AuraSelector />
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-terminal-gray border-t border-terminal-lightgray mt-10 py-4">
        <div className="container mx-auto px-4 text-xs text-gray-500 text-center">
          <p>THE ONE CHAT | v1.0.0 | Expérience textuelle rétro-futuriste</p>
          <p className="mt-1">Pas de photos. Pas de vidéos. Que du texte. Que des idées.</p>
          <div className="mt-2 flex justify-center space-x-4">
            <Link href="#" className="hover:text-terminal-green transition-colors duration-300">À propos</Link>
            <Link href="#" className="hover:text-terminal-green transition-colors duration-300">Règles</Link>
            <Link href="#" className="hover:text-terminal-green transition-colors duration-300">Contact</Link>
            <Link href="#" className="hover:text-terminal-green transition-colors duration-300">Confidentialité</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
