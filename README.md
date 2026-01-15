# Setup-Anleitung - Serial Switch Configurator

Diese Anleitung beschreibt die Ersteinrichtung des Serial Switch Configurators auf einem Raspberry Pi (Ubuntu 20.04 LTS).

## 1. Repository klonen

Zuerst das Repository von GitHub klonen:

```bash
cd ~
git clone https://github.com/Morgenstern/baseline-implementer.git
cd baseline-implementer
```

## 2. Miniconda / Miniforge Setup

Da Standard-Python-Versionen auf ARM-Systemen oft Probleme bereiten, nutzen wir Miniforge.

### 2.1 Miniforge installieren
```bash
wget https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Linux-aarch64.sh
bash Miniforge3-Linux-aarch64.sh
# Den Anweisungen folgen (Standardpfad ~/miniforge3, 'yes' zur Initialisierung)
source ~/.bashrc
```

### 2.2 Python-Umgebung erstellen
```bash
conda create -n switchconfig python=3.10 -y
conda activate switchconfig
```

## 3. Abhängigkeiten installieren

### 3.1 Backend (Python)
Stellen Sie sicher, dass die `switchconfig` Umgebung aktiviert ist.

```bash
pip install fastapi uvicorn sqlalchemy celery redis jinja2 pyserial
```

### 3.2 Frontend (Node.js/JS)
Die Build-Artefakte sind bereits im Repository enthalten. Dennoch müssen die Node-Module installiert werden, um den Server zu starten.

```bash
cd ~/baseline-implementer/frontend
npm install
```

## 4. System-Services (systemd)

Wir richten drei Services ein: Backend, Worker und Frontend.

### 4.1 Service-Dateien kopieren
Die Vorlagen befinden sich im Ordner `systemd/`. Kopieren Sie diese nach `/etc/systemd/system/` (Pfade in den Dateien ggf. anpassen).

```bash
sudo cp ~/baseline-implementer/systemd/*.service /etc/systemd/system/
```

### 4.2 Services aktivieren und starten
```bash
sudo systemctl daemon-reload

# Aktivieren (Start beim Booten)
sudo systemctl enable switchconfig-backend
sudo systemctl enable switchconfig-worker
sudo systemctl enable switchconfig-frontend

# Starten
sudo systemctl start switchconfig-backend
sudo systemctl start switchconfig-worker
sudo systemctl start switchconfig-frontend
```

## 5. Update-Leitfaden

Um das System auf den neuesten Stand zu bringen:

```bash
cd ~/baseline-implementer
git pull origin main

# Backend & Worker neu starten
sudo systemctl restart switchconfig-backend switchconfig-worker

# Frontend (da Build bereits vorhanden ist, reicht meist ein Neustart)
# Falls JS-Abhängigkeiten geändert wurden: cd frontend && npm install
sudo systemctl restart switchconfig-frontend
```

## Troubleshooting
- **Logs prüfen**: `sudo journalctl -u switchconfig-backend -f`
- **Status prüfen**: `sudo systemctl status switchconfig-*`
- **Serielle Ports**: Sicherstellen, dass der User in der Gruppe `dialout` ist: `sudo usermod -a -G dialout $USER` (gefolgt von einem Reboot).
