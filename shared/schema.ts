import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  smallint,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Table des utilisateurs
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Table des messages (chat). The metrics columns are only filled on assistant
// messages; `feedback` is the visitor's thumbs up (1) / down (-1).
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cachedTokens: integer("cached_tokens"),
    latencyMs: integer("latency_ms"),
    finishReason: text("finish_reason"),
    feedback: smallint("feedback"),
  },
  (table) => [
    index("chat_messages_user_created_idx").on(table.userId, table.createdAt),
    index("chat_messages_created_idx").on(table.createdAt),
  ],
);

// Table des messages (formulaire de contact)
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  // 'form' (contact page) or 'chat_lead' (submit_lead tool)
  source: text("source").notNull().default("form"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Table à ligne unique mise à jour par le health check : une vraie écriture
// est nécessaire pour que Supabase (plan Free) compte l'activité et ne mette
// pas le projet en pause, un simple `select 1` ne suffisant pas.
export const heartbeat = pgTable("heartbeat", {
  id: integer("id").primaryKey(),
  lastPing: timestamp("last_ping", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Compteurs de rate limiting (fenêtre fixe), clé = préfixe + hash SHA-256 de
// l'IP (jamais d'IP en clair). Purgés après 24 h par /api/health.
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true })
    .notNull()
    .defaultNow(),
  count: integer("count").notNull().default(1),
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
  user: one(users, {
    fields: [contactMessages.userId],
    references: [users.id],
  }),
}));

// Schéma de validation pour les messages de chat
export const insertChatMessageSchema = createInsertSchema(chatMessages)
  .pick({
    role: true,
    content: true,
  })
  .required({
    role: true,
    content: true,
  });

// Schéma de validation pour les contacts
export const insertContactSchema = createInsertSchema(contactMessages)
  .pick({
    userId: true,
    message: true,
  })
  .required({
    userId: true,
    message: true,
  });

// Schéma de validation pour les utilisateurs
export const insertUserSchema = createInsertSchema(users)
  .pick({
    id: true,
    name: true,
    email: true,
  })
  .required({
    id: true,
  });

// Rôle et message utilisés dans les échanges avec les providers IA
export type ChatRole = "system" | "user" | "assistant";

export type AiChatMessage = {
  role: ChatRole;
  content: string;
};
