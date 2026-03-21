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
export function createClerkSupabaseClient(clerkToken?: string | null) {
  // Se non viene passato un token Clerk custom, viene inizializzato il client in modalità anonima/pubblica.
  if (!clerkToken) {
    return createClient(supabaseUrl, supabaseAnonKey);
  }

  // Se viene fornito un token Clerk, viene passato come Intestazione "Authorization: Bearer <TOKEN>".
  // Le policy Supabase che sfruttano `auth.jwt() ->> 'sub'` leggeranno correttamente l'identità dell'utente Clerk.
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    },
  });
}
