import { useState } from "react";
import { Link } from "wouter";
import { UserProfile } from "@/components/profile/user-profile";
import { AuraSelector } from "@/components/profile/aura-selector";
import { useAuth } from "@/hooks/use-auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TerminalBox } from "@/components/ui/terminal-box";
import { TerminalHeader } from "@/components/ui/terminal-header";

const profileFormSchema = z.object({
  bio: z.string().max(200, {
    message: "Bio must not be longer than 200 characters.",
  }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, updateProfileMutation } = useAuth();
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      bio: user?.bio || "",
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate({ bio: data.bio });
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
            <Link href="/profile" className="text-terminal-blue hover:text-terminal-blue hover:underline transition duration-300">
              PROFIL
            </Link>
            <Link href="#" className="text-gray-300 hover:text-terminal-blue hover:underline transition duration-300">
              CLASSEMENTS
            </Link>
            <Link href="#" className="text-gray-300 hover:text-terminal-blue hover:underline transition duration-300">
              À PROPOS
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-terminal-green">
              <ArrowLeft size={16} className="mr-1" /> Back to Chat
            </Button>
          </Link>
          <h2 className="text-xl font-semibold text-terminal-green ml-4">Your Profile</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <UserProfile />
            <AuraSelector />
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <TerminalBox>
              <TerminalHeader title="PROFILE@EDIT:~$" color="blue" />
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-terminal-green">About You</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about yourself in a few words..."
                            className="bg-terminal-darkgray border-terminal-green/30 resize-none h-32"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <div className="text-xs text-gray-400 text-right mt-1">
                          {field.value.length}/200 characters
                        </div>
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="bg-terminal-green text-terminal-black hover:bg-terminal-green/80"
                    disabled={updateProfileMutation.isPending || !form.formState.isDirty}
                  >
                    <Save size={16} className="mr-2" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </TerminalBox>
            
            <TerminalBox>
              <TerminalHeader title="STATS@OVERVIEW:~$" color="yellow" />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-terminal-darkgray p-4 rounded-md">
                  <h3 className="text-terminal-green text-sm font-semibold mb-2">Total Followers</h3>
                  <p className="text-2xl font-bold">{user?.followerCount || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {user && user.followerCount > 100 
                      ? "You're becoming influential!" 
                      : "Keep posting quality content"}
                  </p>
                </div>
                
                <div className="bg-terminal-darkgray p-4 rounded-md">
                  <h3 className="text-terminal-blue text-sm font-semibold mb-2">Member Since</h3>
                  <p className="text-2xl font-bold">
                    {user?.createdAt 
                      ? new Date(user.createdAt).toLocaleDateString() 
                      : "Loading..."}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {user?.createdAt ? `${Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days` : ""}
                  </p>
                </div>
                
                <div className="bg-terminal-darkgray p-4 rounded-md">
                  <h3 className="text-terminal-purple text-sm font-semibold mb-2">Current Rank</h3>
                  <p className="text-2xl font-bold">#?</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Aiming for THE ONE status
                  </p>
                </div>
              </div>
              
              <div className="mt-4 bg-terminal-darkgray p-4 rounded-md">
                <h3 className="text-terminal-red text-sm font-semibold mb-2">Road to "THE ONE"</h3>
                <div className="w-full bg-terminal-black h-4 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-terminal-green" 
                    style={{ width: `${Math.min(100, Math.max(1, user?.followerCount ? user.followerCount / 100 : 0))}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Keep gaining followers to become THE ONE
                </p>
              </div>
            </TerminalBox>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-terminal-gray border-t border-terminal-lightgray mt-10 py-4">
        <div className="container mx-auto px-4 text-xs text-gray-500 text-center">
          <p>THE ONE CHAT | v1.0.0 | Expérience textuelle rétro-futuriste</p>
          <p className="mt-1">Pas de photos. Pas de vidéos. Que du texte. Que des idées.</p>
        </div>
      </footer>
    </div>
  );
}
