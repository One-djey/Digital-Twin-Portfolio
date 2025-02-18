import { drizzle } from "drizzle-orm/postgres-js";
import postgres from 'postgres';
import { eq } from "drizzle-orm";
import { chatMessages, contactMessages, users } from "../shared/schema.ts";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle({ client });

// Récupérer un utilisateur spécifique
export async function getUser(userId: string) {
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0] ||  null;
}

// Ajouter un utilisateur avec un ID spécifié
export async function addUser(id: string, name?: string | null, email?: string | null) {
  return await db.insert(users).values({ id, name, email }).returning();
}

// Mettre à jour les informations d'un utilisateur avec un ID spécifié
export async function updateUser(id: string, name?: string | null, email?: string | null) {
  // Construire l'objet de mise à jour avec uniquement les champs fournis
  const updateData: { name?: string | null, email?: string | null } = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;

  // Mettre à jour l'utilisateur dans la base de données
  return await db.update(users).set(updateData).where(eq(users.id, id)).returning();
}


// Vérifier si un utilisateur existe par userId
export async function userExistsById(userId: string): Promise<boolean> {
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0;
}

// Ajouter un message de chat
export async function addMessage(userId: string, role: string, content: string) {
  return await db.insert(chatMessages).values({ userId, role, content }).returning();
}

// Récupérer les messages d'un utilisateur spécifique
export async function getUserMessages(userId: string) {
  return await db.select().from(chatMessages).where(eq(chatMessages.userId, userId));
}

// Supprimer les messages d'un utilisateur spécifique
export async function resetUserMessages(userId: string) {
  await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
}

// Ajouter un message depuis le formulaire de contact
export async function addContactMessage(userId: string, message: string) {
  return await db.insert(contactMessages).values({ userId, message }).returning();
}
