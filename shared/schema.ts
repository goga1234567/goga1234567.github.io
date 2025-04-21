import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  followerCount: integer("follower_count").notNull().default(0),
  bio: text("bio"),
  aura: text("aura").notNull().default("mystique"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  color: text("color").notNull().default("green"),
  active: boolean("active").notNull().default(true),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: integer("user_id").notNull(),
  roomId: integer("room_id").notNull(),
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  isOneShot: boolean("is_one_shot").notNull().default(false),
  viewed: boolean("viewed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
}).extend({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, {
    message: "Username can only contain letters, numbers, and underscores",
  }),
  password: z.string().min(6).max(100),
});

export const updateUserSchema = createInsertSchema(users).pick({
  bio: true,
  aura: true,
});

export const insertChatRoomSchema = createInsertSchema(chatRooms).pick({
  name: true,
  description: true,
  color: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  roomId: true,
  isOneShot: true,
});

export const insertVoteSchema = z.object({
  messageId: z.number(),
  isUpvote: z.boolean(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertVote = z.infer<typeof insertVoteSchema>;

export type User = typeof users.$inferSelect;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type Message = typeof messages.$inferSelect;
