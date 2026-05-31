import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { registerFarmer, getVillages, getTalukas, getDistricts, getStates } from '../../api/client';
import { Card, Button, Input } from '../../components/UI';
import { colors, spacing, font } from '../../styles/theme';

export default function RegisterFarmer({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [phone2,    setPhone2]    = useState('');
  const [aadhaar,   setAadhaar]   = useState('');
  const [pan,       setPan]       = useState('');
  const [addr1,     setAddr1]     = useState('');
  const [remarks,   setRemarks]   = useState('');

  const validate = () => {
    if (!firstName.trim()) { Alert.alert('Required', 'First name is required.'); return false; }
    if (!phone.trim() || phone.length < 10) { Alert.alert('Required', 'Valid 10-digit phone number required.'); return false; }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        first_name:    firstName.trim(),
        last_name:     lastName.trim() || null,
        phone_primary: phone.trim(),
        phone_secondary: phone2.trim() || null,
        role:          'farmer',
        address_line1: addr1.trim() || null,
        remarks:       remarks.trim() || null,
        dealer_id:     user.id,
        registration_date: new Date().toISOString().split('T')[0],
        aadhaar_number: aadhaar.trim() || null,
        pan_number:     pan.trim() || null,
      };
      await registerFarmer(payload);
      Alert.alert('Success', 'Farmer registered successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      <Card>
        <Text style={styles.sectionTitle}>👤 Personal Info</Text>
        <Input label="First Name *" value={firstName} onChangeText={setFirstName} placeholder="e.g. Ramesh" />
        <Input label="Last Name"    value={lastName}  onChangeText={setLastName}  placeholder="e.g. Patil" />
        <Input label="Mobile Number *" value={phone} onChangeText={setPhone}
          placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} />
        <Input label="Alternate Mobile" value={phone2} onChangeText={setPhone2}
          placeholder="Optional" keyboardType="phone-pad" maxLength={10} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>🪪 KYC Details</Text>
        <Input label="Aadhaar Number" value={aadhaar} onChangeText={setAadhaar}
          placeholder="12-digit Aadhaar" keyboardType="numeric" maxLength={12} />
        <Input label="PAN Number" value={pan} onChangeText={setPan}
          placeholder="e.g. ABCDE1234F" autoCapitalize="characters" maxLength={10} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>📍 Address</Text>
        <Input label="Address" value={addr1} onChangeText={setAddr1}
          placeholder="Village / Taluka / District" multiline numberOfLines={2} />
        <Input label="Remarks" value={remarks} onChangeText={setRemarks}
          placeholder="Any notes…" multiline numberOfLines={2} />
      </Card>

      <Button
        title="Register Farmer"
        onPress={handleRegister}
        loading={loading}
        style={{ marginHorizontal: spacing.md }}
      />

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  sectionTitle: { fontSize: font.base, fontWeight: font.bold, color: colors.primary, marginBottom: spacing.md },
});
