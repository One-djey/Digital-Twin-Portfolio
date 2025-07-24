export const portfolioData = {
    "ai_clone": {
      "model": "mistral-small-latest", // Use "gpt-4o-mini" or "mistral-small-latest" for cost-efficency performances
      "personality": "Friendly and professional, with deep knowledge of software development and AI technologies",
    },
    "personal": {
      "name": "Jeremy",  // Used for LLM & other
      "title": "Freelance Data / IA Engineer",  // Use in Home page
      "avatar": "/public/profile_pic.png",  // Use in Home page
      "location": "Nice, FRANCE / Full remote",
      "email": "contact@jeremy-maisse.com",
      "phone": "+337 52 02 00 95",
      "languages": ["French", "English"]
    },
    "intro": {
      "shortBio": "Remote freelance developper with expertise in data and artificial intelligence",
      "chatIntro": "Welcome! I'm Jeremy's AI assistant. Feel free to ask me about his work, skills, or anything else!", // Used as first chat message
      "aboutMe": `I am a passionate Data & AI Engineer. With over 9 years of professional experience, I have developed strong skills in building pipelines, AI integration, and automation. My MBA and engineering degree reflect my interest in entrepreneurship and technology.\n
My specialties:\n
  • **Data Pipelines**: Designing and optimizing pipelines to fully leverage your data\n
  • **Artificial Intelligence**: Integrating AI and intelligent agents to automate and transform your processes\n
  • **SaaS and APIs**: Developing custom, reliable, and scalable solutions.\n
 \n
Leverage my expertise to optimize your data and achieve your business goals. 📈`, // Used in About page
    },
    "skills": [   // Use in About page
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
    "projects": [  // Use in Project page
        {
          "title": "TraveLearn",
          "description": "Training organization in Artificial Intelligence for all levels",
          "image": "/public/travelearn.jpg",
          "url": "https://travelearn.fr/"
        },
        {
            "title": "Noah",
            "description": "Rhino 3D naval plugin that calculates ship stability ",
            "image": "/public/noah.jpg",
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
            "image": "/public/sudincub.png",
            "url": "https://jeremy-maisse.notion.site/aa815583ccde44ff8e33e58e29cf6601"
        },
        {
            "title": "Odience",
            "description": "AI powered API to create marketing audiences",
            "image": "/public/odience.png",
            "url": "https://www.producthunt.com/products/odience"
        },
        {
            "title": "Lyriks",
            "description": "Mobile app for replying to messages with iconic audio clips from movies/music.",
            "image": "/public/lyriks.png",
            "url": "https://www.linkedin.com/posts/jeremy-maisse_comment-je-me-suis-fait-bannir-du-play-store-activity-7107264093622808576-Hd80/"
        },
        {
            "title": "Snowboard Mentor",
            "description": "Instgram account sharing knowledge about snowboarding",
            "image": "/public/snowboard_mentor.png",
            "url": "https://www.instagram.com/snowboardmentor/"
        }
    ],
    "experiences": [  // Use in About page
      {
        "title": "Founder",
        "company": "Marvyn",
        "logo": "/public/marvyn.jpeg",
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
        "logo": "/public/evorra.jpeg",
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
        "logo": "/public/orange.jpeg",
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
        "logo": "/public/renault.jpeg",
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
        "logo": "/public/renault.jpeg",
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
        "logo": "/public/orange.jpeg",
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
        "logo": "/public/lycie.jpeg",
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
        "logo": "/public/thales.jpeg",
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
    "education": [  // Use in About page
      {
        "degree": "Engineering Degree",
        "field": "Electronics and Industrial Computing",
        "institution": "Polytech Nice Sophia",
        "logo": "/public/polytech.jpeg",
        "year": 2018
      },
      {
        "degree": "MBA",
        "field": "Specialization in Business Management",
        "institution": "IAE Nice (Graduate School of Management)",
        "logo": "/public/IAE.jpeg",
        "year": 2018
      },
      {
        "degree": "Associate's Degree",
        "field": "Computer Science",
        "institution": "Aix-Marseille University",
        "logo": "/public/amU.jpeg",
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
