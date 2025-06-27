#!/bin/bash

# Script to start both backend and frontend applications for WebSocket Benchmark

echo "Starting WebSocket Benchmark..."

# Create a file to store PIDs
PID_FILE="/tmp/websocket_benchmark_pids.txt"
echo "" > $PID_FILE

# Start the backend server
echo "Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!
echo $BACKEND_PID > $PID_FILE
cd ..

# Wait a moment to make sure backend is fully started
sleep 1

# Start the frontend server
echo "Starting frontend server..."
cd frontend
npm start &
FRONTEND_PID=$!
echo $FRONTEND_PID >> $PID_FILE
cd ..

echo "Both applications started successfully!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Open your browser and navigate to: http://localhost:4000"
