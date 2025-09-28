#!/bin/bash

# Agent Zule Development Startup Script
# This script starts all components of the Agent Zule application

echo "🚀 Starting Agent Zule Development Environment"
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are available"

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null; then
        echo "⚠️  Port $1 is already in use. Please stop the service using this port."
        return 1
    fi
    return 0
}

# Check required ports
echo "🔍 Checking required ports..."
check_port 3000 || exit 1  # Frontend
check_port 8000 || exit 1  # Backend
check_port 4000 || exit 1  # Envio (optional)

echo "✅ All required ports are available"

# Install dependencies if node_modules don't exist
echo "📦 Checking dependencies..."

if [ ! -d "agent-zule-frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd agent-zule-frontend && npm install && cd ..
fi

if [ ! -d "agent-zule-backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd agent-zule-backend && npm install && cd ..
fi

if [ ! -d "agent-zule-contracts/node_modules" ]; then
    echo "Installing contracts dependencies..."
    cd agent-zule-contracts && npm install && cd ..
fi

echo "✅ Dependencies are ready"

# Create environment files if they don't exist
echo "🔧 Setting up environment files..."

if [ ! -f "agent-zule-frontend/.env.local" ]; then
    echo "Creating frontend environment file..."
    cat > agent-zule-frontend/.env.local << EOF
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_CHAIN_ID=420
NEXT_PUBLIC_ENVIO_GRAPHQL_URL=http://localhost:4000/graphql
NEXT_PUBLIC_ENVIO_WS_URL=ws://localhost:4000/graphql
EOF
fi

if [ ! -f "agent-zule-backend/.env" ]; then
    echo "Creating backend environment file..."
    cat > agent-zule-backend/.env << EOF
NODE_ENV=development
PORT=8000
MONGODB_URI=mongodb://localhost:27017/agent-zule
JWT_SECRET=dev-jwt-secret-change-in-production
ENVIO_API_URL=http://localhost:4000/graphql
EOF
fi

echo "✅ Environment files are ready"

# Function to start service in background
start_service() {
    local service_name=$1
    local service_dir=$2
    local start_command=$3
    local port=$4
    
    echo "🚀 Starting $service_name on port $port..."
    cd $service_dir
    $start_command > ../logs/${service_name}.log 2>&1 &
    local pid=$!
    echo $pid > ../logs/${service_name}.pid
    cd ..
    
    # Wait a moment for the service to start
    sleep 2
    
    # Check if the service is running
    if kill -0 $pid 2>/dev/null; then
        echo "✅ $service_name started successfully (PID: $pid)"
    else
        echo "❌ Failed to start $service_name. Check logs/${service_name}.log"
        return 1
    fi
}

# Create logs directory
mkdir -p logs

# Start services
echo "🎯 Starting services..."

# Start Backend
start_service "backend" "agent-zule-backend" "npm run dev" 8000

# Wait for backend to initialize
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Start Frontend
start_service "frontend" "agent-zule-frontend" "npm run dev" 3000

echo ""
echo "🎉 Agent Zule is starting up!"
echo "================================"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📊 Backend Health: http://localhost:8000/api/v1/health"
echo ""
echo "📋 Logs are available in the 'logs' directory:"
echo "   - Frontend: logs/frontend.log"
echo "   - Backend: logs/backend.log"
echo ""
echo "🛑 To stop all services, run: ./stop-dev.sh"
echo ""
echo "📖 For more information, see INTEGRATION_GUIDE.md"
echo ""

# Keep script running to show status
echo "Press Ctrl+C to stop monitoring (services will continue running)"
echo ""

# Monitor services
while true; do
    sleep 10
    
    # Check if services are still running
    if [ -f "logs/backend.pid" ]; then
        backend_pid=$(cat logs/backend.pid)
        if ! kill -0 $backend_pid 2>/dev/null; then
            echo "⚠️  Backend service stopped unexpectedly"
        fi
    fi
    
    if [ -f "logs/frontend.pid" ]; then
        frontend_pid=$(cat logs/frontend.pid)
        if ! kill -0 $frontend_pid 2>/dev/null; then
            echo "⚠️  Frontend service stopped unexpectedly"
        fi
    fi
done
