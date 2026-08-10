import { AI_SERVER_URL } from './ai-service';

export type MatchV2CaptureStartInput = {
  matchId: string;
  home?: string;
  away?: string;
  league?: string;
  b365Token?: string;
};

export type MatchV2CaptureResult =
  | { ok: true; status?: unknown }
  | { ok: false; error: string };

/** Bắt đầu thu trận v2 trên server (poll 60s → data/v2/...). */
export async function startMatchV2Capture(
  input: MatchV2CaptureStartInput,
): Promise<MatchV2CaptureResult> {
  const matchId = String(input.matchId || '').trim();
  if (!matchId) return { ok: false, error: 'Thiếu matchId' };

  try {
    const res = await fetch(`${AI_SERVER_URL}/api/match-v2/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId,
        home: input.home || undefined,
        away: input.away || undefined,
        league: input.league || undefined,
        b365Token: input.b365Token || undefined,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const error = text || `HTTP ${res.status}`;
      console.warn(`[match-v2] start failed match=${matchId}:`, error);
      return { ok: false, error };
    }
    const data = (await res.json().catch(() => ({}))) as { status?: unknown };
    return { ok: true, status: data.status };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.warn(
      `[match-v2] start network error — kiểm tra server AI (${AI_SERVER_URL}):`,
      error,
    );
    return { ok: false, error };
  }
}

/** Dừng thu trận v2. */
export async function stopMatchV2Capture(matchId: string): Promise<MatchV2CaptureResult> {
  const id = String(matchId || '').trim();
  if (!id) return { ok: false, error: 'Thiếu matchId' };

  try {
    const res = await fetch(`${AI_SERVER_URL}/api/match-v2/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: id }),
    });
    if (!res.ok && res.status !== 404) {
      const text = await res.text().catch(() => '');
      const error = text || `HTTP ${res.status}`;
      console.warn(`[match-v2] stop failed match=${id}:`, error);
      return { ok: false, error };
    }
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.warn(`[match-v2] stop network error:`, error);
    return { ok: false, error };
  }
}
