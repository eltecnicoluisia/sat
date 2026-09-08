#!/bin/sh

# If the database file does not exist in the volume, copy the default one
if [ ! -f /app/data/dev.db ]; then
  echo "Database not found in volume, copying default database..."
  cp /app/prisma/dev.db /app/data/dev.db
fi

# Run prisma db push to ensure schema is synced (optional, if you want automatic migrations)
npx prisma db push --skip-generate || npx prisma db push

# Start the application
exec "$@"
