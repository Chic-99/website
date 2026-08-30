// Shared Supabase client, built from the anon key + URL in config.js.
// Uses the official supabase-js v2 ESM build from esm.sh so this project can
// run as a plain static site with no bundler.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const isPlaceholder =
  !SUPABASE_URL || SUPABASE_URL.includes('YOUR-PROJECT-REF') ||
  !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('YOUR-PUBLIC-ANON-KEY');

export const SUPABASE_NOT_CONFIGURED = isPlaceholder;

export const supabase = isPlaceholder
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });

/**
 * Small helper so every page can show one consistent message instead of
 * silently failing (or worse, pretending data loaded) when config.js still
 * has placeholder values.
 */
export function warnIfNotConfigured(containerEl){
  if(!isPlaceholder) return false;
  if(containerEl){
    containerEl.innerHTML = `<div class="state-msg error">
      This site isn't connected to Supabase yet. Copy <code>js/config.example.js</code>
      to <code>js/config.js</code> and fill in your project URL and anon key.
    </div>`;
  }
  console.warn('[CHIC Connect] Supabase is not configured — see js/config.example.js');
  return true;
}
