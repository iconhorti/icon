import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Switch, Alert, ActivityIndicator, Image, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { queueAdd }  from '../../db/syncQueue';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

const ORANGE = '#E65100';
const STEPS = ['Location', 'Site Info', 'Observations', 'Photos', 'Review'];
const PHOTO_SLOTS = ['Corner', 'Water', 'Road', 'Other'] as const;
type PhotoSlot = typeof PHOTO_SLOTS[number];

export default function SiteVisitScreen() {
  const [step, setStep]               = useState(0);
  const [gpsLat, setGpsLat]           = useState<number | null>(null);
  const [gpsLng, setGpsLng]           = useState<number | null>(null);
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [soilType, setSoilType]       = useState('');
  const [waterSource, setWaterSource] = useState('');
  const [electricity, setElectricity] = useState(false);
  const [roadAccess, setRoadAccess]   = useState('');
  const [observations, setObservations] = useState('');
  const [photos, setPhotos]           = useState<Partial<Record<PhotoSlot, string>>>({}); // slot → data URI
  const [submitting, setSubmitting]   = useState(false);

  const photoCount = Object.keys(photos).length;

  const capturePhoto = async (slot: PhotoSlot) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to capture site photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.4,        // compress — these get embedded in the offline payload
      base64: true,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const dataUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
    setPhotos(prev => ({ ...prev, [slot]: dataUri }));
  };

  const captureGPS = async () => {
    setGpsLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Location access is needed for site visits.');
      setGpsLoading(false);
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setGpsLat(loc.coords.latitude);
    setGpsLng(loc.coords.longitude);
    setGpsLoading(false);
  };

  const handleSubmit = async () => {
    if (!gpsLat || !gpsLng) { Alert.alert('GPS Required', 'Capture GPS location before submitting.'); return; }
    if (observations.trim().length < 10) { Alert.alert('Observations Required', 'Enter at least 10 characters.'); return; }
    if (photoCount < PHOTO_SLOTS.length) {
      Alert.alert('Photos Required', `Capture all ${PHOTO_SLOTS.length} photos (${photoCount}/${PHOTO_SLOTS.length} done) before submitting.`);
      return;
    }
    setSubmitting(true);
    await queueAdd('site_visit', '/site-visits', {
      gps_lat: gpsLat, gps_lng: gpsLng, soil_type: soilType, water_source: waterSource,
      electricity, road_access: roadAccess, observations,
      // base64 data URIs keyed by slot — embedded so they survive offline and
      // upload with the rest of the payload when the queue flushes.
      photos: Object.entries(photos).map(([slot, data]) => ({ slot, data })),
      submitted_at: new Date().toISOString(),
    });
    setSubmitting(false);
    Alert.alert('Saved Offline', 'Site visit saved locally and will sync when you reconnect.', [
      { text: 'OK', onPress: () => { setStep(0); setGpsLat(null); setGpsLng(null); setSoilType(''); setWaterSource(''); setObservations(''); setPhotos({}); } },
    ]);
  };

  const stepContent = [
    <View key="loc">
      <Text style={styles.label}>GPS Coordinates</Text>
      {gpsLat ? <Text style={styles.gpsValue}>{gpsLat.toFixed(5)}° N, {gpsLng!.toFixed(5)}° E</Text>
               : <Text style={styles.gpsEmpty}>Not captured yet</Text>}
      <TouchableOpacity style={[styles.gpsBtn, gpsLoading && { opacity: 0.6 }]} onPress={captureGPS} disabled={gpsLoading}>
        {gpsLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.gpsBtnTxt}>📍 Capture GPS</Text>}
      </TouchableOpacity>
      <Text style={styles.label}>Road Access</Text>
      <TextInput style={styles.input} placeholder="All-weather / Seasonal / No road" value={roadAccess} onChangeText={setRoadAccess} />
    </View>,
    <View key="site">
      <Text style={styles.label}>Water Source</Text>
      <TextInput style={styles.input} placeholder="Borewell / Canal / Rain-fed" value={waterSource} onChangeText={setWaterSource} />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Electricity Available</Text>
        <Switch value={electricity} onValueChange={setElectricity} trackColor={{ true: COLORS.primary }} />
      </View>
      <Text style={styles.label}>Soil Type</Text>
      <TextInput style={styles.input} placeholder="Sandy Loam / Clay / Black Cotton..." value={soilType} onChangeText={setSoilType} />
    </View>,
    <View key="obs">
      <Text style={styles.label}>Key Observations * (min 10 chars)</Text>
      <TextInput style={[styles.input, { minHeight: 120 }]} placeholder="Slope, existing structures, hazards, special notes..." multiline numberOfLines={5} value={observations} onChangeText={setObservations} textAlignVertical="top" />
    </View>,
    <View key="photos">
      <Text style={styles.info}>All {PHOTO_SLOTS.length} photos required: corner, water source, road, any issues. Tap to capture.</Text>
      <View style={styles.photosGrid}>
        {PHOTO_SLOTS.map(l => {
          const uri = photos[l];
          return (
            <TouchableOpacity key={l} style={styles.photoBox} onPress={() => capturePhoto(l)} activeOpacity={0.7}>
              {uri ? (
                <>
                  <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                  <View style={styles.photoBadge}><Text style={styles.photoBadgeTxt}>✓ {l}</Text></View>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 28 }}>📷</Text>
                  <Text style={{ fontSize: 11, color: COLORS.subtext, marginTop: 4 }}>{l}</Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={{ fontSize: 11, color: photoCount >= PHOTO_SLOTS.length ? COLORS.primary : COLORS.subtext, textAlign: 'center', marginTop: 12, fontWeight: '700' }}>
        {photoCount}/{PHOTO_SLOTS.length} captured
      </Text>
    </View>,
    <View key="review">
      {[
        { label: 'GPS',          value: gpsLat ? `${gpsLat.toFixed(4)}, ${gpsLng!.toFixed(4)}` : '⚠️ Not captured' },
        { label: 'Soil',         value: soilType || '—' },
        { label: 'Water',        value: waterSource || '—' },
        { label: 'Electricity',  value: electricity ? 'Yes' : 'No' },
        { label: 'Road',         value: roadAccess || '—' },
        { label: 'Photos',       value: photoCount >= PHOTO_SLOTS.length ? `${photoCount} attached` : `⚠️ ${photoCount}/${PHOTO_SLOTS.length}` },
        { label: 'Observations', value: observations ? `${observations.length} chars` : '⚠️ Missing' },
      ].map(({ label, value }) => (
        <View key={label} style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>{label}</Text>
          <Text style={styles.reviewValue}>{value}</Text>
        </View>
      ))}
      <View style={{ backgroundColor: '#E3F2FD', borderRadius: 10, padding: 12, marginTop: 12, borderLeftWidth: 3, borderLeftColor: '#1565C0' }}>
        <Text style={{ fontSize: 12, color: '#1565C0' }}>Saved offline · syncs when connected</Text>
      </View>
    </View>,
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.stepBar}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <View style={[styles.stepDot, i <= step && { backgroundColor: ORANGE }]}>
              <Text style={styles.stepDotTxt}>{i < step ? '✓' : String(i + 1)}</Text>
            </View>
            {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step && { backgroundColor: ORANGE }]} />}
          </React.Fragment>
        ))}
      </View>
      <Text style={styles.stepTitle}>{STEPS[step]}</Text>
      <View style={{ padding: SPACING.md }}>{stepContent[step]}</View>
      <View style={styles.navRow}>
        {step > 0 && <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}><Text style={styles.backBtnTxt}>← Back</Text></TouchableOpacity>}
        {step < STEPS.length - 1
          ? <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(s => s + 1)}><Text style={styles.nextBtnTxt}>Next →</Text></TouchableOpacity>
          : <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnTxt}>Save Site Visit</Text>}
            </TouchableOpacity>
        }
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  stepBar:      { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, paddingTop: SPACING.lg },
  stepDot:      { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center' },
  stepDotTxt:   { fontSize: 11, fontWeight: '800', color: '#fff' },
  stepLine:     { flex: 1, height: 2, backgroundColor: '#E0E0E0', marginHorizontal: 2 },
  stepTitle:    { fontSize: 16, fontWeight: '800', color: COLORS.text, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  label:        { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: SPACING.md },
  input:        { backgroundColor: COLORS.white, borderRadius: RADIUS.sm, padding: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 14 },
  gpsValue:     { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: SPACING.sm },
  gpsEmpty:     { fontSize: 13, color: COLORS.subtext, marginBottom: SPACING.sm },
  gpsBtn:       { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center', marginTop: 4 },
  gpsBtnTxt:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  switchRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  switchLabel:  { fontSize: 14, color: COLORS.text },
  info:         { fontSize: 13, color: COLORS.subtext, lineHeight: 20, marginBottom: SPACING.md },
  photosGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  photoBox:     { width: '47%', aspectRatio: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', overflow: 'hidden' },
  photoThumb:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  photoBadge:   { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 3, alignItems: 'center' },
  photoBadgeTxt:{ color: '#fff', fontSize: 11, fontWeight: '700' },
  reviewRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  reviewLabel:  { fontSize: 12, color: COLORS.subtext },
  reviewValue:  { fontSize: 13, fontWeight: '600', color: COLORS.text },
  navRow:       { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm },
  backBtn:      { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border },
  backBtnTxt:   { color: COLORS.text, fontWeight: '700' },
  nextBtn:      { flex: 2, backgroundColor: ORANGE, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center' },
  nextBtnTxt:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  submitBtn:    { flex: 2, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center' },
  submitBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
