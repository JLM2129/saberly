import React, { createContext, useContext, useState, useEffect } from 'react';

const ModeContext = createContext();

export const ModeProvider = ({ children }) => {
    // Al iniciar, verificamos si hay internet o si el usuario prefirió offline
    const [isOffline, setIsOffline] = useState(localStorage.getItem('preferred_mode') === 'offline');

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
