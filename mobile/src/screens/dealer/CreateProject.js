import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  createProject, getDealerFarmers, getAreaTypes, getAgencies, getBanks, getBankBranches,
} from '../../api/client';
import { Card, Button, Input } from '../../components/UI';
import { colors, spacing, font, radius } from '../../styles/theme';

// Simple picker row
const PickerRow = ({ label, value, options, onSelect }) => (
  <View style={{ marginBottom: spacing.md }}>
    <Text style={styles.label}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.chip, value === opt.value && styles.chipSelected]}
          onPress={() => onSelect(opt.value)}
        >
          <Text style={[styles.chipText, value === opt.value && styles.chipTextSelected]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

export default function CreateProject({ navigation }) {
  const { user } = useAuth();
  const [loading,   setLoading]   = useState(false);
  const [farmers,   setFarmers]   = useState([]);
  const [areaTypes, setAreaTypes] = useState([]);
  const [agencies,  setAgencies]  = useState([]);
  const [banks,     setBanks]     = useState([]);

  // Form state
  const [farmerId,  setFarmerId]  = useState(null);
  const [areaTypeId,setAreaTypeId]= useState(null);
  const [agencyId,  setAgencyId]  = useState(null);
  const [khasra,    setKhasra]    = useState('');
  const [landArea,  setLandArea]  = useState('');
  const [priority,  setPriority]  = useState('normal');

  useEffect(() => {
    (async () => {
      try {
        const [fd, at, ag] = await Promise.all([
          getDealerFarmers(user.id),
          getAreaTypes(),
          getAgencies(),
        ]);
        setFarmers((fd.farmers || []).map(f => ({ value: f.id, label: `${f.first_name} ${f.last_name || ''}` })));
        setAreaTypes((at || []).map(a => ({ value: a.id, label: a.name })));
        setAgencies((ag || []).map(a => ({ value: a.id, label: a.name })));
      } catch (_) {}
    })();
  }, [user.id]);

  const handleCreate = async () => {
    if (!farmerId)   { Alert.alert('Required', 'Please select a farmer.'); return; }
    if (!areaTypeId) { Alert.alert('Required', 'Please select a structure type.'); return; }

    setLoading(true);
    try {
      await createProject({
        farmer_id:         farmerId,
        dealer_id:         user.id,
        created_by:        user.id,
        company_id:        1,            // default company
        area_type_id:      areaTypeId,
        subsidy_agency_id: agencyId || null,
        khasra_no:         khasra.trim() || null,
        land_area:         landArea ? parseFloat(landArea) : null,
        priority,
      });
      Alert.alert('Success', 'Project created!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to create project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      <Card>
        <Text style={styles.sectionTitle}>🌾 Main Applicant (Farmer)</Text>
        <PickerRow label="Select Farmer *" value={farmerId} options={farmers} onSelect={setFarmerId} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>🏗️ Structure Details</Text>
        <PickerRow label="Structure / Area Type *" value={areaTypeId} options={areaTypes} onSelect={setAreaTypeId} />
        <Input label="Land Area (SQM)" value={landArea} onChangeText={setLandArea}
          placeholder="e.g. 4000" keyboardType="numeric" />
        <Input label="Khasra / Survey No." value={khasra} onChangeText={setKhasra}
          placeholder="Land parcel number" />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>🏛️ Subsidy Agency</Text>
        <PickerRow label="Agency (optional)" value={agencyId} options={agencies} onSelect={setAgencyId} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>⚡ Priority</Text>
        <PickerRow
          label="Project Priority"
          value={priority}
          options={[
            { value: 'low',    label: 'Low' },
            { value: 'normal', label: 'Normal' },
            { value: 'high',   label: 'High' },
            { value: 'urgent', label: 'Urgent' },
          ]}
          onSelect={setPriority}
        />
      </Card>

      <Button title="Create Project" onPress={handleCreate} loading={loading}
        style={{ marginHorizontal: spacing.md }} />
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  sectionTitle: { fontSize: font.base, fontWeight: font.bold, color: colors.primary, marginBottom: spacing.md },
  label: { fontSize: font.sm, fontWeight: font.semi, color: colors.text, marginBottom: 6 },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.full, borderWidth: 1.5,
    borderColor: colors.border, marginRight: spacing.sm,
    backgroundColor: colors.white,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  chipText: { fontSize: font.sm, color: colors.textMuted },
  chipTextSelected: { color: colors.primary, fontWeight: font.semi },
});
