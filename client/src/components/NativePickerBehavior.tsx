import { useEffect } from 'react';

const isManagedNativePickerInput = (element: EventTarget | null): element is HTMLInputElement => {
    if (!(element instanceof HTMLInputElement)) {
        return false;
    }

    return element.type === 'date' || element.type === 'month' || Boolean(element.dataset.nativePickerType);
};

const getNativePickerType = (input: HTMLInputElement): 'date' | 'month' | null => {
    if (input.type === 'date' || input.type === 'month') {
        return input.type;
    }

    if (input.dataset.nativePickerType === 'date' || input.dataset.nativePickerType === 'month') {
        return input.dataset.nativePickerType;
    }

    return null;
};

const getNativePickerPlaceholder = (type: 'date' | 'month') =>
    type === 'date' ? 'mm/dd/yyyy' : 'mm/yyyy';

const setProxyTextState = (input: HTMLInputElement, type: 'date' | 'month') => {
    input.dataset.nativePickerType = type;
    input.type = 'text';
    input.readOnly = true;
    input.placeholder = getNativePickerPlaceholder(type);
    input.classList.add('native-picker-proxy');
};

const restoreNativePickerState = (input: HTMLInputElement, type: 'date' | 'month') => {
    input.type = type;
    input.readOnly = false;
    input.lang = 'en-US';
    input.placeholder = getNativePickerPlaceholder(type);
    input.classList.remove('native-picker-proxy');
};

const syncNativePickerState = (input: HTMLInputElement) => {
    const type = getNativePickerType(input);

    if (!type || input.disabled) {
        return;
    }

    if (input.value) {
        restoreNativePickerState(input, type);
        return;
    }

    setProxyTextState(input, type);
};

const openNativePicker = (input: HTMLInputElement) => {
    const type = getNativePickerType(input);

    if (!type || input.disabled) {
        return;
    }

    restoreNativePickerState(input, type);

    if (input.disabled || input.readOnly || typeof input.showPicker !== 'function') {
        return;
    }

    try {
        input.showPicker();
    } catch {
        // Some browsers restrict programmatic picker opening in specific cases.
    }
};

const NativePickerBehavior: React.FC = () => {
    useEffect(() => {
        const syncInputs = (root: ParentNode = document) => {
            root.querySelectorAll('input[type="date"], input[type="month"]').forEach((element) => {
                if (element instanceof HTMLInputElement) {
                    syncNativePickerState(element);
                }
            });
        };

        const handlePointerDown = (event: PointerEvent) => {
            if (!isManagedNativePickerInput(event.target)) {
                return;
            }

            openNativePicker(event.target);
        };

        const handleFocusIn = (event: FocusEvent) => {
            if (!isManagedNativePickerInput(event.target)) {
                return;
            }

            openNativePicker(event.target);
        };

        const handleInputChange = (event: Event) => {
            if (!isManagedNativePickerInput(event.target)) {
                return;
            }

            syncNativePickerState(event.target);
        };

        const handleBlur = (event: FocusEvent) => {
            if (!isManagedNativePickerInput(event.target)) {
                return;
            }

            syncNativePickerState(event.target);
        };

        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (!(node instanceof HTMLElement)) {
                        return;
                    }

                    if (node instanceof HTMLInputElement && (node.type === 'date' || node.type === 'month')) {
                        syncNativePickerState(node);
                    }

                    syncInputs(node);
                });
            });
        });

        syncInputs();
        document.addEventListener('pointerdown', handlePointerDown, true);
        document.addEventListener('focusin', handleFocusIn, true);
        document.addEventListener('input', handleInputChange, true);
        document.addEventListener('change', handleInputChange, true);
        document.addEventListener('focusout', handleBlur, true);
        mutationObserver.observe(document.body, { childList: true, subtree: true });

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, true);
            document.removeEventListener('focusin', handleFocusIn, true);
            document.removeEventListener('input', handleInputChange, true);
            document.removeEventListener('change', handleInputChange, true);
            document.removeEventListener('focusout', handleBlur, true);
            mutationObserver.disconnect();
        };
    }, []);

    return null;
};

export default NativePickerBehavior;
