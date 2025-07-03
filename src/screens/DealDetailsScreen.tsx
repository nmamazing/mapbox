import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { zohoService } from '../services/zohoService';

// Define the deals stack param list
type DealsStackParamList = {
  DealsList: undefined;
  DealDetails: { deal: any };
};

const HEADER_BLUE = colors.primary;

// Add type for CollapsibleSection props
interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection = ({ title, children, defaultOpen = false }: CollapsibleSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.sectionContainer}>
      <TouchableOpacity style={styles.sectionHeader} onPress={() => setOpen(o => !o)}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color="#fff" />
      </TouchableOpacity>
      {open && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
};

export default function DealDetailsScreen() {
  const navigation = useNavigation<StackNavigationProp<DealsStackParamList>>();
  const route = useRoute();
  const { deal } = route.params as { deal: any }; // Get deal from navigation params
  
  const [dealData, setDealData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  console.log('DealDetailsScreen: Rendering with deal:', deal);
  
  useEffect(() => {
    const fetchDealDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!deal?.id) {
          throw new Error('No deal ID provided');
        }
        
        console.log('Fetching deal details for ID:', deal.id);
        const details = await zohoService.getDealDetails(deal.id);
        console.log('Fetched deal details:', details);
        
        setDealData(details);
      } catch (err: any) {
        console.error('Error fetching deal details:', err);
        setError(err.message || 'Failed to fetch deal details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDealDetails();
  }, [deal?.id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.blueHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading deal details...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.blueHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ff6b6b" />
          <Text style={styles.errorText}>Failed to load deal details</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!dealData) {
    return (
      <View style={styles.container}>
        <View style={styles.blueHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Not Found</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="document-outline" size={48} color="#ff6b6b" />
          <Text style={styles.errorText}>Deal not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Helper function to format field names
  const formatFieldName = (fieldName: string): string => {
    return fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Helper function to get field value
  const getFieldValue = (value: any): string => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return String(value);
  };

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={styles.blueHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{dealData.Deal_Name || 'Unknown Deal'}</Text>
      </View>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Top Section */}
        <View style={styles.topSection}>
          <Text style={styles.topLabel}><Text style={styles.topLabelTitle}>Stage:</Text> {getFieldValue(dealData.Stage)}</Text>
          <Text style={styles.topLabel}><Text style={styles.topLabelTitle}>Lead Source:</Text> {getFieldValue(dealData.Lead_Source)}</Text>
          {dealData.Foreclosure_Date ? (
            <Text style={styles.topLabel}><Text style={styles.topLabelTitle}>Foreclosure Date:</Text> {getFieldValue(dealData.Foreclosure_Date)}</Text>
          ) : null}
          <Text style={styles.topLabel}><Text style={styles.topLabelTitle}>Contact Person:</Text> {getFieldValue(dealData.Contact_Person)}</Text>
        </View>
        {/* Collapsible Sections */}
        <Text style={styles.detailsHeader}>Deal Details</Text>
        
        {/* Assignment Details */}
        <CollapsibleSection title="Assignment Details">
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Date of Assignment:</Text> {getFieldValue(dealData.Date_of_Assignment)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>County Recorders Number:</Text> {getFieldValue(dealData.County_Recorders_Number)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Original Mortgage Holder:</Text> {getFieldValue(dealData.Original_Mortgage_Holder)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Age Of Homeowner:</Text> {getFieldValue(dealData.Age_Of_Homeowner)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Interest Rate:</Text> {getFieldValue(dealData.Interest_Rate)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Assigned Mortgage Holder:</Text> {getFieldValue(dealData.Assigned_Mortgage_Holder)}</Text>
        </CollapsibleSection>
        
        {/* Deal Information */}
        <CollapsibleSection title="Deal Information">
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Seller:</Text> {getFieldValue(dealData.Seller)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Close of Escrow:</Text> {getFieldValue(dealData.Close_of_Escrow)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Legal Description:</Text> {getFieldValue(dealData.Legal_Description)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Earnest Money:</Text> {getFieldValue(dealData.Earnest_Money)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Date and Time Earnest Money Was Sent:</Text> {getFieldValue(dealData.Date_and_Time_Earnest_Money_Was_Sent)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Type:</Text> {getFieldValue(dealData.Type)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Modified By:</Text> {getFieldValue(dealData.Modified_By)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Date Under Contract:</Text> {getFieldValue(dealData.Date_Under_Contract)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Closing Date:</Text> {getFieldValue(dealData.Closing_Date)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Probability:</Text> {getFieldValue(dealData.Probability)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Expected Revenue:</Text> {getFieldValue(dealData.Expected_Revenue)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Created By:</Text> {getFieldValue(dealData.Created_By)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Created Time:</Text> {getFieldValue(dealData.Created_Time)}</Text>
        </CollapsibleSection>
        
        {/* Description Information */}
        <CollapsibleSection title="Description Information">
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Description:</Text> {getFieldValue(dealData.Description)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Closing Checklist:</Text> {getFieldValue(dealData.Closing_Checklist)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>PH:</Text> {getFieldValue(dealData.PH)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>PH ID:</Text> {getFieldValue(dealData.PH_ID)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>PH Commission:</Text> {getFieldValue(dealData.PH_Commission)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>PH Submitted By:</Text> {getFieldValue(dealData.PH_Submitted_By)}</Text>
        </CollapsibleSection>
        
        {/* Property Information */}
        <CollapsibleSection title="Property Information">
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Property Address:</Text> {getFieldValue(dealData.Property_Address)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Property City:</Text> {getFieldValue(dealData.Property_City)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Property State:</Text> {getFieldValue(dealData.Property_State)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Property Zip:</Text> {getFieldValue(dealData.Property_Zip)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Property Owner:</Text> {getFieldValue(dealData.Property_Owner)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Phone Number:</Text> {getFieldValue(dealData.Phone_Number)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Tax Mailing Address:</Text> {getFieldValue(dealData.Tax_Mailing_Address)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Notice Date:</Text> {getFieldValue(dealData.Notice_Date)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Property Comp:</Text> {getFieldValue(dealData.Property_Comp)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Max Offer:</Text> {getFieldValue(dealData.Max_Offer)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Loan Estimate:</Text> {getFieldValue(dealData.Loan_Estimate)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>MLS Parcel Number:</Text> {getFieldValue(dealData.MLS_Parcel_Number)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>MLS Parcel Link:</Text> {getFieldValue(dealData.MLS_Parcel_Link)}</Text>
        </CollapsibleSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  blueHeader: {
    backgroundColor: HEADER_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 18,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  topSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  topLabel: {
    fontSize: 16,
    color: '#222',
    marginBottom: 6,
  },
  topLabelTitle: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  detailsHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    marginLeft: 2,
  },
  sectionContainer: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.primary,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionContent: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  detailRow: {
    fontSize: 15,
    color: '#222',
    marginBottom: 4,
  },
  detailKey: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  noteContainer: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  noteText: {
    fontSize: 15,
    color: '#222',
    marginBottom: 2,
  },
  noteMeta: {
    fontSize: 13,
    color: '#888',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 12,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#888',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
}); 