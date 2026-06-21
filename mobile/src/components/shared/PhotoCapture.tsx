import React from 'react';
import { View, Text, TouchableOpacity, Image, Alert, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export type PhotoMap = Record<string, string>; // slot label -> base64 data URI

interface Props {
  slots: readonly string[];
  photos: PhotoMap;
  onChange: (next: PhotoMap) => void;
  /** How many are required (for the counter + caller's gate). 0 = optional. */
  min?: number;
  accent?: string;
}

/**
 * Reusable camera-capture grid used by the field-staff capture screens.
 * Tapping a slot opens the device camera (compressed, base64) and stores the
 * image in the slot. Photos live in caller state so they can be embedded in the
 * offline sync payload and survive no-signal.
 */
export function PhotoCapture({ slots, photos, onChange, min = 0, accent = COLORS.primary }: Props) {
  const count = Object.keys(photos).length;

  const capture = async (slot: string) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to capture photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.4, base64: true, allowsEditing: false });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    onChange({ ...photos, [slot]: `data:image/jpeg;base64,${result.assets[0].base64}` });
  };

  return (
    <View>
      <View style={styles.grid}>
        {slots.map((slot) => {
          const uri = photos[slot];
          return (
            <TouchableOpacity key={slot} style={styles.box} onPress={() => capture(slot)} activeOpacity={0.7}>
              {uri ? (
                <>
                  <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                  <View style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                    <Text style={styles.badgeTxt}>✓ {slot}</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 28 }}>📷</Text>
                  <Text style={{ fontSize: 11, color: COLORS.subtext, marginTop: 4 }}>{slot}</Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.counter, { color: min > 0 && count < min ? COLORS.subtext : accent }]}>
        {count}/{slots.length} captured{min > 0 ? ` · ${min} required` : ''}
      </Text>
    </View>
  );
}

/** Serialize the slot→dataURI map into the array shape the API expects. */
export function photosToPayload(photos: PhotoMap): { slot: string; data: string }[] {
  return Object.entries(photos).map(([slot, data]) => ({ slot, data }));
}

const styles = StyleSheet.create({
  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  box:      { width: '47%', aspectRatio: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', overflow: 'hidden' },
  thumb:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  badge:    { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 3, alignItems: 'center' },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  counter:  { fontSize: 11, textAlign: 'center', marginTop: 10, fontWeight: '700' },
});
