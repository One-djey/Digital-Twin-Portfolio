import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, asc, desc, eq, lt, notExists, sql } from "drizzle-orm";
import {
  chatMessages,
  contactMessages,
  heartbeat,
  rateLimits,
  users,
} from "../shared/schema.ts";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle({ client });

// Vérifier que la base de données répond (utilisé par le health check).
// Upsert d'une ligne unique plutôt qu'un `select 1` : Supabase ne semble pas
// compter les lectures triviales comme de l'activité, et la table ne grossit
// jamais même si l'endpoint public est spammé.
export async function checkDatabaseHealth(): Promise<{
  up: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await db
      .insert(heartbeat)
      .values({ id: 1 })
      .onConflictDoUpdate({
        target: heartbeat.id,
        set: { lastPing: sql`now()` },
      });
    return { up: true, latencyMs: Date.now() - start };
  } catch (error: any) {
    return { up: false, latencyMs: Date.now() - start, error: error.message };
  }
}

// Récupérer un utilisateur spécifique
export async function getUser(userId: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result[0] || null;
}

// Ajouter un utilisateur avec un ID spécifié
export async function addUser(
  id: string,
  name?: string | null,
  email?: string | null,
  phone?: string | null,
) {
  return await db.insert(users).values({ id, name, email, phone }).returning();
}

// Mettre à jour les informations d'un utilisateur avec un ID spécifié
export async function updateUser(
  id: string,
  name?: string | null,
  email?: string | null,
  phone?: string | null,
) {
  // Construire l'objet de mise à jour avec uniquement les champs fournis
  const updateData: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (Object.keys(updateData).length === 0) return [];

  // Mettre à jour l'utilisateur dans la base de données
  return await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning();
}

// Vérifier si un utilisateur existe par userId
export async function userExistsById(userId: string): Promise<boolean> {
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result.length > 0;
}

// Ajouter un message de chat
export async function addMessage(
  userId: string,
  role: string,
  content: string,
) {
  return await db
    .insert(chatMessages)
    .values({ userId, role, content })
    .returning();
}

export type AssistantMetrics = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  latencyMs: number;
  finishReason: string;
};

// Ajouter la réponse de l'assistant avec ses métriques (aucune donnée
// personnelle : modèle, tokens, latence).
export async function addAssistantMessage(
  userId: string,
  content: string,
  metrics: AssistantMetrics,
) {
  const rows = await db
    .insert(chatMessages)
    .values({
      userId,
      role: "assistant",
      content,
      model: metrics.model,
      inputTokens: metrics.inputTokens,
      outputTokens: metrics.outputTokens,
      cachedTokens: metrics.cachedTokens ?? null,
      latencyMs: metrics.latencyMs,
      finishReason: metrics.finishReason,
    })
    .returning();
  return rows[0];
}

// Récupérer tous les messages d'un utilisateur (ordre chronologique)
export async function getAllUserMessages(userId: string) {
  return await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(asc(chatMessages.createdAt), asc(chatMessages.id));
}

// Récupérer les N derniers messages d'un utilisateur (ordre chronologique)
export async function getRecentUserMessages(userId: string, limit: number) {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
    .limit(limit);
  return rows.reverse();
}

// Nombre de messages (user + assistant) d'un utilisateur
export async function countUserMessages(userId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId));
  return rows[0]?.count ?? 0;
}

// Nombre de réponses de l'assistant depuis minuit UTC (plafond global)
export async function countAssistantMessagesToday(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.role, "assistant"),
        sql`${chatMessages.createdAt} >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'`,
      ),
    );
  return rows[0]?.count ?? 0;
}

// Supprimer un message précis d'un utilisateur
export async function deleteMessage(userId: string, messageId: number) {
  await db
    .delete(chatMessages)
    .where(
      and(eq(chatMessages.id, messageId), eq(chatMessages.userId, userId)),
    );
}

// Enregistrer le feedback (1 / -1 / null) sur une réponse de l'assistant de
// cet utilisateur. Retourne false si le message n'existe pas ou ne lui
// appartient pas.
export async function setMessageFeedback(
  userId: string,
  messageId: number,
  rating: 1 | -1 | null,
): Promise<{ createdAt: Date | null } | null> {
  const [row] = await db
    .update(chatMessages)
    .set({ feedback: rating })
    .where(
      and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.userId, userId),
        eq(chatMessages.role, "assistant"),
      ),
    )
    .returning({ createdAt: chatMessages.createdAt });
  return row ?? null;
}

// Id of the user message that started the turn answered by this assistant
// message (the latest user message before it), or null.
export async function getTurnUserMessageId(
  userId: string,
  assistantMessageId: number,
): Promise<number | null> {
  const [row] = await db
    .select({ id: chatMessages.id })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.role, "user"),
        lt(chatMessages.id, assistantMessageId),
      ),
    )
    .orderBy(desc(chatMessages.id))
    .limit(1);
  return row ? Number(row.id) : null;
}

// Supprimer les messages d'un utilisateur spécifique
// Returns the ids of the deleted user messages (one per chat turn).
export async function resetUserMessages(userId: string): Promise<number[]> {
  const rows = await db
    .delete(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .returning({ id: chatMessages.id, role: chatMessages.role });
  return userMessageIds(rows);
}

function userMessageIds(rows: { id: number; role: string }[]): number[] {
  // postgres-js returns bigint identity columns as strings at runtime.
  return rows.filter((row) => row.role === "user").map((row) => Number(row.id));
}

// Ajouter un message de contact ('form') ou un lead du chat ('chat_lead')
export async function addContactMessage(
  userId: string,
  message: string,
  source: "form" | "chat_lead" = "form",
) {
  return await db
    .insert(contactMessages)
    .values({ userId, message, source })
    .returning();
}

// Nombre de leads envoyés depuis le chat par un utilisateur
export async function countLeads(userId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contactMessages)
    .where(
      and(
        eq(contactMessages.userId, userId),
        eq(contactMessages.source, "chat_lead"),
      ),
    );
  return rows[0]?.count ?? 0;
}

export type PurgeResult = {
  chatMessages: number;
  contactMessages: number;
  users: number;
  rateLimits: number;
};

export type PurgeOutcome = {
  result: PurgeResult;
  // Ids of the purged user messages (one per chat turn), not part of the
  // public health report.
  expiredUserMessageIds: number[];
};

// Rétention : conversations 60 jours, contacts/leads 3 ans, utilisateurs
// sans plus aucune donnée après 60 jours, compteurs de rate limit 24 h.
// Appelé par /api/health (pingé toutes les 24 h).
export async function purgeExpiredData(): Promise<PurgeOutcome> {
  const chat = await db
    .delete(chatMessages)
    .where(lt(chatMessages.createdAt, sql`now() - interval '60 days'`))
    .returning({ id: chatMessages.id, role: chatMessages.role });
  const contacts = await db
    .delete(contactMessages)
    .where(lt(contactMessages.createdAt, sql`now() - interval '3 years'`))
    .returning({ id: contactMessages.id });
  const orphanUsers = await db
    .delete(users)
    .where(
      and(
        lt(users.createdAt, sql`now() - interval '60 days'`),
        notExists(
          db
            .select({ one: sql`1` })
            .from(chatMessages)
            .where(eq(chatMessages.userId, users.id)),
        ),
        notExists(
          db
            .select({ one: sql`1` })
            .from(contactMessages)
            .where(eq(contactMessages.userId, users.id)),
        ),
      ),
    )
    .returning({ id: users.id });
  const limits = await db
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, sql`now() - interval '24 hours'`))
    .returning({ key: rateLimits.key });
  return {
    result: {
      chatMessages: chat.length,
      contactMessages: contacts.length,
      users: orphanUsers.length,
      rateLimits: limits.length,
    },
    expiredUserMessageIds: userMessageIds(chat),
  };
}

// Rate limiting à fenêtre fixe, atomique. Si la fenêtre courante est expirée,
// le compteur repart à 1 ; sinon il est incrémenté.
const windowExpired = (windowMs: number) =>
  sql`${rateLimits.windowStart} + (${windowMs} * interval '1 millisecond') <= now()`;

export async function incrementRateLimit(
  key: string,
  windowMs: number,
): Promise<{ totalHits: number; resetTime: Date }> {
  const rows = await db
    .insert(rateLimits)
    .values({ key, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${windowExpired(windowMs)} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${windowExpired(windowMs)} then now() else ${rateLimits.windowStart} end`,
      },
    })
    .returning({
      count: rateLimits.count,
      windowStart: rateLimits.windowStart,
    });
  const row = rows[0];
  return {
    totalHits: row.count,
    resetTime: new Date(new Date(row.windowStart).getTime() + windowMs),
  };
}

export async function getRateLimit(
  key: string,
  windowMs: number,
): Promise<{ totalHits: number; resetTime: Date } | undefined> {
  const rows = await db
    .select({ count: rateLimits.count, windowStart: rateLimits.windowStart })
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  const resetTime = new Date(new Date(row.windowStart).getTime() + windowMs);
  if (resetTime.getTime() <= Date.now()) return undefined;
  return { totalHits: row.count, resetTime };
}

export async function decrementRateLimit(key: string) {
  await db
    .update(rateLimits)
    .set({ count: sql`greatest(${rateLimits.count} - 1, 0)` })
    .where(eq(rateLimits.key, key));
}

export async function deleteRateLimit(key: string) {
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}
