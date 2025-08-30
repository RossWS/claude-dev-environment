# DiscoveryBox.app Production Deployment Guide

## 🚀 Quick Start

### Domain Registration
1. **Register discoverybox.app**
   - Purchase from: Namecheap, GoDaddy, Cloudflare Registrar
   - Cost: ~$12-15/year
   - Enable domain privacy protection

### Infrastructure Options

#### Option 1: DigitalOcean Droplet (Recommended for starters)
**Cost: $6-12/month**
```bash
# 1. Create droplet (Ubuntu 22.04, 1-2GB RAM)
# 2. SSH into server
ssh root@your-server-ip

# 3. Update system
apt update && apt upgrade -y

# 4. Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install docker-compose -y

# 5. Clone your repository
git clone https://github.com/yourusername/discoverybox-app.git
cd discoverybox-app

# 6. Set up environment variables
cp .env.example .env
nano .env  # Edit with production values

# 7. Set up SSL with Let's Encrypt
apt install certbot -y
certbot certonly --standalone -d discoverybox.app -d www.discoverybox.app

# 8. Deploy with Docker
docker-compose up -d
```

#### Option 2: Railway (Easiest deployment)
**Cost: $5-20/month**
1. Connect GitHub repo to Railway
2. Set environment variables in dashboard
3. Deploy automatically on push
4. Add custom domain in Railway dashboard

#### Option 3: Vercel + PlanetScale (Modern stack)
**Cost: $0-40/month**
- Vercel for hosting (free tier available)
- PlanetScale for database (free tier: 5GB)
- Automatic deployments and scaling

#### Option 4: AWS (Scalable but complex)
**Cost: $20-100/month**
- EC2 instance or ECS
- RDS for database
- CloudFront CDN
- Route 53 for DNS

## 🔧 Production Configuration

### Environment Variables (.env)
```bash
NODE_ENV=production
PORT=5000
JWT_SECRET=generate-super-secure-256-bit-key
ALLOWED_ORIGINS=https://discoverybox.app,https://www.discoverybox.app
DB_PATH=./database/discoverybox.db

# Generate JWT secret:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Domain & DNS Setup
**Point your domain to server:**
```
Type: A
Name: @
Value: YOUR_SERVER_IP

Type: A  
Name: www
Value: YOUR_SERVER_IP
```

### SSL Certificate (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone \
  -d discoverybox.app \
  -d www.discoverybox.app

# Auto-renewal cron job
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Nginx Configuration
The included `nginx.conf` provides:
- HTTP to HTTPS redirect
- Security headers
- Rate limiting
- Static file caching
- Gzip compression

### Database Setup
```bash
# Initialize database
npm run db:setup

# Seed with content
node backend/utils/2024-movies-seed.js
```

## 📊 Monitoring & Maintenance

### Health Checks
- Health endpoint: `https://discoverybox.app/health`
- Docker health checks included
- Monitor uptime with UptimeRobot (free)

### Backups
```bash
# Manual backup
sqlite3 database/discoverybox.db ".backup backup-$(date +%Y%m%d).db"

# Automated daily backups
echo "0 2 * * * cd /app && sqlite3 database/discoverybox.db \".backup backups/backup-\$(date +\%Y\%m\%d).db\"" | crontab -
```

### Log Management
```bash
# View application logs
docker-compose logs -f app

# View Nginx logs
docker-compose logs -f nginx

# Rotate logs to prevent disk full
sudo apt install logrotate
```

### Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🔒 Security Checklist

### Server Security
- [ ] Use SSH keys instead of passwords
- [ ] Configure firewall (ufw)
- [ ] Keep system updated
- [ ] Use non-root user for deployment
- [ ] Enable fail2ban for SSH protection

```bash
# Basic firewall setup
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS  
ufw enable
```

### Application Security
- [ ] Use strong JWT secrets (256-bit)
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Use HTTPS everywhere
- [ ] Implement CSP headers
- [ ] Regular dependency updates

```bash
# Check for security vulnerabilities
npm audit
npm audit fix
```

## 💰 Cost Breakdown

### Minimal Setup (~$20/month)
- Domain: $12/year (~$1/month)
- DigitalOcean Droplet: $6/month
- Backups/monitoring: Free tier services

### Recommended Setup (~$50/month)
- Domain: $12/year
- VPS: $12-20/month (2GB RAM)
- CDN: $5-10/month
- Monitoring: $10/month
- Backups: $5/month

### Scaling Considerations
- **<1000 users**: Single VPS sufficient
- **1000-10000 users**: Add load balancer, database replicas
- **>10000 users**: Consider managed services (AWS RDS, etc.)

## 🚀 Deployment Commands

### Initial Deployment
```bash
# Clone repository
git clone https://github.com/yourusername/discoverybox-app.git
cd discoverybox-app

# Configure environment
cp .env.example .env
# Edit .env with production values

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### Zero-Downtime Updates
```bash
# Pull latest code
git pull origin main

# Build new image
docker-compose build app

# Rolling update
docker-compose up -d --no-deps app
```

## 📈 Performance Optimization

### Database
- Regular VACUUM for SQLite
- Consider PostgreSQL for high traffic
- Implement connection pooling

### Caching
- Nginx static file caching (configured)
- Add Redis for session storage
- CDN for global content delivery

### Monitoring
- Set up error tracking (Sentry)
- Performance monitoring (New Relic)
- Analytics (Google Analytics)

## 🆘 Troubleshooting

### Common Issues
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs app
docker-compose logs nginx

# Restart services
docker-compose restart

# Full rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database Issues
```bash
# Check database file permissions
ls -la database/

# Test database connection
sqlite3 database/discoverybox.db ".tables"
```

### SSL Issues
```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test SSL setup
curl -I https://discoverybox.app
```

## 📞 Support

For deployment issues:
1. Check logs: `docker-compose logs`
2. Verify environment variables
3. Test health endpoint: `/health`
4. Check firewall and DNS settings

Ready to go live with DiscoveryBox.app! 🎬✨