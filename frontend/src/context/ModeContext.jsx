import React, { createContext, useContext, useState, useEffect } from 'react';

const ModeContext = createContext();

export const ModeProvider = ({ children }) => {
    // Al iniciar, preferimos modo offline sin servidor si no hay preferencia guardada.
    const [isOffline, setIsOffline] = useState(() => {
        const saved = localStorage.getItem('preferred_mode');
        if (saved !== null) return saved === 'offline';
        return true;
    });

    const toggleMode = (manual = null) => {
        const newValue = manual !== null ? manual : !isOffline;
        setIsOffline(newValue);
        localStorage.setItem('preferred_mode', newValue ? 'offline' : 'online');
    };

    return (
        <ModeContext.Provider value={{ isOffline, toggleMode }}>
            {children}
        </ModeContext.Provider>
    );
};

export const useMode = () => useContext(ModeContext);
