# Deployment Guide - Ubuntu 20.04 LTS (Raspberry Pi ARM)

Complete deployment guide for the Serial Switch Configurator on Raspberry Pi running Ubuntu 20.04 LTS.

## System Requirements

- **Hardware**: Raspberry Pi 3/4 (ARM64)
- **OS**: Ubuntu 20.04 LTS (ARM)
- **RAM**: Minimum 2GB recommended
- **Storage**: 8GB+ available
- **Network**: Static IP recommended
- **Serial Ports**: USB serial adapters as needed

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Nginx (Port 80/443)            │
├─────────────────────────────────────────┤
│  ┌────────────┐    ┌─────────────┐     │
│  │  Frontend  │    │   Backend   │     │
│  │  (Next.js) │    │  (FastAPI)  │     │
│  │  Port 3000 │    │  Port 8000  │     │
│  └────────────┘    └─────────────┘     │
│                          │              │
│                    ┌─────┴──────┐       │
│                    │   Redis    │       │
│                    │  Port 6379 │       │
│                    └─────┬──────┘       │
│                          │              │
│                    ┌─────┴──────┐       │
│                    │   Celery   │       │
│                    │   Worker   │       │
│                    └────────────┘       │
└─────────────────────────────────────────┘
```

## Part 1: System Preparation

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential git curl wget
```

### 1.2 Install Miniforge (Python for ARM)

**Why Miniforge?** Python 3.11 on ARM can be challenging with standard apt. Miniforge provides optimized ARM builds.

```bash
# Download Miniforge for ARM64
wget https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Linux-aarch64.sh

# Install
bash Miniforge3-Linux-aarch64.sh
# Follow prompts, install to ~/miniforge3
# Answer 'yes' to initialize conda

# Reload shell
source ~/.bashrc

# Verify
conda --version
```

### 1.3 Create Python Environment

```bash
# Create environment with Python 3.10 (more stable on ARM than 3.11)
conda create -n switchconfig python=3.10 -y
conda activate switchconfig

# Verify
python --version  # Should show Python 3.10.x
```

### 1.4 Install Redis

```bash
sudo apt install -y redis-server

# Configure Redis to start on boot
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify
redis-cli ping  # Should return PONG
```

### 1.5 Install Node.js (for Next.js frontend)

```bash
# Install NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node 18 LTS (ARM compatible)
nvm install 18
nvm use 18
nvm alias default 18

# Verify
node --version  # Should show v18.x
npm --version
```

## Part 2: Application Setup

### 2.1 Clone Repository

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/baseline-implementer.git
cd baseline-implementer
```

### 2.2 Backend Setup

```bash
# Activate conda environment
conda activate switchconfig

# Install Python dependencies
pip install fastapi uvicorn sqlalchemy celery redis jinja2 pyserial

# Seed device profiles
python backend/seed_profiles.py

# Test backend
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
# Ctrl+C to stop after verifying it starts
```

### 2.3 Frontend Setup

```bash
cd ~/baseline-implementer/frontend

# Install dependencies
npm install

# Build for production
npm run build

# Test production build
npm start  # Runs on port 3000
# Ctrl+C to stop after verifying
```

## Part 3: Process Management with systemd

### 3.1 Backend Service

Create `/etc/systemd/system/switchconfig-backend.service`:

```bash
sudo nano /etc/systemd/system/switchconfig-backend.service
```

```ini
[Unit]
Description=Switch Configurator Backend (FastAPI)
After=network.target redis-server.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/baseline-implementer
Environment="PATH=/home/ubuntu/miniforge3/envs/switchconfig/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Environment="PYTHONPATH=/home/ubuntu/baseline-implementer"
ExecStart=/home/ubuntu/miniforge3/envs/switchconfig/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3.2 Celery Worker Service

Create `/etc/systemd/system/switchconfig-worker.service`:

```bash
sudo nano /etc/systemd/system/switchconfig-worker.service
```

```ini
[Unit]
Description=Switch Configurator Celery Worker
After=network.target redis-server.service switchconfig-backend.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/baseline-implementer
Environment="PATH=/home/ubuntu/miniforge3/envs/switchconfig/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Environment="PYTHONPATH=/home/ubuntu/baseline-implementer"
Environment="REDIS_URL=redis://localhost:6379/0"
ExecStart=/home/ubuntu/miniforge3/envs/switchconfig/bin/celery -A backend.worker.celery_app worker --loglevel=info --concurrency=2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Note**: `--concurrency=2` limits worker threads for Raspberry Pi. Adjust based on your model.

### 3.3 Frontend Service

Create `/etc/systemd/system/switchconfig-frontend.service`:

```bash
sudo nano /etc/systemd/system/switchconfig-frontend.service
```

```ini
[Unit]
Description=Switch Configurator Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/baseline-implementer/frontend
Environment="PATH=/home/ubuntu/.nvm/versions/node/v18.19.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Environment="NODE_ENV=production"
ExecStart=/home/ubuntu/.nvm/versions/node/v18.19.0/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Note**: Update Node path to match your `nvm` installation. Check with `which node`.

### 3.4 Enable and Start Services

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services (start on boot)
sudo systemctl enable switchconfig-backend
sudo systemctl enable switchconfig-worker
sudo systemctl enable switchconfig-frontend

# Start services
sudo systemctl start switchconfig-backend
sudo systemctl start switchconfig-worker
sudo systemctl start switchconfig-frontend

# Check status
sudo systemctl status switchconfig-backend
sudo systemctl status switchconfig-worker
sudo systemctl status switchconfig-frontend
```

### 3.5 View Logs

```bash
# Backend logs
sudo journalctl -u switchconfig-backend -f

# Worker logs
sudo journalctl -u switchconfig-worker -f

# Frontend logs
sudo journalctl -u switchconfig-frontend -f
```

## Part 4: Nginx Reverse Proxy

### 4.1 Install Nginx

```bash
sudo apt install -y nginx
```

### 4.2 Configure Nginx

Create `/etc/nginx/sites-available/switchconfig`:

```bash
sudo nano /etc/nginx/sites-available/switchconfig
```

```nginx
server {
    listen 80;
    server_name YOUR_PI_IP_OR_HOSTNAME;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Backend API
    location /api {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Backend direct access (optional, for debugging)
    location /docs {
        proxy_pass http://localhost:8000/docs;
        proxy_set_header Host $host;
    }
}
```

### 4.3 Enable Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/switchconfig /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Part 5: Serial Port Configuration

### 5.1 Add User to dialout Group

```bash
# Add user to dialout group for serial port access
sudo usermod -a -G dialout ubuntu

# Logout and login for changes to take effect
# Or reboot
sudo reboot
```

### 5.2 Create Port Symlinks (Optional)

For convenience, create symlinks like `~/port1`, `~/port2`:

```bash
# Example: USB serial adapter at /dev/ttyUSB0
ln -s /dev/ttyUSB0 ~/port1
ln -s /dev/ttyUSB1 ~/port2
# etc.

# Or use udev rules for persistent names (advanced)
```

### 5.3 Verify Serial Access

```bash
# List serial devices
ls -l /dev/ttyUSB* /dev/ttyACM*

# Test permissions
python -c "import serial; s = serial.Serial('/dev/ttyUSB0', 9600); print('OK'); s.close()"
```

## Part 6: Frontend API Configuration

### 6.1 Update API Endpoint

Edit `frontend/src/lib/api.ts` to use relative paths or your server IP:

```typescript
// Option 1: Use relative path with Nginx proxy
const api = axios.create({
  baseURL: '/api',  // Nginx will proxy to backend
});

// Option 2: Direct backend access (if not using Nginx /api proxy)
const api = axios.create({
  baseURL: 'http://YOUR_PI_IP:8000',
});
```

### 6.2 Rebuild Frontend

```bash
cd ~/baseline-implementer/frontend
npm run build

# Restart service
sudo systemctl restart switchconfig-frontend
```

## Part 7: Testing Deployment

### 7.1 Verify Services

```bash
# Check all services running
sudo systemctl status switchconfig-backend switchconfig-worker switchconfig-frontend redis-server nginx

# Check ports
sudo netstat -tlnp | grep -E '(3000|8000|6379|80)'
```

### 7.2 Access Application

1. **Via Browser**: `http://YOUR_PI_IP`
2. **API Docs**: `http://YOUR_PI_IP/docs`
3. **Direct Backend**: `http://YOUR_PI_IP:8000` (if not using Nginx)

### 7.3 Test Job Execution

1. Create a template via wizard
2. Submit a job with a test port
3. Monitor worker logs: `sudo journalctl -u switchconfig-worker -f`

## Part 8: Maintenance & Troubleshooting

### 8.1 Update Application

```bash
cd ~/baseline-implementer
git pull

# Backend: Restart service
sudo systemctl restart switchconfig-backend switchconfig-worker

# Frontend: Rebuild and restart
cd frontend
npm install  # If package.json changed
npm run build
sudo systemctl restart switchconfig-frontend
```

### 8.2 Database Management

```bash
# Backup SQLite database
cp ~/baseline-implementer/backend/switch_config.db ~/backups/switch_config_$(date +%Y%m%d).db

# Restore
cp ~/backups/switch_config_YYYYMMDD.db ~/baseline-implementer/backend/switch_config.db
sudo systemctl restart switchconfig-backend
```

### 8.3 Common Issues

**Issue**: Worker fails with "Port does not exist"
- **Fix**: Verify serial port exists, check permissions (dialout group)

**Issue**: Frontend can't reach backend
- **Fix**: Check Nginx config, verify backend is running on port 8000

**Issue**: Celery worker crashes
- **Fix**: Check Redis is running, reduce `--concurrency` to 1

**Issue**: Python dependencies fail on ARM
- **Fix**: Use conda: `conda install -c conda-forge PACKAGE_NAME`

### 8.4 Logs Location

```bash
# systemd journal
sudo journalctl -u switchconfig-backend -n 100
sudo journalctl -u switchconfig-worker -n 100
sudo journalctl -u switchconfig-frontend -n 100

# Nginx access/error logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Part 9: Security Hardening (Optional)

### 9.1 Firewall Setup

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block direct access to backend/redis (only allow localhost)
# (Already secured by binding to localhost)

# Enable firewall
sudo ufw enable
sudo ufw status
```

### 9.2 SSL/TLS with Let's Encrypt (Optional)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (requires domain name)
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured via cron
```

### 9.3 Change Default Ports (Optional)

Edit systemd service files to use non-standard ports if exposing to internet.

## Part 10: Performance Tuning for Raspberry Pi

### 10.1 Swap Configuration

```bash
# Increase swap (useful for npm build)
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Set CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### 10.2 Redis Tuning

Edit `/etc/redis/redis.conf`:
```
maxmemory 256mb
maxmemory-policy allkeys-lru
```

Restart: `sudo systemctl restart redis-server`

### 10.3 Celery Worker Tuning

For Raspberry Pi 3: Use `--concurrency=1`
For Raspberry Pi 4 (4GB+): Use `--concurrency=2`

Edit `/etc/systemd/system/switchconfig-worker.service` and adjust.

## Part 11: Monitoring (Optional)

### 11.1 Resource Monitoring

```bash
# Install htop
sudo apt install -y htop

# Monitor resources
htop

# Monitor specific processes
ps aux | grep -E '(uvicorn|celery|node)'
```

### 11.2 Application Health Checks

Create a simple health check script:

```bash
#!/bin/bash
# ~/health_check.sh

curl -f http://localhost:8000/ > /dev/null 2>&1 || echo "Backend DOWN"
curl -f http://localhost:3000/ > /dev/null 2>&1 || echo "Frontend DOWN"
redis-cli ping > /dev/null 2>&1 || echo "Redis DOWN"
```

Run via cron for monitoring.

## Summary

**Quick Start Commands:**
```bash
# Start all services
sudo systemctl start switchconfig-backend switchconfig-worker switchconfig-frontend

# Stop all services
sudo systemctl stop switchconfig-backend switchconfig-worker switchconfig-frontend

# Restart all services
sudo systemctl restart switchconfig-backend switchconfig-worker switchconfig-frontend

# View all logs
sudo journalctl -u switchconfig-* -f
```

**Access Points:**
- Frontend: `http://YOUR_PI_IP`
- API Docs: `http://YOUR_PI_IP/docs`
- SQLite DB: `~/baseline-implementer/backend/switch_config.db`

Your Serial Switch Configurator is now deployed and ready for production use!
