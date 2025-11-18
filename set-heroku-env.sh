#!/bin/bash
# Heroku Environment Variables Setup Script (Bash)
# Usage: ./set-heroku-env.sh [app-name]

APP_NAME="${1:-}"

echo ""
echo "🚀 Setting Heroku Environment Variables"
echo "=========================================="
echo ""

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not found. Please install it first:"
    echo "   https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if logged in
if ! heroku auth:whoami &> /dev/null; then
    echo "❌ Not logged into Heroku. Please run: heroku login"
    exit 1
fi

echo "✓ Heroku CLI found and logged in"
echo ""

# Get app name if not provided
if [ -z "$APP_NAME" ]; then
    read -p "Enter your Heroku app name (or press Enter to skip): " APP_NAME
    if [ -z "$APP_NAME" ]; then
        echo "⚠️  No app name provided. Commands will be generic."
        APP_FLAG=""
    else
        APP_FLAG="-a $APP_NAME"
    fi
else
    APP_FLAG="-a $APP_NAME"
    echo "Using app: $APP_NAME"
    echo ""
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

echo "Reading variables from .env file..."
echo ""

# Read .env file and set variables
SUCCESS_COUNT=0
FAIL_COUNT=0

while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    
    # Remove any leading/trailing whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    
    # Skip PORT (Heroku sets this automatically)
    if [ "$key" = "PORT" ]; then
        echo "⚠️  Skipping PORT (Heroku sets this automatically)"
        continue
    fi
    
    # Set NODE_ENV to production for Heroku
    if [ "$key" = "NODE_ENV" ]; then
        value="production"
        echo "ℹ️  Setting NODE_ENV to 'production' (required for Heroku)"
    fi
    
    # Set the variable
    if [ -n "$key" ] && [ -n "$value" ]; then
        if [ -n "$APP_FLAG" ]; then
            if heroku config:set "${key}=${value}" $APP_FLAG &> /dev/null; then
                echo "✓ Set $key"
                ((SUCCESS_COUNT++))
            else
                echo "❌ Failed to set $key"
                ((FAIL_COUNT++))
            fi
        else
            if heroku config:set "${key}=${value}" &> /dev/null; then
                echo "✓ Set $key"
                ((SUCCESS_COUNT++))
            else
                echo "❌ Failed to set $key"
                ((FAIL_COUNT++))
            fi
        fi
    fi
done < <(grep -v '^#' .env | grep '=')

echo ""
echo "=========================================="
echo "✅ Complete!"
echo "   Successfully set: $SUCCESS_COUNT variables"
if [ $FAIL_COUNT -gt 0 ]; then
    echo "   Failed: $FAIL_COUNT variables"
fi

echo ""
echo "📋 Verify your config:"
if [ -n "$APP_FLAG" ]; then
    echo "   heroku config $APP_FLAG"
else
    echo "   heroku config"
fi
echo ""

