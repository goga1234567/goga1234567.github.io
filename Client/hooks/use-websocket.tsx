import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

type WebSocketMessage = {
  type: string;
  payload: any;
};

type WebSocketStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

export function useWebSocket() {
  const { toast } = useToast();
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const socket = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  const connect = useCallback(() => {
    if (socket.current?.readyState === WebSocket.OPEN) return;

    try {
      setStatus("connecting");
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      socket.current = new WebSocket(wsUrl);
      
      socket.current.onopen = () => {
        setStatus("connected");
        reconnectAttempts.current = 0;
      };
      
      socket.current.onclose = () => {
        setStatus("disconnected");
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          setStatus("reconnecting");
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          toast({
            title: "Connection lost",
            description: "Unable to reconnect to server. Please refresh the page.",
            variant: "destructive"
          });
        }
      };
      
      socket.current.onerror = () => {
        if (socket.current) {
          socket.current.close();
        }
      };
    } catch (error) {
      setStatus("disconnected");
      console.error("WebSocket connection error:", error);
    }
  }, [toast]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    if (socket.current) {
      socket.current.close();
      socket.current = null;
    }
    
    setStatus("disconnected");
  }, []);

  const sendMessage = useCallback((type: string, payload: any) => {
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ type, payload }));
      return true;
    }
    return false;
  }, []);

  const joinRoom = useCallback((roomId: number, userId?: number) => {
    if (status === "connected") {
      sendMessage("JOIN_ROOM", { roomId, userId });
    }
  }, [status, sendMessage]);

  const leaveRoom = useCallback(() => {
    if (status === "connected") {
      sendMessage("LEAVE_ROOM", {});
    }
  }, [status, sendMessage]);

  const addMessageListener = useCallback((listener: (message: WebSocketMessage) => void) => {
    if (!socket.current) return () => {};
    
    const messageHandler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        listener(message);
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };
    
    socket.current.addEventListener("message", messageHandler);
    
    // Return cleanup function
    return () => {
      if (socket.current) {
        socket.current.removeEventListener("message", messageHandler);
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    connect,
    disconnect,
    sendMessage,
    joinRoom,
    leaveRoom,
    addMessageListener
  };
}
