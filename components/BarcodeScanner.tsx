import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  onScan: (barcode: string) => void;
  onCancel: () => void;
};

export function BarcodeScanner({ visible, onScan, onCancel }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  function handleBarcodeScanned({ data }: { data: string }) {
    if (scanned) return; // EC3-6: lock onto first barcode in frame
    setScanned(true);
    onScan(data);
  }

  function handleRescan() {
    setScanned(false);
  }

  function handleManualSubmit() {
    const trimmed = manualBarcode.trim();
    if (!trimmed) return;
    setScanned(true);
    onScan(trimmed);
  }

  function handleCancel() {
    setScanned(false);
    setManualBarcode('');
    onCancel();
  }

  function renderContent() {
    // Permission not yet loaded
    if (!permission) {
      return <View style={styles.loadingContainer} />;
    }

    // EC3-4: camera permission denied
    if (!permission.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Camera access is needed for barcode scanning.
          </Text>
          {permission.canAskAgain ? (
            <Pressable
              style={styles.actionBtn}
              onPress={requestPermission}
              accessibilityRole="button"
            >
              <Text style={styles.actionBtnText}>Grant Permission</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.actionBtn}
              onPress={() => Linking.openSettings()}
              accessibilityRole="button"
            >
              <Text style={styles.actionBtnText}>Open Settings</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.actionBtn, styles.cancelActionBtn]}
            onPress={handleCancel}
            accessibilityRole="button"
          >
            <Text style={styles.cancelActionText}>Cancel</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['upc_a', 'upc_e', 'ean13', 'ean8', 'code128', 'code39'],
          }}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.targetBox}>
              <Text style={styles.targetLabel}>align barcode</Text>
            </View>
          </View>
        </CameraView>

        {/* EC3-6: [Rescan] after first barcode is locked */}
        {scanned && (
          <View style={styles.rescanRow}>
            <Pressable
              style={styles.rescanBtn}
              onPress={handleRescan}
              accessibilityRole="button"
              accessibilityLabel="Rescan"
            >
              <Text style={styles.rescanText}>Rescan</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.manualSection}>
          <Text style={styles.manualLabel}>Or enter barcode manually</Text>
          <View style={styles.manualRow}>
            <TextInput
              style={styles.manualInput}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              keyboardType="numeric"
              placeholder="Enter barcode number"
              placeholderTextColor="#9ca3af"
              returnKeyType="done"
              onSubmitEditing={handleManualSubmit}
              accessibilityLabel="Barcode number"
            />
            <Pressable
              style={[
                styles.manualGoBtn,
                !manualBarcode.trim() && styles.manualGoBtnDisabled,
              ]}
              onPress={handleManualSubmit}
              disabled={!manualBarcode.trim()}
              accessibilityRole="button"
              accessibilityLabel="Submit barcode"
            >
              <Text style={styles.manualGoText}>Go</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scan Barcode</Text>
          <Pressable
            onPress={handleCancel}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Cancel barcode scanner"
          >
            <Text style={styles.headerCancel}>Cancel</Text>
          </Pressable>
        </View>
        {renderContent()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#111827',
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  headerCancel: { fontSize: 16, color: '#60a5fa' },
  loadingContainer: { flex: 1, backgroundColor: '#000' },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#111827',
    gap: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#f9fafb',
    textAlign: 'center',
    marginBottom: 8,
  },
  actionBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelActionBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#4b5563' },
  cancelActionText: { color: '#9ca3af', fontSize: 15 },
  scannerContainer: { flex: 1 },
  camera: { flex: 1 },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  targetBox: {
    width: 260,
    height: 120,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
  },
  targetLabel: { color: '#fff', fontSize: 13, opacity: 0.8 },
  rescanRow: {
    position: 'absolute',
    bottom: 220,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  rescanBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  rescanText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  manualSection: {
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  manualLabel: { fontSize: 13, color: '#9ca3af', marginBottom: 10 },
  manualRow: { flexDirection: 'row', gap: 8 },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#f9fafb',
    backgroundColor: '#1f2937',
  },
  manualGoBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualGoBtnDisabled: { backgroundColor: '#374151' },
  manualGoText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
