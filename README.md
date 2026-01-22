# Setup-Anleitung - Serial Switch Configurator

Diese Anleitung beschreibt die Ersteinrichtung des Serial Switch Configurators auf einem Raspberry Pi (Ubuntu 20.04 LTS).

## 1. System Vorbereitung

Zuerst das System aktualisieren und Basis-Tools installieren:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential git curl wget redis-server nginx
```

### 1.1 Redis konfigurieren
```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
# Test: redis-cli ping (sollte PONG zurückgeben)
```

### 1.2 Node.js (NVM) installieren
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
```

## 2. Repository klonen

```bash
cd ~
git clone https://github.com/Morgenstern/baseline-implementer.git
cd baseline-implementer
```

## 3. Miniconda / Miniforge Setup

### 3.1 Miniforge installieren (für ARM64)
```bash
wget https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Linux-aarch64.sh
bash Miniforge3-Linux-aarch64.sh
source ~/.bashrc
```

### 3.2 Python-Umgebung erstellen
```bash
conda create -n switchconfig python=3.10 -y
conda activate switchconfig
```

## 4. Abhängigkeiten & Datenbank

### 4.1 Backend (Python)
```bash
pip install fastapi uvicorn sqlalchemy celery redis jinja2 pyserial
# Datenbank initialisieren und Standardprofile laden
python backend/seed_profiles.py
```

### 4.2 Frontend (Node.js/JS)
Build-Artefakte sind bereits enthalten, nur Abhängigkeiten installieren:
```bash
cd ~/baseline-implementer/frontend
npm install
```

## 5. Nginx Konfiguration

Nginx als Reverse Proxy einrichten:

```bash
sudo cp ~/baseline-implementer/nginx/switchconfig.conf /etc/nginx/sites-available/switchconfig
```

Aktivieren:
```bash
sudo ln -s /etc/nginx/sites-available/switchconfig /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## 6. System-Services (systemd)

### 6.1 Services einrichten
```bash
sudo cp ~/baseline-implementer/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload

# Aktivieren und Starten
sudo systemctl enable --now switchconfig-backend switchconfig-worker switchconfig-frontend
```

## 7. Update-Leitfaden

```bash
cd ~/baseline-implementer
git pull origin main

# Dienste neu starten
sudo systemctl restart switchconfig-backend switchconfig-worker switchconfig-frontend
```

## Fehlerbehebung
- **Berechtigungen**: `sudo usermod -a -G dialout $USER` (gefolgt von Reboot).
- **Logs**: `sudo journalctl -u switchconfig-* -f`
