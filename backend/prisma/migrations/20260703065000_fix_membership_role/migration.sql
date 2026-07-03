-- Fix MembershipRole enum: rename 'MEMBER' to 'DEVELOPER' to match schema.prisma
-- This migration handles the enum change safely.

-- First, mark as resolved the previous failed attempt
-- (Prisma tracks migration state in _prisma_migrations table)

-- 1. Create a new enum type with the correct values
CREATE TYPE "MembershipRole_new" AS ENUM ('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER');

-- 2. Drop the default value so we can change the column type
ALTER TABLE "memberships" ALTER COLUMN "role" DROP DEFAULT;

-- 3. Cast existing values from old enum to text, then to new enum
-- 'OWNER', 'ADMIN', 'VIEWER' map directly
-- 'MEMBER' maps to 'DEVELOPER'
ALTER TABLE "memberships" ALTER COLUMN "role" TYPE "MembershipRole_new" USING (
  CASE WHEN "role"::text = 'MEMBER' THEN 'DEVELOPER'::"MembershipRole_new"
       ELSE ("role"::text)::"MembershipRole_new"
  END
);

-- 4. Set the new default
ALTER TABLE "memberships" ALTER COLUMN "role" SET DEFAULT 'DEVELOPER'::"MembershipRole_new";

-- 5. Drop the old enum type
DROP TYPE "MembershipRole";

-- 6. Rename the new type to the original name
ALTER TYPE "MembershipRole_new" RENAME TO "MembershipRole";
