import { users, type User, type InsertUser, type UpdateUser } from "@shared/schema";
import { chatRooms, type ChatRoom, type InsertChatRoom } from "@shared/schema";
import { messages, type Message, type InsertMessage } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: UpdateUser): Promise<User | undefined>;
  updateUserFollowers(id: number, delta: number): Promise<User | undefined>;
  getTopUsers(limit: number): Promise<User[]>;
  
  // Room methods
  getChatRoom(id: number): Promise<ChatRoom | undefined>;
  getChatRoomByName(name: string): Promise<ChatRoom | undefined>;
  getAllChatRooms(): Promise<ChatRoom[]>;
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  
  // Message methods
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesForRoom(roomId: number, limit: number): Promise<Message[]>;
  createMessage(message: InsertMessage, userId: number): Promise<Message>;
  voteMessage(messageId: number, userId: number, isUpvote: boolean): Promise<Message | undefined>;
  markOneShortAsViewed(messageId: number): Promise<Message | undefined>;
  getBurnOfTheDay(): Promise<Message | undefined>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chatRooms: Map<number, ChatRoom>;
  private messages: Map<number, Message>;
  private currentUserId: number;
  private currentRoomId: number;
  private currentMessageId: number;
  public sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.chatRooms = new Map();
    this.messages = new Map();
    this.currentUserId = 1;
    this.currentRoomId = 1;
    this.currentMessageId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Initialize default chat rooms
    const defaultRooms = [
      { name: "philo", description: "Des mots qui résonnent, des idées qui défient l'ordinaire — bienvenue dans le vortex philosophique.", color: "green" },
      { name: "amour", description: "L'amour sous toutes ses formes, du romantisme à l'existentiel.", color: "purple" },
      { name: "provoc", description: "Zone de provocation intellectuelle et de débats épicés.", color: "red" },
      { name: "débats", description: "Confrontez vos idées, affrontez la dialectique, construisez ensemble.", color: "blue" },
      { name: "poésie", description: "L'art des mots ciselés et des émotions sublimées.", color: "yellow" },
      { name: "absurdités", description: "Quand la logique s'effondre, l'absurde commence à parler.", color: "gray" },
    ];
    
    defaultRooms.forEach(room => {
      this.createChatRoom(room);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      followerCount: 0, 
      bio: "", 
      aura: "mystique", 
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: UpdateUser): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserFollowers(id: number, delta: number): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    // Make sure follower count doesn't go below zero
    const newCount = Math.max(0, user.followerCount + delta);
    const updatedUser = { ...user, followerCount: newCount };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getTopUsers(limit: number): Promise<User[]> {
    return Array.from(this.users.values())
      .sort((a, b) => b.followerCount - a.followerCount)
      .slice(0, limit);
  }

  // Room methods
  async getChatRoom(id: number): Promise<ChatRoom | undefined> {
    return this.chatRooms.get(id);
  }

  async getChatRoomByName(name: string): Promise<ChatRoom | undefined> {
    return Array.from(this.chatRooms.values()).find(
      (room) => room.name.toLowerCase() === name.toLowerCase(),
    );
  }

  async getAllChatRooms(): Promise<ChatRoom[]> {
    return Array.from(this.chatRooms.values())
      .filter(room => room.active)
      .sort((a, b) => a.id - b.id);
  }

  async createChatRoom(room: InsertChatRoom): Promise<ChatRoom> {
    const id = this.currentRoomId++;
    const chatRoom: ChatRoom = { ...room, id, active: true };
    this.chatRooms.set(id, chatRoom);
    return chatRoom;
  }

  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesForRoom(roomId: number, limit: number = 50): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.roomId === roomId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async createMessage(message: InsertMessage, userId: number): Promise<Message> {
    const id = this.currentMessageId++;
    const now = new Date();
    const newMessage: Message = {
      ...message,
      id,
      userId,
      upvotes: 0,
      downvotes: 0,
      viewed: false,
      createdAt: now
    };
    this.messages.set(id, newMessage);
    return newMessage;
  }

  async voteMessage(messageId: number, userId: number, isUpvote: boolean): Promise<Message | undefined> {
    const message = await this.getMessage(messageId);
    if (!message) return undefined;
    
    // Update the message vote count
    const updatedMessage = { 
      ...message,
      upvotes: isUpvote ? message.upvotes + 1 : message.upvotes,
      downvotes: !isUpvote ? message.downvotes + 1 : message.downvotes
    };
    this.messages.set(messageId, updatedMessage);
    
    // Update the author's follower count 
    // Follower logic: +1 for upvote, -1 for downvote
    const authorId = message.userId;
    await this.updateUserFollowers(authorId, isUpvote ? 1 : -1);
    
    return updatedMessage;
  }

  async markOneShortAsViewed(messageId: number): Promise<Message | undefined> {
    const message = await this.getMessage(messageId);
    if (!message || !message.isOneShot) return undefined;
    
    const updatedMessage = { ...message, viewed: true };
    this.messages.set(messageId, updatedMessage);
    return updatedMessage;
  }

  async getBurnOfTheDay(): Promise<Message | undefined> {
    // Get the message with the highest (upvotes - downvotes) from the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    return Array.from(this.messages.values())
      .filter(message => new Date(message.createdAt) >= oneDayAgo)
      .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
      [0];
  }
}

export const storage = new MemStorage();
