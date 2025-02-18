import { v4 as uuidv4 } from 'uuid';

// Fonction pour obtenir ou créer un user ID
export function getOrCreateUserId(): string {
  // Vérifiez si un user ID existe déjà dans le localStorage
  let userId = localStorage.getItem('userId');

  // Si aucun user ID n'existe, en générer un nouveau
  if (!userId) {
    // Generer le user ID (UUID)
    userId = uuidv4();

    // Enregistrer le nouvel ustilisateur dans le Local Storage
    localStorage.setItem('userId', userId);
  } 

  return userId;
}

export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}