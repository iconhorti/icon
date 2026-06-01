import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '../../constants/theme';

export default function DPRScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg }}>
      <Text style={{ color: COLORS.subtext, fontSize: 14 }}>Daily Progress Report — Phase 2 Task 3</Text>
    </View>
  );
}
