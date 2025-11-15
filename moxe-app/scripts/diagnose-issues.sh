#!/bin/bash

# MOXE Application Diagnostic Script
# Identifies what features are not working

echo "🔍 MOXE Application Diagnostic"
echo "==============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "1. Checking Backend Server..."
if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend is running"
    BACKEND_HEALTH=$(curl -s http://localhost:5001/api/health)
    echo "   Response: $BACKEND_HEALTH"
else
    echo -e "${RED}✗${NC} Backend is not responding"
    exit 1
fi

echo ""
echo "2. Checking Frontend Server..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Frontend is running"
else
    echo -e "${RED}✗${NC} Frontend is not responding"
    exit 1
fi

echo ""
echo "3. Checking MongoDB..."
if mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} MongoDB is connected"
else
    echo -e "${RED}✗${NC} MongoDB is not connected"
    echo "   Run: brew services start mongodb-community"
fi

echo ""
echo "4. Testing Authentication Endpoint..."
AUTH_TEST=$(curl -s -X POST http://localhost:5001/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+1234567890"}')
if echo "$AUTH_TEST" | grep -q "otp\|message"; then
    echo -e "${GREEN}✓${NC} Authentication endpoint working"
    echo "   Response: $AUTH_TEST"
else
    echo -e "${RED}✗${NC} Authentication endpoint failed"
    echo "   Response: $AUTH_TEST"
fi

echo ""
echo "5. Testing Posts Endpoint (requires auth)..."
POSTS_TEST=$(curl -s http://localhost:5001/api/posts/feed \
  -H "Authorization: Bearer invalid" 2>&1)
if echo "$POSTS_TEST" | grep -q "Invalid token\|Unauthorized"; then
    echo -e "${GREEN}✓${NC} Posts endpoint is protected (correct)"
else
    echo -e "${YELLOW}⚠${NC} Posts endpoint response: $POSTS_TEST"
fi

echo ""
echo "6. Checking Socket.io Connection..."
# Check if socket.io endpoint is accessible
SOCKET_TEST=$(curl -s http://localhost:5001/socket.io/ 2>&1 | head -1)
if [ -n "$SOCKET_TEST" ]; then
    echo -e "${GREEN}✓${NC} Socket.io endpoint accessible"
else
    echo -e "${YELLOW}⚠${NC} Socket.io endpoint check inconclusive"
fi

echo ""
echo "7. Checking Environment Variables..."
cd backend
if [ -f .env ]; then
    echo -e "${GREEN}✓${NC} Backend .env file exists"
    if grep -q "MONGODB_URI" .env; then
        echo -e "${GREEN}✓${NC} MONGODB_URI is set"
    else
        echo -e "${YELLOW}⚠${NC} MONGODB_URI not found in .env"
    fi
else
    echo -e "${RED}✗${NC} Backend .env file missing"
fi

cd ../frontend
if [ -f .env ]; then
    echo -e "${GREEN}✓${NC} Frontend .env file exists"
    if grep -q "VITE_API_URL" .env; then
        echo -e "${GREEN}✓${NC} VITE_API_URL is set"
    else
        echo -e "${YELLOW}⚠${NC} VITE_API_URL not found in .env"
    fi
else
    echo -e "${YELLOW}⚠${NC} Frontend .env file missing (may use defaults)"
fi
cd ..

echo ""
echo "8. Checking Running Processes..."
if pgrep -f "tsx.*server.ts" > /dev/null; then
    echo -e "${GREEN}✓${NC} Backend process running"
else
    echo -e "${RED}✗${NC} Backend process not found"
fi

if pgrep -f "vite" > /dev/null; then
    echo -e "${GREEN}✓${NC} Frontend process running"
else
    echo -e "${RED}✗${NC} Frontend process not found"
fi

echo ""
echo "==============================="
echo "📋 Diagnostic Complete"
echo ""
echo "Common Issues & Solutions:"
echo "1. If authentication fails: Check Twilio credentials in .env"
echo "2. If posts don't load: Make sure you're logged in"
echo "3. If Socket.io fails: Check CORS settings in backend"
echo "4. If MongoDB errors: Start MongoDB service"
echo ""
echo "Next Steps:"
echo "- Open browser console (F12) to see frontend errors"
echo "- Check backend terminal for server errors"
echo "- Try registering a new account"
echo "- Test creating a post after login"


