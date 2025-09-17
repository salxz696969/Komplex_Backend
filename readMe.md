# KOMPLEX Backend API Documentation

## 🌟 About Komplex

**KOMPLEX** is an open-source STEM learning platform specifically designed for high school students in Cambodia. Our mission is to democratize quality education by providing free, interactive lessons and resources that align with the national curriculum.

### The Problem We're Solving

Many Cambodian students struggle with STEM subjects and rely heavily on expensive private tutoring and paid summary books. KOMPLEX offers a free, self-paced alternative that promotes deep understanding over rote memorization.

### Our Inspiration

Built with the philosophy of platforms like **W3Schools**, we believe learning should be:

- 🆓 **Free and accessible**
- 🎯 **Interactive and engaging**
- 📚 **Curriculum-aligned**
- 🚀 **Self-paced**

---

## ✨ Features

### 🔐 User Management
- **Authentication**: Secure Firebase-based auth system
- **Profiles**: Customizable user profiles with follower/following system
- **Social**: Community-driven learning experience

### 📚 Content Management
- **Blogs**: Educational articles and tutorials
- **Forums**: Student discussion boards and Q&A
- **Videos**: Interactive video lessons
- **Exercises**: Practice problems and assessments
- **Media**: File upload and management system

### 🔍 Advanced Search
- **Lightning Fast**: Powered by Meilisearch
- **Full-Text Search**: Search across blogs, forums, and videos
- **Intelligent Indexing**: Smart content discovery

### 🛡️ Performance & Security
- **Rate Limiting**: Redis-backed protection against abuse
- **Error Handling**: Comprehensive error management
- **Admin Panel**: Moderation tools and analytics dashboard

### 🤖 AI Integration
- **Gemini 2.5 Flash**: AI-powered learning assistance via [Komplex AI](https://github.com/salxz696969/Komplex_Ai)

---

## 🏗️ Architecture

```
Komplex_Backend/
├── readMe.md                  # Project documentation
├── .env                       # Environment variables
├── Dockerfile                 # Docker build instructions
├── docker-compose.yml         # Multi-service orchestration
└── src/
    ├── server.ts              # Application entry point
    ├── app/
    │   ├── komplex/
    │   │   ├── controllers/   # Route handlers (grouped by feature)
    │   │   │   ├── auth.controller.ts
    │   │   │   ├── upload.controller.ts
    │   │   │   ├── feed/     # Public content (blogs, forums, etc.)
    │   │   │   ├── me/       # Authenticated user actions
    │   │   │   ├── search/   # Search endpoints
    │   │   │   └── users/    # Other users' public content
    │   │   ├── routes/       # Express routers (API endpoints)
    │   │   │   ├── auth.routes.ts
    │   │   │   ├── index.ts
    │   │   │   ├── upload.route.ts
    │   │   │   ├── feed/     # /api/feed/*
    │   │   │   ├── me/       # /api/me/*
    │   │   │   ├── search/   # /api/search/*
    │   │   │   └── users/    # /api/users/*
    │   │   └── services/     # Business logic (feature-based)
    │   │       ├── auth/
    │   │       ├── feed/
    │   │       ├── me/
    │   │       ├── search/
    │   │       └── users/
    │   └── komplex.admin/
    │       ├── controllers/  # Admin panel logic
    │       │   ├── auth.controller.ts
    │       │   ├── blogs.controller.ts
    │       │   ├── dashboard.controller.ts
    │       │   ├── exercises.controller.ts
    │       │   ├── feedbacks.controller.ts
    │       │   ├── forum_comments.controller.ts
    │       │   ├── forum_replies.controller.ts
    │       │   ├── forums.controller.ts
    │       │   ├── grades.controller.ts
    │       │   ├── subjects.controller.ts
    │       │   ├── users.controller.ts
    │       │   ├── videos.controller.ts
    │       │   └── database/ # DB admin tools
    │       └── routes/       # /api/admin/* endpoints
    │           ├── auth.route.ts
    │           ├── blogs.route.ts
    │           ├── dashborad.route.ts
    │           ├── database.route.ts
    │           ├── exercises.route.ts
    │           ├── feedbacks.route.ts
    │           ├── followers.route.ts
    │           ├── forum_comments.route.ts
    │           ├── forum_replies.route.ts
    │           ├── forums.route.ts
    │           ├── grades.route.ts
    │           ├── index.ts
    │           ├── subjects.route.ts
    │           ├── user_exercise_history.route.ts
    │           ├── user_saved_blogs.route.ts
    │           ├── user_saved_videos.route.ts
    │           ├── user_video_history.route.ts
    │           ├── users.route.ts
    │           └── videos.route.ts
    ├── config/
    │   ├── meilisearchConfig.ts     # Meilisearch setup
    │   ├── swagger.ts               # Swagger/OpenAPI config
    │   └── firebase/
    │       └── admin.ts             # Firebase admin SDK
    ├── db/
    │   ├── index.ts                 # DB connection
    │   ├── schema.ts                # Drizzle schema
    │   ├── cloudflare/
    │   │   ├── cloudflareConfig.ts
    │   │   └── cloudflareFunction.ts
    │   ├── models/                  # Table definitions
    │   │   ├── blog_media.ts
    │   │   ├── blogs.ts
    │   │   ├── choices.ts
    │   │   ├── exercises.ts
    │   │   ├── feedback_media.ts
    │   │   ├── feedback_status.ts
    │   │   ├── feedbacks.ts
    │   │   ├── followers.ts
    │   │   ├── forum_comment_like.ts
    │   │   ├── forum_comment_media.ts
    │   │   ├── forum_comments.ts
    │   │   ├── forum_likes.ts
    │   │   ├── forum_medias.ts
    │   │   ├── forum_replies.ts
    │   │   ├── forum_reply_like.ts
    │   │   ├── forum_reply_media.ts
    │   │   ├── forums.ts
    │   │   ├── media_type.ts
    │   │   ├── questions.ts
    │   │   ├── user_ai_history.ts
    │   │   ├── user_exercise_history.ts
    │   │   ├── user_oauth.ts
    │   │   ├── user_question_history.ts
    │   │   ├── user_saved_blogs.ts
    │   │   ├── user_saved_videos.ts
    │   │   ├── user_video_history.ts
    │   │   ├── users.ts
    │   │   ├── video_comment_like.ts
    │   │   ├── video_comment_medias.ts
    │   │   ├── video_comments.ts
    │   │   ├── video_likes.ts
    │   │   ├── video_replies.ts
    │   │   ├── video_reply_like.ts
    │   │   ├── video_reply_medias.ts
    │   │   └── videos.ts
    │   └── redis/
    │       └── redisConfig.ts       # Redis connection
    ├── middleware/
    │   ├── auth.ts                  # Auth middleware
    │   ├── redisLimiter.ts          # Rate limiting
    │   ├── upload.ts                # File upload logic
    │   └── uploads/
    │       ├── images/
    │       │   └── .gitkeep
    │       └── videos/
    │           └── .gitkeep
    ├── seed/
    │   ├── data.ts                  # Seed data
    │   ├── ddl.sql                  # SQL schema
    │   └── seedFunction.ts          # Seeding logic
    ├── types/
    │   └── request.ts               # TypeScript types
    └── utils/
        ├── authenticatedRequest.ts  # Auth helpers
        ├── formatter.ts             # Data formatting
        └── imageMimeTypes.ts        # Image type helpers
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **PostgreSQL** 15+
- **Redis** 6+
- **Docker** (optional)

### Option 1: Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/komplex-backend.git
   cd komplex-backend/Komplex_Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp envExample.txt .env
   # Edit .env with your configuration
   ```

4. **Start the server**
   ```bash
   npm run dev
   ```

### Option 2: Docker Setup

1. **Clone and build**
   ```bash
   git clone https://github.com/your-org/komplex-backend.git
   cd komplex-backend/Komplex_Backend
   docker-compose up --build
   ```

---

## 🔧 Environment Configuration

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=1234

# Database Configuration
DATABASE_URL=postgresql://username:password@host:5432/database?sslmode=require
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_NAME=your_db_name
DATABASE_PORT=5432

# Cloudflare R2 Storage
R2_TOKEN_VALUE=your_r2_token
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
R2_PHOTO_PUBLIC_URL=https://your-photos.r2.dev
R2_VIDEO_PUBLIC_URL=https://your-videos.r2.dev

# Redis Configuration (Choose one option)
# Option 1: If using hosted Redis
REDIS_USERNAME=your_redis_user
REDIS_PASSWORD=your_redis_password
REDIS_PORT=your_redis_port

# Option 2: If using local Redis
REDIS_HOST=127.0.0.1

# AI Integration
GEMINI_API_KEY=your_gemini_api_key
FAST_API_KEY=https://your-ai-service.com/gemini
INTERNAL_API_KEY=your_internal_api_key

# Firebase Authentication
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----\n"

# Meilisearch Configuration (Choose one option)
MEILI_API_KEY=your_meili_api_key

# Option 1: If using hosted Meilisearch
MEILI_HOST_URL=https://your-meilisearch-host.com

# Option 2: If using local Meilisearch
MEILI_HOST_URL=http://localhost:7700
```

---

## 🛠️ Database Setup

### 1. Set up Meilisearch

```bash
docker run -d \
  --name meilisearch \
  -p 7700:7700 \
  -v $(pwd)/meili_data:/meili_data \
  getmeili/meilisearch:v1.5 \
  meilisearch --db-path /meili_data --master-key=your-master-key
```

### 2. Seed the Database

Once your server is running, initialize the database and search index:

#### Using Thunder Client or Postman

1. **Seed Database**:
   - Method: `GET`
   - URL: `http://localhost:3000/seedDb`

2. **Seed Search Index**:
   - Method: `GET`
   - URL: `http://localhost:3000/seedSearch`

#### Using cURL
```bash
# Seed the database
curl -X GET "http://localhost:3000/seedDb"

# Seed the search engine
curl -X GET "http://localhost:3000/seedSearch"
```

---

## 📚 API Documentation

### Base URL
```
/api
```

### Authentication
- All `/api/me/*` endpoints require authentication
- All `/api/admin/*` endpoints require admin authentication
- Public endpoints under `/api/feed/*` and `/api/users/*` do not require authentication

---

## 🔗 Endpoint Categories

### Root
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/` | Welcome message |

### Feed (Public Content Discovery)

#### Blogs
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/feed/blogs` | Get all public blogs |
| `GET` | `/api/feed/blogs/:id` | Get specific blog by ID |

#### Forums
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/feed/forums` | Get all public forums |
| `GET` | `/api/feed/forums/:id` | Get specific forum by ID |
| `GET` | `/api/feed/forum-comments/:id` | Get forum comments |
| `GET` | `/api/feed/forum-replies/:id` | Get forum replies |

#### Videos
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/feed/videos` | Get all public videos |
| `GET` | `/api/feed/videos/:id` | Get specific video by ID |
| `GET` | `/api/feed/videos/:id/recommended` | Get recommended videos |
| `GET` | `/api/feed/video-comments/:id` | Get video comments |
| `GET` | `/api/feed/video-likes/:id` | Get video likes |
| `GET` | `/api/feed/video-replies/:id` | Get video replies |

#### Exercises
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/feed/exercises` | Get all public exercises |
| `GET` | `/api/feed/exercises/:id` | Get specific exercise by ID |

### Me (Authenticated User Content)

> **⚠️ Authentication Required**

#### User Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/me/` | Get current user info |
| `GET` | `/api/me/dashboard` | Get user dashboard |

#### Content Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST/PUT/DELETE` | `/api/me/blogs` | Manage user blogs |
| `GET/POST/PUT/DELETE` | `/api/me/forums` | Manage user forums |
| `GET/POST/PUT/DELETE` | `/api/me/videos` | Manage user videos |
| `PATCH` | `/api/me/blogs/:id/save` | Save/unsave blog |
| `PATCH` | `/api/me/videos/:id/save` | Save/unsave video |
| `PATCH` | `/api/me/forums/:id/like` | Like/unlike forum |

#### Interactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST/PUT/DELETE` | `/api/me/forum-comments/:id` | Manage forum comments |
| `POST/PUT/DELETE` | `/api/me/forum-replies/:id` | Manage forum replies |
| `POST/PUT/DELETE` | `/api/me/video-comments/:id` | Manage video comments |
| `POST/PUT/DELETE` | `/api/me/video-replies/:id` | Manage video replies |
| `PATCH` | `/api/me/*/:id/like` | Like/unlike content |

#### Learning & Social
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/me/exercises/dashboard` | Get exercises dashboard |
| `GET` | `/api/me/exercises/history` | Get exercise history |
| `POST` | `/api/me/exercises/:id/submit` | Submit exercise |
| `GET` | `/api/me/follow/followers` | Get followers |
| `GET` | `/api/me/follow/following` | Get following |
| `POST` | `/api/me/follow/follow/:id` | Follow/unfollow user |
| `GET` | `/api/me/video-history` | Get video history |
| `POST` | `/api/me/feedback` | Submit feedback |

#### AI Integration
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/me/ai` | AI assistance |

### Users (Other Users' Content)

> **📖 Read-only**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/:id/blogs` | Get user's public blogs |
| `GET` | `/api/users/:id/forums` | Get user's public forums |
| `GET` | `/api/users/:id/videos` | Get user's public videos |
| `GET` | `/api/users/:id/profile` | Get user's profile |

### Authentication & Utilities

#### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | User registration |
| `POST` | `/api/auth/social-login` | Social media login |

#### Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload/upload-url` | Get upload URL for files |

#### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/search/blogs` | Search blogs |
| `GET` | `/api/search/forums` | Search forums |
| `GET` | `/api/search/videos` | Search videos |

### Admin Panel

> **🔐 Admin Authentication Required**

#### Core Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/auth/login` | Admin login |
| `GET` | `/api/admin/dashboard` | Admin dashboard |

#### Content Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/admin/blogs` | Manage all blogs |
| `GET/PUT/DELETE` | `/api/admin/forums/:id` | Manage forums |
| `GET` | `/api/admin/videos` | Manage videos |
| `GET/POST/PUT/DELETE` | `/api/admin/exercises` | Manage exercises |

#### User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/users` | Get all users |
| `GET/POST/PUT/DELETE` | `/api/admin/users/admins` | Manage admin users |
| `GET/PATCH` | `/api/admin/feedbacks` | Manage user feedback |

#### Database Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/database/dashboard` | Database overview |
| `GET` | `/api/admin/database/schema` | Database schema |
| `POST` | `/api/admin/database/console` | Execute SQL commands |
| `GET/POST/PUT/DELETE` | `/api/admin/database/users` | Manage DB users |
| `GET/POST/PUT/DELETE` | `/api/admin/database/roles` | Manage DB roles |

#### System Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/grades` | Get all grades |
| `GET` | `/api/admin/subjects` | Get all subjects |

---

## 🔌 Required Services

1. **PostgreSQL Database** (NeonDB recommended for production)
2. **Redis** (for caching and rate limiting)
3. **Meilisearch** (for search functionality)
4. **Firebase** (for authentication)
5. **Cloudflare R2** (for media storage)
6. **[Komplex AI](https://github.com/salxz696969/Komplex_Ai)** (for AI-powered features)

---

## 📝 API Notes

- **Authentication**: Use appropriate authentication tokens for protected endpoints
- **Rate Limiting**: Some endpoints have rate limiting protection
- **Error Handling**: Standard HTTP status codes with descriptive error messages
- **File Uploads**: Use upload endpoints for media management
- **Pagination**: List endpoints support pagination parameters

---

## 🚀 Getting Started with API

1. **Authentication**: Register via `/api/auth/signup` or `/api/auth/social-login`
2. **Public Content**: Explore `/api/feed/*` endpoints for discovery
3. **User Actions**: Use `/api/me/*` endpoints for personalized features
4. **Admin Panel**: Access `/api/admin/*` with appropriate privileges

---

> **KOMPLEX** strives to make STEM learning more accessible, understandable, and interactive for all Cambodian students—regardless of their background or financial means.