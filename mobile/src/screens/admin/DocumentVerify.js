import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { verifyDocument } from '../../api/client';
import { Card, Button } from '../../components/UI';
import { colors, spacing, font } from '../../styles/theme';

export default function DocumentVerify({ route, navigation }) {
  const { projectId, docs: initialDocs = [] } = route.params || {};
  const [docs, setDocs]   = useState(initialDocs);
  const [busy, setBusy]   = useState(null);  // doc id being verified

  const handleVerify = async (docId) => {
    setBusy(docId);
    try {
      await verifyDocument(docId);
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, is_verified: true } : d));
      Alert.alert('Verified', 'Document marked as verified.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Verification failed.');
    } finally { setBusy(null); }
  };

  const unverified = docs.filter(d => !d.is_verified);
  const verified   = docs.filter(d => d.is_verified);

  return (
    <View style={styles.screen}>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {verified.length} verified · {unverified.length} pending
        </Text>
      </View>

      <FlatList
        data={docs}
        keyExtractor={d => String(d.id)}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: colors.textMuted, padding: spacing.xl }}>
            No documents for this project.
          </Text>
        }
        renderItem={({ item }) => (
          <Card style={[styles.docCard, item.is_verified && styles.docCardDone]}>
            <View style={styles.docTop}>
              <Text style={styles.docIcon}>
                {item.mime_type?.includes('pdf') ? '📄' : item.mime_type?.includes('image') ? '🖼️' : '📎'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.docType}>{item.document_type}</Text>
                <Text style={styles.docName} numberOfLines={1}>{item.file_name}</Text>
                {item.uploader_name && (
                  <Text style={styles.uploader}>Uploaded by: {item.uploader_name}</Text>
                )}
              </View>
              {item.is_verified
                ? <Text style={styles.checkmark}>✅</Text>
                : (
                  <Button
                    title={busy === item.id ? '…' : 'Verify'}
                    onPress={() => handleVerify(item.id)}
                    loading={busy === item.id}
                    style={styles.verifyBtn}
                  />
                )
              }
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: colors.bg },
  summary:  { backgroundColor: colors.primary, padding: spacing.md },
  summaryText: { color: colors.white, fontSize: font.sm, fontWeight: font.semi },
  docCard:  { marginBottom: spacing.sm },
  docCardDone: { opacity: 0.7 },
  docTop:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  docIcon:  { fontSize: 24 },
  docType:  { fontSize: font.base, fontWeight: font.semi, color: colors.text },
  docName:  { fontSize: font.xs, color: colors.textMuted, marginTop: 2 },
  uploader: { fontSize: font.xs, color: colors.textLight, marginTop: 2 },
  checkmark: { fontSize: 22 },
  verifyBtn: { paddingHorizontal: spacing.sm, paddingVertical: 6, minWidth: 70 },
});
