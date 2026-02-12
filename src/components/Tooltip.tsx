import { useEffect, useState, useRef } from 'react';

/**
 * Global tooltip component that intercepts title attributes on any element.
 * Shows custom styled tooltips with 250ms delay instead of browser default (~1s).
 * Place once at app root level.
 */
const GlobalTooltip: React.FC = () => {
    const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const savedTitleRef = useRef<{ el: HTMLElement; title: string } | null>(null);

    useEffect(() => {
        const handleMouseEnter = (e: MouseEvent) => {
            const el = (e.target as HTMLElement).closest('[title]') as HTMLElement | null;
            if (!el || !el.title) return;

            // Save and remove native title to prevent browser tooltip
            const title = el.title;
            savedTitleRef.current = { el, title };
            el.title = '';

            timerRef.current = setTimeout(() => {
                const rect = el.getBoundingClientRect();
                setTooltip({
                    text: title,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                });
            }, 250);
        };

        const handleMouseLeave = (_e: MouseEvent) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            setTooltip(null);

            // Restore native title
            if (savedTitleRef.current) {
                savedTitleRef.current.el.title = savedTitleRef.current.title;
                savedTitleRef.current = null;
            }
        };

        document.addEventListener('mouseover', handleMouseEnter, true);
        document.addEventListener('mouseout', handleMouseLeave, true);

        return () => {
            document.removeEventListener('mouseover', handleMouseEnter, true);
            document.removeEventListener('mouseout', handleMouseLeave, true);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    if (!tooltip) return null;

    const above = tooltip.y > 50;

    return (
        <div
            className="fixed z-[9999] pointer-events-none"
            style={{
                left: tooltip.x,
                top: above ? tooltip.y - 4 : tooltip.y + 36,
                transform: above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            }}
        >
            <div className="bg-gray-800 text-white text-[11px] px-2 py-1 rounded shadow-lg whitespace-nowrap max-w-xs">
                {tooltip.text}
            </div>
        </div>
    );
};

export default GlobalTooltip;
