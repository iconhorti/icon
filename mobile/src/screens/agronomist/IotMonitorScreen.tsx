import React, { useEffect, useState, useRef } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import type { RouteProp } from '@react-navigation/native';
import { API_URL } from '../../constants/config';

const PURPLE = '#6A1B9A';
const WS_URL  = API_URL.replace(/^http/, 'ws');

interface SensorData { temperature: number; humidity: number; co2: number; soil_moisture: number; ec: number; ph: number; }
const DEFAULT: SensorData = { temperature: 0, humidity: 0, co2: 0, soil_moisture: 0, ec: 0, ph: 0 };

function getSensorStatus(key: string, value: number): 'ok' | 'warning' | 'critical' {
  if (key === 'temperature') { if (value >= 38) return 'critical'; if (value >= 35) return 'warning'; }
  if (key === 'humidity')    { if (value >= 90) return 'critical'; if (value >= 80) return 'warning'; }
  if (key === 'soil_moisture') { if (value <= 20) return 'critical'; if (value <= 30) return 'warning'; }
  return 'ok';
}

const STATUS_COLORS = { ok: '#2E7D46', warning: '#E65100', critical: '#C62828' };

export default function IotMonitorScreen({ route }: { route: RouteProp<any, any> }) {
  const farmId = route.params?.farmId as number | undefined;
  const [sensors, setSensors]     = useState<SensorData>(DEFAULT);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!farmId) return;
    const ws = new WebSocket(`${WS_URL}/iot/live/${farmId}`);
    wsRef.current = ws;
    ws.onopen    = () => setConnected(true);
    ws.onclose   = () => setConnected(false);
    ws.onerror   = () => setConnected(false);
    ws.onmessage = (e) => {
      try { setSensors(JSON.parse(e.data) as SensorData); setLastUpdate(new Date().toLocaleTimeString('en-IN')); } catch { /* ignore */ }
    };
    return () => { ws.close(); wsRef.current = null; };
  }, [farmId]);

  if (!farmId) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg }}>
      <Text style={{ color: COLORS.subtext }}>Select a farm from the Farms tab to view live IoT data.</Text>
    </View>
  );

  const TILES = [
    { key: 'temperature',   label: 'Temperature', unit: '°C',  value: sensors.temperature },
    { key: 'humidity',      label: 'Humidity',    unit: '%',   value: sensors.humidity },
    { key: 'co2',           label: 'CO₂',         unit: 'ppm', value: sensors.co2 },
    { key: 'soil_moisture', label: 'Soil Moist.', unit: '%',   value: sensors.soil_moisture },
    { key: 'ec',            label: 'EC',          unit: 'mS',  value: sensors.ec },
    { key: 'ph',            label: 'pH',          unit: '',    value: sensors.ph },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={[styles.connBar, { backgroundColor: connected ? '#2E7D46' : '#E65100' }]}>
        <Text style={styles.connTxt}>{connected ? `Live · ${lastUpdate ?? '—'}` : 'Disconnected — last reading shown'}</Text>
      </View>
      <View style={styles.grid}>
        {TILES.map(({ key, label, unit, value }) => {
          const status = getSensorStatus(key, value);
          const color  = STATUS_COLORS[status];
          return (
            <View key={key} style={[styles.tile, { borderTopColor: color }]}>
              <Text style={[styles.tileValue, { color }]}>{value.toFixed(1)}{unit}</Text>
              <Text style={styles.tileLabel}>{label}</Text>
              <View style={[styles.statusDot, { backgroundColor: color }]} />
            </View>
          );
        })}
      </View>
      {TILES.filter(t => getSensorStatus(t.key, t.value) !== 'ok').map(t => (
        <View key={t.key} style={[styles.alertBox, getSensorStatus(t.key, t.value) === 'critical' && styles.alertBoxCrit]}>
          <Text style={styles.alertTxt}>{getSensorStatus(t.key, t.value) === 'critical' ? 'CRITICAL' : 'WARNING'}: {t.label} at {t.value.toFixed(1)}{t.unit}</Text>
        </View>
      ))}
      <Text style={styles.note}>Readings update every 60 s via WebSocket.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  connBar:    { padding: 8, paddingHorizontal: 16 },
  connTxt:    { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', padding: SPACING.sm },
  tile:       { width: '30%', margin: '1.5%', backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', elevation: 1, borderTopWidth: 3 },
  tileValue:  { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  tileLabel:  { fontSize: 10, color: COLORS.subtext, textAlign: 'center' },
  statusDot:  { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  alertBox:   { backgroundColor: '#FFF8E1', margin: SPACING.md, marginTop: 0, borderRadius: 10, padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: '#E65100' },
  alertBoxCrit:{ backgroundColor: '#FFEBEE', borderLeftColor: '#C62828' },
  alertTxt:   { fontSize: 13, fontWeight: '700', color: COLORS.text },
  note:       { fontSize: 11, color: COLORS.subtext, margin: SPACING.md, textAlign: 'center' },
});
