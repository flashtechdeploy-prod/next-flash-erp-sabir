
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Image, TextInput, ActivityIndicator, Platform, ScrollView, TouchableOpacity, Linking, SafeAreaView, StatusBar } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { CONFIG } from '../constants/config';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const [status, setStatus] = useState('');
  const [location, setLocation] = useState(null);
  const [image, setImage] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [leaveType, setLeaveType] = useState('casual');
  const [submitting, setSubmitting] = useState(false);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, leave: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const router = useRouter();

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const empId = await AsyncStorage.getItem('employee_id');
      setEmployeeId(empId);

      const [statusRes, statsRes, historyRes] = await Promise.all([
        fetch(`${CONFIG.API_BASE_URL}/attendance/my-status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${CONFIG.API_BASE_URL}/attendance/my-stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${CONFIG.API_BASE_URL}/attendance/my-history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statusRes.ok) setTodayStatus(await statusRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (historyRes.ok) setHistory(await historyRes.json());
    } catch (e) {
      console.error('Failed to fetch stats', e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const takeSelfie = async () => {
    let { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (camStatus !== 'granted') {
      Alert.alert('Permission denied', 'Camera permission is required.');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const selectStatus = (attendanceStatus: string) => {
    if (todayStatus) return;
    setStatus(attendanceStatus);
  };

  const handleManualSubmit = async () => {
    if (!image) {
      Alert.alert('Action Required', 'Please take a live selfie first.');
      return;
    }
    if (!status) {
      Alert.alert('Action Required', 'Please select your status for today.');
      return;
    }

    setSubmitting(true);

    let { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    if (locStatus !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required for verification.');
      setSubmitting(false);
      return;
    }
    let loc = await Location.getCurrentPositionAsync({});
    setLocation(loc.coords);

    await submitAttendance(status, loc.coords, image);
  };

  const submitAttendance = async (attendanceStatus: string, coords: any, imageUri: string) => {
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const formData = new FormData();
      formData.append('status', attendanceStatus);
      formData.append('location', JSON.stringify(coords));
      formData.append('note', note);
      if (attendanceStatus === 'leave') {
        formData.append('leave_type', leaveType);
      }

      const fileUri = imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`;
      const fileName = fileUri.split('/').pop() || 'selfie.jpg';
      const fileType = 'image/jpeg';

      if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('picture', blob, fileName);
      } else {
        formData.append('picture', { uri: fileUri, name: fileName, type: fileType } as any);
      }

      const res = await fetch(`${CONFIG.API_BASE_URL}/attendance/mark-self`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Attendance Marked', 'Your status has been updated and synced with HR.');
        fetchStats();
        setImage(null);
        setNote('');
      } else {
        Alert.alert('Submission Error', data.message || 'Verification failed.');
      }
    } catch (e) {
      Alert.alert('System Error', 'Could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('employee_id');
    router.replace('/login');
  };

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'present': return { color: '#10b981', bg: '#ecfdf5' };
      case 'late': return { color: '#f59e0b', bg: '#fffbeb' };
      case 'absent': return { color: '#ef4444', bg: '#fef2f2' };
      case 'leave': return { color: '#3b82f6', bg: '#eff6ff' };
      default: return { color: '#64748b', bg: '#f8fafc' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View>
            <Text style={styles.greetingHeader}>Welcome back,</Text>
            <Text style={styles.employeeName}>{employeeId || 'Employee'}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutCircle}>
            <Text style={styles.logoutIcon}>🚪</Text>
          </TouchableOpacity>
        </View>

        {/* Monthly Performance Highlights */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Monthly Stats</Text>
          <Text style={styles.sectionDate}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statItem, { backgroundColor: '#ecfdf5' }]}>
            <Text style={[styles.statValue, { color: '#059669' }]}>{stats.present}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#fffbeb' }]}>
            <Text style={[styles.statValue, { color: '#d97706' }]}>{stats.late}</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#fef2f2' }]}>
            <Text style={[styles.statValue, { color: '#dc2626' }]}>{stats.absent}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#eff6ff' }]}>
            <Text style={[styles.statValue, { color: '#2563eb' }]}>{stats.leave}</Text>
            <Text style={styles.statLabel}>Leave</Text>
          </View>
        </View>

        {/* Current Status Card */}
        <View style={[styles.mainActionCard, todayStatus && styles.completedCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderTitle}>Today's Attendance</Text>
            <View style={[styles.dateBadge, { backgroundColor: todayStatus ? '#dcfce7' : '#f1f5f9' }]}>
              <Text style={[styles.dateBadgeText, { color: todayStatus ? '#15803d' : '#475569' }]}>
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </Text>
            </View>
          </View>

          {todayStatus ? (
            <View style={styles.completionView}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark-circle" size={48} color="#10b981" />
              </View>
              <Text style={styles.completionTitle}>Attendance Captured</Text>
              <Text style={styles.completionSub}>Marked as <Text style={{ fontWeight: '800', color: getStatusStyle(todayStatus.status).color }}>{todayStatus.status.toUpperCase()}</Text></Text>

              {todayStatus.location && (
                <View style={styles.locationVerifiedBadge}>
                  <Ionicons name="location" size={12} color="#059669" />
                  <Text style={styles.locationVerifiedText}>GPS Verified</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.actionBody}>
              <TouchableOpacity style={styles.cameraTrigger} onPress={takeSelfie} activeOpacity={0.7}>
                {image ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: image }} style={styles.selfiePreview} />
                    <View style={styles.retakeOverlay}>
                      <Text style={styles.retakeText}>RETAKE</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.cameraPlaceholder}>
                    <Text style={styles.cameraIcon}>📸</Text>
                    <Text style={styles.cameraHint}>TAP TO TAKE SELFIE</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.statusPickerRow}>
                {['present', 'late', 'absent', 'leave'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => selectStatus(s)}
                    style={[
                      styles.statusBubble,
                      status === s && { backgroundColor: getStatusStyle(s).color, borderColor: getStatusStyle(s).color }
                    ]}
                  >
                    <Text style={[styles.statusBubbleText, status === s && { color: '#fff' }]}>
                      {s.charAt(0).toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {status === 'leave' && (
                <View style={styles.leavePickerContainer}>
                  <Picker
                    selectedValue={leaveType}
                    onValueChange={(itemValue) => setLeaveType(itemValue)}
                    style={styles.simplePicker}
                  >
                    <Picker.Item label="Casual Leave" value="casual" />
                    <Picker.Item label="Sick Leave" value="sick" />
                    <Picker.Item label="Annual Leave" value="annual" />
                    <Picker.Item label="Unpaid Leave" value="unpaid" />
                  </Picker>
                </View>
              )}

              <TextInput
                style={styles.noteInput}
                placeholder="Add a remark (optional)..."
                value={note}
                onChangeText={setNote}
              />

              <TouchableOpacity
                style={[styles.submitButton, (!image || !status || submitting) && styles.submitButtonDisabled]}
                onPress={handleManualSubmit}
                disabled={!image || !status || submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>CONFIRM & MARK</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* History Area */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Timeline History</Text>
          <TouchableOpacity onPress={fetchStats}><Text style={styles.refreshLink}>Refresh</Text></TouchableOpacity>
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Text style={styles.emptyHistoryText}>No records found for the past month.</Text>
          </View>
        ) : (
          history.slice(0, 5).map((item, index) => (
            <View key={index} style={styles.historyCard}>
              <View style={styles.historyLeading}>
                <View style={[styles.statusDot, { backgroundColor: getStatusStyle(item.status).color }]} />
                <View style={styles.historyDetails}>
                  <Text style={styles.historyDate}>{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                  <Text style={[styles.historyStatus, { color: getStatusStyle(item.status).color }]}>{item.status.toUpperCase()}</Text>
                  {item.location && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${JSON.parse(item.location).latitude},${JSON.parse(item.location).longitude}`)}
                      style={styles.historyLocationLink}
                    >
                      <Ionicons name="location-outline" size={12} color="#2563eb" />
                      <Text style={styles.historyLocationText}>View Mapping</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View style={styles.historyTrailing}>
                {item.picture ? (
                  <View style={styles.historyThumbWrapper}>
                    <Image source={{ uri: item.picture }} style={styles.historyThumb} />
                  </View>
                ) : (
                  <View style={styles.historyNoThumb} />
                )}
              </View>
            </View>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  greetingHeader: { fontSize: 16, color: '#64748b', fontWeight: '500' },
  employeeName: { fontSize: 26, fontWeight: '800', color: '#1e293b', letterSpacing: -0.5 },
  logoutCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  logoutIcon: { fontSize: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  sectionDate: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  statItem: { flex: 1, height: 80, marginHorizontal: 4, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 2, textTransform: 'uppercase' },
  mainActionCard: { backgroundColor: '#fff', borderRadius: 32, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 20, elevation: 3, marginBottom: 32 },
  completedCard: { backgroundColor: '#f0fdf4', borderColor: '#d1fae5', borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  cardHeaderTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  dateBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  dateBadgeText: { fontSize: 12, fontWeight: '700' },
  cameraTrigger: { width: '100%', height: 180, borderRadius: 24, backgroundColor: '#f8fafc', borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0', overflow: 'hidden', marginBottom: 20 },
  cameraPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cameraIcon: { fontSize: 40, marginBottom: 8 },
  cameraHint: { fontSize: 13, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5 },
  previewContainer: { flex: 1 },
  selfiePreview: { width: '100%', height: '100%', objectFit: 'cover' },
  retakeOverlay: { position: 'absolute', bottom: 12, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  retakeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  statusPickerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statusBubble: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#f1f5f9', backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  statusBubbleText: { fontSize: 18, fontWeight: '800', color: '#64748b' },
  noteInput: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, fontSize: 15, color: '#1e293b', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20 },
  actionBody: { width: '100%' },
  submitButton: { backgroundColor: '#1e293b', paddingVertical: 18, borderRadius: 18, alignItems: 'center', shadowColor: '#1e293b', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  submitButtonText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
  submitButtonDisabled: { opacity: 0.4, elevation: 0 },
  completionView: { alignItems: 'center', paddingVertical: 20 },
  successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#10b981', shadowOpacity: 0.1, shadowRadius: 10, elevation: 2 },
  completionTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  completionSub: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 24, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5 },
  historyLeading: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 16 },
  historyDetails: { gap: 2 },
  historyDate: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  historyStatus: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  historyTrailing: {},
  historyThumb: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f8fafc' },
  historyNoThumb: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f1f5f9' },
  historyThumbWrapper: { position: 'relative' },
  locationVerifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#d1fae5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 12, gap: 4 },
  locationVerifiedText: { color: '#059669', fontSize: 12, fontWeight: '700' },
  historyLocationLink: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 2 },
  historyLocationText: { fontSize: 11, fontWeight: '600', color: '#2563eb' },
  refreshLink: { color: '#2563eb', fontSize: 14, fontWeight: '700' },
  emptyHistory: { alignItems: 'center', paddingVertical: 40 },
  emptyHistoryText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  bottomSpacer: { height: 40 },
  leavePickerContainer: { marginBottom: 20, backgroundColor: '#f8fafc', borderRadius: 16, overflow: 'hidden' },
  simplePicker: { height: 50, color: '#1e293b' },
});
