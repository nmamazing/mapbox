import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

// Import SVG components
import PickaxeIcon from '../../assets/DealMarkers/pickaxe.svg';
import BabyBottleIcon from '../../assets/DealMarkers/baby-bottle-outline.svg';
import HandshakeIcon from '../../assets/DealMarkers/handshake-outline.svg';
import ThumbUpIcon from '../../assets/DealMarkers/thumb-up-outline.svg';
import ThumbDownIcon from '../../assets/DealMarkers/thumb-down-outline.svg';
import HandIcon from '../../assets/DealMarkers/hand.svg';
import ExclamationIcon from '../../assets/DealMarkers/exclamation-thick.svg';
import MapMarkerIcon from '../../assets/DealMarkers/map-marker.svg';

interface DealMarkerProps {
  stage?: string;
  size?: number;
}

const STAGE_ICONS: { [key: string]: { Icon: React.ComponentType<any>; color: string } } = {
  // Early stage deals
  'Initial Contact': { Icon: PickaxeIcon, color: '#FFD700' },
  'New Lead': { Icon: PickaxeIcon, color: '#FFD700' },
  'Qualification': { Icon: PickaxeIcon, color: '#FFD700' },
  'Lead': { Icon: PickaxeIcon, color: '#FFD700' },
  'New': { Icon: PickaxeIcon, color: '#FFD700' },
  '1. Assigned to Agent': { Icon: PickaxeIcon, color: '#FFD700' },
  
  // Nurturing deals
  'In Progress': { Icon: BabyBottleIcon, color: '#4CAF50' },
  'Nurturing': { Icon: BabyBottleIcon, color: '#4CAF50' },
  'Nurture': { Icon: BabyBottleIcon, color: '#4CAF50' },
  'Development': { Icon: BabyBottleIcon, color: '#4CAF50' },
  '3. Nurture': { Icon: BabyBottleIcon, color: '#4CAF50' },
  '3. Check Back': { Icon: BabyBottleIcon, color: '#4CAF50' },
  
  // Contact attempts
  '2. Attempting to Contact': { Icon: ExclamationIcon, color: '#00BCD4' },
  
  // Working offers
  '4. Working Offer Made': { Icon: HandshakeIcon, color: '#2196F3' },
  '4. Working Need to Offer': { Icon: HandshakeIcon, color: '#2196F3' },
  
  // Under contract
  '6. Under Contract': { Icon: HandshakeIcon, color: '#2196F3' },
  
  // Buyer assigned
  '6. Buyer Assigned': { Icon: HandshakeIcon, color: '#2196F3' },
  
  // Contract deals
  'Under Contract': { Icon: HandshakeIcon, color: '#2196F3' },
  'Proposal': { Icon: HandshakeIcon, color: '#2196F3' },
  'Negotiation': { Icon: HandshakeIcon, color: '#2196F3' },
  'Contract': { Icon: HandshakeIcon, color: '#2196F3' },
  'Pending': { Icon: HandshakeIcon, color: '#2196F3' },
  
  // Successful deals
  'Closed': { Icon: ThumbUpIcon, color: '#9C27B0' },
  'Won': { Icon: ThumbUpIcon, color: '#9C27B0' },
  'Closed Won': { Icon: ThumbUpIcon, color: '#9C27B0' },
  'Completed': { Icon: ThumbUpIcon, color: '#9C27B0' },
  'Success': { Icon: ThumbUpIcon, color: '#9C27B0' },
  '8. Closed: Transaction Done': { Icon: ThumbUpIcon, color: '#9C27B0' },
  
  // Failed deals (including out of foreclosure)
  'Lost': { Icon: ThumbDownIcon, color: '#F44336' },
  'Cancelled': { Icon: ThumbDownIcon, color: '#F44336' },
  'Closed Lost': { Icon: ThumbDownIcon, color: '#F44336' },
  'Failed': { Icon: ThumbDownIcon, color: '#F44336' },
  'Rejected': { Icon: ThumbDownIcon, color: '#F44336' },
  'Dead Lead/Deal': { Icon: ThumbDownIcon, color: '#F44336' },
  '9. Lost Deal: Unknown': { Icon: ThumbDownIcon, color: '#F44336' },
  '9. Lost Deal: Other Wholesale Company': { Icon: ThumbDownIcon, color: '#F44336' },
  '9. Lost Deal: Auction': { Icon: ThumbDownIcon, color: '#F44336' },
  'Closed Lost to Competition': { Icon: ThumbDownIcon, color: '#F44336' },
  
  // Out of foreclosure deals - treated as Stage 9 Lost Deal
  'Out of Foreclosure: Unknown': { Icon: ThumbDownIcon, color: '#F44336' },
  'Out of Foreclosure: Follow Up': { Icon: ThumbDownIcon, color: '#F44336' },
  
  // On hold deals
  'On Hold': { Icon: HandIcon, color: '#FF9800' },
  'Hold': { Icon: HandIcon, color: '#FF9800' },
  'Paused': { Icon: HandIcon, color: '#FF9800' },
  'Suspended': { Icon: HandIcon, color: '#FF9800' },
  '5. Limbo': { Icon: HandIcon, color: '#FF9800' },
  
  // Follow up deals
  'Follow Up': { Icon: ExclamationIcon, color: '#00BCD4' },
  'Follow-up': { Icon: ExclamationIcon, color: '#00BCD4' },
  'Followup': { Icon: ExclamationIcon, color: '#00BCD4' },
  'Review': { Icon: ExclamationIcon, color: '#00BCD4' },
  'Evaluation': { Icon: ExclamationIcon, color: '#00BCD4' },
  
  // Default fallback
  'default': { Icon: MapMarkerIcon, color: colors.primary }
};

const DealMarker: React.FC<DealMarkerProps> = ({ stage, size = 30 }) => {
  const iconConfig = STAGE_ICONS[stage || ''] || STAGE_ICONS.default;
  const IconComponent = iconConfig.Icon;

  // Debug: Log when a stage is not found in mapping
  if (stage && !STAGE_ICONS[stage]) {
    console.log(`⚠️ DealMarker - Stage "${stage}" not found in mapping, using default icon`);
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.iconContainer, { backgroundColor: iconConfig.color }]}>
        <IconComponent
          width={size * 0.6}
          height={size * 0.6}
          fill={colors.white}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default DealMarker; 