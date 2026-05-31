import React, { useState } from 'react';
import { ScrollView, RefreshControl, View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useGetDocumentsQuery } from '../../store/api/documentsApi';
import { OfflineBanner }        from '../../components/shared/OfflineBanner';
import { EmptyState }           from '../../components/shared/EmptyState';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

const FILTERS = ['All', 'KYC', 'Land', 'Subsidy', 'NHB', 'Legal'];

export default function DocInboxScreen({ navigation }: any) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch]             = useState('');
  const [refreshing, setRefreshing]     = useState(false);
  const { data: docs = [], isLoading, refetch } = useGetDocumentsQuery({ status: 'pending' });

  const filtered = docs.filter((d) => {
    const matchFilter = activeFilter === 'All' || d.document_type.toLowerCase().includes(activeFilter.toLowerCase());
    const matchSearch = !search || (d.farmer_name ?? '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      <OfflineBanner />
      <TextInput
        style={styles.search}
        placeholder="🔍 Search farmer or document type…"
        value={search}
        onChangeText={setSearch}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, activeFilter === f && styles.chipActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.chipTxt, activeFilter === f && styles.chipTxtActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : filtered.length === 0 ? (
        <EmptyState emoji="📭" message="No documents match your filter." />
      ) : (
        <View style={{ paddingHorizontal: SPACING.md }}>
          {filtered.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.row}
              onPress={() => navigation.navigate('KycReview', { docId: doc.id })}
            >
              <Text style={styles.icon}>📄</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{doc.document_type} — {doc.farmer_name}</Text>
                <Text style={styles.meta}>{doc.file_name} · {new Date(doc.uploaded_at).toLocaleDateString('en-IN')}</Text>
              </View>
              <View style={styles.reviewBadge}>
                <Text style={styles.reviewTxt}>Review</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search:        { margin: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 13 },
  chipScroll:    { paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  chip:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, marginRight: 8 },
  chipActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt:       { fontSize: 11, fontWeight: '600', color: COLORS.subtext },
  chipTxtActive: { color: COLORS.white },
  loading:       { textAlign: 'center', color: COLORS.subtext, padding: 32 },
  row:           { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1, gap: SPACING.md },
  icon:          { fontSize: 22 },
  name:          { fontSize: 12, fontWeight: '700', color: COLORS.text },
  meta:          { fontSize: 10, color: COLORS.subtext, marginTop: 2 },
  reviewBadge:   { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  reviewTxt:     { fontSize: 10, fontWeight: '700', color: '#E65100' },
});
