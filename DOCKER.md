# Docker Setup Guide

This project uses Docker Compose to orchestrate multiple services for the USDC Transaction Indexer application.

## Services

The Docker setup includes four services:

1. **Backend** - NestJS API server (Port 8080)
2. **Frontend** - Next.js web application (Port 3000)
3. **PostgreSQL** - Database (Port 5432)
4. **Redis** - Caching and queue system (Port 6379)

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start

### Production Mode

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### Development Mode

To run services in development mode with hot-reload:

```bash
# Build with development target
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Common Commands

```bash
# Start services
docker-compose up

# Start services in background
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild a specific service
docker-compose up --build backend

# Access backend container shell
docker-compose exec backend sh

# Access frontend container shell
docker-compose exec frontend sh

# Access PostgreSQL
docker-compose exec postgres psql -U indexer_user -d indexer_db

# Access Redis CLI
docker-compose exec redis redis-cli
```

## Service URLs

Once running, access the services at:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Environment Variables

The backend service uses environment variables defined in the `docker-compose.yml` file. To customize:

1. Create a `.env` file in the root directory
2. Override variables as needed
3. Restart services: `docker-compose up -d`

Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `QUEUE_HOST` - Redis host for BullMQ
- `JWT_SECRET` - JWT signing secret
- `CORS_ORIGIN` - Allowed CORS origins

## Database Migrations

Migrations run automatically when the backend container starts. To run manually:

```bash
# Run migrations
docker-compose exec backend pnpm prisma migrate deploy

# Generate Prisma client
docker-compose exec backend pnpm prisma generate

# Create a new migration
docker-compose exec backend pnpm prisma migrate dev --name migration_name
```

## Troubleshooting

### Services won't start

```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs
```

### Database connection errors

Ensure PostgreSQL is healthy:

```bash
docker-compose ps postgres
docker-compose logs postgres
```

### Redis connection errors

Ensure Redis is healthy:

```bash
docker-compose ps redis
docker-compose logs redis
```

### Clean slate restart

```bash
# Stop everything and remove volumes
docker-compose down -v

# Rebuild and start
docker-compose up --build
```

## Performance Tips

### For Development

- Use volumes for hot-reload (already configured in docker-compose.yml)
- Consider running `npm install` locally to speed up IDE

### For Production

- Multi-stage builds keep images small
- Health checks ensure service reliability
- Persistent volumes maintain data across restarts

## Security Notes

**Before deploying to production:**

1. Change all default passwords in environment variables
2. Use secrets management (Docker Secrets, Vault, etc.)
3. Update `JWT_SECRET` to a strong random value
4. Restrict CORS origins
5. Use HTTPS/TLS certificates
6. Review and harden database permissions
7. Never commit `.env` files to version control

## Architecture

```
┌─────────────┐
│   Frontend  │ :3000
│   (Next.js) │
└──────┬──────┘
       │
       │ HTTP
       │
┌──────▼──────┐     ┌──────────┐
│   Backend   │────▶│PostgreSQL│ :5432
│   (NestJS)  │     └──────────┘
└──────┬──────┘
       │            ┌──────────┐
       └───────────▶│  Redis   │ :6379
                    │(Cache/MQ)│
                    └──────────┘
```

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Prisma Documentation](https://www.prisma.io/docs)
