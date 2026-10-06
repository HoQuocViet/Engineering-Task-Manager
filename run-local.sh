#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Starting Engineering Task & Work Manager (Docker Local)  "
echo " Persistent data will be saved to: $(pwd)/data            "
echo "=========================================================="

# Ensure data directory and uploads exist on host
mkdir -p ./data/uploads

# Build and start container using Docker Compose
if command -v docker-compose &> /dev/null; then
    docker-compose up -d --build
else
    docker compose up -d --build
fi

echo ""
echo " Application is running at: http://localhost:3000"
echo " Data is permanently stored in ./data/app.db"
echo " To view logs: docker logs -f engineering-task-manager"
echo " To stop: docker-compose down (or docker compose down)"
echo "=========================================================="
