import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://etuayfsoldimixslaqxx.supabase.co";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0dWF5ZnNvbGRpbWl4c2xhcXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxODgzNTksImV4cCI6MjEwMzc2NDM1OX0.Fq2UxDG8pSdxvStSkEeokeXxwP57AbEKy17WFhvKHRw";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);