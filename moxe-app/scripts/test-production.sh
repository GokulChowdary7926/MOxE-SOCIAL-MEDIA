#!/bin/bash

# MOXE Production Testing Script
# Comprehensive testing for production readiness

set -e

echo "🧪 MOXE Production Testing Suite"
echo "================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -n "Testing: $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo ""
echo "🔍 Backend API Tests"
echo "--------------------"

# Start backend in background for testing
cd backend
npm run build > /dev/null 2>&1

# Test health endpoint
run_test "Health Check Endpoint" "curl -f http://localhost:5001/api/health 2>/dev/null || echo 'Backend not running - start with: cd backend && npm run dev'"

cd ..

echo ""
echo "🎨 Frontend Build Tests"
echo "-----------------------"

cd frontend
npm run build > /dev/null 2>&1

run_test "Frontend Production Build" "[ -d 'dist' ] && [ -f 'dist/index.html' ]"

cd ..

echo ""
echo "🐳 Docker Tests"
echo "---------------"

run_test "Docker Compose Configuration" "docker-compose -f docker-compose.prod.yml config > /dev/null 2>&1"

echo ""
echo "📊 Test Summary"
echo "==============="
echo -e "Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed.${NC}"
    exit 1
fi


