import { Express } from "express";
import { createServer, type Server } from "http";
import { addUser, userExistsById, addMessage, getUserMessages, resetUserMessages, addContactMessage, updateUser } from "./storage.ts";
import { insertChatMessageSchema, insertContactSchema, insertUserSchema } from '../shared/schema.ts';
import { digitalTwinAgent } from "./ai/DigitalTwinAgent.ts";
import { isUUID } from "@shared/uuidv4.ts";
import Mailjet from 'node-mailjet';
import cors from "cors";

export async function registerRoutes(app: Express): Promise<Server> {
  const MAX_MESSAGES = 20;  // count both, user & assisant, messages.

  app.post("/api/contact", async (req, res) => {
    try {
      const contactRequest = req.body;
      const receivedUser = contactRequest.user;
      const receivedContact = contactRequest.contact

      // Vérifiez que les champs nécessaires sont présents
      const userResult = insertUserSchema.safeParse(receivedUser);
      if (!receivedUser || !userResult.success) {
        console.error(`Invalid user format: ${JSON.stringify(receivedUser)}`)
        res.status(400).json({ message: "Invalid user format" });
        return;
      }
      const contactResult = insertContactSchema.safeParse(receivedContact);
      if (!receivedContact || !contactResult.success) {
        console.error(`Invalid user format: ${JSON.stringify(receivedContact)}`)
        res.status(400).json({ message: "Invalid contact format" });
        return;
      }
  
      // Ajoutez l'utilisateur à la base de données, s'il n'existe pas
      if(!await userExistsById(userResult.data.id)){
        const newUser = await addUser(userResult.data.id, userResult.data.name, userResult.data.email);
  
        // Vérifiez si l'utilisateur a été ajouté avec succès
        if (!newUser) {
          console.error(`Failed to add user ${JSON.stringify(userResult.data)}`);
          res.status(500).json({ message: "Failed to add user." });
          return;
        }
      } else {
        // Mettre a jour les info de l'utilisateur
        await updateUser(userResult.data.id, userResult.data?.name, userResult.data?.email);
      }

      // Ajouter le formulaire de contact à la base de données
      const newContact = await addContactMessage(contactResult.data.userId, contactResult.data.message);
  
      // Vérifiez si le formulaire de contact a été ajouté avec succès
      if (!newContact) {
        console.error(`Failed to add contact message ${JSON.stringify(contactResult.data)}`);
        res.status(500).json({ message: "Failed to add contact message." });
        return;
      }
      
      console.info(`New contact form saved!`)
      res.status(201).json({});
    } catch (error: any) {
      console.error("Error adding user: " + error.message);
      res.status(500).json({ message: "Failed to add user" });
    }
  });
  

  app.post("/api/chat/reset", async (req, res) => {
    try {
      // Check user ID exists
      const user_id: string = req.body?.user_id;
      if(!user_id || !await userExistsById(user_id)){
        console.error(`User ID ${user_id} not found.`)
        res.status(400).json({ message: "Invalid User ID" });
        return;
      }

      // Delete all user's messages
      await resetUserMessages(user_id);

      // Respond with all messages
      const messages = await getUserMessages(user_id);
      res.status(205).json(messages);
    } catch (error:any) {
      console.error("Error resetting messages: " + error.message);
      res.status(500).json({ message: "Failed to reset messages" });
    }
  });

  app.get("/api/chat", async (req, res) => {
    try {
      // Check user ID format
      const user_id = req.query?.user_id;
      if(!user_id || typeof user_id != 'string'){
        console.error(`Invalid user ID ${user_id} format.`);
        res.status(400).json({ message: "Invalid User ID format" });
        return;
      }
      // Check user ID exists
      if(!await userExistsById(user_id)){
        console.warn(`User ID ${user_id} not found, return empty message list`);
        res.status(204).json([]);
        return;
      }

      // Retrive all user's messages
      const messages = await getUserMessages(user_id);
      res.status(200).json(messages);
    } catch (error:any) {
      console.error("Error fetching messages: " + error.message);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      // Check user_id format
      const user_id: string = req.body?.user_id;
      if(!user_id || !isUUID(user_id)){
        console.error(`User ID ${user_id}.`)
        res.status(400).json({ message: "Invalid user ID" });
        return;
      }

      // Check message format
      const requestChatMessage = req.body?.message;
      const result = insertChatMessageSchema.safeParse(requestChatMessage);
      if (!requestChatMessage || !result.success) {
        console.error(`Invalid message format: ${JSON.stringify(requestChatMessage)}`)
        res.status(400).json({ message: "Invalid message format" });
        return;
      }

      // Create user if not exists
      if(!await userExistsById(user_id)){
        await addUser(user_id);
      }

      // Add user's message
      await addMessage(user_id, "user", result.data.content);

      // Check if messages limit is met
      const messages = await getUserMessages(user_id);
      if(messages.length >= MAX_MESSAGES){
        console.error(`Messages limit reached (${MAX_MESSAGES}) for user ${user_id}`)
        res.status(403).json({ message: `Messages limit reached (${MAX_MESSAGES})` });
        return;
      }

      // Get AI response
      const aiResponse = await digitalTwinAgent.getResponse(messages);

      // Add AI' response
      await addMessage(user_id, "assistant", aiResponse);

      // Respond with all messages
      const allMessages = await getUserMessages(user_id);
      allMessages.forEach((msg: any) => console.info(`[chat] ${msg.role}: ${msg.content}`));
      res.status(201).json(allMessages);
    } catch (error:any) {
      console.error("Error processing chat: " + error.message);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  app.post("/api/rebootcamp-email", async (req, res) => {
    try {
      // Check missing fields
      const { subject, textPart } = req.body;
      const requiredFields = { subject, textPart };
      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([key]) => key);
      if (missingFields.length > 0) {
        console.error(`Missing fields: ${missingFields.join(', ')}`);
        res.status(400).json({ message: `Missing required fields: ${missingFields.join(', ')}` });
        return;
      }

      const mailjetClient = new Mailjet({
        apiKey: process.env.MJ_API_KEY_PUBLIC,
        apiSecret: process.env.MJ_API_KEY_PRIVATE
      });

      const request = mailjetClient.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: 'contact@rebootcamp.fr',
              Name: 'website',
            },
            To: [
              {
                Email: 'roselilaval1@gmail.com',
                Name: 'Webmaster',
              },
            ],
            Subject: subject,
            TextPart: textPart,
            HTMLPart: null,
          },
        ],
      });

      const result = await request;
      res.status(result.response.status).json({ message: "Email sent successfully", result: result.body });
    } catch (err: any) {
      console.error("Error sending email: " + err.message);
      res.status(500).json({ message: "Failed to send email" });
    }
  }, cors());

  const httpServer = createServer(app);
  return httpServer;
}
