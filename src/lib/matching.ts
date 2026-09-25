import { isMatchMood, type MatchMood } from '@/lib/matchMoods';
import { getSupabase } from '@/lib/supabaseClient';

export type MatchListen = {
  matchStatus: 'idle' | 'waiting' | 'matched';
  mood: MatchMood | null;
  matchId: string | null;
  matchedWith: string | null;
};

function emptyListen(): MatchListen {
  return { matchStatus: 'idle', mood: null, matchId: null, matchedWith: null };
}

function readRow(row: Record<string, unknown> | null): MatchListen {
  if (!row) return emptyListen();
  const status = row.match_status === 'waiting' || row.match_status === 'matched' ? row.match_status : 'idle';
  return {
    matchStatus: status,
    mood: typeof row.mood === 'string' && isMatchMood(row.mood) ? row.mood : null,
    matchId: typeof row.match_id === 'string' ? row.match_id : null,
    matchedWith: typeof row.matched_with === 'string' ? row.matched_with : null,
  };
}

export function listenMatch(uid: string, onChange: (state: MatchListen) => void): () => void {
  const supabase = getSupabase();
  if (!supabase || !uid) {
    onChange(emptyListen());
    return () => undefined;
  }
  let closed = false;
  const pull = () => {
    void (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('mood, match_status, match_id, matched_with')
          .eq('id', uid)
          .maybeSingle();
        if (!closed) onChange(readRow((data as Record<string, unknown> | null) ?? null));
      } catch {
        if (!closed) onChange(emptyListen());
      }
    })();
  };
  pull();
  const channel = supabase
    .channel(`profile-${uid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` }, pull)
    .subscribe();
  return () => {
    closed = true;
    void supabase.removeChannel(channel);
  };
}

/** The database function pairs two waiting people. The client does not pick a partner. */
export async function joinMatchQueue(uid: string, mood: MatchMood): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabase();
  if (!supabase || !uid) return { ok: false, message: 'Eşleşme şu an başlamıyor.' };
  if (!isMatchMood(mood)) return { ok: false, message: 'Bir ruh hali seç.' };
  const { error } = await supabase.rpc('join_match', { p_mood: mood });
  if (!error) return { ok: true };
  if (error.message.includes('already-matched')) return { ok: false, message: 'Zaten bir eşleşmen var.' };
  return { ok: false, message: 'Havuza yazılamadı. Tekrar dene.' };
}

export async function leaveMatchQueue(uid: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !uid) return;
  await supabase.rpc('leave_match');
}

export async function saveMatchMood(uid: string, mood: MatchMood): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !uid || !isMatchMood(mood)) return;
  await leaveMatchQueue(uid);
  await supabase.from('profiles').update({ mood, mood_updated_at: new Date().toISOString() }).eq('id', uid);
}
