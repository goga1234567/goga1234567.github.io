import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Terminal, User, Key, Zap, MessageSquare, Trophy } from "lucide-react";

// Define form schemas
const loginSchema = insertUserSchema.pick({
  username: true,
  password: true,
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof insertUserSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [, navigate] = useLocation();
  const { user, loginMutation, registerMutation, isLoading } = useAuth();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-terminal-black flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="bg-terminal-gray border-b border-terminal-lightgray p-4 z-10">
        <div className="container mx-auto">
          <h1 className="text-2xl font-mono font-bold tracking-tighter text-terminal-green animate-glow">
            THE ONE CHAT
            <span className="ml-1 animate-blink">_</span>
          </h1>
        </div>
      </header>

      <div className="flex-grow flex flex-col md:flex-row">
        {/* Auth Form */}
        <div className="w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto">
            <div className="bg-terminal-gray border border-terminal-green/30 p-6 rounded-md shadow-lg relative overflow-hidden">
              <div className="terminal-noise"></div>
              
              <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 bg-terminal-darkgray mb-6">
                  <TabsTrigger value="login" className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-black">
                    <Terminal className="mr-2 h-4 w-4" /> Login
                  </TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-black">
                    <User className="mr-2 h-4 w-4" /> Register
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-terminal-green">Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your username" 
                                {...field} 
                                className="bg-terminal-darkgray border-terminal-green/30 focus:border-terminal-green"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-terminal-green">Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter your password" 
                                {...field} 
                                className="bg-terminal-darkgray border-terminal-green/30 focus:border-terminal-green"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-terminal-green text-terminal-black hover:bg-terminal-green/80"
                        disabled={loginMutation.isPending || isLoading}
                      >
                        {loginMutation.isPending ? "Connecting..." : "Connect"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
                
                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-terminal-green">Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Choose a unique username" 
                                {...field} 
                                className="bg-terminal-darkgray border-terminal-green/30 focus:border-terminal-green"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-terminal-green">Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Create a password (min. 6 characters)" 
                                {...field} 
                                className="bg-terminal-darkgray border-terminal-green/30 focus:border-terminal-green"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-terminal-green text-terminal-black hover:bg-terminal-green/80"
                        disabled={registerMutation.isPending || isLoading}
                      >
                        {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
        
        {/* Hero Section */}
        <div className="w-full md:w-1/2 bg-terminal-darkgray p-6 md:p-12 flex items-center">
          <div className="max-w-lg mx-auto">
            <h2 className="text-3xl font-bold text-terminal-green mb-6">
              Become THE ONE <span className="animate-blink">_</span>
            </h2>
            <p className="text-gray-300 mb-8">
              Bienvenue dans l'arène textuelle du futur. Un forum-chat rétro-moderne où chaque mot compte et peut vous faire gagner ou perdre de l'influence.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-terminal-gray/50 p-4 rounded-md">
                <Key className="text-terminal-green mb-2" />
                <h3 className="text-terminal-green font-semibold mb-1">Pseudo Unique</h3>
                <p className="text-sm text-gray-400">Choisissez votre identité. Votre réputation vous suivra.</p>
              </div>
              
              <div className="bg-terminal-gray/50 p-4 rounded-md">
                <MessageSquare className="text-terminal-blue mb-2" />
                <h3 className="text-terminal-blue font-semibold mb-1">Salons Thématiques</h3>
                <p className="text-sm text-gray-400">Philo, amour, débats, poésie... Trouvez votre terrain d'expression.</p>
              </div>
              
              <div className="bg-terminal-gray/50 p-4 rounded-md">
                <Zap className="text-terminal-yellow mb-2" />
                <h3 className="text-terminal-yellow font-semibold mb-1">Messages One-Shot</h3>
                <p className="text-sm text-gray-400">Des messages qui s'autodétruisent après lecture.</p>
              </div>
              
              <div className="bg-terminal-gray/50 p-4 rounded-md">
                <Trophy className="text-terminal-purple mb-2" />
                <h3 className="text-terminal-purple font-semibold mb-1">Système de Followers</h3>
                <p className="text-sm text-gray-400">Gagnez ou perdez des abonnés selon la qualité de vos messages.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-terminal-gray border-t border-terminal-lightgray py-4">
        <div className="container mx-auto px-4 text-xs text-gray-500 text-center">
          <p>THE ONE CHAT | v1.0.0 | Expérience textuelle rétro-futuriste</p>
          <p className="mt-1">Pas de photos. Pas de vidéos. Que du texte. Que des idées.</p>
        </div>
      </footer>
    </div>
  );
}
