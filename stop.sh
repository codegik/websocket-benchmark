#!/bin/bash

# Script to stop both backend and frontend applications for WebSocket Benchmark

echo "Stopping WebSocket Benchmark..."
PID_FILE="/tmp/websocket_benchmark_pids.txt"

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
    echo "PID file not found. Applications may not be running."
    exit 1
fi

# Read PIDs from file
PIDS=$(cat $PID_FILE)
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
rm $PID_FILE

echo "Applications stopped successfully!"
