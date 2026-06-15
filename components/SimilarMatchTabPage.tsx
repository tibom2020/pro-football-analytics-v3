import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchMatchDetail, type OpeningLinesRef, type SimilarMatchDetail } from '../services/goal-prediction';
import { Ou13ChartContent } from './Ou13ChartModal';

/** Format số dùng chung cho bảng so sánh tình huống tương tự. */
export const INT = (v: number) => String(Math.round(v));
export const ODDS = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '—');
export const HCAP = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '—');
export const SIGNED = (v: number) => (v > 0 ? `+${Math.round(v)}` : String(Math.round(v)));

/** Hàng số liệu hiển thị trong popup/trang so sánh (nhãn tiếng Việt + cách format). */
export const SNAPSHOT_ROWS: Array<{ key: string; label: string; fmt: (v: number) => string }> = [
  { key: 'total_goals_so_far', label: 'Tổng bàn đã ghi', fmt: INT },
  { key: 'da_total_3m', label: "Bóng nguy hiểm 3' (tổng)", fmt: INT },
  { key: 'da_h_delta_3m', label: "• chủ nhà 3'", fmt: INT },
  { key: 'da_a_delta_3m', label: "• khách 3'", fmt: INT },
  { key: 'shots_total_delta_3m', label: "Dứt điểm 3'", fmt: INT },
  { key: 'on_target_delta_3m', label: "Trúng đích 3'", fmt: INT },
  { key: 'corners_delta_3m', label: "Phạt góc 3'", fmt: INT },
  { key: 'ou13_handicap', label: 'Vạch Tài/Xỉu', fmt: HCAP },
  { key: 'ou13_over_odds', label: 'Odds Tài', fmt: ODDS },
  { key: 'ou13_under_odds', label: 'Odds Xỉu', fmt: ODDS },
  { key: 'ou13_over_drops_5m_count', label: "Số lần kéo Tài 5'", fmt: INT },
  { key: 'ou13_under_rises_5m_count', label: "Số lần đẩy Xỉu 5'", fmt: INT },
  { key: 'ah12_handicap', label: 'Vạch chấp', fmt: HCAP },
  { key: 'ah12_home_odds', label: 'Odds chủ', fmt: ODDS },
  { key: 'ah12_away_odds', label: 'Odds khách', fmt: ODDS },
  { key: 'ah12_home_drops_5m_count', label: "Số lần kéo chấp chủ 5'", fmt: INT },
  { key: 'pressure_alert_count_3m', label: "Cảnh báo sức ép 3'", fmt: INT },
  { key: 'man_advantage', label: 'Hơn người (chủ +)', fmt: SIGNED },
];

/** Tham số mở trang chi tiết trận tương tự ở tab mới (truyền qua query string). */
export interface SimilarMatchTabParams {
  matchId: string;
  half?: 1 | 2;
  minute?: number;
  /** "Home vs Away" — fallback hiển thị khi chưa fetch được match detail. */
  team?: string;
  /** Tỷ số chung cuộc — fallback hiển thị. */
  ft?: string;
  /** Kết cục 15' sau tình huống: 1 = có bàn, 0 = không. */
  label?: 0 | 1;
  /** Kết cục 30' sau tình huống. */
  label30?: 0 | 1;
  similarity?: number;
  /** Snapshot features của tình huống tương tự tại phút đó — vẽ bảng so sánh. */
  feats?: Record<string, number>;
  /** Features trận đang xem ĐÓNG BĂNG tại thời điểm mở tab — cột so sánh. */
  queryFeats?: Record<string, number>;
  /** Vạch mở hiệp 1_3 H1/H2 của trận đang xem (để hiển thị ngữ cảnh so khớp). */
  openingLines?: OpeningLinesRef;
}

/** Dựng URL mở trang chi tiết trận tương tự ở tab mới (cùng origin, SPA tự nhận diện qua ?simMatch=). */
export function buildSimilarMatchTabUrl(p: SimilarMatchTabParams): string {
  const q = new URLSearchParams({ simMatch: p.matchId });
  if (p.half != null) q.set('half', String(p.half));
  if (p.minute != null) q.set('minute', String(p.minute));
  if (p.team) q.set('team', p.team);
  if (p.ft) q.set('ft', p.ft);
  if (p.label != null) q.set('label', String(p.label));
  if (p.label30 != null) q.set('label30', String(p.label30));
  if (p.similarity != null) q.set('sim', p.similarity.toFixed(3));
  if (p.feats) q.set('feats', JSON.stringify(p.feats));
  if (p.queryFeats) q.set('qfeats', JSON.stringify(p.queryFeats));
  if (p.openingLines) q.set('openlines', JSON.stringify(p.openingLines));
  return `${window.location.origin}${window.location.pathname}?${q.toString()}`;
}

/** Đọc params từ URL hiện tại — null nếu không phải trang chi tiết trận tương tự. */
export function parseSimilarMatchTabParams(): SimilarMatchTabParams | null {
  const q = new URLSearchParams(window.location.search);
  const matchId = q.get('simMatch');
  if (!matchId) return null;
  const num = (k: string): number | undefined => {
    const v = q.get(k);
    if (v == null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const bin = (k: string): 0 | 1 | undefined => {
    const v = q.get(k);
    return v === '1' ? 1 : v === '0' ? 0 : undefined;
  };
  const json = (k: string): Record<string, number> | undefined => {
    const v = q.get(k);
    if (!v) return undefined;
    try {
      const o = JSON.parse(v) as unknown;
      return o && typeof o === 'object' ? (o as Record<string, number>) : undefined;
    } catch {
      return undefined;
    }
  };
  const openRaw = q.get('openlines');
  let openingLines: OpeningLinesRef | undefined;
  if (openRaw) {
    try {
      openingLines = JSON.parse(openRaw) as OpeningLinesRef;
    } catch {
      openingLines = undefined;
    }
  }
  const h = num('half');
  return {
    matchId,
    half: h === 2 ? 2 : h === 1 ? 1 : undefined,
    minute: num('minute'),
    team: q.get('team') ?? undefined,
    ft: q.get('ft') ?? undefined,
    label: bin('label'),
    label30: bin('label30'),
    similarity: num('sim'),
    feats: json('feats'),
    queryFeats: json('qfeats'),
    openingLines,
  };
}

/**
 * Trang toàn màn hình (mở ở tab riêng) hiển thị TOÀN BỘ thông tin 1 trận tương tự:
 * header trận (đội, giải, tỷ số CK), kết cục 15'/30' + độ giống, bảng so sánh số liệu
 * với trận đang xem (đóng băng lúc mở tab) và biểu đồ kèo H1/H2 full-width.
 * Được render thay cho App khi URL có ?simMatch= (xem index.tsx).
 */
export const SimilarMatchTabPage: React.FC<{ params: SimilarMatchTabParams }> = ({ params }) => {
  const [detail, setDetail] = useState<SimilarMatchDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  // Áp theme giống tab chính — App lưu lựa chọn trong localStorage('theme').
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const dark = saved ? saved === 'dark' : !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoadingDetail(true);
    void fetchMatchDetail(params.matchId).then((d) => {
      if (!alive) return;
      setDetail(d);
      setLoadingDetail(false);
    });
    return () => {
      alive = false;
    };
  }, [params.matchId]);

  const teamLine = detail?.homeName && detail?.awayName
    ? `${detail.homeName} vs ${detail.awayName}`
    : params.team || `Match ${params.matchId}`;
  const ftScore = detail?.finalScore || params.ft || '';

  useEffect(() => {
    document.title = `${teamLine} — trận tương tự`;
  }, [teamLine]);

  const past = params.feats;
  const query = params.queryFeats;
  const marker =
    params.half != null && params.minute != null
      ? { half: params.half, minute: params.minute }
      : undefined;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 text-gray-900 dark:text-gray-100">
      <div className="max-w-6xl mx-auto p-3 sm:p-4 space-y-3">
        {/* Header thông tin trận */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow px-4 py-3">
          <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{teamLine}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {loadingDetail ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> đang tải thông tin trận…
              </span>
            ) : (
              <>
                {detail?.league && <span>{detail.league}</span>}
                {ftScore && <span> · CK {ftScore}</span>}
                {detail?.ftStatus && <span> · {detail.ftStatus}</span>}
                <span> · Match {params.matchId}</span>
              </>
            )}
          </div>
          <div className="flex items-center flex-wrap gap-2 mt-2">
            {marker && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                Tình huống H{marker.half} · phút {marker.minute}
              </span>
            )}
            {params.label != null && (
              <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${params.label === 1 ? 'bg-red-500 text-white' : 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-100'}`}>
                {params.label === 1 ? "15p sau: CÓ BÀN" : '15p sau: không có bàn'}
              </span>
            )}
            <span
              className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                params.label30 == null
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  : params.label30 === 1
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-100'
              }`}
            >
              {params.label30 == null ? '30p sau: chưa rõ' : params.label30 === 1 ? '30p sau: CÓ BÀN' : '30p sau: không có bàn'}
            </span>
            {params.similarity != null && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400">độ giống {params.similarity.toFixed(2)}</span>
            )}
            {params.openingLines && (params.openingLines.h1OpenOu13 != null || params.openingLines.h2OpenOu13 != null) && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                Trận đang xem · H1 mở {params.openingLines.h1OpenOu13 != null ? HCAP(params.openingLines.h1OpenOu13) : '—'}
                {' · H2 mở '}
                {params.openingLines.h2OpenOu13 != null ? HCAP(params.openingLines.h2OpenOu13) : '—'}
              </span>
            )}
          </div>
        </div>

        {/* Bảng so sánh số liệu tại phút tình huống */}
        {past && (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-4">
            <div className="text-sm font-bold text-gray-900 dark:text-white mb-2">
              So sánh số liệu tại phút {params.minute ?? '—'}
            </div>
            <div className="grid grid-cols-[1fr_auto_auto] sm:max-w-md gap-x-4 gap-y-1 text-xs">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Chỉ số</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 text-right">Tình huống QK</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-orange-500 text-right">Trận đang xem</div>
              {SNAPSHOT_ROWS.map((row) => {
                const pv = past[row.key];
                const qv = query?.[row.key];
                if (pv == null && qv == null) return null;
                const diff = typeof pv === 'number' && typeof qv === 'number' ? qv - pv : null;
                return (
                  <React.Fragment key={row.key}>
                    <div className="text-gray-600 dark:text-gray-300 py-0.5">{row.label}</div>
                    <div className="text-right font-mono text-gray-800 dark:text-gray-200 py-0.5">
                      {typeof pv === 'number' ? row.fmt(pv) : '—'}
                    </div>
                    <div className="text-right font-mono py-0.5 text-gray-900 dark:text-gray-100">
                      {typeof qv === 'number' ? row.fmt(qv) : '—'}
                      {diff != null && Math.abs(diff) >= 0.005 && (
                        <span className={`ml-1 text-[10px] ${diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                          ({diff > 0 ? '+' : ''}{row.fmt(diff)})
                        </span>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3 leading-snug">
              Cột "Trận đang xem" là số liệu được đóng băng tại thời điểm bạn mở tab này — quay lại tab chính để xem số liệu live mới nhất.
            </p>
          </div>
        )}

        {/* Biểu đồ kèo cả trận H1 / H2 */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-3 space-y-3">
          <div className="text-sm font-bold text-gray-900 dark:text-white px-1">
            Kèo Tài/Xỉu (1_3) + Đội nhà (1_2) &amp; Dòng thời gian API
          </div>
          <Ou13ChartContent matchId={params.matchId} marker={marker} />
        </div>
      </div>
    </div>
  );
};
