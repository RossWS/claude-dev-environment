# 🎬 DiscoveryBox.app

> Gamified content discovery platform for movies and TV shows

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://www.docker.com/)

## 🚀 Features

- **Gamified Discovery**: Spin-to-discover mechanism for finding new content
- **Quality-Based Rarity System**: Critics-focused scoring algorithm (80/20 critics/audience)
- **Curated Content**: 100+ handpicked movies and TV shows from 2024
- **Rarity Tiers**: Mythic (1%) → Legendary (5%) → Epic (15%) → Rare/Common
- **Trophy Cabinet**: Track your discovered content collection
- **Admin Panel**: Content management with filtering and sorting
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Theme**: Cinema-inspired UI with smooth animations

## 🎯 Demo

Try it live at: **https://discoverybox.app** *(coming soon)*

## 🏗️ Quick Start

### Local Development
```bash
# Clone repository
git clone https://github.com/yourusername/discoverybox-app.git
cd discoverybox-app

# Install dependencies
npm install

# Set up database
npm run db:setup

# Start development server
npm run dev

# Visit http://localhost:5000
```

### Production Deployment
```bash
# Copy environment template
cp .env.example .env
# Edit .env with production values

# Deploy with Docker
./scripts/deploy.sh
```

## 🛠️ Technology Stack

### Backend
- **Node.js 18+** with Express.js
- **SQLite** database with better-sqlite3
- **JWT** authentication with bcrypt
- **Rate limiting** and security middleware
- **CORS** and Helmet for security

### Frontend
- **Vanilla JavaScript** (ES6+)
- **CSS Grid/Flexbox** with custom properties
- **3D CSS animations** for discoverybox effects
- **Responsive design** with mobile-first approach
- **Progressive enhancement** for all devices

### Infrastructure
- **Docker** containerization
- **Nginx** reverse proxy with SSL
- **Let's Encrypt** SSL certificates
- **Health checks** and monitoring
- **Automated backups** with rotation

## 📊 Content Algorithm

### Quality Scoring
- **Critics Score (80%)**: Rotten Tomatoes critics rating
- **Audience Score (20%)**: User/audience rating  
- **Bonuses**: Certified Fresh (+5), Verified Hot (+3), IMDB rating bonuses
- **Penalties**: Low critics scores (-5 to -10) to avoid mainstream bias

### Rarity Distribution
- **Mythic (1%)**: Ultra-rare, highest quality content
- **Legendary (5%)**: Exceptional films and series
- **Epic (15%)**: Outstanding quality discoveries  
- **Rare (30%)**: Great finds worth watching
- **Common (49%)**: Solid entertainment options

## 🎮 How It Works

1. **Choose Category**: Movies or TV Series
2. **Spin DiscoveryBox**: Animated 3D cube reveals content
3. **Discover Content**: Get curated recommendations with details
4. **Build Collection**: Track discoveries in Trophy Cabinet
5. **Daily Limits**: 3 spins per day encourages thoughtful discovery

## 🔧 Configuration

### Environment Variables
```bash
NODE_ENV=production
PORT=5000
JWT_SECRET=your-secure-secret
ALLOWED_ORIGINS=https://discoverybox.app
DB_PATH=./database/discoverybox.db
```

### Database
- SQLite for simplicity and performance
- Includes 100+ curated movies from 2024
- User authentication and spin tracking
- Admin panel for content management

## 📱 API Documentation

### Authentication
```javascript
POST /api/auth/register  // Create account
POST /api/auth/login     // Login user
GET  /api/auth/verify    // Verify token
```

### Discovery
```javascript
POST /api/lootbox/open   // Open discoverybox
GET  /api/lootbox/status // Get spin status
```

### User
```javascript
GET  /api/user/profile        // User profile
GET  /api/user/trophy-cabinet // User discoveries
POST /api/user/top-up-spins   // Test endpoint
```

### Admin
```javascript
GET  /api/admin/stats    // Admin statistics
GET  /api/admin/content  // Content management
GET  /api/admin/users    // User management
```

## 🚀 Deployment Options

### 1. DigitalOcean ($6-12/month)
- Ubuntu 22.04 droplet
- Docker + Docker Compose
- Nginx reverse proxy
- Let's Encrypt SSL

### 2. Railway ($5-20/month)
- GitHub integration
- Automatic deployments
- Custom domain support
- Built-in monitoring

### 3. Vercel + PlanetScale ($0-40/month)
- Serverless deployment
- Global CDN
- Automatic scaling
- Database as a service

### 4. AWS (Enterprise)
- EC2 or ECS
- RDS database
- CloudFront CDN
- Auto-scaling groups

## 🔒 Security Features

- **JWT Authentication** with secure tokens
- **Rate Limiting** (100 requests/15 minutes)
- **CORS Protection** with specific origins
- **Helmet.js** security headers
- **Input Validation** and sanitization
- **SQL Injection** protection
- **XSS Protection** with CSP headers

## 📈 Performance

- **Gzipped Assets** (~500KB total)
- **Static File Caching** (30 days)
- **Database Optimization** with proper indexing
- **Lazy Loading** for content images
- **Efficient Animations** with CSS transforms
- **Mobile Optimized** with responsive design

## 🛡️ Monitoring

- Health check endpoint: `/health`
- Docker health checks
- Application logging
- Error tracking ready (Sentry)
- Performance monitoring ready (New Relic)

## 🔄 Updates

### Content Updates
```bash
# Add new movies/shows
node backend/utils/add-content.js

# Rebalance rarity distribution
node backend/utils/rebalance-rarities.js
```

### Application Updates
```bash
# Zero-downtime deployment
git pull origin main
docker-compose build app
docker-compose up -d --no-deps app
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:api
npm run test:frontend

# Check test coverage
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎬 About

DiscoveryBox.app transforms the way people discover quality movies and TV shows. Instead of endless scrolling through streaming platforms, users get curated recommendations through an engaging, game-like experience that prioritizes critical acclaim and artistic merit.

Built with performance, security, and user experience in mind, DiscoveryBox is ready for production deployment and can scale from hundreds to thousands of users.

---

**Ready to discover your next favorite movie?** 🍿

Visit [discoverybox.app](https://discoverybox.app) or deploy your own instance today!