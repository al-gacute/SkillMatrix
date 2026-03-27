import { useEffect, useState } from 'react';

const GLOBAL_MODAL_STATE_EVENT = 'global-modal-state-change';
const GLOBAL_MODAL_OPEN_ATTR = 'data-global-modal-open';
const GLOBAL_MODAL_COUNT_ATTR = 'data-global-modal-count';

const getModalCount = (): number => {
    if (typeof document === 'undefined') {
        return 0;
    }

    const value = Number(document.body.getAttribute(GLOBAL_MODAL_COUNT_ATTR) || '0');
    return Number.isFinite(value) ? value : 0;
};

const hasOpenModal = (): boolean => {
    if (typeof document === 'undefined') {
        return false;
    }

    return document.body.getAttribute(GLOBAL_MODAL_OPEN_ATTR) === 'true';
};

const emitModalState = (count: number) => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
        return;
    }

    document.body.setAttribute(GLOBAL_MODAL_COUNT_ATTR, String(count));
    document.body.setAttribute(GLOBAL_MODAL_OPEN_ATTR, count > 0 ? 'true' : 'false');
    window.dispatchEvent(
        new CustomEvent(GLOBAL_MODAL_STATE_EVENT, {
            detail: {
                count,
                hasOpenModal: count > 0,
            },
        })
    );
};

export const useGlobalModalPresence = (isOpen: boolean) => {
    useEffect(() => {
        if (!isOpen || typeof document === 'undefined' || typeof window === 'undefined') {
            return;
        }

        emitModalState(getModalCount() + 1);

        return () => {
            emitModalState(Math.max(0, getModalCount() - 1));
        };
    }, [isOpen]);
};

export const useHasGlobalModalOpen = () => {
    const [isModalOpen, setIsModalOpen] = useState(hasOpenModal);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const syncState = (event?: Event) => {
            const detail = event instanceof CustomEvent ? event.detail : undefined;
            setIsModalOpen(Boolean(detail?.hasOpenModal ?? hasOpenModal()));
        };

        syncState();
        window.addEventListener(GLOBAL_MODAL_STATE_EVENT, syncState);

        return () => {
            window.removeEventListener(GLOBAL_MODAL_STATE_EVENT, syncState);
        };
    }, []);

    return isModalOpen;
};
