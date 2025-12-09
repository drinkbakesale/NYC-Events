#!/bin/bash

# Simple test script for NYC Events Finder Edge Functions
# Follow the prompts to test your functions

echo "🧪 NYC Events Finder - Function Testing"
echo "========================================"
echo ""

# Get anon key from user
echo "📋 Step 1: Get your Supabase anon key"
echo "Go to: https://supabase.com/dashboard"
echo "Click: Settings → API → Copy 'anon public' key"
echo ""
read -p "Paste your anon key here: " ANON_KEY
echo ""

# Set project URL
PROJECT_URL="https://initlnbtybyewyhjixkf.supabase.co"

# Test 1: like-event
echo "🧪 Test 1: Testing like-event function"
echo "--------------------------------------"
echo "Using event ID: eb4aa659-1f04-4611-a385-179a6e4cfd62"
echo ""

curl -X POST ${PROJECT_URL}/functions/v1/like-event \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "event_id": "eb4aa659-1f04-4611-a385-179a6e4cfd62"
  }'

echo ""
echo ""
echo "✅ Expected: Should see 'partial_success' or 'ok'"
echo "   (partial_success is normal before Make.com setup)"
echo ""
read -p "Press Enter to continue to next test..."
echo ""

# Test 2: ingest-email
echo "🧪 Test 2: Testing ingest-email function"
echo "--------------------------------------"
echo ""

curl -X POST ${PROJECT_URL}/functions/v1/ingest-email \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "raw_email_id": "test-email-12345",
    "from_address": "hello@brooklynbased.com",
    "subject": "This Week in Brooklyn Events",
    "received_at": "2025-01-15T12:00:00Z",
    "html_body": "<html><body>Test newsletter content</body></html>"
  }'

echo ""
echo ""
echo "✅ Expected: Should see 'status: ok'"
echo ""
read -p "Press Enter to continue to next test..."
echo ""

# Test 3: analyze-source
echo "🧪 Test 3: Testing analyze-source function"
echo "--------------------------------------"
echo ""
echo "First, we need to create a test source..."
echo "Go to Supabase → SQL Editor and run:"
echo ""
echo "INSERT INTO sources (domain, status)"
echo "VALUES ('brooklynbased.com', 'unseen')"
echo "RETURNING id;"
echo ""
read -p "Paste the source ID here: " SOURCE_ID
echo ""

curl -X POST ${PROJECT_URL}/functions/v1/analyze-source \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"source_id\": \"${SOURCE_ID}\",
    \"domain\": \"brooklynbased.com\",
    \"sample_url\": \"https://brooklynbased.com/events/\"
  }"

echo ""
echo ""
echo "✅ Expected: Should see analysis results"
echo ""
echo "========================================"
echo "🎉 All tests complete!"
echo ""
echo "Next steps:"
echo "1. Check Supabase Table Editor to verify data was saved"
echo "2. Continue to Make.com setup: docs/MAKE_SETUP_SIMPLE.md"
echo ""
