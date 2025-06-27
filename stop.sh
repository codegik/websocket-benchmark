#!/bin/bash

# Script to stop both backend and frontend applications for WebSocket Benchmark

echo "Stopping WebSocket Benchmark..."

# Check if PID file exists
if [ ! -f "./app_pids.txt" ]; then
    echo "PID file not found. Applications may not be running."
    exit 1
fi

# Read PIDs from file
PIDS=$(cat ./app_pids.txt)
if [ -z "$PIDS" ]; then
    echo "No PIDs found in file. Applications may not be running."
    exit 1
fi

# Kill each process
for PID in $PIDS; do
    if ps -p $PID > /dev/null; then
        echo "Stopping process with PID: $PID"
        kill $PID
    else
        echo "Process with PID $PID is not running"
    fi
done

# Clear the PID file
rm ./app_pids.txt

echo "Applications stopped successfully!"
