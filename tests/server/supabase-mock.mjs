// A stand-in for the Supabase library inside the reminders function, for tests/qc-reminders.js: tables kept in memory, the calls the function makes.
export const createClient = () => globalThis.__ADMIN__;
