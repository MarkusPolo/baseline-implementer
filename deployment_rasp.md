# Deployment Instructions

## Building on Development Machine (Windows)

The Raspberry Pi is too resource-constrained to build the Next.js frontend. Build on your development machine and deploy the artifacts.

### Build Process

```powershell
# On Windows development machine
cd frontend
npm install
npm run build
```

### Deploy via Git

```powershell
# Stage the build artifacts
git add .next/
git add public/
git commit -m "Build: Production build for deployment"
git push origin main
```

### Pull on Raspberry Pi

```bash
# On Raspberry Pi
cd ~/baseline-implementer
git pull origin main

# Restart frontend service
sudo systemctl restart switchconfig-frontend
```

## Alternative: Direct SCP Transfer (Faster for iterations)

If you don't want to commit build artifacts to git:

### On Windows (PowerShell)

```powershell
# Build first
cd C:\Users\Morgenstern\github\baseline-implementer\frontend
npm run build

# Use SCP to copy .next directory
# You'll need an SCP client like WinSCP or use WSL
scp -r .next administrator@172.20.18.221:/home/administrator/baseline-implementer/frontend/
```

### On Raspberry Pi

```bash
# Just restart the service
sudo systemctl restart switchconfig-frontend
```

## Troubleshooting

**502 Bad Gateway**
- Frontend service not running
- Check: `sudo systemctl status switchconfig-frontend`
- Check: `sudo netstat -tlnp | grep 3000`

**Frontend won't start**
- Missing .next directory: Build on dev machine and deploy
- Wrong Node version: Ensure Node 20.x is in PATH
- Check logs: `sudo journalctl -u switchconfig-frontend -n 100`
