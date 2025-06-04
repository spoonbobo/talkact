import { useState, useCallback } from 'react';

type UIProvider = 'chakra' | 'mui' | 'hybrid';

export const useUIProvider = () => {
    const [provider, setProvider] = useState<UIProvider>('hybrid');

    const switchToMUI = useCallback(() => {
        setProvider('mui');
    }, []);

    const switchToChakra = useCallback(() => {
        setProvider('chakra');
    }, []);

    const enableHybrid = useCallback(() => {
        setProvider('hybrid');
    }, []);

    return {
        provider,
        switchToMUI,
        switchToChakra,
        enableHybrid,
        isMUI: provider === 'mui',
        isChakra: provider === 'chakra',
        isHybrid: provider === 'hybrid',
    };
}; 