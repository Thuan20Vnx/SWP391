import React, { createContext, useContext } from 'react';

const ClubParticipateLayoutContext = createContext(false);

export const ClubParticipateLayoutProvider = ({ children }) => (
  <ClubParticipateLayoutContext.Provider value={true}>
    {children}
  </ClubParticipateLayoutContext.Provider>
);

export const useClubParticipateLayout = () => useContext(ClubParticipateLayoutContext);
