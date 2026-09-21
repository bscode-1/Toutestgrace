git add .
git commit -m "wip: permissions module client-bundle fix"
git push origin main


RESET ALL DATA FROM NEON 
OPTION 1:
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- 1. Disable triggers to ignore foreign key constraints during execution
    EXECUTE 'SET session_replication_role = ''replica'';';

    -- 2. Loop through all user tables in the public schema and truncate them
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename != '_prisma_migrations'
    ) LOOP
        EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" RESTART IDENTITY CASCADE;';
    END LOOP;

    -- 3. Re-enable triggers
    EXECUTE 'SET session_replication_role = ''origin'';';
END $$;

OPTION 2:
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- Loop through all user tables in the public schema and truncate them
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename != '_prisma_migrations'
    ) LOOP
        EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" RESTART IDENTITY CASCADE;';
    END LOOP;
END $$;