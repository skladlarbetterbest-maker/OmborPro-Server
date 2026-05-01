$env:PGPASSWORD = '0'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U postgres -h localhost -c 'SELECT 1'