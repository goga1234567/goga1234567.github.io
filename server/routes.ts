import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertMessageSchema, insertVoteSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

type ClientMessage = {
  type: string;
  payload: any;
};

type ServerMessage = {
  type: string;
  payload: any;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // API routes
  app.get("/api/rooms", async (req, res) => {
    const rooms = await storage.getAllChatRooms();
    res.json(rooms);
  });

  app.get("/api/rooms/:id", async (req, res) => {
    const roomId = parseInt(req.params.id);
    if (isNaN(roomId)) {
      return res.status(400).json({ message: "Invalid room ID" });
    }

    const room = await storage.getChatRoom(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json(room);
  });

  app.get("/api/rooms/name/:name", async (req, res) => {
    const name = req.params.name;
    const room = await storage.getChatRoomByName(name);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json(room);
  });

  app.get("/api/rooms/:roomId/messages", async (req, res) => {
    const roomId = parseInt(req.params.roomId);
    if (isNaN(roomId)) {
      return res.status(400).json({ message: "Invalid room ID" });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const messages = await storage.getMessagesForRoom(roomId, limit);
    
    // For each message, fetch the user and attach username and aura
    const messagesWithUserInfo = await Promise.all(
      messages.map(async (message) => {
        const user = await storage.getUser(message.userId);
        return {
          ...message,
          username: user?.username || "Unknown",
          aura: user?.aura || "unknown"
        };
      })
    );

    res.json(messagesWithUserInfo);
  });

  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData, req.user.id);
      
      // Add username and aura for the frontend
      const messageWithUser = {
        ...message,
        username: req.user.username,
        aura: req.user.aura
      };

      // Broadcast the message to all connected clients
      broadcastToRoom(message.roomId, {
        type: "NEW_MESSAGE",
        payload: messageWithUser
      });

      res.status(201).json(messageWithUser);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.post("/api/messages/:id/vote", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    try {
      const messageId = parseInt(req.params.id);
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }

      const voteData = insertVoteSchema.parse({ 
        messageId, 
        isUpvote: req.body.isUpvote 
      });
      
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Don't allow voting on your own messages
      if (message.userId === req.user.id) {
        return res.status(400).json({ message: "You cannot vote on your own messages" });
      }

      const updatedMessage = await storage.voteMessage(
        voteData.messageId,
        req.user.id,
        voteData.isUpvote
      );
      
      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Get the author for follower count update notification
      const author = await storage.getUser(updatedMessage.userId);
      if (author) {
        // Broadcast the vote update to all connected clients
        broadcastToRoom(updatedMessage.roomId, {
          type: "VOTE_UPDATE",
          payload: {
            messageId: updatedMessage.id,
            upvotes: updatedMessage.upvotes,
            downvotes: updatedMessage.downvotes
          }
        });
        
        // Notify the author about follower update
        broadcastToUser(author.id, {
          type: "FOLLOWER_UPDATE",
          payload: {
            followerCount: author.followerCount,
            delta: voteData.isUpvote ? 1 : -1
          }
        });
      }

      res.json({
        messageId: updatedMessage.id,
        upvotes: updatedMessage.upvotes,
        downvotes: updatedMessage.downvotes
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to vote on message" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const topUsers = await storage.getTopUsers(limit);
    
    // Remove passwords from response
    const usersWithoutPasswords = topUsers.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json(usersWithoutPasswords);
  });

  app.get("/api/burn-of-the-day", async (req, res) => {
    const burnMessage = await storage.getBurnOfTheDay();
    
    if (!burnMessage) {
      return res.status(404).json({ message: "No burn of the day found" });
    }
    
    const author = await storage.getUser(burnMessage.userId);
    
    res.json({
      ...burnMessage,
      username: author?.username || "Unknown",
      aura: author?.aura || "unknown"
    });
  });

  // Set up HTTP server
  const httpServer = createServer(app);

  // Set up WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Map to store client connections
  const clients = new Map<WebSocket, { userId?: number, roomId?: number }>();

  wss.on('connection', (ws: WebSocket) => {
    // Initial connection setup
    clients.set(ws, {});
    
    // Handle messages from clients
    ws.on('message', async (data: string) => {
      try {
        const message: ClientMessage = JSON.parse(data);
        
        switch (message.type) {
          case 'JOIN_ROOM':
            const roomId = parseInt(message.payload.roomId);
            const userId = message.payload.userId;
            
            // Store the room and user for this connection
            clients.set(ws, { userId, roomId });
            
            // Notify client of successful join
            ws.send(JSON.stringify({
              type: 'ROOM_JOINED',
              payload: { roomId }
            }));
            break;
            
          case 'LEAVE_ROOM':
            // Clear room association
            const clientInfo = clients.get(ws);
            if (clientInfo) {
              clients.set(ws, { ...clientInfo, roomId: undefined });
            }
            break;
            
          // Other message types can be handled here
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      clients.delete(ws);
    });
  });
  
  // Function to broadcast messages to all clients in a room
  function broadcastToRoom(roomId: number, message: ServerMessage) {
    const serializedMessage = JSON.stringify(message);
    
    for (const [client, info] of clients.entries()) {
      if (info.roomId === roomId && client.readyState === WebSocket.OPEN) {
        client.send(serializedMessage);
      }
    }
  }
  
  // Function to broadcast messages to a specific user
  function broadcastToUser(userId: number, message: ServerMessage) {
    const serializedMessage = JSON.stringify(message);
    
    for (const [client, info] of clients.entries()) {
      if (info.userId === userId && client.readyState === WebSocket.OPEN) {
        client.send(serializedMessage);
      }
    }
  }

  return httpServer;
}
