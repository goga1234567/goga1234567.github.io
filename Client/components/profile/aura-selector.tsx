import { useState } from "react";
import { TerminalBox } from "@/components/ui/terminal-box";
import { TerminalHeader } from "@/components/ui/terminal-header";
import { useAuth } from "@/hooks/use-auth";

const AURAS = [
  { id: "mystique", name: "Mystique", color: "text-terminal-green", bgColor: "bg-terminal-green" },
  { id: "provocateur", name: "Provocateur", color: "text-terminal-red", bgColor: "bg-terminal-red" },
  { id: "sage", name: "Sage", color: "text-terminal-blue", bgColor: "bg-terminal-blue" },
  { id: "poète", name: "Poète", color: "text-terminal-yellow", bgColor: "bg-terminal-yellow" },
  { id: "troll", name: "Troll", color: "text-terminal-purple", bgColor: "bg-terminal-purple" },
];

interface AuraSelectorProps {
  className?: string;
}

export function AuraSelector({ className }: AuraSelectorProps) {
  const { user, updateProfileMutation } = useAuth();
  const [hoveredAura, setHoveredAura] = useState<string | null>(null);

  if (!user) return null;

  const handleAuraChange = (auraId: string) => {
    if (user.aura !== auraId) {
      updateProfileMutation.mutate({ aura: auraId });
    }
  };

  return (
    <TerminalBox className={className}>
      <TerminalHeader title="AURA@SELECTION:~$" color="green" />
      <div className="flex flex-col space-y-2">
        <div className="text-xs text-gray-400 mb-1">
          Choisis ton aura textuelle:
        </div>
        
        {AURAS.map((aura) => (
          <div 
            key={aura.id}
            className={`bg-terminal-darkgray rounded px-3 py-2 flex justify-between items-center cursor-pointer hover:bg-terminal-lightgray transition-colors duration-300 ${
              hoveredAura === aura.id ? 'bg-terminal-lightgray' : ''
            }`}
            onClick={() => handleAuraChange(aura.id)}
            onMouseEnter={() => setHoveredAura(aura.id)}
            onMouseLeave={() => setHoveredAura(null)}
          >
            <div className="flex items-center">
              <span className={`w-2 h-2 rounded-full ${aura.bgColor} mr-2`}></span>
              <span className={`text-sm ${aura.color}`}>{aura.name}</span>
            </div>
            <span className={`text-xs ${
              user.aura === aura.id 
                ? aura.color
                : hoveredAura === aura.id 
                  ? 'text-gray-200'
                  : 'text-gray-400'
            }`}>
              {user.aura === aura.id ? 'ACTIF' : 'CHANGER'}
            </span>
          </div>
        ))}
      </div>
    </TerminalBox>
  );
}
