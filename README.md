# 🧠 Identity Reconciliation
This is a Node.js + TypeScript backend service that consolidates customer identities based on email and phone number.

# 🛜 Render Swagger Endpoint - **https://bitespeed-dmhr.onrender.com/api-docs/** */




## 📦 Tech Stack
- Node.js + Express.js
- TypeScript
- PostgreSQL
- Swagger for API documentation

## 🛠 Setup Instructions

1. **Clone the repo**
  git clone https://github.com/your-username/bitespeed-backend.git
  cd bitespeed-backend

2. **Install dependencies**
  npm install

3. **Set environment variables**
  DATABASE_URL=your_postgres_connection_url
  PORT=3000

4. **Run database setup**
  npx ts-node src/createTable.ts
  npx ts-node src/setupDb.ts

5. **Start the server**
  npm run build
  npm start

6. **Visit Swagger Docs**
  http://localhost:3000/api-docs