import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Settings {
  visibleDealStages: string[];
  routingRadius: number;
  selectedTestUser?: string | null;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  getStageDisplayName: (stage: string) => string;
  getStageIcon: (stage: string) => { icon: string; color: string };
}

// All available deal stages from DealMarker component
const ALL_DEAL_STAGES = [
  // Early stage deals (Gold)
  'Initial Contact',
  'New Lead',
  'Qualification',
  'Lead',
  'New',
  '1. Assigned to Agent',
  
  // Nurturing deals (Green)
  'In Progress',
  'Nurturing',
  'Nurture',
  'Development',
  '3. Nurture',
  '3. Check Back',
  
  // Contact attempts (Cyan)
  '2. Attempting to Contact',
  
  // Working offers (Blue)
  '4. Working Offer Made',
  '4. Working Need to Offer',
  
  // Under contract (Blue)
  '6. Under Contract',
  '6. Buyer Assigned',
  'Under Contract',
  'Proposal',
  'Negotiation',
  'Contract',
  'Pending',
  
  // Successful deals (Purple) - DISABLED BY DEFAULT
  'Closed',
  'Won',
  'Closed Won',
  'Completed',
  'Success',
  '8. Closed: Transaction Done',
  
  // Failed deals (Red) - DISABLED BY DEFAULT
  'Lost',
  'Cancelled',
  'Closed Lost',
  'Failed',
  'Rejected',
  'Dead Lead/Deal',
  '9. Lost Deal: Unknown',
  '9. Lost Deal: Other Wholesale Company',
  '9. Lost Deal: Auction',
  'Closed Lost to Competition',
  'Out of Foreclosure: Unknown',
  'Out of Foreclosure: Follow Up',
  
  // On hold deals (Orange)
  'On Hold',
  'Hold',
  'Paused',
  'Suspended',
  '5. Limbo',
  
  // Follow up deals (Cyan)
  'Follow Up',
  'Follow-up',
  'Followup',
  'Review',
  'Evaluation',
];

// Stage icon and color mapping
const STAGE_ICONS: { [key: string]: { icon: string; color: string } } = {
  // Early stage deals (Gold)
  'Initial Contact': { icon: 'pickaxe', color: '#FFD700' },
  'New Lead': { icon: 'pickaxe', color: '#FFD700' },
  'Qualification': { icon: 'pickaxe', color: '#FFD700' },
  'Lead': { icon: 'pickaxe', color: '#FFD700' },
  'New': { icon: 'pickaxe', color: '#FFD700' },
  '1. Assigned to Agent': { icon: 'pickaxe', color: '#FFD700' },
  
  // Nurturing deals (Green)
  'In Progress': { icon: 'baby-bottle-outline', color: '#4CAF50' },
  'Nurturing': { icon: 'baby-bottle-outline', color: '#4CAF50' },
  'Nurture': { icon: 'baby-bottle-outline', color: '#4CAF50' },
  'Development': { icon: 'baby-bottle-outline', color: '#4CAF50' },
  '3. Nurture': { icon: 'baby-bottle-outline', color: '#4CAF50' },
  '3. Check Back': { icon: 'baby-bottle-outline', color: '#4CAF50' },
  
  // Contact attempts (Cyan)
  '2. Attempting to Contact': { icon: 'exclamation-thick', color: '#00BCD4' },
  
  // Working offers (Blue)
  '4. Working Offer Made': { icon: 'handshake-outline', color: '#2196F3' },
  '4. Working Need to Offer': { icon: 'handshake-outline', color: '#2196F3' },
  
  // Under contract (Blue)
  '6. Under Contract': { icon: 'handshake-outline', color: '#2196F3' },
  '6. Buyer Assigned': { icon: 'handshake-outline', color: '#2196F3' },
  'Under Contract': { icon: 'handshake-outline', color: '#2196F3' },
  'Proposal': { icon: 'handshake-outline', color: '#2196F3' },
  'Negotiation': { icon: 'handshake-outline', color: '#2196F3' },
  'Contract': { icon: 'handshake-outline', color: '#2196F3' },
  'Pending': { icon: 'handshake-outline', color: '#2196F3' },
  
  // Successful deals (Purple)
  'Closed': { icon: 'thumb-up-outline', color: '#9C27B0' },
  'Won': { icon: 'thumb-up-outline', color: '#9C27B0' },
  'Closed Won': { icon: 'thumb-up-outline', color: '#9C27B0' },
  'Completed': { icon: 'thumb-up-outline', color: '#9C27B0' },
  'Success': { icon: 'thumb-up-outline', color: '#9C27B0' },
  '8. Closed: Transaction Done': { icon: 'thumb-up-outline', color: '#9C27B0' },
  
  // Failed deals (Red)
  'Lost': { icon: 'thumb-down-outline', color: '#F44336' },
  'Cancelled': { icon: 'thumb-down-outline', color: '#F44336' },
  'Closed Lost': { icon: 'thumb-down-outline', color: '#F44336' },
  'Failed': { icon: 'thumb-down-outline', color: '#F44336' },
  'Rejected': { icon: 'thumb-down-outline', color: '#F44336' },
  'Dead Lead/Deal': { icon: 'thumb-down-outline', color: '#F44336' },
  '9. Lost Deal: Unknown': { icon: 'thumb-down-outline', color: '#F44336' },
  '9. Lost Deal: Other Wholesale Company': { icon: 'thumb-down-outline', color: '#F44336' },
  '9. Lost Deal: Auction': { icon: 'thumb-down-outline', color: '#F44336' },
  'Closed Lost to Competition': { icon: 'thumb-down-outline', color: '#F44336' },
  'Out of Foreclosure: Unknown': { icon: 'thumb-down-outline', color: '#F44336' },
  'Out of Foreclosure: Follow Up': { icon: 'thumb-down-outline', color: '#F44336' },
  
  // On hold deals (Orange)
  'On Hold': { icon: 'hand', color: '#FF9800' },
  'Hold': { icon: 'hand', color: '#FF9800' },
  'Paused': { icon: 'hand', color: '#FF9800' },
  'Suspended': { icon: 'hand', color: '#FF9800' },
  '5. Limbo': { icon: 'hand', color: '#FF9800' },
  
  // Follow up deals (Cyan)
  'Follow Up': { icon: 'exclamation-thick', color: '#00BCD4' },
  'Follow-up': { icon: 'exclamation-thick', color: '#00BCD4' },
  'Followup': { icon: 'exclamation-thick', color: '#00BCD4' },
  'Review': { icon: 'exclamation-thick', color: '#00BCD4' },
  'Evaluation': { icon: 'exclamation-thick', color: '#00BCD4' },
  
  // Default fallback
  'default': { icon: 'map-marker', color: '#007AFF' }
};

// Get all stages except "Closed Lost" and "Closed Won" categories
const getDefaultVisibleStages = () => {
  return ALL_DEAL_STAGES.filter(stage => {
    const iconConfig = STAGE_ICONS[stage];
    if (!iconConfig) return true; // Include unknown stages by default
    
    // Exclude stages with thumb-down-outline (Closed Lost) and thumb-up-outline (Closed Won)
    return iconConfig.icon !== 'thumb-down-outline' && iconConfig.icon !== 'thumb-up-outline';
  });
};

const defaultSettings: Settings = {
  visibleDealStages: getDefaultVisibleStages(),
  routingRadius: 5,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('appSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await AsyncStorage.setItem('appSettings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const getStageDisplayName = (stage: string) => {
    // Map long stage names to shorter display names for the UI
    const stageDisplayMap: {[key: string]: string} = {
      '1. Assigned to Agent': 'Assigned',
      '2. Attempting to Contact': 'Contact',
      '3. Nurture': 'Nurture',
      '3. Check Back': 'Check Back',
      '4. Working Offer Made': 'Working Offer',
      '4. Working Need to Offer': 'Need Offer',
      '5. Limbo': 'Limbo',
      '6. Under Contract': 'Under Contract',
      '6. Buyer Assigned': 'Buyer Assigned',
      '8. Closed: Transaction Done': 'Closed',
      '9. Lost Deal: Unknown': 'Lost Unknown',
      '9. Lost Deal: Other Wholesale Company': 'Lost Other',
      '9. Lost Deal: Auction': 'Lost Auction',
      'Dead Lead/Deal': 'Dead Lead',
      'Out of Foreclosure: Unknown': 'Out of Foreclosure',
      'Out of Foreclosure: Follow Up': 'Foreclosure Follow Up',
      'Closed Lost to Competition': 'Lost Competition',
      'Closed Lost': 'Closed Lost',
    };
    
    return stageDisplayMap[stage] || stage;
  };

  const getStageIcon = (stage: string) => {
    return STAGE_ICONS[stage] || STAGE_ICONS.default;
  };

  return (
    <SettingsContext.Provider value={{ 
      settings, 
      updateSettings, 
      getStageDisplayName, 
      getStageIcon 
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
} 