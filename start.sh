#!/bin/bash

# Script to start both backend and frontend applications for WebSocket Benchmark

echo "Starting WebSocket Benchmark..."

# Create a file to store PIDs
echo "" > ./app_pids.txt

# Start the backend server
echo "Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!
echo $BACKEND_PID > ../app_pids.txt
cd ..

# Wait a moment to make sure backend is fully started
sleep 1

# Start the frontend server
echo "Starting frontend server..."
cd frontend
npm start &
FRONTEND_PID=$!
echo $FRONTEND_PID >> ../app_pids.txt
cd ..

echo "Both applications started successfully!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Open your browser and navigate to: http://localhost:4000"
