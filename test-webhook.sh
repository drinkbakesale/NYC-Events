#!/bin/bash

# Test webhook connection
# Usage: ./test-webhook.sh YOUR_ANON_KEY

if [ -z "$1" ]; then
  echo "Usage: ./test-webhook.sh YOUR_ANON_KEY"
  echo ""
  echo "Get your anon key from: Supabase → Settings → API → anon public"
  exit 1
fi

ANON_KEY=$1

echo "Testing like-event function..."
echo ""

curl -X POST https://initlnbtybyewyhjixkf.supabase.co/functions/v1/like-event \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "event_id": "eb4aa659-1f04-4611-a385-179a6e4cfd62"
  }'

echo ""
echo ""
echo "Check Make.com scenario for incoming data!"
