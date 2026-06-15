import React from 'react';

export const StatItem: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
    <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 last:border-b-0 py-1">
        <span className="text-gray-500 dark:text-gray-400 font-medium">{label}:</span>
        <span className={`font-bold ${color || 'text-gray-800 dark:text-gray-100'}`}>{value}</span>
    </div>
);

export const StatBox: React.FC<{
    label: string;
    home: number;
    away: number;
    highlight?: boolean;
    /** Không có mốc thống kê — hiển thị "—" */
    empty?: boolean;
}> = ({ label, home, away, highlight, empty }) => {
    const total = home + away;
    const homePct = total === 0 ? 50 : (home / total) * 100;

    return (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <div className="text-xs text-gray-400 dark:text-slate-500 text-center mb-2 uppercase font-semibold">{label}</div>
            <div className="flex justify-between items-end mb-1">
                <span className={`text-lg font-bold ${empty ? 'text-gray-400 dark:text-slate-600' : highlight && home > away ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-white'}`}>
                    {empty ? '—' : home}
                </span>
                <span className={`text-lg font-bold ${empty ? 'text-gray-400 dark:text-slate-600' : highlight && away > home ? 'text-orange-600 dark:text-orange-400' : 'text-gray-800 dark:text-white'}`}>
                    {empty ? '—' : away}
                </span>
            </div>
            <div className={`h-1.5 w-full rounded-full overflow-hidden flex ${empty ? 'bg-gray-100 dark:bg-slate-800 opacity-40' : 'bg-gray-100 dark:bg-slate-700'}`}>
                {!empty && (
                    <>
                        <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${homePct}%` }}></div>
                        <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${100 - homePct}%` }}></div>
                    </>
                )}
            </div>
        </div>
    );
};
