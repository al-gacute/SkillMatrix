import React from 'react';
import { Link } from 'react-router-dom';

interface AppLogoProps {
    compact?: boolean;
    to?: string;
}

const cubeTiles = [
    { className: 'bg-red-500 scale-125 shadow-sm', label: '1', labelClassName: 'text-white text-[9px] font-black' },
    { className: 'bg-blue-500', label: '', labelClassName: '' },
    { className: 'bg-yellow-400', label: '', labelClassName: '' },
    { className: 'bg-green-500', label: '', labelClassName: '' },
    { className: 'bg-white border border-slate-300 scale-125 shadow-sm', label: '', labelClassName: '' },
    { className: 'bg-orange-500', label: '6', labelClassName: 'text-white text-[9px] font-black' },
    { className: 'bg-indigo-500', label: '', labelClassName: '' },
    { className: 'bg-emerald-400', label: '', labelClassName: '' },
    { className: 'bg-pink-500 scale-125 shadow-sm', label: '9', labelClassName: 'text-white text-[9px] font-black' },
];

const compactCubeTiles = cubeTiles.map((tile, index) => {
    if (index === 0) {
        return { ...tile, label: '1', labelClassName: 'text-white text-[9px] font-black' };
    }

    if (index === 3) {
        return { ...tile, className: 'bg-[#facc15] shadow-sm', label: '6', labelClassName: 'text-white text-[9px] font-black' };
    }

    if (index === 6) {
        return { ...tile, className: 'bg-green-500 shadow-sm', label: '9', labelClassName: 'text-white text-[9px] font-black' };
    }

    if (index === 5 || index === 8) {
        return { ...tile, label: '', labelClassName: '' };
    }

    return tile;
});

const AppLogoContent: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
    const tiles = compact ? compactCubeTiles : cubeTiles;

    if (compact) {
        const compactNumberTiles = tiles.filter((tile) => Boolean(tile.label));

        return (
            <div className="flex items-center justify-center">
                <div className="flex -rotate-12 transform flex-col gap-1 rounded-xl bg-slate-900 p-1.5">
                    {compactNumberTiles.map((tile, index) => {
                        const sizeClass = tile.label === '9'
                            ? 'h-4.5 w-4.5'
                            : tile.label === '6'
                                ? 'h-4 w-4'
                                : 'h-3.5 w-3.5';
                        const compactTileClassName = tile.className.replace('scale-125', '').trim();

                        return (
                            <span
                                key={`${tile.className}-${index}`}
                                className={`flex ${sizeClass} items-center justify-center rounded-[3px] ${compactTileClassName}`}
                            >
                                <span className={tile.labelClassName.replace('text-[9px]', 'text-[10px]')}>{tile.label}</span>
                            </span>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <div className="-rotate-12 transform rounded-xl bg-slate-900 p-1.5">
                <div className="grid grid-cols-3 gap-1">
                    {tiles.map((tile, index) => (
                        <span
                            key={`${tile.className}-${index}`}
                            className={`flex h-2.5 w-2.5 items-center justify-center rounded-[3px] ${tile.className}`}
                        >
                            {tile.label ? <span className={tile.labelClassName}>{tile.label}</span> : null}
                        </span>
                    ))}
                </div>
            </div>
            <div className="leading-tight">
                <span className="block text-lg font-bold text-primary-600">SkillMatrix</span>
                <div className="flex items-center justify-between gap-2">
                    <span className="block text-[11px] font-semibold text-black">Map Your Mastery</span>
                    <span className="whitespace-nowrap text-[0.5rem] font-semibold text-slate-700">by A.Gacute</span>
                </div>
            </div>
        </div>
    );
};

const AppLogo: React.FC<AppLogoProps> = ({ compact = false, to }) => {
    if (to) {
        return (
            <Link to={to} className="inline-flex">
                <AppLogoContent compact={compact} />
            </Link>
        );
    }

    return <AppLogoContent compact={compact} />;
};

export default AppLogo;
