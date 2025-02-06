import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
  "https://itwrjvxitphanlnorbji.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0d3JqdnhpdHBoYW5sbm9yYmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4MTA1NjgsImV4cCI6MjA1MzM4NjU2OH0.Q0JlWDgH9AHCqteCRv8rFt5GPaafX48MQD4fe0RM4v4"
);