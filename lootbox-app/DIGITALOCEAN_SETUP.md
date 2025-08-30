# Complete DigitalOcean Deployment Guide for Beginners

## 🎯 What We're Building
You'll deploy DiscoveryBox.app on a DigitalOcean server with:
- Your own domain (discoverybox.app)
- SSL certificate (HTTPS)
- Professional production setup
- **Total monthly cost: ~$18** ($6 server + $12/year domain)

---

## 📋 Prerequisites Checklist

Before starting, you'll need:
- [ ] DigitalOcean account (sign up at digitalocean.com)
- [ ] Domain name registered (we'll use discoverybox.app as example)
- [ ] Basic command line familiarity
- [ ] 30 minutes of time

---

## Step 1: Create DigitalOcean Account

### 1.1 Sign Up
1. Go to [digitalocean.com](https://digitalocean.com)
2. Click **"Sign up"**
3. Enter email/password or use GitHub/Google
4. Verify your email address
5. Add payment method (credit card required)

### 1.2 Get Free Credits
- New accounts get $200 free credits for 60 days
- Use promo codes for additional credits if available

---

## Step 2: Register Your Domain

### Option A: Use DigitalOcean Domains
1. In DigitalOcean dashboard, click **"Networking"**
2. Click **"Domains"** 
3. Search for your desired domain
4. Purchase domain (~$12/year for .app domains)

### Option B: Use External Registrar (Recommended)
1. Go to [Namecheap](https://namecheap.com) or [Cloudflare](https://cloudflare.com)
2. Search for "discoverybox.app" (or your preferred name)
3. Purchase domain (~$10-15/year)
4. We'll configure DNS later

---

## Step 3: Create Your Server (Droplet)

### 3.1 Create New Droplet
1. In DigitalOcean dashboard, click **"Create"** → **"Droplets"**
2. **Choose an image**: 
   - Select **"Ubuntu 22.04 (LTS) x64"**
3. **Choose Size**:
   - **Basic plan**
   - **Regular Intel** 
   - **$6/month** (1 GB RAM, 1 vCPU, 25GB SSD)
4. **Choose datacenter**: 
   - Pick closest to your users (e.g., New York, San Francisco)
5. **Authentication**:
   - **Select "SSH Key" (Recommended)**
   - Click **"New SSH Key"**

### 3.2 Set Up SSH Key (Important for Security)

#### On Windows:
1. Download and install [PuTTYgen](https://www.putty.org/)
2. Open PuTTYgen
3. Click **"Generate"** and move mouse randomly
4. Copy the **public key** (starts with "ssh-rsa")
5. Save **private key** as "discoverybox-key.ppk"

#### On Mac/Linux:
```bash
# Generate SSH key
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Copy public key (paste this into DigitalOcean)
cat ~/.ssh/id_rsa.pub
```

### 3.3 Finish Droplet Creation
1. Paste your **public key** into DigitalOcean
2. **Hostname**: "discoverybox-app"
3. Click **"Create Droplet"**
4. Wait 2-3 minutes for creation
5. **Write down the IP address** (e.g., 159.89.123.45)

---

## Step 4: Configure Domain DNS

### 4.1 Point Domain to Server
1. Go to your domain registrar (Namecheap, Cloudflare, etc.)
2. Find **"DNS Settings"** or **"Manage DNS"**
3. **Delete** existing A records
4. **Add new A records**:

```
Type: A
Name: @
Value: [YOUR-DROPLET-IP]
TTL: 300

Type: A  
Name: www
Value: [YOUR-DROPLET-IP]
TTL: 300
```

**Example**:
- If your IP is `159.89.123.45`
- Set both `@` and `www` to point to `159.89.123.45`

### 4.2 Wait for DNS Propagation
- DNS changes take 5-60 minutes to propagate
- Test with: `ping discoverybox.app`
- Should return your server IP

---

## Step 5: Connect to Your Server

### 5.1 Windows Users (PuTTY)
1. Download [PuTTY](https://www.putty.org/)
2. Open PuTTY
3. **Host Name**: `root@[YOUR-IP]`
4. **Port**: 22
5. Go to **Connection → SSH → Auth**
6. Browse and select your `.ppk` private key
7. Click **"Open"**

### 5.2 Mac/Linux Users (Terminal)
```bash
# Connect to server
ssh root@YOUR-DROPLET-IP

# If you get "permission denied", try:
ssh -i ~/.ssh/id_rsa root@YOUR-DROPLET-IP
```

### 5.3 First Connection
- Type "yes" when prompted about fingerprint
- You should see Ubuntu welcome message
- You're now connected to your server!

---

## Step 6: Install Required Software

### 6.1 Update System
```bash
# Update package lists
sudo apt update

# Upgrade all packages
sudo apt upgrade -y
```

### 6.2 Install Docker & Docker Compose
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Verify installation
docker --version
docker-compose --version
```

### 6.3 Install Git
```bash
# Install Git
sudo apt install git -y

# Verify
git --version
```

### 6.4 Install Certbot (for SSL)
```bash
# Install Certbot
sudo apt install certbot -y

# Verify
certbot --version
```

---

## Step 7: Deploy Your Application

### 7.1 Clone Repository
```bash
# Navigate to home directory
cd /root

# Clone your repository (replace with your GitHub URL)
git clone https://github.com/RossWS/claude-dev-environment.git

# Navigate to app directory
cd claude-dev-environment/lootbox-app
```

### 7.2 Set Up Environment Variables
```bash
# Copy environment template
cp .env.example .env

# Edit environment file
nano .env
```

**In the nano editor**, update these critical values:
```bash
NODE_ENV=production
JWT_SECRET=REPLACE-WITH-SECURE-KEY-GENERATE-BELOW
ADMIN_PASSWORD=REPLACE-WITH-SECURE-PASSWORD
ALLOWED_ORIGINS=https://discoverybox.app,https://www.discoverybox.app
```

**Generate secure values**:
```bash
# Generate JWT secret (copy this value)
openssl rand -hex 32

# Generate admin password (copy this value)  
openssl rand -base64 24
```

**Save the file**:
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

### 7.3 Set Up SSL Certificate
```bash
# Stop any services on port 80/443
sudo systemctl stop nginx apache2 || true

# Get SSL certificate (replace with your domain)
sudo certbot certonly --standalone -d discoverybox.app -d www.discoverybox.app

# Follow prompts:
# - Enter email address
# - Accept terms of service (type 'Y')
# - Share email (type 'N' or 'Y')
```

**Expected output**:
```
Congratulations! Your certificate and chain have been saved at:
/etc/letsencrypt/live/discoverybox.app/fullchain.pem
```

---

## Step 8: Launch Application

### 8.1 Build and Start Services
```bash
# Make sure you're in the app directory
cd /root/claude-dev-environment/lootbox-app

# Build and start all services
docker-compose up -d --build

# Check if services are running
docker-compose ps
```

**Expected output**:
```
       Name                     Command               State                    Ports
------------------------------------------------------------------------------------------
lootbox-app_app_1     npm start                        Up      0.0.0.0:5000->5000/tcp
lootbox-app_nginx_1   /docker-entrypoint.sh ngin ...   Up      0.0.0.0:443->443/tcp,
                                                                0.0.0.0:80->80/tcp
```

### 8.2 Verify Deployment
```bash
# Check application logs
docker-compose logs app

# Check nginx logs
docker-compose logs nginx

# Test local connection
curl http://localhost:5000/health
```

---

## Step 9: Test Your Website

### 9.1 Test HTTP/HTTPS Access
1. Open browser and go to: `https://discoverybox.app`
2. You should see the DiscoveryBox application
3. SSL certificate should show as valid (green lock icon)

### 9.2 Test Admin Access
1. Click **"Login"** on the website
2. Use credentials from setup:
   - **Email**: `admin@discoverybox.app` 
   - **Password**: [The password you generated/set]
3. Should see admin panel

### 9.3 Test Functionality
1. Register a new user account
2. Try spinning the discovery box
3. Check that content appears correctly

---

## Step 10: Set Up Monitoring & Maintenance

### 10.1 Set Up Auto-Renewal for SSL
```bash
# Add to crontab
sudo crontab -e

# Add this line (select nano if prompted):
0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f /root/claude-dev-environment/lootbox-app/docker-compose.yml restart nginx
```

### 10.2 Set Up Log Rotation
```bash
# Install logrotate
sudo apt install logrotate -y

# Configure Docker logs
sudo nano /etc/logrotate.d/docker

# Add this content:
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
```

### 10.3 Set Up Basic Monitoring
```bash
# Create monitoring script
nano /root/monitor.sh

# Add content:
#!/bin/bash
curl -f http://localhost:5000/health || (echo "App down, restarting..." && cd /root/claude-dev-environment/lootbox-app && docker-compose restart)

# Make executable
chmod +x /root/monitor.sh

# Add to crontab (runs every 5 minutes)
crontab -e
# Add: */5 * * * * /root/monitor.sh
```

---

## Step 11: Security Hardening

### 11.1 Set Up Firewall
```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH (IMPORTANT - don't lock yourself out!)
sudo ufw allow 22

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Check status
sudo ufw status
```

### 11.2 Install Fail2Ban (SSH Protection)
```bash
# Install fail2ban
sudo apt install fail2ban -y

# Start and enable
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check status
sudo systemctl status fail2ban
```

### 11.3 Disable Root SSH (Optional but Recommended)
```bash
# Create non-root user
adduser deployuser
usermod -aG sudo deployuser
usermod -aG docker deployuser

# Copy SSH keys to new user
mkdir /home/deployuser/.ssh
cp /root/.ssh/authorized_keys /home/deployuser/.ssh/
chown -R deployuser:deployuser /home/deployuser/.ssh
chmod 700 /home/deployuser/.ssh
chmod 600 /home/deployuser/.ssh/authorized_keys
```

---

## 🎉 Congratulations! Your App is Live!

### ✅ What You've Accomplished:
- ✅ Deployed DiscoveryBox.app to production server
- ✅ Configured custom domain with SSL certificate  
- ✅ Set up automatic security updates and monitoring
- ✅ Implemented proper security hardening
- ✅ Created automated backups and maintenance

### 🌐 Your App URLs:
- **Main Site**: https://discoverybox.app
- **Admin Panel**: https://discoverybox.app (login as admin)
- **Health Check**: https://discoverybox.app/health

### 💰 Monthly Costs:
- **Server**: $6/month (DigitalOcean droplet)
- **Domain**: ~$1/month ($12/year)
- **Total**: ~$7/month

---

## 📚 Common Issues & Troubleshooting

### Issue: "Site can't be reached"
**Solution**: 
```bash
# Check if services are running
docker-compose ps

# Restart services if needed
docker-compose restart

# Check firewall
sudo ufw status
```

### Issue: SSL Certificate Error
**Solution**:
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Restart nginx
docker-compose restart nginx
```

### Issue: "Admin login not working"
**Solution**:
```bash
# Check environment variables
cat .env | grep ADMIN

# Reset admin password
docker-compose exec app node backend/utils/setup-database.js
```

### Issue: Domain not pointing to server
**Solution**:
- Check DNS settings at your registrar
- Wait up to 24 hours for DNS propagation
- Test with: `nslookup discoverybox.app`

---

## 🔄 How to Update Your App

### When you make changes to code:
```bash
# SSH into server
ssh root@YOUR-IP

# Navigate to app directory  
cd /root/claude-dev-environment/lootbox-app

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Verify update
curl https://discoverybox.app/health
```

---

## 📞 Support & Next Steps

### 🆘 If You Need Help:
1. Check application logs: `docker-compose logs`
2. Verify all services running: `docker-compose ps`
3. Test server connectivity: `ping discoverybox.app`
4. Check firewall settings: `sudo ufw status`

### 🚀 Scaling Up:
When you get more users:
1. **Upgrade server**: $12/month (2GB RAM) or $24/month (4GB RAM)
2. **Add monitoring**: UptimeRobot, Sentry
3. **Add CDN**: Cloudflare for faster loading
4. **Database optimization**: Consider PostgreSQL

### 🎯 Marketing Your App:
- Share on social media
- Submit to product directories
- Create content about movie discovery
- Build email newsletter

---

**🎬 Your DiscoveryBox.app is now LIVE! Time to help people discover amazing movies! ✨**