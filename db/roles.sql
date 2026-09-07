-- DegreeComplete.in — database roles and grants
-- Run once as a superuser AFTER `prisma db push` / `prisma migrate deploy` has created the tables.
--
--   dc_admin   : owns both schemas. Used by admin pages, finance, seed and migrations. (DATABASE_URL)
--   dc_public  : used by every student-facing page and public API. (DATABASE_URL_PUBLIC)
--                Has SELECT on catalogue tables and INSERT on leads/applications, and
--                NO privileges whatsoever on schema `internal`.
--
-- This is the second line of defence behind the application-level allow-list serializers:
-- even a bug in a public route cannot read payout data, because the connection cannot.

CREATE ROLE dc_public LOGIN PASSWORD 'change-me';

GRANT CONNECT ON DATABASE degreecomplete TO dc_public;
GRANT USAGE ON SCHEMA public TO dc_public;
REVOKE ALL ON SCHEMA internal FROM dc_public;
REVOKE ALL ON ALL TABLES IN SCHEMA internal FROM dc_public;
ALTER DEFAULT PRIVILEGES IN SCHEMA internal REVOKE ALL ON TABLES FROM dc_public;

-- Read the catalogue
GRANT SELECT ON TABLE
  public."University", public."Program", public."Specialization", public."FeeRecord",
  public."Financing", public."ContentPage", public."FaqItem", public."EligibilityRule", public."DocumentRequirement", public."AdmissionStep", public."SiteNote"
TO dc_public;

-- Student self-service (row ownership is enforced in the application layer)
GRANT SELECT, INSERT, UPDATE ON TABLE public."Lead", public."StudentUser", public."Application",
  public."Document", public."ApplicationEvent", public."Message", public."Counter" TO dc_public;

-- Staff-only tables
REVOKE ALL ON TABLE public."StaffUser", public."AuditLog", public."DataFinding" FROM dc_public;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dc_public;
