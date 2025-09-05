import swaggerJsdoc from "swagger-jsdoc";
import { Express } from "express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "KOMPLEX API",
      version: "1.0.0",
      description:
        "A comprehensive social media platform API with blogs, forums, videos, and exercises",
      contact: {
        name: "KOMPLEX Team",
        email: "support@komplex.com",
      },
    },
    servers: [
      {
        url: "http://localhost:6969",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        FirebaseAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Firebase Authentication Token",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "integer" },
            uid: { type: "string" },
            username: { type: "string" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            email: { type: "string", format: "email" },
            phone: { type: "string" },
            profileImage: { type: "string" },
            isAdmin: { type: "boolean" },
            isSocial: { type: "boolean" },
            isVerified: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Blog: {
          type: "object",
          properties: {
            id: { type: "integer" },
            userId: { type: "integer" },
            title: { type: "string" },
            description: { type: "string" },
            type: {
              type: "string",
              enum: ["education", "entertainment", "news"],
            },
            topic: { type: "string" },
            viewCount: { type: "integer" },
            likeCount: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            media: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  url: { type: "string" },
                  type: { type: "string" },
                },
              },
            },
          },
        },
        Forum: {
          type: "object",
          properties: {
            id: { type: "integer" },
            userId: { type: "integer" },
            title: { type: "string" },
            description: { type: "string" },
            viewCount: { type: "integer" },
            likeCount: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            media: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  url: { type: "string" },
                  type: { type: "string" },
                },
              },
            },
          },
        },
        Video: {
          type: "object",
          properties: {
            id: { type: "integer" },
            userId: { type: "integer" },
            title: { type: "string" },
            description: { type: "string" },
            videoUrl: { type: "string" },
            thumbnailUrl: { type: "string" },
            duration: { type: "integer" },
            viewCount: { type: "integer" },
            likeCount: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Exercise: {
          type: "object",
          properties: {
            id: { type: "integer" },
            title: { type: "string" },
            description: { type: "string" },
            subject: { type: "string" },
            grade: { type: "string" },
            duration: { type: "integer" },
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  title: { type: "string" },
                  imageUrl: { type: "string" },
                  section: { type: "string" },
                  choices: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        text: { type: "string" },
                        isCorrect: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Comment: {
          type: "object",
          properties: {
            id: { type: "integer" },
            userId: { type: "integer" },
            content: { type: "string" },
            likeCount: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            media: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  url: { type: "string" },
                  type: { type: "string" },
                },
              },
            },
          },
        },
        Reply: {
          type: "object",
          properties: {
            id: { type: "integer" },
            userId: { type: "integer" },
            commentId: { type: "integer" },
            content: { type: "string" },
            likeCount: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            media: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  url: { type: "string" },
                  type: { type: "string" },
                },
              },
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: { type: "string" },
            error: { type: "string" },
          },
        },
      },
    },
    security: [
      {
        FirebaseAuth: [],
      },
    ],
  },
  apis: ["./src/app/komplex/routes/**/*.ts"], // Path to the API docs
};

export const specs = swaggerJsdoc(options);
