#!/bin/bash

# Agent Zule Development Stop Script
# This script stops all running Agent Zule services

echo "🛑 Stopping Agent Zule Development Environment"
echo "=============================================="

# Function to stop service
stop_service() {
    local service_name=$1
    local pid_file="logs/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat $pid_file)
        if kill -0 $pid 2>/dev/null; then
            echo "🛑 Stopping $service_name (PID: $pid)..."
            kill $pid
            sleep 2
            
            # Force kill if still running
            if kill -0 $pid 2>/dev/null; then
                echo "🔨 Force stopping $service_name..."
                kill -9 $pid
            fi
            
            echo "✅ $service_name stopped"
        else
            echo "⚠️  $service_name was not running"
        fi
        rm -f $pid_file
    else
        echo "⚠️  No PID file found for $service_name"
    fi
}

# Stop services
stop_service "frontend"
stop_service "backend"

# Kill any remaining processes on our ports
echo "🔍 Checking for remaining processes on ports 3000 and 8000..."

# Kill processes on port 3000 (Frontend)
frontend_pids=$(lsof -ti:3000)
if [ ! -z "$frontend_pids" ]; then
    echo "🛑 Killing remaining processes on port 3000..."
    echo $frontend_pids | xargs kill -9 2>/dev/null
fi

# Kill processes on port 8000 (Backend)
backend_pids=$(lsof -ti:8000)
if [ ! -z "$backend_pids" ]; then
    echo "🛑 Killing remaining processes on port 8000..."
    echo $backend_pids | xargs kill -9 2>/dev/null
fi

echo ""
echo "✅ All Agent Zule services have been stopped"
echo ""
echo "📋 Log files are preserved in the 'logs' directory"
echo "🧹 To clean up log files, run: rm -rf logs/"
echo ""
