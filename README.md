# Nexos - Advanced Social Media Platform

A full-featured social media platform built with modern web technologies.

## Features

### Core Social Features
- **Posts**: Create, like, comment, and share posts with media support
- **Stories**: 24-hour disappearing stories with image/video
- **Reels**: Short-form video content with effects and audio
- **Messages**: Real-time chat with media sharing
- **Groups**: Create and join communities
- **Marketplace**: Buy and sell items
- **Video/Audio Calls**: WebRTC-powered calling
- **Explore**: Discover new content and users

### Technical Features
- Real-time messaging with Socket.io
- File upload and media processing
- User authentication and authorization
- Responsive design for all devices
- Search and filtering capabilities
- Infinite scroll and pagination

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.io** for real-time features
- **JWT** for authentication
- **Multer** for file uploads
- **Redis** for caching (optional)

### Frontend
- **React** with hooks and functional components
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Styled Components** for styling
- **React Query** for data fetching
- **Socket.io Client** for real-time updates

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Redis (optional)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nexos
JWT_SECRET=your-super-secret-jwt-key
CLIENT_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Posts
- `GET /api/posts/feed` - Get posts feed
- `POST /api/posts` - Create new post
- `POST /api/posts/:id/like` - Like/unlike post
- `POST /api/posts/:id/comment` - Add comment
- `POST /api/posts/:id/share` - Share post

### Stories
- `GET /api/stories` - Get active stories
- `POST /api/stories` - Create story
- `POST /api/stories/:id/view` - Mark story as viewed

### Reels
- `GET /api/reels` - Get reels feed
- `POST /api/reels` - Create reel
- `POST /api/reels/:id/like` - Like reel
- `POST /api/reels/:id/comment` - Comment on reel

### Messages
- `GET /api/messages` - Get conversations
- `GET /api/messages/:userId` - Get conversation with user
- `POST /api/messages` - Send message

### Groups
- `GET /api/groups` - Get public groups
- `POST /api/groups` - Create group
- `POST /api/groups/:id/join` - Join group

### Marketplace
- `GET /api/marketplace` - Get marketplace items
- `POST /api/marketplace` - Create marketplace item
- `POST /api/marketplace/:id/like` - Like item

## Real-time Events

### Socket.io Events
- `join-room` - Join chat room
- `send-message` - Send message
- `receive-message` - Receive message
- `video-call-offer` - Video call offer
- `video-call-answer` - Video call answer
- `ice-candidate` - WebRTC ICE candidate

## Database Schema

### User Model
- username, email, password
- profile info (fullName, avatar, bio)
- followers, following arrays
- posts, stories, reels references

### Post Model
- author reference
- content, media array
- likes, comments, shares arrays
- visibility settings

### Story Model
- author reference
- media object
- views array
- auto-expiration (24 hours)

### Message Model
- sender, recipient references
- content, media object
- read status and timestamps

## Development

### Running Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

### Building for Production
```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

## Deployment

### Backend Deployment
1. Set production environment variables
2. Configure MongoDB Atlas or production database
3. Deploy to Heroku, AWS, or preferred platform

### Frontend Deployment
1. Build the React app
2. Deploy to Netlify, Vercel, or preferred platform
3. Configure environment variables

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue on GitHub.