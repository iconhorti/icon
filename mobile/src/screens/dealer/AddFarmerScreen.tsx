import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRegisterFarmerMutation } from '../../store/api/farmersApi';
import { COLORS, SPACING, RADIUS }   from '../../constants/theme';
import type { NavigationProp }        from '@react-navigation/native';

export default function AddFarmerScreen({ navigation }: { navigation: NavigationProp<any> }) {
  const [firstName, setFirstName]       = useState('');
  const [lastName, setLastName]         = useState('');
  const [phone, setPhone]               = useState('');
  const [registerFarmer, { isLoading }] = useRegisterFarmerMutation();

  const submit = async () => {
    if (!firstName.trim()) {
      Alert.alert('Required', 'First name is required.'); return;
    }
    if (phone.trim().length !== 10 || !/^\d{10}$/.test(phone.trim())) {
      Alert.alert('Invalid', 'Phone number must be exactly 10 digits.'); return;
    }
    try {
      await registerFarmer({
        first_name:    firstName.trim(),
        last_name:     lastName.trim() || undefined,
        phone_primary: phone.trim(),
      }).unwrap();
      Alert.alert('Success', `${firstName} registered!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.data?.detail ?? 'Registration failed. Check your connection.');
    }
  };

  return (
    <ScrollView style={styles.screen}>
      {[
        { label: 'First Name *',    value: firstName, set: setFirstName, keyboard: 'default',   maxLen: 50, placeholder: 'Ramesh' },
        { label: 'Last Name',       value: lastName,  set: setLastName,  keyboard: 'default',   maxLen: 50, placeholder: 'Patel' },
        { label: 'Mobile Number *', value: phone,     set: setPhone,     keyboard: 'phone-pad', maxLen: 10, placeholder: '9876543210' },
      ].map(({ label, value, set, keyboard, maxLen, placeholder }) => (
        <View key={label} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            value={value}
            onChangeText={set}
            keyboardType={keyboard as any}
            maxLength={maxLen}
          />
        </View>
      ))}
      <TouchableOpacity
        style={[styles.btn, isLoading && { opacity: 0.6 }]}
        onPress={submit}
        disabled={isLoading}
      >
        {isLoading
          ? <ActivityIndicator color={COLORS.white} />
          : <Text style={styles.btnTxt}>✓ Register Farmer</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md },
  field:  { marginBottom: SPACING.md },
  label:  { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  input:  { backgroundColor: COLORS.white, borderRadius: RADIUS.sm, padding: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 14 },
  btn:    { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.lg },
  btnTxt: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});
