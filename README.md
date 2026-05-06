# Argus Service Desk

An enterprise IT Service Management platform with AI-powered automation, built with Django (backend) and React (frontend).

## Features

- **Incident Management** - Track, prioritize, and resolve incidents
- **Change Management** - Plan and execute changes with approval workflows
- **Problem Management** - Root cause analysis and known error tracking
- **CMDB & Assets** - Configuration Management Database and asset tracking
- **Alerting & Monitoring** - Integration with Prometheus, Grafana, and other monitoring tools
- **On-Call & Escalation** - Automated escalation policies and on-call scheduling
- **AI Insights** - GPT-4 powered incident analysis and resolution suggestions
- **Multi-Tenant** - Organization-based isolation and management
- **Integrations** - Slack, PagerDuty, ServiceNow, Jira, and more

## Tech Stack

### Backend
- **Django 5** - Web framework
- **Django REST Framework** - API framework
- **PostgreSQL 16** - Database
- **Redis** - Caching and Celery broker
- **Celery** - Background tasks
- **djangorestframework-simplejwt** - JWT authentication

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TanStack Query** - Data fetching
- **Zustand** - State management
- **TailwindCSS** - Styling
- **Lucide React** - Icons

## Quick Start

### Using Docker Compose (Recommended)

```bash
git clone <your-repo-url>
cd argus-servicedesk
docker-compose -f docker-compose.dev.yml up -d
```

Access the application at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1
- API Docs: http://localhost:8000/api/schema/

### Manual Setup

See [SETUP.md](./SETUP.md) for detailed manual setup instructions.

## Project Structure

```
argus-servicedesk/
├── Argus-Backend/          # Django backend
│   ├── apps/               # Django apps
│   │   ├── accounts/       # User & auth
│   │   ├── incidents/      # Incident management
│   │   ├── changes/        # Change management
│   │   ├── problems/       # Problem management
│   │   ├── assets/         # CMDB/Assets
│   │   ├── alerts/         # Alert management
│   │   ├── teams/          # Team management
│   │   └── integrations/   # Third-party integrations
│   ├── config/             # Django settings
│   └── manage.py
├── Argus-Frontend/         # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── lib/           # API client
│   │   ├── stores/        # State management
│   │   └── hooks/         # Custom hooks
│   └── package.json
├── docs/                   # Documentation
│   ├── schema.dbml        # Database schema
│   └── DATABASE_ERD.md     # Database documentation
└── docker-compose.dev.yml
```

## Documentation

- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [Database Schema](./docs/DATABASE_ERD.md) - Database documentation
- [API Documentation](http://localhost:8000/api/schema/) - Interactive API docs (Swagger UI)

## Environment Variables

See [SETUP.md](./SETUP.md) for required environment variables for both backend and frontend.

## Development

### Backend

```bash
cd Argus-Backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend

```bash
cd Argus-Frontend
npm install
npm run dev
```

## License

Proprietary - FinSpot Technology Solutions Pvt Ltd

## Support

For support, contact the development team.


python manage.py runserver 0.0.0.0:8000