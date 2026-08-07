import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { queueAdd } from '../../db/syncQueue';
import { PhotoCapture, photosToPayload, type PhotoMap } from '../../components/shared/PhotoCapture';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import type { VisitReportScreenProps } from '../../navigation/types';

const PURPLE = '#6A1B9A';
const VR_PHOTOS = ['Photo 1', 'Photo 2'] as const;

export default function VisitReportScreen({ route }: VisitReportScreenProps) {
  const farmId = route.params.farmId;
  const [findings, setFindings] = useState('');
  const [reco1, setReco1]       = useState('');
  const [reco2, setReco2]       = useState('');
  const [reco3, setReco3]       = useState('');
  const [nextDate, setNextDate] = useState('');
  const [otp, setOtp]           = useState('');
  const [photos, setPhotos]     = useState<PhotoMap>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (findings.trim().length < 20) { Alert.alert('Findings Required', 'Enter at least 20 characters.'); return; }
    setSubmitting(true);
    await queueAdd('visit_report', `/agronomist/farms/${farmId}/visit-report`, { findings_summary: findings.trim(), recommendations: [reco1, reco2, reco3].filter(r => r.trim()), next_visit_date: nextDate, farmer_otp: otp.trim() || undefined, photos: photosToPayload(photos), submitted_at: new Date().toISOString() });
    setSubmitting(false);
    Alert.alert('Saved', 'Visit report saved and PDF will be sent to farmer on sync.');
    setFindings(''); setReco1(''); setReco2(''); setReco3(''); setNextDate(''); setOtp(''); setPhotos({});
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ padding: SPACING.md }}>
        <Text style={styles.label}>Findings Summary * (min 20 chars)</Text>
        <TextInput style={[styles.input, { minHeight: 100 }]} placeholder="Overall crop condition, key observations..." multiline value={findings} onChangeText={setFindings} textAlignVertical="top" />
        <Text style={styles.label}>Recommendations</Text>
        <TextInput style={[styles.input, { marginBottom: 6 }]} placeholder="1. First recommendation..." value={reco1} onChangeText={setReco1} multiline />
        <TextInput style={[styles.input, { marginBottom: 6 }]} placeholder="2. Second recommendation..." value={reco2} onChangeText={setReco2} multiline />
        <TextInput style={[styles.input, { marginBottom: 6 }]} placeholder="3. Optional third..." value={reco3} onChangeText={setReco3} multiline />
        <Text style={styles.label}>Next Visit Date</Text>
        <TextInput style={styles.input} placeholder="DD/MM/YYYY" value={nextDate} onChangeText={setNextDate} />
        <Text style={styles.label}>Farmer OTP (optional)</Text>
        <TextInput style={styles.input} placeholder="6-digit OTP from farmer's mobile" value={otp} onChangeText={setOtp} keyboardType="numeric" maxLength={6} />
        <Text style={styles.label}>Photos (optional)</Text>
        <PhotoCapture slots={VR_PHOTOS} photos={photos} onChange={setPhotos} accent={PURPLE} />
        <View style={styles.pdfNote}><Text style={styles.pdfNoteTxt}>PDF auto-sent to farmer WhatsApp within 5 min of sync</Text></View>
        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnTxt}>Submit Visit Report</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label:       { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: SPACING.md },
  input:       { backgroundColor: COLORS.white, borderRadius: RADIUS.sm, padding: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 14 },
  pdfNote:     { backgroundColor: '#F3E8FF', borderRadius: 10, padding: SPACING.md, marginTop: SPACING.md, borderLeftWidth: 3, borderLeftColor: PURPLE },
  pdfNoteTxt:  { fontSize: 12, color: PURPLE },
  submitBtn:   { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.xl },
  submitBtnTxt:{ color: '#fff', fontWeight: '700', fontSize: 15 },
});
