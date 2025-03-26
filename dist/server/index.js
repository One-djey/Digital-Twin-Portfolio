// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";

// shared/schema.ts
import { pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow()
});
var chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var usersRelations = relations(users, ({ many }) => ({
  messages: many(chatMessages),
  contacts: many(contactMessages)
}));
var chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, { fields: [chatMessages.userId], references: [users.id] })
}));
var contactsRelations = relations(contactMessages, ({ one }) => ({
  user: one(users, { fields: [contactMessages.userId], references: [users.id] })
}));
var insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  role: true,
  content: true
}).required({
  role: true,
  content: true
});
var insertContactSchema = createInsertSchema(contactMessages).pick({
  userId: true,
  message: true
}).required({
  userId: true,
  message: true
});
var insertUserSchema = createInsertSchema(users).pick({
  id: true,
  name: true,
  email: true
}).required({
  id: true
});

// server/storage.ts
var client = postgres(process.env.DATABASE_URL);
var db = drizzle({ client });
async function addUser(id, name, email) {
  return await db.insert(users).values({ id, name, email }).returning();
}
async function updateUser(id, name, email) {
  const updateData = {};
  if (name !== void 0) updateData.name = name;
  if (email !== void 0) updateData.email = email;
  return await db.update(users).set(updateData).where(eq(users.id, id)).returning();
}
async function userExistsById(userId) {
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0;
}
async function addMessage(userId, role, content) {
  return await db.insert(chatMessages).values({ userId, role, content }).returning();
}
async function getUserMessages(userId) {
  return await db.select().from(chatMessages).where(eq(chatMessages.userId, userId));
}
async function resetUserMessages(userId) {
  await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
}
async function addContactMessage(userId, message) {
  return await db.insert(contactMessages).values({ userId, message }).returning();
}

// server/ai/APIs/OpenAI.ts
import OpenAI from "openai";
import "dotenv/config";
var OpenAIAPI = class {
  client;
  model;
  temperature;
  maxTokens;
  // Check pricing: https://platform.openai.com/docs/pricing
  static MODELS = [
    "o1",
    "o1-mini",
    "gpt-4o",
    "gpt-4o-mini",
    "o3-mini"
  ];
  constructor(model, temperature, maxTokens) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }
  async getResponse(messages) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens
      });
      return response.choices[0].message.content ?? "I apologize, I couldn't process that request.";
    } catch (error) {
      throw new Error(`OpenAI API request failed: ${error}`);
    }
  }
};

// server/ai/APIs/Mistral.ts
import "dotenv/config";
import { Mistral } from "@mistralai/mistralai";
var MistralAPI = class {
  client;
  model;
  temperature;
  maxTokens;
  // Check Pricing: https://mistral.ai/en/products/la-plateforme#pricing
  static MODELS = [
    "mistral-large-latest",
    "pixtral-large-latest",
    "mistral-small-latest",
    "codestral-latest",
    "ministral-8b-latest",
    "ministral-3b-latest",
    "mistral-embed",
    "mistral-moderation-latest"
  ];
  constructor(model, temperature, maxTokens) {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY environment variable is required");
    }
    this.client = new Mistral({ apiKey });
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }
  async getResponse(messages) {
    try {
      const chatResponse = await this.client.chat.complete({
        model: this.model,
        messages,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        stream: false
      });
      return String(chatResponse.choices?.[0]?.message.content ?? "I apologize, I couldn't process that request.");
    } catch (error) {
      throw new Error(`Mistral API request failed: ${error}`);
    }
  }
};

// server/ai/AIAgent.ts
var AIAgent = class {
  model;
  temperature;
  maxTokens;
  systemMessage;
  apiInstance;
  // Instance de l'API
  constructor(model, temperature, maxTokens, systemMessage) {
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
    this.systemMessage = systemMessage;
    if (model.startsWith("gpt")) {
      this.apiInstance = new OpenAIAPI(model, temperature, maxTokens);
    } else if (model.startsWith("mistral")) {
      this.apiInstance = new MistralAPI(model, temperature, maxTokens);
    } else {
      throw new Error("Unsupported model type");
    }
  }
  async callAPI(messages) {
    const messagesWithContext = [
      {
        role: "system",
        content: this.systemMessage
      },
      ...messages
    ];
    return this.apiInstance.getResponse(messagesWithContext);
  }
  async getResponse(messages) {
    return this.callAPI(messages);
  }
};

// shared/portfolio.ts
var portfolioData = {
  "ai_clone": {
    "model": "mistral-small-latest",
    // Use "gpt-4o-mini" or "mistral-small-latest" for cost-efficency performances
    "personality": "Friendly and professional, with deep knowledge of software development and AI technologies"
  },
  "personal": {
    "name": "Jeremy",
    // Used for LLM & other
    "title": "Freelance Data / IA Engineer",
    // Use in Home page
    "avatar": "https://media.licdn.com/dms/image/v2/D4D03AQHb7UR8SvGc-Q/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1678795828713?e=1744848000&v=beta&t=GztAvIY1yqiAoJx1AKWlfHv-ognqxU9_mFM9OdtcZ1s",
    // Use in Home page
    "location": "Nice, FRANCE / Full remote",
    "email": "contact@jeremy-maisse.com",
    "phone": "+337 52 02 00 95",
    "languages": ["French", "English"]
  },
  "intro": {
    "shortBio": "Remote freelance developper with expertise in data and artificial intelligence",
    "chatIntro": "Welcome! I'm Jeremy's AI assistant. Feel free to ask me about his work, skills, or anything else!",
    // Used as first chat message
    "aboutMe": `I am a passionate Data & AI Engineer. With over 9 years of professional experience, I have developed strong skills in building pipelines, AI integration, and automation. My MBA and engineering degree reflect my interest in entrepreneurship and technology.

My specialties:

  \u2022 **Data Pipelines**: Designing and optimizing pipelines to fully leverage your data

  \u2022 **Artificial Intelligence**: Integrating AI and intelligent agents to automate and transform your processes

  \u2022 **SaaS and APIs**: Developing custom, reliable, and scalable solutions.

 

Leverage my expertise to optimize your data and achieve your business goals. \u{1F4C8}`
    // Used in About page
  },
  "skills": [
    // Use in About page
    "Python",
    "Spark",
    "SQL",
    "AWS",
    "ETL",
    "Data pipelines",
    "API",
    "AI/ML",
    "LLM"
  ],
  "projects": [
    // Use in Project page
    {
      "title": "Noah",
      "description": "Rhino 3D naval plugin that calculates ship stability ",
      "image": "https://www.rhino3d.com/images/marine-expressmarinedefault.jpg",
      "url": null
    },
    {
      "title": "Chess Verse",
      "description": "Chess game with custom modes",
      "image": "https://images.unsplash.com/photo-1529699211952-734e80c4d42b",
      "url": "https://chess.jeremy-maisse.com/"
    },
    {
      "title": "SudIncub",
      "description": "Directory of startup support organizations with interactive filters",
      "image": "https://img.notionusercontent.com/s3/prod-files-secure%2F917a6727-e8fc-4115-bfda-de72142aa4d9%2Fa7601455-cc0c-48ea-8a4e-e87c388acbec%2FSudIncub_banner.png/size/w=2000?exp=1740534821&sig=u33SKX4b46F6Cs_O7rqoLzlFJBuz5I5dXHI5y96wSVA",
      "url": "https://jeremy-maisse.notion.site/aa815583ccde44ff8e33e58e29cf6601"
    },
    {
      "title": "Odience",
      "description": "AI powered API to create marketing audiences",
      "image": "https://ph-files.imgix.net/dae11345-0709-4184-adc0-677ffdcdb83a.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&fm=pjpg&w=1100&h=515&fit=max&frame=1&dpr=1",
      "url": "https://www.producthunt.com/products/odience"
    },
    {
      "title": "Lyriks",
      "description": "Mobile app for replying to messages with iconic audio clips from movies/music.",
      "image": "https://media.licdn.com/dms/image/v2/D4E22AQHe9igCtBZLrg/feedshare-shrink_1280/feedshare-shrink_1280/0/1694343126349?e=1743638400&v=beta&t=EG5N9S9CvTSzOQnfiIC6U3rR4U2DnZ7fQST6Wf88uF8",
      "url": "https://www.linkedin.com/posts/jeremy-maisse_comment-je-me-suis-fait-bannir-du-play-store-activity-7107264093622808576-Hd80/"
    },
    {
      "title": "Snowboard Mentor",
      "description": "Instgram account sharing knowledge about snowboarding",
      "image": "https://www.snowboardpascher.com/img/cms/composition-snow.gif",
      "url": "https://www.instagram.com/snowboardmentor/"
    }
  ],
  "experiences": [
    // Use in About page
    {
      "title": "Founder",
      "company": "Marvyn",
      "logo": "https://media.licdn.com/dms/image/v2/D4E0BAQF3hFEkz7QpSQ/company-logo_100_100/company-logo_100_100/0/1693917068755/sudincub_logo?e=1747872000&v=beta&t=MUpVe5Mr9dggpiRtkPFAXcJjOjTLLYlFifd337C9SX8",
      "industry": "capital investment",
      "period": "January 2024 - December 2024",
      "description": "Marvyn is a venture capital analysis tool powered by artificial intelligence. It provides precise insights for startup evaluation. Our platform transforms how investors and venture capital firms access data, analyze investment opportunities, and make informed decisions.",
      "link": "https://marvyn.app/",
      "skills": [
        "LLMs",
        "Business analysis",
        "Market research",
        "Financial analysis",
        "Risk assessment",
        "Private equity",
        "Venture capital",
        "Corporate venture",
        "Mergers & acquisitions"
      ]
    },
    {
      "title": "Head Data Engineer",
      "company": "Evorra",
      "logo": "https://media.licdn.com/dms/image/v2/C4E0BAQHPbMz8jP_EFw/company-logo_200_200/company-logo_200_200/0/1630628834726/evorra_logo?e=1747872000&v=beta&t=7eZKgn1HEaYEtvsPjdP7F-c-iAtZAzgr_vgrYvURXPo",
      "industry": "e-commerce",
      "period": "April 2021 - December 2023",
      "description": "Designed and built data pipelines in Spark Python/SQL for audience analysis and online advertising. Scaled from 0 to 1 billion profiles managed daily in 2 years.",
      "skills": [
        "Python",
        "Spark",
        "AWS",
        "GitHub",
        "SQL"
      ]
    },
    {
      "title": "Data Engineer",
      "company": "Orange",
      "logo": "https://media.licdn.com/dms/image/v2/C4D0BAQEIG5RkDRNPvg/company-logo_200_200/company-logo_200_200/0/1630485596129/orange_logo?e=1747872000&v=beta&t=nW3I-Ba-bSayfXkRI5hzgXHYOFiRv7VbXjogodmwMkY",
      "industry": "telecommunications",
      "period": "January 2020 - April 2021",
      "description": "Creative Data Team (TV & web profiling): Developed new Big Data features and managed production applications. Skill Center AI Team (Customer Experience Quality): Created a system incident tracking tool linked to customer feedback.",
      "skills": [
        "Java",
        "Scala",
        "Spark",
        "Hadoop",
        "MapReduce",
        "Hive"
      ]
    },
    {
      "title": "Data Scientist",
      "company": "Renault",
      "logo": "https://media.licdn.com/dms/image/v2/D4E0BAQHgav0KLpu8-g/company-logo_200_200/company-logo_200_200/0/1699449290162/renault_software_factory_logo?e=1747872000&v=beta&t=9_VhhVsswcmFo-MnmvXQxgWFilFdRlWeujCzg2Z64To",
      "industry": "automotive",
      "period": "September 2019 - January 2020",
      "description": "R&D of advanced driver assistance systems for analyzing driving scenes in autonomous vehicles.",
      "skills": [
        "Python",
        "TensorFlow",
        "Keras",
        "Numpy"
      ]
    },
    {
      "title": "Backend Developer (Java)",
      "company": "Renault",
      "logo": "https://media.licdn.com/dms/image/v2/D4E0BAQHgav0KLpu8-g/company-logo_200_200/company-logo_200_200/0/1699449290162/renault_software_factory_logo?e=1747872000&v=beta&t=9_VhhVsswcmFo-MnmvXQxgWFilFdRlWeujCzg2Z64To",
      "industry": "automotive",
      "period": "May 2019 - September 2019",
      "description": "Developed a cloud service for a Bluetooth virtual car key solution.",
      "skills": [
        "Java",
        "Spring",
        "API",
        "JUnit",
        "Mockito",
        "Postman",
        "JWT"
      ]
    },
    {
      "title": "Backend Developer (JavaScript)",
      "company": "Orange",
      "logo": "https://media.licdn.com/dms/image/v2/C4D0BAQEIG5RkDRNPvg/company-logo_200_200/company-logo_200_200/0/1630485596129/orange_logo?e=1747872000&v=beta&t=nW3I-Ba-bSayfXkRI5hzgXHYOFiRv7VbXjogodmwMkY",
      "industry": "telecommunications",
      "period": "November 2018 - May 2019",
      "description": "Developed a Software-Defined Network and created tools for managing Cisco network devices.",
      "skills": [
        "JavaScript",
        "Node.js",
        "TypeScript",
        "API"
      ]
    },
    {
      "title": "Co-founder",
      "company": "Lycie App",
      "logo": "https://media.licdn.com/dms/image/v2/C4D0BAQGiiNximCPeVw/company-logo_100_100/company-logo_100_100/0/1634205001619/lycieapp_logo?e=1747872000&v=beta&t=u-GCIFHitNLyb_vDQJoe6myovWlXv9dchodK1NE5zJw",
      "industry": "automotive",
      "period": "May 2018 - January 2020",
      "description": "Lycie is the first mobile application for accident prevention, analyzing abnormal driver and road user behavior.",
      "skills": [
        "Startup",
        "Entrepreneurship",
        "Business plan",
        "Flutter",
        "Dart",
        "Google Cloud",
        "Android",
        "Storytelling"
      ]
    },
    {
      "title": "Backend & Test Developer Apprentice",
      "company": "Thales",
      "logo": "https://media.licdn.com/dms/image/v2/C4D0BAQEmnUAXTuLkJQ/company-logo_200_200/company-logo_200_200/0/1631366051478/thales_logo?e=1747872000&v=beta&t=1OASNkTeLaeGN2ChJWCn85pooUuOk6bvITjxQgn8LFE",
      "industry": "defense & military",
      "period": "September 2015 - August 2018",
      "description": "Apprentice in the sonar software department: developed software and automated unit, acceptance, and UI tests.",
      "skills": [
        "Java",
        "Swing",
        "JUnit",
        "Postman"
      ]
    }
  ],
  "education": [
    // Use in About page
    {
      "degree": "Engineering Degree",
      "field": "Electronics and Industrial Computing",
      "institution": "Polytech Nice Sophia",
      "logo": "https://media.licdn.com/dms/image/v2/C560BAQGbxDmYp9BZ5g/company-logo_200_200/company-logo_200_200/0/1630577766733/polytech_nice_sophia_logo?e=1747872000&v=beta&t=4zaomX9g6vtl9uwAIWy1zuljzH5-NXoeFId_KsU0vJQ",
      "year": 2018
    },
    {
      "degree": "MBA",
      "field": "Specialization in Business Management",
      "institution": "IAE Nice (Graduate School of Management)",
      "logo": "https://media.licdn.com/dms/image/v2/C510BAQHBfvof7DL22w/company-logo_200_200/company-logo_200_200/0/1631365706583?e=1747872000&v=beta&t=QwRC6pEH87GMRm-v4c0YoqbIrpcYJ3Kjzqyd6wLMBzk",
      "year": 2018
    },
    {
      "degree": "Associate's Degree",
      "field": "Computer Science",
      "institution": "Aix-Marseille University",
      "logo": "https://media.licdn.com/dms/image/v2/D560BAQEyYm84FuqZyg/company-logo_200_200/company-logo_200_200/0/1733995733147/aix_marseille_universite_logo?e=1747872000&v=beta&t=FPNMoZud4fMHzFyLErsQ1Ifsa5Q4PVjKqKW8rA6B7hA",
      "year": 2015
    }
  ],
  "processSteps": [
    {
      "step": 1,
      "title": "Discovery",
      "description": "Analysis of your needs and objectives to define the scope of the project."
    },
    {
      "step": 2,
      "title": "Proposal",
      "description": "Development of a custom solution with detailed planning and budget."
    },
    {
      "step": 3,
      "title": "Implementation",
      "description": "Iterative development with regular check-ins to ensure your satisfaction."
    }
  ],
  "services": [
    {
      "title": "AI Agent Development",
      "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><rect width="18" height="10" x="3" y="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" x2="8" y1="16" y2="16"/><line x1="16" x2="16" y1="16" y2="16"/></svg>',
      "shortDescription": "Intelligent automation solutions using the latest LLM technologies.",
      "features": [
        "Custom conversational agents development",
        "LLM integration (GPT-4, Claude, etc.) into your workflows",
        "Repetitive task automation with AI",
        "Intelligent content analysis and generation",
        "Business process optimization with AI"
      ]
    },
    {
      "title": "Data Pipeline Engineering",
      "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>',
      "shortDescription": "Data flow architecture and optimization for efficient data utilization.",
      "features": [
        "Design and implementation of performant ETL processes",
        "Modern data infrastructure (data mesh, data lake)",
        "Cross-platform data integration and transformation",
        "Flow orchestration with Airflow, Prefect, or Dagster",
        "Reliable and scalable data solutions"
      ]
    },
    {
      "title": "Fullstack Development",
      "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      "shortDescription": "Modern web applications and robust APIs tailored to your needs.",
      "features": [
        "Web application development with React/Next.js",
        "RESTful and GraphQL API design",
        "Cloud-native and serverless architecture",
        "High-performance apps with responsive design",
        "Integration with existing systems"
      ]
    }
  ],
  "testimonials": [
    {
      "name": "Arnaud P.",
      "position": "CEO, iPepper",
      "text": "He is a brilliant guy who has brilliantly developed his skills in the field of Data and AI. [...] A creative and highly professional guy that I recommend!"
    },
    {
      "name": "Marc C.",
      "position": "CTO, Evorra",
      "text": "He worked on the data ingestion pipeline and insights generation and was instrumental cleansing the data, revisiting our design as we scaled, discovering interesting correlations."
    },
    {
      "name": "Laurence O.",
      "position": "Team Manager, Capgemini",
      "text": "He demonstrated a remarkable ability to adapt, a growing curiosity on all subjects related to data and especially data science [...]. Jeremy is a professional, on whom we can rely when it comes to embarking on new challenges."
    },
    {
      "name": "Philippe T.",
      "position": "AI Engineer, Renault",
      "text": "Passionnate, motivated and willing to provide customer with quick and high quality response."
    }
  ],
  "faq": [
    {
      "question": "How does the collaboration process work?",
      "answer": "After an initial discussion to understand your needs, I'll propose a tailored solution with a detailed quote. Once approved, we'll establish a timeline together, and I'll keep you regularly updated on progress with frequent demonstrations."
    },
    {
      "question": "What are your pricing options?",
      "answer": "I offer several formats depending on your needs: daily rate, project-based package, or maintenance contract. Since each project is unique, pricing is customized after analyzing your specific requirements."
    },
    {
      "question": "How long does it take to complete a project?",
      "answer": "Duration depends on your project's complexity. A simple API development might take a few weeks, while a complete application with AI could require several months. A precise estimate will be provided after our initial consultation."
    },
    {
      "question": "Do you offer support after project delivery?",
      "answer": "Absolutely! I offer maintenance and evolution contracts to ensure the longevity of your solution. You also benefit from a warranty period after production deployment."
    },
    {
      "question": "Do you work on international projects?",
      "answer": "Yes, I regularly collaborate with international clients. Thanks to modern collaborative tools and clear communication, distance is not an obstacle to your project's success."
    }
  ]
};

// server/ai/DigitalTwinAgent.ts
var DigitalTwinAgent = class extends AIAgent {
  constructor() {
    const model = portfolioData.ai_clone.model;
    const temperature = 0.7;
    const maxTokens = 500;
    const systemMessage = `You are a virtual clone of ${portfolioData.personal.name}. Your goal is to respond to potential clients' inquiries, provide accurate information about your skills / services, prequalify interviews, and negotiate the best daily rate for freelance projects.

**Portfolio Data:**
${JSON.stringify(portfolioData)}

**Instructions:**

1. **Tone and Style:**
   - Speak in first person.
   - Respond in the user's language.
   - Maintain a professional yet friendly tone.
   - Be clear, concise, and direct in your responses.
   - Use appropriate technical terms for your field, but explain them simply when necessary.

2. **Responding to Queries:**
   - Provide detailed and accurate responses based on the portfolioData.
   - If a question is beyond your knowledge, offer to get back to the client after verification or ask for clarification.

3. **Presenting Services:**
   - Highlight key skills and successful projects from the portfolioData.
   - Explain how your services can meet the client's specific needs.

4. **Handling Quote Requests:**
   - Ask for project details to provide an accurate estimate.
   - Offer packages or hourly rates based on available information.

5. **Follow-Up and Engagement:**
   - Suggest clear next steps, such as a discovery call or sending a detailed proposal.
   - Always thank the client for their interest and express enthusiasm for collaboration.

6. **Example Responses:**
   - "Thank you for your interest! I specialize in [list of main skills] and recently worked on [relevant project or experience]. How can I assist with your project?"
   - "To better understand your needs, could you provide more details about [specific project aspect]?"
   - "Based on your description, I can offer [solution or service]. Would you like to discuss further in a call?"

**Example Scenarios:**
- A client asks for information about your rates.
- A client wants to see examples of similar projects.
- A client has technical questions about your skills or tools used.
`;
    super(model, temperature, maxTokens, systemMessage);
  }
};
var digitalTwinAgent = new DigitalTwinAgent();

// shared/uuidv4.ts
import { v4 as uuidv4 } from "uuid";
function isUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// server/routes.ts
import Mailjet from "node-mailjet";
import cors from "cors";
async function registerRoutes(app2) {
  const MAX_MESSAGES = 20;
  app2.post("/api/contact", async (req, res) => {
    try {
      const contactRequest = req.body;
      const receivedUser = contactRequest.user;
      const receivedContact = contactRequest.contact;
      const userResult = insertUserSchema.safeParse(receivedUser);
      if (!receivedUser || !userResult.success) {
        console.error(`Invalid user format: ${JSON.stringify(receivedUser)}`);
        res.status(400).json({ message: "Invalid user format" });
        return;
      }
      const contactResult = insertContactSchema.safeParse(receivedContact);
      if (!receivedContact || !contactResult.success) {
        console.error(`Invalid user format: ${JSON.stringify(receivedContact)}`);
        res.status(400).json({ message: "Invalid contact format" });
        return;
      }
      if (!await userExistsById(userResult.data.id)) {
        const newUser = await addUser(userResult.data.id, userResult.data.name, userResult.data.email);
        if (!newUser) {
          console.error(`Failed to add user ${JSON.stringify(userResult.data)}`);
          res.status(500).json({ message: "Failed to add user." });
          return;
        }
      } else {
        await updateUser(userResult.data.id, userResult.data?.name, userResult.data?.email);
      }
      const newContact = await addContactMessage(contactResult.data.userId, contactResult.data.message);
      if (!newContact) {
        console.error(`Failed to add contact message ${JSON.stringify(contactResult.data)}`);
        res.status(500).json({ message: "Failed to add contact message." });
        return;
      }
      console.info(`New contact form saved!`);
      res.status(201).json({});
    } catch (error) {
      console.error("Error adding user: " + error.message);
      res.status(500).json({ message: "Failed to add user" });
    }
  });
  app2.post("/api/chat/reset", async (req, res) => {
    try {
      const user_id = req.body?.user_id;
      if (!user_id || !await userExistsById(user_id)) {
        console.error(`User ID ${user_id} not found.`);
        res.status(400).json({ message: "Invalid User ID" });
        return;
      }
      await resetUserMessages(user_id);
      const messages = await getUserMessages(user_id);
      res.status(205).json(messages);
    } catch (error) {
      console.error("Error resetting messages: " + error.message);
      res.status(500).json({ message: "Failed to reset messages" });
    }
  });
  app2.get("/api/chat", async (req, res) => {
    try {
      const user_id = req.query?.user_id;
      if (!user_id || typeof user_id != "string") {
        console.error(`Invalid user ID ${user_id} format.`);
        res.status(400).json({ message: "Invalid User ID format" });
        return;
      }
      if (!await userExistsById(user_id)) {
        console.warn(`User ID ${user_id} not found, return empty message list`);
        res.status(204).json([]);
        return;
      }
      const messages = await getUserMessages(user_id);
      res.status(200).json(messages);
    } catch (error) {
      console.error("Error fetching messages: " + error.message);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  app2.post("/api/chat", async (req, res) => {
    try {
      const user_id = req.body?.user_id;
      if (!user_id || !isUUID(user_id)) {
        console.error(`User ID ${user_id}.`);
        res.status(400).json({ message: "Invalid user ID" });
        return;
      }
      const requestChatMessage = req.body?.message;
      const result = insertChatMessageSchema.safeParse(requestChatMessage);
      if (!requestChatMessage || !result.success) {
        console.error(`Invalid message format: ${JSON.stringify(requestChatMessage)}`);
        res.status(400).json({ message: "Invalid message format" });
        return;
      }
      if (!await userExistsById(user_id)) {
        await addUser(user_id);
      }
      await addMessage(user_id, "user", result.data.content);
      const messages = await getUserMessages(user_id);
      if (messages.length >= MAX_MESSAGES) {
        console.error(`Messages limit reached (${MAX_MESSAGES}) for user ${user_id}`);
        res.status(403).json({ message: `Messages limit reached (${MAX_MESSAGES})` });
        return;
      }
      const aiResponse = await digitalTwinAgent.getResponse(messages);
      await addMessage(user_id, "assistant", aiResponse);
      const allMessages = await getUserMessages(user_id);
      allMessages.forEach((msg) => console.info(`[chat] ${msg.role}: ${msg.content}`));
      res.status(201).json(allMessages);
    } catch (error) {
      console.error("Error processing chat: " + error.message);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });
  const originAllowedList = [
    "http://localhost:8080",
    "https://vercel.rebootcamp.fr",
    "http://www.rebootcamp.fr",
    "http://rebootcamp.fr",
    "https://www.rebootcamp.fr",
    "https://rebootcamp.fr"
  ];
  const corsOptions = {
    origin: originAllowedList,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  };
  app2.use("/api/rebootcamp-email", cors(corsOptions));
  app2.options("/api/rebootcamp-email", (req, res) => {
    res.header("Access-Control-Allow-Origin", originAllowedList);
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.sendStatus(204);
  });
  app2.post("/api/rebootcamp-email", async (req, res) => {
    try {
      const { subject, textPart } = req.body;
      if (!subject || !textPart) {
        return res.status(400).json({ message: "Missing required fields: subject, textPart" });
      }
      const mailjetClient = new Mailjet({
        apiKey: process.env.MJ_API_KEY_PUBLIC,
        apiSecret: process.env.MJ_API_KEY_PRIVATE
      });
      const request = mailjetClient.post("send", { version: "v3.1" }).request({
        Messages: [
          {
            From: { Email: "contact@rebootcamp.fr", Name: "website" },
            To: [{ Email: "roselilaval1@gmail.com", Name: "Webmaster" }],
            Subject: subject,
            TextPart: textPart,
            HTMLPart: null
          }
        ]
      });
      const result = await request;
      res.status(result.response.status).json({ message: "Email sent successfully", result: result.body });
    } catch (err) {
      console.error("Error sending email: " + err.message);
      res.status(500).json({ message: "Failed to send email" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import "dotenv/config";
var app = express();
if (!process.env.VERCEL) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
}
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      console.log(logLine);
    }
  });
  next();
});
var environment = process.env.VERCEL_ENV || process.env.NODE_ENV;
console.log(`The application is starting in ${environment} mode...`);
var serverPromise = (async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  return app;
})();
async function handler(req, res) {
  const appInstance = await serverPromise;
  return appInstance(req, res);
}
export {
  handler as default
};
