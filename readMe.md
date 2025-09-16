## 🌟 About Komplex

**KOMPLEX** is an open-source STEM learning platform specifically designed for high school students in Cambodia. Our mission is to democratize quality education by providing free, interactive lessons and resources that align with the national curriculum.

### The Problem We're Solving

Many Cambodian students struggle with STEM subjects and rely heavily on expensive private tutoring and paid summary books. KOMPLEX offers a free, self-paced alternative that promotes deep understanding over rote memorization.

### Our Inspiration

Built with the philosophy of platforms like **W3Schools**, we believe learning should be:

-   🆓 **Free and accessible**
-   🎯 **Interactive and engaging**
-   📚 **Curriculum-aligned**
-   🚀 **Self-paced**

---

## ✨ Features

### 🔐 User Management

-   **Authentication**: Secure Firebase-based auth system
-   **Profiles**: Customizable user profiles with follower/following system
-   **Social**: Community-driven learning experience

### 📚 Content Management

-   **Blogs**: Educational articles and tutorials
-   **Forums**: Student discussion boards and Q&A
-   **Videos**: Interactive video lessons
-   **Exercises**: Practice problems and assessments
-   **Media**: File upload and management system

### 🔍 Advanced Search

-   **Lightning Fast**: Powered by Meilisearch
-   **Full-Text Search**: Search across blogs, forums, and videos
-   **Intelligent Indexing**: Smart content discovery

### 🛡️ Performance & Security

-   **Rate Limiting**: Redis-backed protection against abuse
-   **Error Handling**: Comprehensive error management
-   **Admin Panel**: Moderation tools and analytics dashboard

### 🤖 AI Integration

-   **Gemini 2.5 Flash**: AI-powered learning assistance via [Komplex AI](https://github.com/salxz696969/Komplex_Ai)

---

## 🏗️ Architecture

```
Komplex_Backend/
├── src/
│   ├── app/
│   │   ├── komplex/                 # Main application
│   │   │   ├── controllers/         # Route handlers
│   │   │   ├── routes/              # API routes
│   │   │   └── services/            # Business logic
│   │   └── komplex.admin/           # Admin panel
│   │       ├── controllers/         # Admin controllers
│   │       └── routes/              # Admin routes
│   ├── db/
│   │   ├── models/                  # Database models
│   │   ├── redis/                   # Redis configuration
│   │   └── cloudflare/              # CDN integration
│   ├── middleware/                  # Custom middleware
│   ├── seed/                        # Database seeding
│   └── server.ts                    # Application entry point
├── .env                             # Environment variables
├── Dockerfile                       # Container configuration
└── docker-compose.yml              # Multi-service setup
```

---

## 🚀 Quick Start

### Prerequisites

-   **Node.js** 18+
-   **PostgreSQL** 15+
-   **Redis** 6+
-   **Docker** (optional)

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

### 🔧 Environment Configuration

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
INTERNAL_API_KEY=your_internal_api_key  # Secret key used for securing communication between the backend and the FastAPI service


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

Once your server is running, you can initialize the database and search index.

#### Using Thunder Client or Postman

1. Open **Thunder Client** (VS Code extension) or **Postman**.  
2. Create a new request:
   - Method: `GET`
   - URL: `http://localhost:3000/seedDb`
3. Send the request → This will populate the database with sample data.  

Then, for indexing content into Meilisearch:

1. Create another request:
   - Method: `GET`
   - URL: `http://localhost:3000/seedSearch`
2. Send the request → This will index the content for search.  

---

## 🔌 Required Services

1. **PostgreSQL Database** (NeonDB recommended for production)
2. **Redis** (for caching and rate limiting)
3. **Meilisearch** (for search functionality)
4. **Firebase** (for authentication)
5. **Cloudflare R2** (for media storage)
6. **[Komplex AI](https://github.com/salxz696969/Komplex_Ai)** (for AI-powered features)

---

> KOMPLEX strives to make STEM learning more accessible, understandable, and interactive for all Cambodian students—regardless of their background or financial means.
