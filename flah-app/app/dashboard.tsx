
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Image, TextInput, ActivityIndicator, Platform, ScrollView, TouchableOpacity, Linking, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { CONFIG } from '../constants/config';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';

export default function DashboardScreen() {
  const [status, setStatus] = useState('');
  const [location, setLocation] = useState<any>(null);
  const [image, setImage] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [initialLocation, setInitialLocation] = useState<any>(null);

  const [leaveType, setLeaveType] = useState('casual');
  const [submitting, setSubmitting] = useState(false);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, leave: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [fssNo, setFssNo] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [markedDates, setMarkedDates] = useState<any>({});
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedDayHistory, setSelectedDayHistory] = useState<any[]>([]);
  const [calendarMonth, setCalendarMonth] = useState<string>(todayStr);
  const router = useRouter();

  const goToPrevMonth = () => {
    const current = new Date(calendarMonth);
    current.setMonth(current.getMonth() - 1);
    setCalendarMonth(current.toISOString().split('T')[0]);
  };

  const goToNextMonth = () => {
    const current = new Date(calendarMonth);
    const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    // Only allow if next month is not in the future
    if (nextMonth <= today) {
      current.setMonth(current.getMonth() + 1);
      setCalendarMonth(current.toISOString().split('T')[0]);
    }
  };

  const isNextMonthDisabled = () => {
    const current = new Date(calendarMonth);
    const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    return nextMonth > today;
  };

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const empId = await AsyncStorage.getItem('employee_id');
      const name = await AsyncStorage.getItem('full_name');
      const fss = await AsyncStorage.getItem('fss_no');

      setEmployeeId(empId);
      setEmployeeName(name);
      setFssNo(fss);

      if (!token) {
        setLoadingStats(false);
        return;
      }

      const [statusRes, statsRes, historyRes] = await Promise.all([
        fetch(`${CONFIG.API_BASE_URL}/attendance/my-status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${CONFIG.API_BASE_URL}/attendance/my-stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${CONFIG.API_BASE_URL}/attendance/my-history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),

      ]);

      const safeJson = async (res: Response) => {
        if (res.status === 401) {
          await AsyncStorage.removeItem('token');
          router.replace('/login');
          return null;
        }
        if (!res.ok) return null;
        try {
          const text = await res.text();
          return text ? JSON.parse(text) : null;
        } catch (e) {
          return null;
        }
      };

      const statusData = await safeJson(statusRes);
      if (statusData) setTodayStatus(statusData);

      const statsData = await safeJson(statsRes);
      if (statsData) setStats(statsData);



      const historyData = await safeJson(historyRes);
      if (historyData && Array.isArray(historyData)) {
        setHistory(historyData);
        const marks: any = {};

        const formatDate = (d: any) => {
          const date = new Date(d);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        historyData.forEach((item: any) => {
          const dateStr = formatDate(item.date);
          let dotColor = '#64748b';
          switch (item.status) {
            case 'present': dotColor = '#10b981'; break;
            case 'late': dotColor = '#f59e0b'; break;
            case 'absent': dotColor = '#ef4444'; break;
            case 'leave': dotColor = '#3b82f6'; break;
          }
          marks[dateStr] = { marked: true, dotColor };
        });
        setMarkedDates(marks);
      }
    } catch (e) {
      console.error('Failed to fetch stats', e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (history.length > 0 && selectedDate) {
      const filtered = history.filter(item => {
        const itemDate = new Date(item.date);
        const dateStr = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;
        return dateStr === selectedDate;
      });
      setSelectedDayHistory(filtered);
    } else {
      setSelectedDayHistory([]);
    }
  }, [selectedDate, history]);

  const onDayPress = (day: any) => {
    setSelectedDate(day.dateString);
  };

  const takeSelfie = async () => {
    let { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (camStatus !== 'granted') {
      Alert.alert('Permission denied', 'Camera permission is required.');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);

      // Capture initial location immediately after taking selfie
      try {
        let { status: locStatus } = await Location.requestForegroundPermissionsAsync();
        if (locStatus === 'granted') {
          let loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setInitialLocation(loc.coords);
          console.log("Initial location captured:", loc.coords);
        }
      } catch (e) {
        console.warn("Failed to capture initial location:", e);
      }
    }
  };

  const selectStatus = (attendanceStatus: string) => {
    if (todayStatus) return;
    setStatus(attendanceStatus);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
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
    let loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    // Security check: verify location hasn't changed too much
    if (initialLocation) {
      const distance = calculateDistance(
        initialLocation.latitude,
        initialLocation.longitude,
        loc.coords.latitude,
        loc.coords.longitude
      );

      console.log(`Location verification: distance moved = ${distance.toFixed(2)}m`);

      if (distance > 100) {
        setSubmitting(false);
        Alert.alert(
          'Security Warning',
          'You have moved too far since taking the selfie. Please take a fresh selfie at your current location to continue.'
        );
        setImage(null);
        setInitialLocation(null);
        return;
      }
    }

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
      if (initialLocation) {
        formData.append('initial_location', JSON.stringify(initialLocation));
      }
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

      if (res.status === 401) {
        Alert.alert('Session Expired', 'Please log in again.');
        await AsyncStorage.removeItem('token');
        router.replace('/login');
        return;
      }

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.warn('Response parsing failed', e);
      }

      if (res.ok) {
        Alert.alert('Attendance Marked', 'Your status has been updated and synced with HR.');
        fetchStats();
        setImage(null);
        setNote('');
        setStatus(''); // Reset status selection
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

  console.log("todayStatus", todayStatus);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.headerProfile}>
            <View style={styles.avatarMini}>
              <Text style={styles.avatarMiniText}>{(employeeName || 'E').charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <View style={styles.welcomeRow}>
                <Text style={styles.welcomeBackText}>Welcome back,</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>ERP LIVE</Text>
                </View>
              </View>
              <Text style={styles.profileFullName}>{employeeName || 'Muhammad Riaz'}</Text>
              <Text style={styles.profileFssNo}>FSE-{fssNo || '447'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.endSessionBtn}>
            <Ionicons name="power-outline" size={20} color="#64748b" />
            <Text style={styles.endSessionText}>END SESSION</Text>
          </TouchableOpacity>
        </View>

        {/* Assignment Info (Optional feature retained) */}
        {assignment && (
          <View style={styles.assignmentCard}>
            <View style={styles.assignmentHeader}>
              <Ionicons name="location" size={20} color="#3b82f6" />
              <Text style={styles.assignmentTitle}>Current Assignment</Text>
            </View>
            <Text style={styles.siteName}>{assignment.site_name}</Text>
            <Text style={styles.clientName}>{assignment.client_name}</Text>
            <View style={styles.assignmentDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="map-outline" size={14} color="#64748b" />
                <Text style={styles.detailText}>{assignment.address}, {assignment.city}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={14} color="#64748b" />
                <Text style={styles.detailText}>Shift: {assignment.shift}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Main Attendance Card */}
        <View style={styles.attendanceWhiteCard}>
          <View style={styles.cardHeaderSmall}>
            <Text style={styles.cardHeaderLabel}>Current Status</Text>
            <View style={styles.monthBadge}>
              <Text style={styles.monthBadgeText}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
            </View>
          </View>
          <Text style={styles.readyText}>{todayStatus ? 'Daily synchronization complete' : 'Ready to mark your attendance'}</Text>

          {todayStatus ? (
            <View style={styles.capturedView}>
              <View style={styles.capturedIconCircle}>
                <Ionicons name="checkmark" size={40} color="#fff" />
              </View>
              <Text style={styles.capturedTitle}>Attendance Active</Text>

              <View style={styles.capturedBadgesRow}>
                <View style={[styles.statusBadge, { backgroundColor: '#10b981', marginRight: 10 }]}>
                  <Text style={[styles.statusLabel, { color: '#fff' }]}>{todayStatus.status.toUpperCase()}</Text>
                </View>

                <View style={[styles.syncBadge, { borderWidth: 1, borderColor: '#d1fae5' }]}>
                  <Ionicons name="cloud-done" size={14} color="#10b981" />
                  <Text style={styles.syncBadgeText}>Synced</Text>
                </View>
              </View>

              <View style={[styles.gpsBadge, { flexDirection: 'column', height: 'auto', paddingVertical: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Ionicons name="location" size={12} color="#475569" />
                  <Text style={styles.gpsBadgeText}>GPS Verification Secured</Text>
                </View>

                {todayStatus.initial_location && (
                  <Text style={{ fontSize: 10, color: '#64748b' }}>
                    Captured: {JSON.parse(todayStatus.initial_location).latitude.toFixed(6)}, {JSON.parse(todayStatus.initial_location).longitude.toFixed(6)}
                  </Text>
                )}

                {todayStatus.location && (
                  <Text style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                    Final: {JSON.parse(todayStatus.location).latitude.toFixed(6)}, {JSON.parse(todayStatus.location).longitude.toFixed(6)}
                  </Text>
                )}
              </View>
            </View>
          ) : selectedDate !== todayStr ? (
            <View style={[styles.capturedView, { paddingVertical: 40 }]}>
              <View style={[styles.capturedIconCircle, { backgroundColor: '#94a3b8' }]}>
                <Ionicons name="calendar-outline" size={40} color="#fff" />
              </View>
              <Text style={styles.capturedTitle}>Past Date Viewing</Text>
              <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 8 }}>
                Attendance can only be marked for the current date ({todayStr}).
              </Text>
            </View>
          ) : (
            <View style={styles.attendanceForm}>
              <TouchableOpacity style={styles.dashedCameraTrigger} onPress={takeSelfie} activeOpacity={0.7}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.fullPreview} />
                ) : (
                  <View style={styles.cameraCenter}>
                    <View style={styles.cameraIconBg}>
                      <Ionicons name="camera" size={30} color="#2563eb" />
                    </View>
                    <Text style={styles.cameraPromptText}>Take a live selfie to verify</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.selectStatusLabel}>SELECT YOUR STATUS</Text>
              <View style={styles.statusBarRow}>
                {['present', 'late', 'absent', 'leave'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => selectStatus(s)}
                    style={[
                      styles.statusSelectBtn,
                      status === s && styles.statusSelectBtnActive
                    ]}
                  >
                    <Text style={[styles.statusSelectText, status === s && styles.statusSelectTextActive]}>
                      {s.toUpperCase()}
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
                style={styles.whiteNoteInput}
                placeholder="Attach a message for HR (optional)..."
                value={note}
                onChangeText={setNote}
                placeholderTextColor="#94a3b8"
              />

              {initialLocation && (
                <View style={styles.locationDisplayRow}>
                  <Ionicons name="camera-outline" size={16} color="#2563eb" />
                  <Text style={styles.locationDisplayText}>Capture Location: {initialLocation.latitude.toFixed(6)}, {initialLocation.longitude.toFixed(6)}</Text>
                </View>
              )}

              {submitting && (
                <View style={[styles.locationDisplayRow, { marginTop: 4 }]}>
                  <Ionicons name="send-outline" size={16} color="#10b981" />
                  <Text style={styles.locationDisplayText}>Finalizing Submission Location...</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.confirmBtn, (!image || !status || submitting) && styles.confirmBtnDisabled]}
                onPress={handleManualSubmit}
                disabled={!image || !status || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.confirmBtnText}>CONFIRM ATTENDANCE</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Timeline History */}
        <View style={styles.historySectionLabel}>
          <View>
            <Text style={styles.historyMainTitle}>Timeline History</Text>
            <Text style={styles.historySubtitle}>View logs and attendance trends</Text>
          </View>
        </View>

        <View style={styles.premiumCalendarCard}>
          <View style={styles.calendarSummaryHeader}>
            <View style={styles.calMonthInfo}>
              <Text style={styles.calMonthName}>{new Date(calendarMonth).toLocaleString('default', { month: 'long' })}</Text>
              <Text style={styles.calYearInfo}>{new Date(calendarMonth).getFullYear()} • MONTHLY SUMMARY</Text>
            </View>
            <View style={styles.calNavArrows}>
              <TouchableOpacity style={styles.calNavBtn} onPress={goToPrevMonth}>
                <Ionicons name="chevron-back" size={20} color="#64748b" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calNavBtn, { marginLeft: 12, opacity: isNextMonthDisabled() ? 0.3 : 1 }]}
                onPress={goToNextMonth}
                disabled={isNextMonthDisabled()}
              >
                <Ionicons name="chevron-forward" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.calStatsRow}>
            <View style={styles.calStatBox}>
              <Text style={[styles.calStatVal, { color: '#1e293b' }]}>{stats.present + stats.late + stats.absent + stats.leave}</Text>
              <Text style={styles.calStatLab}>LOGS</Text>
            </View>
            <View style={styles.calStatDivider} />
            <View style={styles.calStatBox}>
              <Text style={[styles.calStatVal, { color: '#10b981' }]}>{stats.present}</Text>
              <Text style={styles.calStatLab}>PRES</Text>
            </View>
            <View style={styles.calStatDivider} />
            <View style={styles.calStatBox}>
              <Text style={[styles.calStatVal, { color: '#3b82f6' }]}>{stats.leave}</Text>
              <Text style={styles.calStatLab}>LEAV</Text>
            </View>
            <View style={styles.calStatDivider} />
            <View style={styles.calStatBox}>
              <Text style={[styles.calStatVal, { color: '#f59e0b' }]}>{stats.late}</Text>
              <Text style={styles.calStatLab}>LATE</Text>
            </View>
          </View>

          <Calendar
            key={calendarMonth}
            current={calendarMonth}
            onDayPress={onDayPress}
            hideArrows={true}
            enableSwipeMonths={false}
            maxDate={new Date().toLocaleDateString('en-CA')}
            markedDates={{
              ...markedDates,
              [selectedDate]: { ...(markedDates[selectedDate] || {}), selected: true, selectedColor: '#2563eb' }
            }}
            theme={{
              calendarBackground: '#fff',
              textSectionTitleColor: '#94a3b8',
              selectedDayBackgroundColor: '#2563eb',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#2563eb',
              dayTextColor: '#1e293b',
              textDisabledColor: '#e2e8f0',
              dotColor: '#2563eb',
              selectedDotColor: '#ffffff',
              arrowColor: '#1e293b',
              monthTextColor: '#1e293b',
              indicatorColor: '#1e293b',
              textDayFontWeight: '600',
              textMonthFontWeight: '800',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 14,
              textMonthFontSize: 0,
              textDayHeaderFontSize: 12
            }}
            renderHeader={() => null}
            style={{ marginTop: 10 }}
          />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.recentActivityTitle}>ACTIVITY FOR {selectedDate}</Text>
          <Text style={styles.logCountText}>{selectedDayHistory.length} Logs</Text>
        </View>

        {selectedDayHistory.length > 0 ? (
          <View style={{ marginBottom: 20 }}>
            {selectedDayHistory.map((item, index) => {
              const style = getStatusStyle(item.status);
              return (
                <View key={`sel-${index}`} style={styles.dayRecordCard}>
                  <View style={styles.dayRecordHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
                        <Text style={[styles.statusLabel, { color: style.color }]}>{item.status.toUpperCase()}</Text>
                      </View>

                    </View>
                    <Text style={styles.dayRecordTime}>
                      {new Date(item.created_at || item.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </Text>
                  </View>
                  {item.picture && (
                    <Image
                      source={{ uri: item.picture }}
                      style={{ width: '100%', height: 200, borderRadius: 12, marginTop: 8, marginBottom: 8, backgroundColor: '#f1f5f9' }}
                      resizeMode="cover"
                    />
                  )}
                  {item.location && (
                    <View style={{ marginTop: 8 }}>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${JSON.parse(item.location).latitude},${JSON.parse(item.location).longitude}`)}
                        style={styles.dayLocationLink}
                      >
                        <Ionicons name="location-outline" size={14} color="#2563eb" />
                        <Text style={styles.dayLocationText}>
                          Submission Location: {JSON.parse(item.location).latitude.toFixed(6)}, {JSON.parse(item.location).longitude.toFixed(6)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {item.initial_location && (
                    <View style={{ marginTop: 4 }}>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${JSON.parse(item.initial_location).latitude},${JSON.parse(item.initial_location).longitude}`)}
                        style={styles.dayLocationLink}
                      >
                        <Ionicons name="camera-outline" size={14} color="#64748b" />
                        <Text style={[styles.dayLocationText, { color: '#64748b' }]}>
                          Selfie Location: {JSON.parse(item.initial_location).latitude.toFixed(6)}, {JSON.parse(item.initial_location).longitude.toFixed(6)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyActivityPlaceholder}>
            <View style={styles.documentIconCircle}>
              <Ionicons name="document-text-outline" size={40} color="#94a3b8" />
            </View>
            <Text style={styles.emptyActivityText}>No logs found for this date.</Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fdfdfe' },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },

  // Header Styles
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, marginTop: 10 },
  headerProfile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarMini: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  avatarMiniText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  welcomeBackText: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, gap: 4 },
  liveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#10b981' },
  liveBadgeText: { fontSize: 9, fontWeight: '800', color: '#10b981', letterSpacing: 0.5 },
  profileFullName: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginTop: -2 },
  profileFssNo: { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginTop: 2 },
  endSessionBtn: { alignItems: 'center' },
  endSessionText: { fontSize: 9, fontWeight: '800', color: '#64748b', marginTop: 4 },

  // Attendance Card
  attendanceWhiteCard: { backgroundColor: '#fff', borderRadius: 40, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 30, elevation: 8, marginBottom: 30 },
  cardHeaderSmall: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardHeaderLabel: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  monthBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  monthBadgeText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  readyText: { fontSize: 14, color: '#94a3b8', marginBottom: 20, fontWeight: '500' },
  attendanceForm: { width: '100%' },
  dashedCameraTrigger: { width: '100%', height: 180, borderRadius: 32, borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  fullPreview: { width: '100%', height: '100%', objectFit: 'cover' },
  cameraCenter: { alignItems: 'center' },
  cameraIconBg: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  cameraPromptText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  selectStatusLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textAlign: 'center', marginBottom: 16, letterSpacing: 1 },
  statusBarRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statusSelectBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  statusSelectBtnActive: { backgroundColor: '#fff', borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  statusSelectText: { fontSize: 10, fontWeight: '800', color: '#94a3b8' },
  statusSelectTextActive: { color: '#1e293b' },
  leavePickerContainer: { marginBottom: 20, backgroundColor: '#f8fafc', borderRadius: 16, overflow: 'hidden' },
  simplePicker: { height: 50, color: '#1e293b' },
  whiteNoteInput: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, fontSize: 15, color: '#1e293b', marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  confirmBtn: { backgroundColor: '#1e293b', height: 56, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.7 },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  // Captured State
  capturedView: { alignItems: 'center', paddingVertical: 10 },
  capturedIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#10b981', shadowOpacity: 0.2, shadowRadius: 15, elevation: 5 },
  capturedTitle: { fontSize: 28, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  capturedBadgesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, gap: 4, borderWidth: 1, borderColor: '#d1fae5' },
  syncBadgeText: { fontSize: 11, fontWeight: '800', color: '#10b981', letterSpacing: 0.5 },
  gpsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 6, borderWidth: 1, borderColor: '#f1f5f9' },
  gpsBadgeText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },

  // Timeline History Label Section
  historySectionLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  historyMainTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  historySubtitle: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },

  // Premium Calendar Card
  premiumCalendarCard: { backgroundColor: '#fff', borderRadius: 32, padding: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 20, elevation: 4, marginBottom: 24, borderWidth: 1, borderColor: '#f8fafc' },
  calendarSummaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calMonthInfo: { flex: 1 },
  calMonthName: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  calYearInfo: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 2, letterSpacing: 0.5 },
  calNavArrows: { flexDirection: 'row' },
  calNavBtn: { padding: 4 },
  calStatsRow: { flexDirection: 'row', paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#f8fafc', marginBottom: 10 },
  calStatBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  calStatVal: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  calStatLab: { fontSize: 9, fontWeight: '800', color: '#cbd5e1', letterSpacing: 0.5 },
  calStatDivider: { width: 1, height: '70%', backgroundColor: '#f1f5f9', alignSelf: 'center' },

  // Recent Activity Placeholder
  recentActivityTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 4 },
  logCountText: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  emptyActivityPlaceholder: { width: '100%', height: 160, borderRadius: 32, borderStyle: 'dashed', borderWidth: 2, borderColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  documentIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  emptyActivityText: { fontSize: 13, color: '#94a3b8', fontWeight: '700', textAlign: 'center', width: '60%' },

  // Record Cards
  dayRecordCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  dayRecordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  dayRecordTime: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  dayLocationLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayLocationText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },

  // Assignment Info (Legacy)
  assignmentCard: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 24, shadowColor: '#3b82f6', shadowOpacity: 0.1, shadowRadius: 15, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#3b82f6' },
  assignmentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  assignmentTitle: { fontSize: 13, fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 0.5 },
  siteName: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  clientName: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 12 },
  assignmentDetails: { gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  locationDisplayRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, backgroundColor: '#f0f7ff', padding: 8, borderRadius: 8 },
  locationDisplayText: { fontSize: 12, fontWeight: '600', color: '#1e40af' },
  bottomSpacer: { height: 40 },
});
