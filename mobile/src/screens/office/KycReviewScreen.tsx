import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useReviewDocumentMutation } from '../../store/api/documentsApi';
import { COLORS, SPACING, RADIUS }    from '../../constants/theme';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import type { OfficeStackParamList }      from '../../navigation/types';

export default function KycReviewScreen({
  route,
  navigation,
}: {
  route: RouteProp<OfficeStackParamList, 'KycReview'>;
  navigation: NavigationProp<any>;
}) {
  const docId                       = route.params?.docId as number | undefined;
  const [note, setNote]             = useState('');
  const [reviewDoc, { isLoading }]  = useReviewDocumentMutation();

  const submit = async (status: 'approved' | 'rejected' | 'held') => {
    if (!docId) { Alert.alert('Error', 'No document selected.'); return; }
    if ((status === 'rejected' || status === 'held') && note.trim().length < 20) {
      Alert.alert('Note Required', 'Enter at least 20 characters explaining the reason.');
      return;
    }
    try {
      await reviewDoc({ id: docId, status, note: note.trim() || undefined }).unwrap();
      Alert.alert('Done', `Document ${status}.`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch {
      Alert.alert('Error', 'Could not save review. Check your connection.');
    }
  };

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.sectionTitle}>REVIEW NOTE</Text>
      <TextInput
        style={styles.noteInput}
        placeholder="Add note (required for Reject / Hold — min 20 chars)"
        multiline
        numberOfLines={4}
        value={note}
        onChangeText={setNote}
        textAlignVertical="top"
      />
      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btn, styles.btnDanger]}    onPress={() => submit('rejected')} disabled={isLoading}>
          <Text style={styles.btnTxt}>✗ Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => submit('held')}     disabled={isLoading}>
          <Text style={[styles.btnTxt, { color: COLORS.primary }]}>⏸ Hold</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]}   onPress={() => submit('approved')} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnTxt}>✓ Approve</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm },
  noteInput:    { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 13, minHeight: 100, marginBottom: SPACING.md },
  btnRow:       { flexDirection: 'row', gap: SPACING.sm },
  btn:          { flex: 1, padding: SPACING.md, borderRadius: RADIUS.sm, alignItems: 'center' },
  btnPrimary:   { backgroundColor: COLORS.primary },
  btnSecondary: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.primary },
  btnDanger:    { backgroundColor: COLORS.danger },
  btnTxt:       { fontWeight: '700', fontSize: 13, color: COLORS.white },
});
