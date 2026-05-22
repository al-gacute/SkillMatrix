import React from 'react';
import { Link } from 'react-router-dom';

interface AppLogoProps {
    compact?: boolean;
    to?: string;
}

const cubeTiles = [
    { className: 'bg-red-500 scale-125 shadow-sm', label: '', labelClassName: '' },
    { className: 'bg-blue-500', label: '', labelClassName: '' },
    { className: 'bg-yellow-400', label: '', labelClassName: '' },
    { className: 'bg-green-500', label: '', labelClassName: '' },
    { className: 'bg-white border border-slate-300 scale-125 shadow-sm', label: '', labelClassName: '' },
    { className: 'bg-orange-500', label: '', labelClassName: '' },
    { className: 'bg-indigo-500', label: '', labelClassName: '' },
    { className: 'bg-emerald-400', label: '', labelClassName: '' },
    { className: 'bg-pink-500 scale-125 shadow-sm', label: '', labelClassName: '' },
];

const compactCubeTiles = cubeTiles.map((tile, index) => {
    if (index === 0) {
        return { ...tile, label: '', labelClassName: '' };
    }

    if (index === 3) {
        return { ...tile, className: 'bg-[#facc15] shadow-sm', label: '', labelClassName: '' };
    }

    if (index === 6) {
        return { ...tile, className: 'bg-green-500 shadow-sm', label: '', labelClassName: '' };
    }

    if (index === 5 || index === 8) {
        return { ...tile, label: '', labelClassName: '' };
    }

    return tile;
});

const AppLogoContent: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
    const tiles = compact ? compactCubeTiles : cubeTiles;

    if (compact) {
        const compactAccentTiles = [
            { tile: tiles[0], sizeClass: 'h-3 w-3' },
            { tile: tiles[3], sizeClass: 'h-3 w-3' },
            { tile: tiles[6], sizeClass: 'h-3 w-3' },
        ];

        return (
            <div className="flex items-center justify-center">
                <div className="flex -rotate-12 transform flex-col gap-0.5 rounded-lg bg-slate-900 p-1">
                    {compactAccentTiles.map(({ tile, sizeClass }, index) => {
                        const compactTileClassName = tile.className.replace('scale-125', '').trim();

                        return (
                            <span
                                key={`${tile.className}-${index}`}
                                className={`flex ${sizeClass} items-center justify-center rounded-[3px] ${compactTileClassName}`}
                            />
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
            <div className="flex min-w-0 flex-col justify-center text-left">
                <span className="block text-lg font-bold leading-5 text-primary-600">SkillMatrix</span>
                <div className="mt-0.5 flex items-baseline gap-2 whitespace-nowrap">
                    <span className="block text-[11px] font-semibold leading-3 text-black">Map Your Mastery</span>
                    <span className="text-[0.5rem] font-semibold leading-3 text-slate-700">by A.Gacute</span>
                </div>
            </div>
        </div>
    );
};

const AppLogo: React.FC<AppLogoProps> = ({ compact = false, to }) => {
    if (to) {
        const label = to === '/' ? 'Go to SkillMatrix landing page' : 'Go to SkillMatrix dashboard';

        return (
            <Link
                to={to}
                aria-label={label}
                className="inline-flex rounded-md transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
                <AppLogoContent compact={compact} />
            </Link>
        );
    }

    return <AppLogoContent compact={compact} />;
};

export default AppLogo;
