-- Check if the upsert_source function exists and view its definition
SELECT
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'upsert_source';

-- Also check the function directly
\df upsert_source

-- Try to manually test the function
SELECT * FROM upsert_source('test-domain.com', 'eb4aa659-1f04-4611-a385-179a6e4cfd62'::uuid);
