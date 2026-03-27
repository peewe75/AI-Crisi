import { createClient } from "@supabase/supabase-js";

// Carichiamo le variabili d'ambiente indispensabili dalla configurazione locale
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Crea e restituisce un'istanza del client Supabase JS.
 * 
 * Clerk v7 Integrazione RLS:
 * Poiché utilizziamo Clerk per l'autenticazione, Supabase deve sapere chi sta eseguendo le query
 * per azionare correttamente la RLS (Row Level Security). Per farlo, utilizziamo un "Clerk JWT template"
 * per formare un token apposito che viene trasmesso a questa funzione.
 * 
 * @param clerkToken - JWT Token generato runtime da Clerk (`await getToken({ template: 'supabase' })`)
 */
let cachedClient: any = null;
let cachedToken: string | null = null;

export function createClerkSupabaseClient(clerkToken?: string | null) {
  const token = clerkToken ?? null;

  if (cachedClient && cachedToken === token) {
    return cachedClient;
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });

  cachedClient = client;
  cachedToken = token;
  
  return client;
}
