@echo off
echo ==========================================================
echo  Starting Engineering Task & Work Manager (Docker Local)
echo  Persistent data will be saved to: %cd%\data
echo ==========================================================

REM Ensure data and uploads folders exist
if not exist "data" mkdir data
if not exist "data\uploads" mkdir data\uploads

REM Build and start container using Docker Compose
docker compose up -d --build
if %ERRORLEVEL% NEQ 0 (
    echo Docker compose failed, trying legacy docker-compose...
    docker-compose up -d --build
)

echo.
echo  Application is running at: http://localhost:3000
echo  Data is permanently stored in .\data\app.db
echo  To view logs: docker logs -f engineering-task-manager
echo  To stop: docker compose down
echo ==========================================================
pause
