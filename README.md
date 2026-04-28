# Facebook Analytics Backend

A robust Node.js and TypeScript backend designed to fetch, synchronize, and analyze Facebook Page and Post insights, including Content Monetization (CM) earnings.

## 🚀 Tech Stack

- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Task Queue**: [BullMQ](https://docs.bullmq.io/) with [Redis](https://redis.io/)
- **API Client**: [Axios](https://axios-http.com/) (for Facebook Graph API)
- **Validation**: [Joi](https://joi.dev/)
- **Security**: [Helmet](https://helmetjs.github.io/), [CORS](https://github.com/expressjs/cors)
- **Logging**: [Morgan](https://github.com/expressjs/morgan)

## ✨ Core Features

- **Facebook Graph API Integration**: Seamless connection to Meta's API to fetch page details, post metadata, and detailed insights.
- **Background Synchronization**: Uses BullMQ to handle intensive sync jobs (Full Sync & Incremental Sync) without blocking the main API thread.
- **Automated Cron Tasks**: Daily incremental syncs to keep page and post metrics up to date.
- **Monetization Tracking**: Specifically handles `content_monetization_earnings` and breakdown data.
- **Token Management**: Middleware to exchange short-lived user tokens for long-lived tokens and secure storage of encrypted page tokens.
- **RESTful API**: Structured endpoints for retrieving page, post, and earnings analytics.

## 🛠️ Project Structure

- `/src/controllers`: Request handlers and logic orchestration.
- `/src/services`: Core business logic, including Facebook API interactions.
- `/src/repositories`: Data access layer using Prisma.
- `/src/workers`: BullMQ worker for processing background sync jobs.
- `/src/cron/tasks`: Scheduled synchronization logic.
- `/src/middleware`: Authentication and token exchange logic.
- `/prisma`: Database schema and migrations.

## 🏁 Local Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd fb-analytics-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file based on `.env.example`:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://user:password@localhost:5432/fb_analytics"
   REDIS_URL="redis://localhost:6379"
   FB_APP_ID="your_app_id"
   FB_APP_SECRET="your_app_secret"
   PAGE_TOKEN_ENCRYPTION_SECRET="your_secret"
   ```

4. **Initialize Database**:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Run the Application**:
   - **API Server**: `npm run dev`
   - **Background Worker**: `npm run dev:worker`

---

## ☁️ Deployment on Railway

Deploying this backend to Railway is straightforward as it supports Docker, Node.js, and provides built-in Postgres/Redis services.

### 1. Create a New Project
- Go to [Railway.app](https://railway.app/) and create a new project.
- Select **Deploy from GitHub repo** and connect your repository.

### 2. Add Infrastructure (Postgres & Redis)
- Click **+ New** -> **Database** -> **Add PostgreSQL**.
- Click **+ New** -> **Database** -> **Add Redis**.
- Railway will automatically provide internal URLs for these services.

### 3. Configure Environment Variables
In your Railway Service settings, add the following variables:
- `DATABASE_URL`: Use the URL provided by the Railway Postgres service.
- `REDIS_URL`: Use the URL provided by the Railway Redis service.
- `FB_APP_ID`: Your Facebook App ID.
- `FB_APP_SECRET`: Your Facebook App Secret.
- `PAGE_TOKEN_ENCRYPTION_SECRET`: A random secure string.
- `NODE_ENV`: `production`.

### 4. Deployment Command
Railway will detect the `package.json` and use `npm run start` by default. 

**Running the Worker**:
Since this project requires both an **API** and a **Worker**, the best way on Railway is to create two separate services from the same repository:
1. **API Service**: Uses default settings (`npm start`).
2. **Worker Service**: Set the **Start Command** to `npm run worker` in the Railway settings for this second service.

### 5. Database Migrations
Add a **Pre-deploy command** in Railway settings to ensure your database stays in sync:
```bash
npx prisma migrate deploy && npx prisma generate
```
