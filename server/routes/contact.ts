import type { Express } from "express";
import { sendContactEmail } from "../email.ts";
import { createLimiter } from "../rateLimitStore.ts";
import {
  addContactMessage,
  addUser,
  updateUser,
  userExistsById,
} from "../storage.ts";
import { insertContactSchema, insertUserSchema } from "../../shared/schema.ts";

export function registerContactRoutes(app: Express) {
  const contactRateLimiter = createLimiter({
    prefix: "contact",
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: "Too many contact requests, please try again later.",
  });

  app.post("/api/contact", contactRateLimiter, async (req, res) => {
    try {
      const contactRequest = req.body;
      const receivedUser = contactRequest?.user;
      const receivedContact = contactRequest?.contact;

      // Never log the payload itself: it holds personal data.
      const userResult = insertUserSchema.safeParse(receivedUser);
      if (!receivedUser || !userResult.success) {
        console.error("Invalid user format in contact request");
        res.status(400).json({ message: "Invalid user format" });
        return;
      }
      const contactResult = insertContactSchema.safeParse(receivedContact);
      if (!receivedContact || !contactResult.success) {
        console.error("Invalid contact format in contact request");
        res.status(400).json({ message: "Invalid contact format" });
        return;
      }

      // Ajoutez l'utilisateur à la base de données, s'il n'existe pas
      if (!(await userExistsById(userResult.data.id))) {
        const newUser = await addUser(
          userResult.data.id,
          userResult.data.name,
          userResult.data.email,
        );

        if (!newUser) {
          console.error(`Failed to add user ${userResult.data.id}`);
          res.status(500).json({ message: "Failed to add user." });
          return;
        }
      } else {
        // Mettre a jour les info de l'utilisateur
        await updateUser(
          userResult.data.id,
          userResult.data?.name,
          userResult.data?.email,
        );
      }

      // Ajouter le formulaire de contact à la base de données
      const newContact = await addContactMessage(
        contactResult.data.userId,
        contactResult.data.message,
        "form",
      );

      if (!newContact || !newContact[0]) {
        console.error(
          `Failed to add contact message for user ${contactResult.data.userId}`,
        );
        res.status(500).json({ message: "Failed to add contact message." });
        return;
      }

      // The message is stored: an email failure must not fail the request.
      const emailResult = await sendContactEmail({
        name: userResult.data.name,
        email: userResult.data.email,
        message: contactResult.data.message,
        contactId: newContact[0].id,
      });
      if (!emailResult.ok) {
        console.error(
          `Contact email failed (contact ${newContact[0].id}): ${emailResult.error}`,
        );
      }

      console.info(`New contact form saved!`);
      res.status(201).json({});
    } catch (error: any) {
      console.error("Error adding contact: " + error.message);
      res.status(500).json({ message: "Failed to add user" });
    }
  });
}
