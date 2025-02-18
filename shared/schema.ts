import { pgTable, serial, text, timestamp, integer, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Table des utilisateurs
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Table des messages (chat)
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Table des messages (formulaire de contact)
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Définition des relations
export const usersRelations = relations(users, ({ many }) => ({
  messages: many(chatMessages),
  contacts: many(contactMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, { fields: [chatMessages.userId], references: [users.id] }),
}));

export const contactsRelations = relations(contactMessages, ({ one }) => ({
  user: one(users, { fields: [contactMessages.userId], references: [users.id] }),
}));

// Schéma de validation pour les messages de chat
export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  role: true,
  content: true,
})
.required({
  role: true,
  content: true,
});

// Schéma de validation pour les contacts
export const insertContactSchema = createInsertSchema(contactMessages).pick({
  userId: true,
  message: true,
})
.required({
  userId: true,
  message: true,
});

// Schéma de validation pour les utilisateurs
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  name: true,
  email: true,
})
.required({
  id: true,
});