import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useGetDocumentsQuery, useReviewDocumentMutation } from '../../store/api/documentsApi';
import { EmptyState }    from '../../components/shared/EmptyState';
import { OfflineBanner } from '../../components/shared/OfflineBanner';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export default function ApprovalQueueScreen() {
  const { data: docs = [] }         = useGetDocumentsQuery({ status: 'pending' });
  const [reviewDoc, { isLoading }]  = useReviewDocumentMutation();

  const approve = async (id: number, farmerName?: string) => {
    Alert.alert(
      'Confirm Approval',
      `Approve document for ${farmerName ?? 'this farmer'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve', onPress: async () => {
            await reviewDoc({ id, status: 'approved' });
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
      {docs.length === 0
        ? <EmptyState emoji="✅" message="No approvals pending." />
        : docs.map((doc) => (
          <View key={doc.id} style={styles.item}>
            <Text style={styles.emoji}>📑</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{doc.document_type}</Text>
              <Text style={styles.sub}>{doc.farmer_name ?? '—'}</Text>
            </View>
            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => approve(doc.id, doc.farmer_name)}
              disabled={isLoading}
            >
              <Text style={styles.approveTxt}>Approve</Text>
            </TouchableOpacity>
          </View>
        ))
      }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  item:       { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, margin: SPACING.md, marginBottom: 0, borderRadius: RADIUS.md, padding: SPACING.md, elevation: 1, gap: SPACING.md },
  emoji:      { fontSize: 22 },
  name:       { fontSize: 13, fontWeight: '700', color: COLORS.text },
  sub:        { fontSize: 11, color: COLORS.subtext },
  approveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  approveTxt: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
});
