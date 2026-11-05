import { createClient } from "@supabase/supabase-js";

// A URL e a chave anônima vêm das variáveis do Lovable (projeto Supabase
// "Vida Sistêmica" conectado nas configurações do projeto). Nenhuma chave
// fica escrita no código. Sem elas, o app funciona só com o armazenamento
// local — nada quebra, só não sincroniza.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// O Lovable atual injeta a chave como VITE_SUPABASE_PUBLISHABLE_KEY; projetos
// mais antigos usavam VITE_SUPABASE_ANON_KEY. Aceita os dois nomes — sem a
// chave certa o cliente fica nulo e o app cai para "Só neste navegador".
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
export const isSupabaseConfigured = supabase !== null;
