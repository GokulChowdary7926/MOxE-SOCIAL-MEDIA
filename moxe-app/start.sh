#!/bin/bash

# MOXE - Start Script
echo "🚀 Starting MOXE Application..."

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first."
    echo "   On macOS: brew services start mongodb-community"
    echo "   Or: mongod --dbpath /path/to/data"
fi

# Start Backend
echo "📡 Starting Backend Server..."
cd backend
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
PORT=5001
MONGODB_URI=mongodb://localhost:27017/moxe
JWT_SECRET=your-super-secret-jwt-key-change-in-production
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
EOF
    echo "✅ .env file created. Please update with your credentials."
fi

npm install > /dev/null 2>&1
npm run dev &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Wait for backend to start
sleep 3

# Start Frontend
echo "🎨 Starting Frontend Server..."
cd ../frontend
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
EOF
    echo "✅ .env file created."
fi

npm install > /dev/null 2>&1
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "🎉 MOXE Application is running!"
echo ""
echo "📡 Backend:  http://localhost:5001"
echo "🌐 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait


