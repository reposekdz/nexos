# Nexos Setup Guide

## Quick Start

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Database Setup

**MongoDB:**
- Install MongoDB locally or use MongoDB Atlas
- Create database named 'nexos'
- Update MONGODB_URI in backend/.env

**Redis (Optional):**
- Install Redis for caching
- Update REDIS_URL in backend/.env

### 3. Environment Configuration

**Backend (.env):**
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nexos
JWT_SECRET=your-super-secret-jwt-key-here
CLIENT_URL=http://localhost:3000
```

**Frontend (.env):**
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### 5. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

## Features Available

✅ **Implemented:**
- User authentication (register/login)
- Posts with media upload
- Stories (24h expiration)
- Reels (short videos)
- Real-time messaging
- Groups management
- Marketplace
- Video/Audio calls (WebRTC)
- Likes, comments, shares
- User profiles and following
- Search functionality
- Responsive design

## API Testing

Use tools like Postman or curl to test endpoints:

```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123","fullName":"Test User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Troubleshooting

**Common Issues:**

1. **MongoDB Connection Error:**
   - Ensure MongoDB is running
   - Check MONGODB_URI in .env

2. **Port Already in Use:**
   - Change PORT in backend/.env
   - Update REACT_APP_API_URL in frontend/.env

3. **File Upload Issues:**
   - Ensure uploads/ directory exists in backend
   - Check file permissions

4. **CORS Errors:**
   - Verify CLIENT_URL in backend/.env
   - Check frontend URL matches

## Production Deployment

**Backend (Heroku/Railway/AWS):**
1. Set production environment variables
2. Configure MongoDB Atlas
3. Deploy backend code

**Frontend (Netlify/Vercel):**
1. Build React app: `npm run build`
2. Deploy build folder
3. Set environment variables

## Next Steps

1. Customize styling and branding
2. Add email notifications
3. Implement push notifications
4. Add content moderation
5. Optimize performance
6. Add analytics
7. Implement payment system for marketplace