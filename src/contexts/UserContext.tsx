import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSettings } from './SettingsContext';

interface UserData {
  id: string;
  name: string;
  type: 'Owner' | 'Secondary';
}

interface UserContextType {
  selectedUser: UserData | null;
  setSelectedUser: (user: UserData | null) => void;
  availableUsers: UserData[];
  setAvailableUsers: (users: UserData[]) => void;
  isLoadingUsers: boolean;
  setIsLoadingUsers: (loading: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { settings, updateSettings } = useSettings();
  const [selectedUser, setSelectedUserState] = useState<UserData | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Load selected user from settings on mount
  useEffect(() => {
    if (settings.selectedTestUser && availableUsers.length > 0) {
      const user = availableUsers.find(u => u.id === settings.selectedTestUser);
      if (user) {
        setSelectedUserState(user);
      }
    }
  }, [settings.selectedTestUser, availableUsers]);

  const setSelectedUser = (user: UserData | null) => {
    setSelectedUserState(user);
    updateSettings({ selectedTestUser: user?.id || null });
  };

  return (
    <UserContext.Provider value={{
      selectedUser,
      setSelectedUser,
      availableUsers,
      setAvailableUsers,
      isLoadingUsers,
      setIsLoadingUsers,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 