# Chat App - Backend & Frontend Integration

## 🚀 Backend Setup Complete

### **Technologies Used**
- **Node.js** + **Express** - Server framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Socket.IO** - Real-time communication
- **CORS** - Cross-origin requests

### **Backend Structure**
```
backend/
├── index.js                    # Main server file
├── .env                        # Environment variables
├── models/
│   └── User.js                 # User model with validation
├── controllers/
│   └── authController.js       # Auth logic (register, login, logout)
├── middleware/
│   └── auth.js                 # JWT authentication middleware
└── routes/
    ├── auth.js                 # Auth routes
    └── user.js                 # User routes
```

### **API Endpoints**

#### **Authentication Routes** (`/api/auth`)
- `POST /api/auth/register` - Register new user
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```

- `POST /api/auth/login` - Login user
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

- `GET /api/auth/me` - Get current user (Protected)
- `POST /api/auth/logout` - Logout user (Protected)

#### **User Routes** (`/api/user`)
- `GET /api/user/profile` - Get user profile (Protected)
- `PUT /api/user/profile` - Update user profile (Protected)
- `PUT /api/user/status` - Update user status (Protected)
- `GET /api/user/search?q=query` - Search users (Protected)

### **Environment Variables**
Create a `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_2024
JWT_EXPIRE=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:5174
```

### **Running the Backend**
```bash
cd backend
npm install
node index.js
```

Server will start on `http://localhost:5000`

---

## 🎨 Frontend Integration

### **API Service** (`frontend/src/services/api.js`)
- Axios instance configured with base URL
- Automatic token injection in headers
- Auth API methods (register, login, logout, getMe)
- User API methods (profile, status, search)

### **Updated Components**
- **SignIn Page** - Now connects to backend for authentication
  - Register new users
  - Login existing users
  - Error handling
  - Token storage in localStorage

### **Authentication Flow**
1. User fills in login/signup form
2. Frontend sends request to backend API
3. Backend validates credentials
4. Backend returns JWT token + user data
5. Frontend stores token in localStorage
6. Token is automatically added to all subsequent requests
7. Protected routes check for valid token

### **Running the Frontend**
```bash
cd frontend
npm install
npm run dev
```

Frontend will start on `http://localhost:5174`

---

## 🔐 Security Features
- ✅ Password hashing with bcrypt (10 rounds)
- ✅ JWT token authentication
- ✅ Protected routes with middleware
- ✅ Input validation on both frontend and backend
- ✅ CORS configuration
- ✅ Password not returned in API responses
- ✅ Email uniqueness validation

---

## 📝 User Model Schema
```javascript
{
  name: String (required, 2-50 chars),
  email: String (required, unique, validated),
  password: String (required, hashed, min 6 chars),
  avatar: String (default provided),
  bio: String (max 200 chars),
  status: Enum ['online', 'offline', 'away', 'busy'],
  lastSeen: Date,
  friends: [ObjectId],
  groups: [ObjectId],
  timestamps: true
}
```

---

## 🧪 Testing the API

### **Register a new user**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'
```

### **Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

### **Get current user (with token)**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🎯 Next Steps
1. ✅ Backend authentication complete
2. ✅ Frontend integration complete
3. 🔄 Add message models and routes
4. 🔄 Implement real-time chat with Socket.IO
5. 🔄 Add group chat functionality
6. 🔄 File upload for avatars
7. 🔄 Message read receipts
8. 🔄 Typing indicators

---

## 🐛 Troubleshooting

### MongoDB Connection Error
- Make sure MongoDB is running: `mongod`
- Check connection string in `.env`

### CORS Error
- Verify `FRONTEND_URL` in `.env` matches your frontend URL
- Check CORS configuration in `index.js`

### Token Issues
- Clear localStorage in browser
- Check JWT_SECRET is set in `.env`
- Verify token format: `Bearer <token>`

---

## 📦 Dependencies

### Backend
```json
{
  "express": "^4.18.2",
  "mongoose": "^8.0.3",
  "bcrypt": "^5.1.1",
  "jsonwebtoken": "^9.0.2",
  "dotenv": "^16.3.1",
  "cors": "^2.8.5",
  "socket.io": "^4.6.0"
}
```

### Frontend (New)
```json
{
  "axios": "^1.6.5"
}
```
