# Argus Service Desk - Setup Guide

This guide will help you set up and run the Argus Service Desk application on your local machine.

## Prerequisites

- **PostgreSQL 16** - Database
- **Redis** - Caching and Celery broker
- **Node.js 18+** - Frontend runtime
- **Python 3.11+** - Backend runtime
- **Docker & Docker Compose** (optional, for containerized setup)

## Quick Start (Docker Compose)

The fastest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone <your-repo-url>
cd argus-servicedesk

# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/api/v1
# API Docs: http://localhost:8000/api/schema/
```

## Manual Setup

### 1. Database Setup

```bash
# Install PostgreSQL 16
# Ubuntu/Debian:
sudo apt update
sudo apt install postgresql-16 postgresql-contrib-16

# macOS (Homebrew):
brew install postgresql@16
brew services start postgresql@16

# Create database
sudo -u postgres psql
CREATE DATABASE argus_servicedesk;
CREATE USER argus_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE argus_servicedesk TO argus_user;
\q
```

### 2. Redis Setup

```bash
# Ubuntu/Debian:
sudo apt install redis-server
sudo systemctl start redis-server

# macOS (Homebrew):
brew install redis
brew services start redis

# Windows:
# Download and install Redis from https://github.com/microsoftarchive/redis/releases
# Or use WSL2 and follow Linux instructions
```

### 3. Backend Setup (Django)

```bash
# Navigate to backend directory
cd Argus-Backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env and configure:
# - DATABASE_URL=postgresql://argus_user:your_password@localhost:5432/argus_servicedesk
# - REDIS_URL=redis://localhost:6379/0
# - SECRET_KEY=your-secret-key-here
# - ALLOWED_HOSTS=localhost,127.0.0.1

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Create initial organization (optional)
python manage.py shell
>>> from apps.accounts.models import Organization
>>> Organization.objects.create(
...     name="Demo Organization",
...     slug="demo-org",
...     environment="DEV",
...     fqdn="demo.local"
... )
>>> exit()

# Start backend server
python manage.py runserver
```

Backend will be available at: `http://localhost:8000`

### 4. Frontend Setup (React)

```bash
# Navigate to frontend directory
cd Argus-Frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env and configure:
# - VITE_API_URL=http://localhost:8000/api/v1

# Start development server
npm run dev
```

Frontend will be available at: `http://localhost:3000`

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/argus_servicedesk
DB_NAME=argus_servicedesk
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-secret-key-min-50-characters-long
DJANGO_DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# JWT
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:8000/api/v1
```

## Running Services

### Backend Services

```bash
# Terminal 1: Django server
cd Argus-Backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python manage.py runserver

# Terminal 2: Celery worker
cd Argus-Backend
source venv/bin/activate
celery -A config worker -l info

# Terminal 3: Celery beat (for scheduled tasks)
cd Argus-Backend
source venv/bin/activate
celery -A config beat -l info
```

### Frontend Service

```bash
# Terminal 4: React dev server
cd Argus-Frontend
npm run dev
```

## Default Credentials

After creating a superuser, you can log in with:
- **Email:** Your superuser email
- **Password:** Your superuser password

## API Documentation

Once the backend is running, access the API documentation at:
- **Swagger UI:** `http://localhost:8000/api/schema/`
- **ReDoc:** `http://localhost:8000/api/schema/redoc/`

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check if database exists
sudo -u postgres psql -l

# Test connection
psql -U argus_user -d argus_servicedesk -h localhost
```

### Redis Connection Issues

```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli ping
# Should return: PONG
```

### Port Conflicts

If ports are already in use:
- Backend: Change `8000` in `manage.py runserver 8001`
- Frontend: Change `3000` in `npm run dev -- --port 3001`
- PostgreSQL: Change `5432` in `postgresql.conf`
- Redis: Change `6379` in `redis.conf`

### Migration Issues

```bash
# Reset migrations (WARNING: Deletes data)
cd Argus-Backend
rm apps/*/migrations/0*.py
python manage.py makemigrations
python manage.py migrate
```

### Frontend Build Issues

```bash
# Clear node modules and reinstall
cd Argus-Frontend
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

## Production Deployment

For production deployment, refer to the deployment guide:
- Use PostgreSQL with proper backup strategy
- Configure Redis with persistence
- Set `DJANGO_DEBUG=False`
- Use strong `SECRET_KEY`
- Configure proper `ALLOWED_HOSTS`
- Use production WSGI server (Gunicorn)
- Configure Nginx as reverse proxy
- Enable HTTPS/SSL
- Set up proper logging and monitoring

## Support

For issues or questions:
- Check the API documentation at `/api/schema/`
- Review logs in the backend terminal
- Check browser console for frontend errors
- Ensure all services (PostgreSQL, Redis, Django, React) are running

## Project Structure

```
argus-servicedesk/
├── Argus-Backend/          # Django backend
│   ├── apps/               # Django apps
│   │   ├── accounts/       # User management
│   │   ├── incidents/      # Incident management
│   │   ├── changes/        # Change management
│   │   ├── problems/       # Problem management
│   │   ├── assets/         # CMDB/Assets
│   │   └── ...
│   ├── config/             # Django settings
│   ├── manage.py
│   └── requirements.txt
├── Argus-Frontend/         # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── lib/           # API client
│   │   ├── stores/        # State management
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.dev.yml
└── README.md
```

## Next Steps

1. Start all services as described above
2. Create a superuser account
3. Log in to the application at `http://localhost:3000`
4. Explore the dashboard and features
5. Check the API documentation at `http://localhost:8000/api/schema/`
