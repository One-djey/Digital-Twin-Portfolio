export const portfolioData = {
    "ai_clone": {
      "model": "mistral-small-latest", // Use "gpt-4o-mini" or "mistral-small-latest" for cost-efficency performances
      "personality": "Friendly and professional, with deep knowledge of software development and AI technologies",
    },
    "personal": {
      "name": "Jeremy",  // Used for LLM & other
      "title": "Freelance Data / IA Engineer",  // Use in Home page
      "avatar": "https://media.licdn.com/dms/image/v2/D4D03AQHb7UR8SvGc-Q/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1678795828713?e=1744848000&v=beta&t=GztAvIY1yqiAoJx1AKWlfHv-ognqxU9_mFM9OdtcZ1s",  // Use in Home page
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
        "title": "E-commerce Platform",
        "description": "A modern e-commerce solution with AI-powered recommendations",
        "image": "https://images.unsplash.com/photo-1508873535684-277a3cbcc4e8"
      },
      {
        "title": "Analytics Dashboard",
        "description": "Real-time analytics and data visualization platform",
        "image": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40"
      },
      {
        "title": "Social Media App",
        "description": "A next-gen social platform with AI content moderation",
        "image": "https://images.unsplash.com/photo-1510759395231-72b17d622279"
      },
      {
        "title": "AI Chat Interface",
        "description": "Natural language processing chat application",
        "image": "https://images.unsplash.com/photo-1660592868727-858d28c3ba52"
      },
      {
        "title": "Portfolio Generator",
        "description": "Automated portfolio website generator using AI",
        "image": "https://images.unsplash.com/photo-1685478237595-f452cb125f27"
      },
      {
        "title": "IoT Dashboard",
        "description": "Smart home IoT control and monitoring system",
        "image": "https://images.unsplash.com/photo-1679409759768-bea306439ab8"
      }
    ],
    "experiences": [  // Use in About page
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
    "education": [  // Use in About page
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
    ]
  };