# Database

* Schema of record: `app/prisma/schema.prisma` (two PostgreSQL schemas: `public`, `internal`).
* `roles.sql` creates the restricted `dc_public` role. Apply it after the first migration and
  point `DATABASE_URL_PUBLIC` at it.

```
cd app
docker compose up -d db
cp .env.example .env            # fill secrets
npm install
npx prisma db push              # or: npx prisma migrate dev --name init
npm run db:seed                 # loads data/public + data/internal — nothing is published
psql "$DATABASE_URL" -f ../db/roles.sql
```

Fee versioning: editing a fee in admin creates a new `FeeRecord` with `supersedesId` pointing at the
previous version; the old row is set to `EXPIRED` with `effectiveTo`. History is never deleted.
