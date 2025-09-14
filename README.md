# WiFiPy - Captive Portal System

A complete, production-ready captive portal system with M-Pesa payment integration for WiFi access control.

## 🚀 Features

### Core Functionality
- **Captive Portal**: Automatic redirection for unauthenticated users
- **M-Pesa Integration**: Secure payment processing via Daraja API
- **Session Management**: Redis-based session tracking with TTL
- **Network Access Control**: RADIUS, CoovaChilli, and iptables integration
- **Real-time Status**: WebSocket-based payment status updates

### Security & Fraud Prevention
- **Rate Limiting**: IP and MAC-based request throttling
- **Fraud Detection**: Device fingerprinting and behavioral analysis
- **Webhook Verification**: HMAC signature validation
- **Input Validation**: Comprehensive request sanitization
- **Audit Logging**: Complete transaction and access logs

### Admin Dashboard
- **Real-time Monitoring**: Active sessions and system stats
- **Payment Management**: Transaction history and reconciliation
- **Session Control**: Manual session revocation and extension
- **Security Alerts**: Suspicious activity monitoring

### Technical Excellence
- **TypeScript**: Full type safety across frontend and backend
- **Scalable Architecture**: Microservices-ready design
- **Docker Support**: Complete containerization
- **Production Ready**: Comprehensive error handling and logging

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │     Redis       │
│   (React)       │◄──►│   (Express)     │◄──►│   (Sessions)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   M-Pesa API    │
                       │   (Daraja)      │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Network Control │
                       │ (RADIUS/Chilli) │
                       └─────────────────┘
```

## 🚦 Quick Start

### Prerequisites
- Node.js 18+
- Redis 6+
- Docker & Docker Compose (optional)

### 1. Clone and Install
```bash
git clone <repository-url>
cd wifipy
npm run install:all
```

### 2. Environment Setup
```bash
# Backend configuration
cp backend/.env.example backend/.env
# Edit backend/.env with your M-Pesa credentials

# Frontend configuration  
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your settings
```

### 3. Start Development
```bash
# Start all services
npm run dev

# Or individually
npm run dev:backend  # Backend on :4000
npm run dev:frontend # Frontend on :3000
```

### 4. Production Deployment
```bash
# Using Docker Compose
docker-compose up -d

# Or build and deploy
npm run build
npm run start
```

## 📋 Configuration

### M-Pesa Setup
1. Register at [Safaricom Developer Portal](https://developer.safaricom.co.ke)
2. Create a new app and get credentials
3. Configure webhook URL: `https://yourdomain.com/api/payments/webhook`
4. Update `.env` with your credentials:

```env
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/webhook
```

### Network Integration

#### CoovaChilli Setup
```bash
# Install CoovaChilli
sudo apt-get install coova-chilli

# Configure in /etc/chilli/defaults
HS_LANIF=eth1
HS_NETWORK=192.168.1.0
HS_NETMASK=255.255.255.0
HS_UAMLISTEN=192.168.1.1
HS_UAMPORT=3990
HS_UAMSECRET=your_secret
HS_RADSECRET=your_radius_secret
HS_RADSERVER=127.0.0.1
```

#### FreeRADIUS Setup
```bash
# Install FreeRADIUS
sudo apt-get install freeradius freeradius-mysql

# Configure clients.conf
client captive-portal {
    ipaddr = 127.0.0.1
    secret = your_radius_secret
    require_message_authenticator = no
}
```

## 🔧 API Reference

### Payment Endpoints

#### Initiate Payment
```http
POST /api/payments/initiate
Content-Type: application/json

{
  "mac": "00:11:22:33:44:55",
  "ip": "192.168.1.100", 
  "amount": 20,
  "deviceInfo": {...}
}
```

#### Check Payment Status
```http
GET /api/payments/{reference}/status
```

#### Webhook (M-Pesa Callback)
```http
POST /api/payments/webhook
Content-Type: application/json

{
  "Body": {
    "stkCallback": {
      "ResultCode": 0,
      "CallbackMetadata": {...}
    }
  }
}
```

### Admin Endpoints

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

#### Get System Stats
```http
GET /api/admin/stats
Authorization: Bearer {token}
```

#### Revoke Session
```http
DELETE /api/admin/sessions/{reference}
Authorization: Bearer {token}
```

## 🔒 Security Features

### Fraud Prevention
- **Rate Limiting**: 10 attempts per IP per hour
- **Device Fingerprinting**: Browser and device analysis
- **Velocity Checks**: Rapid request detection
- **Amount Validation**: Suspicious amount flagging

### Data Protection
- **HTTPS Everywhere**: TLS encryption for all endpoints
- **Webhook Verification**: HMAC signature validation
- **Input Sanitization**: Joi schema validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy headers

### Access Control
- **JWT Authentication**: Secure admin access
- **Role-based Authorization**: Admin-only endpoints
- **Session TTL**: Automatic session expiration
- **IP Whitelisting**: Admin IP restrictions

## 📊 Monitoring & Logging

### Metrics
- Payment success/failure rates
- Session duration analytics
- Fraud detection alerts
- System performance metrics

### Logging
- Structured JSON logging (Winston)
- Request/response logging
- Error tracking and alerting
- Audit trail for all transactions

### Health Checks
```http
GET /health
```

Returns system status, uptime, and dependency health.

## 🚀 Deployment

### Docker Production
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    image: wifipy:latest
    environment:
      - NODE_ENV=production
    ports:
      - "80:80"
      - "443:443"
```

### Kubernetes
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wifipy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: wifipy
  template:
    spec:
      containers:
      - name: wifipy
        image: wifipy:latest
        ports:
        - containerPort: 4000
```

### Load Balancing
- Nginx reverse proxy configuration
- SSL termination and certificate management
- Rate limiting and DDoS protection
- Health check endpoints

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Load Testing
```bash
# Using Artillery
npm run test:load
```

### Security Testing
```bash
# OWASP ZAP scanning
npm run test:security
```

## 📈 Performance

### Benchmarks
- **Payment Processing**: <500ms average
- **Session Creation**: <100ms average  
- **Concurrent Users**: 1000+ supported
- **Memory Usage**: <512MB typical

### Optimization
- Redis caching for session data
- Connection pooling for database
- Gzip compression for API responses
- CDN integration for static assets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Development Guidelines
- Follow TypeScript strict mode
- Use conventional commit messages
- Maintain test coverage >80%
- Update documentation for API changes

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](wiki)
- **Issues**: [GitHub Issues](issues)
- **Email**: support@wifipy.com
- **Phone**: +254700000000

## 🗺️ Roadmap

### v2.0 Features
- [ ] Multi-tenant support
- [ ] Advanced analytics dashboard
- [ ] Mobile app for payments
- [ ] Blockchain payment integration
- [ ] AI-powered fraud detection

### v2.1 Features
- [ ] Social media authentication
- [ ] Loyalty program integration
- [ ] Advanced reporting
- [ ] Multi-language support
- [ ] White-label customization

---

**Built with ❤️ for the WiFi community**