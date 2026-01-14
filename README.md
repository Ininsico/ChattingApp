# 🗨️ ChatFlow - Real-Time Scalable Chat Application

[![MIT License](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![React](https://img.shields.io/badge/Frontend-React%2019-blue?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20v20+-green?logo=nodedotjs)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen?logo=mongodb)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Real--time-Socket.io-black?logo=socketdotio)](https://socket.io/)
[![Docker](https://img.shields.io/badge/DevOps-Docker-blue?logo=docker)](https://www.docker.com/)

**ChatFlow** is a modern, full-stack, real-time messaging platform designed for high performance and scalability. Built with a focus on user experience and real-time reliability, it supports direct messaging, group chats, and seamless synchronization across multiple devices.

---

## 🌟 Key Features

### 🚀 Real-Time Communication
- **Instant Messaging**: Low-latency message delivery using Socket.io.
- **Typing Indicators**: See when someone is typing in real-time.
- **Read Receipts**: Know exactly when your messages are seen.
- **Online Presence**: Real-time status tracking (Online, Offline, Away, Busy).

### 👥 Social & Collaboration
- **Direct Messaging**: One-on-one private conversations.
- **Group Chats**: Create and manage groups with multiple members.
- **User Profiles**: Custom avatars, bios, and status updates.
- **Search**: Easily find users by name or email.

### 🔐 Security & Reliability
- **Custom Authentication**: Robust JWT-based auth with bcrypt password hashing.
- **Protected Routes**: Secure frontend and backend routes.
- **Validation**: Strict input validation on both client and server sides.
- **Redis Scaling**: Socket.io adapter with Redis for multi-instance scaling.

### 🎨 Modern UI/UX
- **Beautiful Design**: Built with Tailwind CSS and Framer Motion for smooth animations.
- **Dark Mode**: Native support for dark and light themes.
- **Responsive**: Fully optimized for Desktop, Tablet, and Mobile.
- **Micro-interactions**: Subtle hover effects and state transitions.

---

## 🛠️ Tech Stack

### **Frontend**
- **Library**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Auth Interface**: Custom UI with theme switching
- **State Management**: React Hooks

### **Backend**
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose ODM)
- **Real-time**: Socket.io 4
- **Caching/Scaling**: Redis
- **Auth**: JSON Web Tokens (JWT)
- **File Handling**: Multer / Express-fileupload

### **Infrastructure**
- **Orchestration**: Docker & Docker Compose
- **Proxy/Web Server**: Nginx
- **Containerization**: Separate containers for Frontend, Backend, MongoDB, and Redis

---

## 📁 Project Structure

```text
chatapp/
├── frontend/             # React + Vite frontend
│   ├── src/
│   │   ├── Components/   # Reusable UI components
│   │   ├── Pages/        # Application views (Dashboard, Signin)
│   │   ├── services/     # API and Socket services
│   │   └── App.jsx       # Main routing logic
├── backend/              # Node.js + Express backend
│   ├── models/           # Mongoose schemas (User, Message, Group)
│   ├── controllers/      # Business logic handlers
│   ├── routes/           # API endpoint definitions
│   ├── socket/           # Real-time event logic
│   └── index.js          # Server entry point
├── infrastructure/       # DevOps configuration
│   └── nginx.conf        # High-performance Nginx config
├── docker-compose.yml    # Full stack orchestration
└── README.md             # This file
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20 or higher)
- [Docker](https://www.docker.com/) (recommended)
- [MongoDB](https://www.mongodb.com/) (if running locally)
- [Redis](https://redis.io/) (if running locally)

### 2. Standard Local Setup

#### Backend
```bash
cd backend
npm install
# Create a .env file (see Environment Variables section)
npm start
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Docker Setup (Recommended)
Launch the entire stack (containers for frontend, backend, mongodb, and redis) with a single command:
```bash
docker-compose up --build
```

---

## ⚙️ Environment Variables

### **Backend (.env)**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chatapp
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### **Frontend (.env)**
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🛡️ Nginx Configuration
The project includes a production-ready Nginx configuration in `infrastructure/nginx.conf` that handles:
- Static asset serving for Vite build.
- API proxying to the Node.js backend.
- WebSocket proxying with sticky sessions.
- Gzip compression for optimal performance.
- Direct serving of user-uploaded content.

---

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
Distributed under the **ISC License**. See `LICENSE` (if applicable) or `package.json` for more information.

---

## 👨‍💻 Created By
**Arslan Rathore**

---
*Built with ❤️ for a better messaging experience.*
