# Deployment Guide

This app runs as two Docker containers (Node.js app + MongoDB) behind an nginx reverse proxy.

---

## Prerequisites

Install these on the VPS:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx
sudo usermod -aG docker $USER   # lets you run docker without sudo (re-login after)
```

---

## First-Time Setup

### 1. Clone the repo

```bash
git clone <your-repo-url> /srv/bin-collection
cd /srv/bin-collection
```

### 2. Create your `.env` file

Copy the example and fill in every value:

```bash
cp .env.example .env
nano .env
```

Key values for production:

```env
NODE_ENV=production
PORT=3000
HOST_PORT=3000
SESSION_SECRET=<a long random string — run: openssl rand -hex 64>
COOKIE_DOMAIN=                  # leave blank unless using subdomains

MONGO_URL=mongodb://mongo:27017/bincollection?replicaSet=rs0
# If you set MONGO_ROOT_USER/PASSWORD below, include them in the URL:
# MONGO_URL=mongodb://<user>:<password>@mongo:27017/bincollection?replicaSet=rs0&authSource=admin
MONGO_ROOT_USER=<choose a username>
MONGO_ROOT_PASSWORD=<choose a strong password>

GMAIL_USER=
GMAIL_APP_PASSWORD=
BIN_REMINDER_CRON=
BIN_COLLECTION_API=
ADDRESS_LIST_API=
```

### 3. Build and start the containers

```bash
docker compose up -d --build
```

### 4. Initialise the MongoDB replica set (first time only)

MongoDB needs its replica set bootstrapped before the app can use transactions or sessions.

**Without auth** (if you left MONGO_ROOT_USER/PASSWORD blank):

```bash
docker compose exec mongo mongosh --eval \
  "rs.initiate({_id:'rs0',members:[{_id:0,host:'mongo:27017'}]})"
```

**With auth** (if you set MONGO_ROOT_USER/PASSWORD in `.env`):

```bash
docker compose exec mongo mongosh \
  -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'mongo:27017'}]})"
```

Confirm with `rs.status()` — you should see `"stateStr": "PRIMARY"`.

---

## nginx Configuration

The app runs on port 3000 inside Docker. nginx proxies public HTTP/HTTPS traffic to it.

### 1. Copy the config template

```bash
sudo cp nginx/bin-collection.conf /etc/nginx/sites-available/bin-collection
sudo nano /etc/nginx/sites-available/bin-collection
```

Replace `yourdomain.com` and `www.yourdomain.com` with your actual domain.

### 2. Enable the site

```bash
sudo ln -s /etc/nginx/sites-available/bin-collection /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Get an SSL certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will automatically edit your nginx config to add HTTPS and set up auto-renewal.

---

## Running Multiple Sites on the Same VPS

Each site gets its own config file in `/etc/nginx/sites-available/` and runs on a different Docker host port.

For a second site (e.g., on port 4000):

```nginx
# /etc/nginx/sites-available/my-other-site
server {
    listen 80;
    server_name otherdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host              $host;
    }
}
```

Then run that app's compose stack in its own directory with `HOST_PORT=4000` in its `.env`.

---

## Maintenance

### View logs

```bash
docker compose logs -f app
docker compose logs -f mongo
```

### Restart the app

```bash
docker compose restart app
```

### Deploy an update

```bash
git pull
docker compose up -d --build app
```

This rebuilds only the app container and restarts it with zero-downtime for the database.

### Stop everything

```bash
docker compose down
```

> Data is preserved in the `mongo-data` Docker volume. Use `docker compose down -v` only if you want to wipe the database.
