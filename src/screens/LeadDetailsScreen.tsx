import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';
import { Lead, LeadStatus } from '../types';
import { zohoService } from '../services/zohoService';

type LeadDetailsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LeadDetails'>;
  route: RouteProp<RootStackParamList, 'LeadDetails'>;
};

const LeadDetailsScreen: React.FC<LeadDetailsScreenProps> = ({ navigation, route }) => {
  const { leadId } = route.params;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeadDetails();
  }, [leadId]);

  const fetchLeadDetails = async () => {
    try {
      const leads = await zohoService.getLeads();
      const foundLead = leads.find(l => l.id === leadId);
      if (foundLead) {
        setLead(foundLead);
      } else {
        Alert.alert('Error', 'Lead not found');
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch lead details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptLead = async () => {
    try {
      await zohoService.updateLeadStatus(
        leadId,
        LeadStatus.ASSIGNED,
        `Lead accepted at ${new Date().toISOString()}`
      );
      navigation.navigate('Map', { leadId });
    } catch (error) {
      Alert.alert('Error', 'Failed to accept lead');
    }
  };

  const handleArrived = async () => {
    try {
      await zohoService.updateLeadStatus(
        leadId,
        LeadStatus.IN_PROGRESS,
        `Arrived at location at ${new Date().toISOString()}`
      );
      navigation.navigate('Photo', { leadId });
    } catch (error) {
      Alert.alert('Error', 'Failed to update lead status');
    }
  };

  if (loading || !lead) {
    return (
      <View style={styles.centered}>
        <Text>Loading lead details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lead Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{lead.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Address:</Text>
          <Text style={styles.value}>{lead.address}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Phone:</Text>
          <Text style={styles.value}>{lead.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{lead.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, { color: getStatusColor(lead.status) }]}>
            {lead.status}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {lead.status === LeadStatus.NEW && (
          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={handleAcceptLead}
          >
            <Text style={styles.buttonText}>Accept Lead</Text>
          </TouchableOpacity>
        )}

        {lead.status === LeadStatus.ASSIGNED && (
          <TouchableOpacity
            style={[styles.button, styles.arrivedButton]}
            onPress={handleArrived}
          >
            <Text style={styles.buttonText}>I've Arrived</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const getStatusColor = (status: LeadStatus): string => {
  switch (status) {
    case LeadStatus.NEW:
      return '#2196F3';
    case LeadStatus.ASSIGNED:
      return '#FFA000';
    case LeadStatus.IN_PROGRESS:
      return '#4CAF50';
    case LeadStatus.COMPLETED:
      return '#9E9E9E';
    case LeadStatus.CANCELLED:
      return '#F44336';
    default:
      return '#000000';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  value: {
    flex: 2,
    fontSize: 16,
  },
  actions: {
    padding: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  arrivedButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LeadDetailsScreen; 