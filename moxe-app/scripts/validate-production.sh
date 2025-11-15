#!/bin/bash

# MOXE Production Validation Script
# This script validates that the application is production-ready

set -e

echo "🚀 MOXE Production Validation Starting..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation results
PASSED=0
FAILED=0

# Function to check if command exists
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $1 is not installed"
        ((FAILED++))
        return 1
    fi
}

# Function to validate file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $1 is missing"
        ((FAILED++))
        return 1
    fi
}

# Function to validate environment variable
check_env() {
    if [ -n "${!1}" ]; then
        echo -e "${GREEN}✓${NC} $1 is set"
        ((PASSED++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $1 is not set (may be optional)"
        return 1
    fi
}

echo ""
echo "📦 Checking Dependencies..."
echo "---------------------------"
check_command node
check_command npm
check_command docker
check_command docker-compose
check_command mongosh

echo ""
echo "📁 Checking Required Files..."
echo "------------------------------"
check_file "backend/package.json"
check_file "frontend/package.json"
check_file "backend/tsconfig.json"
check_file "frontend/vite.config.ts"
check_file "docker-compose.prod.yml"
check_file ".env.production"

echo ""
echo "🔧 Checking Backend..."
echo "----------------------"
cd backend
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend builds successfully"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Backend build failed"
    ((FAILED++))
fi
cd ..

echo ""
echo "🎨 Checking Frontend..."
echo "-----------------------"
cd frontend
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Frontend builds successfully"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Frontend build failed"
    ((FAILED++))
fi
cd ..

echo ""
echo "🔒 Checking Security..."
echo "-----------------------"
if grep -q "CHANGE_THIS" .env.production 2>/dev/null; then
    echo -e "${YELLOW}⚠${NC} Default secrets detected - update .env.production"
    ((FAILED++))
else
    echo -e "${GREEN}✓${NC} No default secrets found"
    ((PASSED++))
fi

echo ""
echo "📊 Validation Summary"
echo "======================"
echo -e "Passed: ${GREEN}${PASSED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All validations passed! Application is production-ready.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some validations failed. Please fix the issues above.${NC}"
    exit 1
fi


