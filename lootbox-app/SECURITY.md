# DiscoveryBox.app Security Guide

## 🔒 Pre-Deployment Security Checklist

### CRITICAL - Must Complete Before Production

- [ ] **Set Strong JWT Secret**: Generate 256-bit key: `openssl rand -hex 32`
- [ ] **Set Secure Admin Password**: Minimum 12 characters, complex
- [ ] **Configure CORS Origins**: Set ALLOWED_ORIGINS to your domain only
- [ ] **Review Rate Limits**: Adjust for your expected traffic
- [ ] **Enable HTTPS**: Use Let's Encrypt SSL certificates
- [ ] **Set Production Environment**: NODE_ENV=production

### Environment Variables Security

```bash
# Generate secure JWT secret
openssl rand -hex 32

# Generate secure admin password
openssl rand -base64 24
```

## 🛡️ Security Features Implemented

### Authentication & Authorization
- ✅ JWT tokens with secure secret validation
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Admin role-based access control
- ✅ Token expiration (7 days default)

### Input Validation & Sanitization  
- ✅ Express-validator for all user inputs
- ✅ SQL injection protection via parameterized queries
- ✅ Email normalization and validation
- ✅ Username pattern matching (alphanumeric + underscore)

### Security Middleware
- ✅ Helmet.js security headers
- ✅ CORS protection with origin validation
- ✅ Rate limiting (100 requests/15 minutes)
- ✅ Request size limits (10MB)
- ✅ Compression for performance

### Database Security
- ✅ Parameterized queries prevent SQL injection
- ✅ Foreign key constraints enabled
- ✅ Secure password storage (bcrypt)
- ✅ No sensitive data in logs

## 🚨 Known Vulnerabilities Fixed

1. **Weak Admin Password**: Now generates cryptographically secure password
2. **Credential Exposure**: Removed password logging
3. **CORS Misconfiguration**: Production-ready CORS validation
4. **Missing JWT Validation**: Server won't start without secure JWT secret

## 📋 Production Security Setup

### 1. Environment Configuration
```bash
# Required production environment variables
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_PASSWORD=$(openssl rand -base64 24)
ALLOWED_ORIGINS=https://discoverybox.app,https://www.discoverybox.app
```

### 2. Server Security
```bash
# Enable firewall
ufw allow 22    # SSH
ufw allow 80    # HTTP (redirects to HTTPS)
ufw allow 443   # HTTPS
ufw enable

# Install fail2ban for SSH protection
apt install fail2ban -y
```

### 3. SSL Certificate Setup
```bash
# Install certbot
apt install certbot -y

# Get certificate
certbot certonly --standalone -d discoverybox.app -d www.discoverybox.app

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

## 🔍 Security Monitoring

### Health Check Endpoint
- `/health` - Application status
- No sensitive information exposed
- Can be monitored by external services

### Logging Security
- No passwords or tokens in logs
- Error messages don't expose internals
- Request logging available for monitoring

### Rate Limiting
- API endpoints: 100 requests/15 minutes per IP
- Configurable via environment variables
- Protects against brute force attacks

## 🚧 Recommended Additional Security

### For High-Traffic Production
1. **Web Application Firewall (WAF)**
2. **DDoS Protection** (Cloudflare, AWS Shield)
3. **Security Monitoring** (Sentry for errors)
4. **Database Encryption** (consider full-disk encryption)
5. **Regular Security Updates** (dependabot, security audits)

### Optional Enhancements
- Two-factor authentication for admin accounts
- API key authentication for admin endpoints
- Request IP whitelisting for admin panel
- Enhanced audit logging

## 📞 Security Incident Response

1. **Monitor logs** for suspicious activity
2. **Rate limiting** protects against automated attacks  
3. **JWT tokens** can be invalidated by changing secret
4. **Database backups** allow quick recovery
5. **Health checks** detect service disruption

## 🔐 Password Policy

### User Passwords
- Minimum 6 characters (basic requirement)
- Stored with bcrypt (12 rounds)
- No password complexity requirements (modern best practice)

### Admin Password
- Minimum 12 characters
- Auto-generated if not provided
- Displayed once during setup
- Consider using password manager

---

**Security Status**: ✅ PRODUCTION READY

All critical security vulnerabilities have been addressed. The application follows modern security best practices and is ready for internet deployment.