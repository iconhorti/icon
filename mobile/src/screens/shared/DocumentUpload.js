import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { uploadDocument, getDocumentTypes } from '../../api/client';
import { Card, Button, Input } from '../../components/UI';
import { colors, spacing, font, radius } from '../../styles/theme';

export default function DocumentUploadScreen({ route, navigation }) {
  const { projectId, category } = route.params || {};
  const [docTypes, setDocTypes]   = useState([]);
  const [docType, setDocType]     = useState('');
  const [remarks, setRemarks]     = useState('');
  const [file, setFile]           = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getDocumentTypes(category ? { category } : {});
        setDocTypes(data.document_types || []);
      } catch (_) { setDocTypes([]); }
    })();
  }, [category]);

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow access to photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setFile({ uri: result.assets[0].uri, name: `photo_${Date.now()}.jpg`, type: 'image/jpeg' });
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setFile({ uri: result.assets[0].uri, name: `photo_${Date.now()}.jpg`, type: 'image/jpeg' });
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    });
    if (result.assets?.[0]) {
      const a = result.assets[0];
      setFile({ uri: a.uri, name: a.name, type: a.mimeType });
    }
  };

  const handleUpload = async () => {
    if (!docType) { Alert.alert('Missing', 'Please select a document type.'); return; }
    if (!file)    { Alert.alert('Missing', 'Please select a file.'); return; }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('document_type', docType);
      form.append('remarks', remarks);
      form.append('file', { uri: file.uri, name: file.name, type: file.type });
      await uploadDocument(projectId, form);
      Alert.alert('Success', 'Document uploaded successfully!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Upload Failed', err.response?.data?.detail || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.sectionLabel}>Document Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          {docTypes.map(dt => (
            <TouchableOpacity
              key={dt}
              style={[styles.typeChip, docType === dt && styles.typeChipSelected]}
              onPress={() => setDocType(dt)}
            >
              <Text style={[styles.typeChipText, docType === dt && styles.typeChipTextSelected]}>
                {dt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {file ? (
          <View style={styles.filePreview}>
            <Text style={styles.fileIcon}>📎</Text>
            <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
            <TouchableOpacity onPress={() => setFile(null)}>
              <Text style={{ color: colors.danger, fontWeight: font.semi }}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pickRow}>
            <TouchableOpacity style={styles.pickBtn} onPress={pickFromCamera}>
              <Text style={styles.pickIcon}>📷</Text>
              <Text style={styles.pickLabel}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickBtn} onPress={pickFromGallery}>
              <Text style={styles.pickIcon}>🖼️</Text>
              <Text style={styles.pickLabel}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickBtn} onPress={pickDocument}>
              <Text style={styles.pickIcon}>📄</Text>
              <Text style={styles.pickLabel}>Files</Text>
            </TouchableOpacity>
          </View>
        )}

        <Input
          label="Remarks (optional)"
          value={remarks}
          onChangeText={setRemarks}
          placeholder="Any notes about this document…"
          multiline
          numberOfLines={2}
        />
      </Card>

      <Button
        title={uploading ? 'Uploading…' : 'Upload Document'}
        onPress={handleUpload}
        loading={uploading}
        disabled={!docType || !file}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  sectionLabel: { fontSize: font.sm, fontWeight: font.semi, color: colors.text, marginBottom: spacing.sm },
  typeChip: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.full, borderWidth: 1.5,
    borderColor: colors.border, marginRight: spacing.sm,
    backgroundColor: colors.white,
  },
  typeChipSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  typeChipText: { fontSize: font.sm, color: colors.textMuted },
  typeChipTextSelected: { color: colors.primary, fontWeight: font.semi },
  pickRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.md },
  pickBtn: {
    alignItems: 'center', padding: spacing.md,
    borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.border, flex: 1, marginHorizontal: 4,
  },
  pickIcon: { fontSize: 28, marginBottom: 4 },
  pickLabel: { fontSize: font.xs, color: colors.textMuted, fontWeight: font.semi },
  filePreview: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, backgroundColor: colors.bg,
    borderRadius: radius.md, marginBottom: spacing.md,
  },
  fileIcon: { fontSize: 24 },
  fileName: { flex: 1, fontSize: font.sm, color: colors.text },
});
