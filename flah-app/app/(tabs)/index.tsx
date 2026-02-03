
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Image, TextInput, ActivityIndicator, Platform, ScrollView, TouchableOpacity, Linking, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { CONFIG } from '../../constants/config';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';

// Haversine formula to calculate distance between two points in meters
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371000; // Radius of Earth in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function DashboardScreen() {
  const [status, setStatus] = useState('');
  const [statusError, setStatusError] = useState(false);
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
  const [attendancePhase, setAttendancePhase] = useState<'check_in' | 'check_out' | 'overtime_in' | 'overtime_out'>('check_in');
  const [activeTab, setActiveTab] = useState<'standard' | 'overtime'>('standard');
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
      console.log("Fetched Today Status:", statusData);

      if (statusData) {
        setTodayStatus(statusData);

        // Unified Phase Detection
        const hasCheckIn = !!(statusData.check_in && statusData.check_in.trim() !== '');
        const hasCheckOut = !!(statusData.check_out && statusData.check_out.trim() !== '');
        const hasOTIn = !!(statusData.overtime_in && statusData.overtime_in.trim() !== '');
        const hasOTOut = !!(statusData.overtime_out && statusData.overtime_out.trim() !== '');

        if (!hasCheckIn) {
          setAttendancePhase('check_in');
          setActiveTab('standard');
        } else if (!hasCheckOut) {
          setAttendancePhase('check_out');
          setActiveTab('standard');
        } else {
          setActiveTab('overtime');
          if (!hasOTIn) setAttendancePhase('overtime_in');
          else if (!hasOTOut) setAttendancePhase('overtime_out');
          else setAttendancePhase('check_in'); // All done
        }
      } else {
        setTodayStatus(null);
        setAttendancePhase('check_in');
        setActiveTab('standard');
      }

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
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      cameraType: ImagePicker.CameraType.front
    });
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
    setStatus(attendanceStatus);
    setStatusError(false);
  };


  const handleManualSubmit = async () => {
    if (attendancePhase === 'check_in' && !status) {
      setStatusError(true);
      Alert.alert('Selection Error', 'Please select your status (Present, Late, etc.) before submitting.');
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
    await submitAttendance(attendancePhase, status || 'present', loc.coords, image);
  };

  const submitAttendance = async (phase: string, attendanceStatus: string, coords: any, imageUri: string) => {
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const formData = new FormData();
      formData.append('type', phase);
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
        Alert.alert('Success', `${phase.replace('_', ' ').toUpperCase()} recorded successfully.`);
        console.log("Submit Response Data:", data);

        if (data && typeof data === 'object') {
          setTodayStatus(data);

          const hasCheckIn = !!(data.check_in && data.check_in.trim() !== '');
          const hasCheckOut = !!(data.check_out && data.check_out.trim() !== '');
          const hasOTIn = !!(data.overtime_in && data.overtime_in.trim() !== '');

          // Proactive UI transition
          if (!hasCheckIn) {
            setAttendancePhase('check_in');
            setActiveTab('standard');
          } else if (!hasCheckOut) {
            setAttendancePhase('check_out');
            setActiveTab('standard');
          } else {
            setActiveTab('overtime');
            if (!hasOTIn) setAttendancePhase('overtime_in');
            else setAttendancePhase('overtime_out');
          }
        }

        // Delay fetch to let DB settle and sync other stats
        setTimeout(() => fetchStats(), 1500);

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

          {todayStatus && todayStatus.check_in && todayStatus.check_out && todayStatus.overtime_in && todayStatus.overtime_out ? (
            <View style={styles.capturedView}>
              <View style={styles.capturedIconCircle}>
                <Ionicons name="checkmark-done" size={40} color="#fff" />
              </View>
              <Text style={styles.capturedTitle}>Shift Completed</Text>
              <Text style={{ color: '#64748b', textAlign: 'center' }}>All attendance phases for today have been recorded.</Text>
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
              {/* Enhanced Tab Selector */}
              {todayStatus?.check_out && (
                <View style={styles.tabContainer}>
                  <TouchableOpacity
                    onPress={() => setActiveTab('standard')}
                    style={[styles.tabBtn, activeTab === 'standard' && styles.tabBtnActive]}
                  >
                    <Ionicons name={"time" as any} size={16} color={activeTab === 'standard' ? '#2563eb' : '#64748b'} style={{ marginRight: 6 }} />
                    <Text style={[styles.tabText, activeTab === 'standard' && styles.tabTextActive]}>Regular Shift</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setActiveTab('overtime')}
                    style={[styles.tabBtn, activeTab === 'overtime' && styles.tabBtnActive]}
                  >
                    <Ionicons name={"flash" as any} size={16} color={activeTab === 'overtime' ? '#7c3aed' : '#64748b'} style={{ marginRight: 6 }} />
                    <Text style={[styles.tabText, activeTab === 'overtime' && styles.tabTextActive]}>Overtime</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.phaseSelectorRow}>
                {(activeTab === 'standard' ? [
                  { id: 'check_in', label: 'CHECK IN', icon: 'enter-outline', color: '#2563eb', active: attendancePhase === 'check_in', done: !!todayStatus?.check_in, disabled: false },
                  { id: 'check_out', label: 'CHECK OUT', icon: 'exit-outline', color: '#f59e0b', active: attendancePhase === 'check_out', done: !!todayStatus?.check_out, disabled: !todayStatus?.check_in },
                ] : [
                  { id: 'overtime_in', label: 'OT IN', icon: 'play-outline', color: '#7c3aed', active: attendancePhase === 'overtime_in', done: !!todayStatus?.overtime_in, disabled: false },
                  { id: 'overtime_out', label: 'OT OUT', icon: 'stop-outline', color: '#10b981', active: attendancePhase === 'overtime_out', done: !!todayStatus?.overtime_out, disabled: !todayStatus?.overtime_in },
                ]).map((phase: any) => (
                  <TouchableOpacity
                    key={phase.id}
                    onPress={() => !phase.disabled && setAttendancePhase(phase.id as any)}
                    disabled={phase.disabled}
                    style={[
                      styles.phaseBtn,
                      phase.active && { borderColor: phase.color, borderBottomWidth: 4 },
                      phase.done && styles.phaseBtnDone,
                      phase.disabled && { opacity: 0.3 }
                    ]}
                  >
                    <Ionicons name={phase.icon as any} size={14} color={phase.active ? phase.color : phase.disabled ? '#cbd5e1' : '#94a3b8'} style={{ marginRight: 4 }} />
                    <Text style={[
                      styles.phaseBtnText,
                      phase.active && { color: phase.color, fontWeight: '900' },
                      phase.done && styles.phaseBtnTextDone,
                      phase.disabled && { color: '#cbd5e1' }
                    ]}>
                      {phase.label}
                    </Text>
                    {phase.done && <Ionicons name={"checkmark-circle" as any} size={12} color="#10b981" style={{ marginLeft: 4 }} />}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Conditional Display: Phase Summary OR Submission Form */}
              {(() => {
                const isCurrentPhaseDone =
                  (attendancePhase === 'check_in' && todayStatus?.check_in && todayStatus.check_in.trim() !== '') ||
                  (attendancePhase === 'check_out' && todayStatus?.check_out && todayStatus.check_out.trim() !== '') ||
                  (attendancePhase === 'overtime_in' && todayStatus?.overtime_in && todayStatus.overtime_in.trim() !== '') ||
                  (attendancePhase === 'overtime_out' && todayStatus?.overtime_out && todayStatus.overtime_out.trim() !== '');

                if (isCurrentPhaseDone) {
                  const data = attendancePhase === 'check_in' ? { time: todayStatus?.check_in, picture: todayStatus?.picture, loc: todayStatus?.location } :
                    attendancePhase === 'check_out' ? { time: todayStatus?.check_out, picture: todayStatus?.check_out_picture, loc: todayStatus?.check_out_location } :
                      attendancePhase === 'overtime_in' ? { time: todayStatus?.overtime_in, picture: todayStatus?.overtime_in_picture, loc: todayStatus?.overtime_in_location } :
                        { time: todayStatus?.overtime_out, picture: todayStatus?.overtime_out_picture, loc: todayStatus?.overtime_out_location };

                  return (
                    <View style={styles.phaseSummaryCard}>
                      <View style={styles.summaryTopRow}>
                        <View style={[styles.summaryStatusBadge, { backgroundColor: attendancePhase.includes('overtime') ? '#f5f3ff' : '#eff6ff' }]}>
                          <Ionicons name="checkmark-circle" size={16} color={attendancePhase.includes('overtime') ? '#7c3aed' : '#2563eb'} />
                          <Text style={[styles.summaryStatusText, { color: attendancePhase.includes('overtime') ? '#7c3aed' : '#2563eb' }]}>RECORDED</Text>
                        </View>
                        <Text style={styles.summaryTimeText}>{data.time}</Text>
                      </View>

                      {data.picture && (
                        <Image source={{ uri: data.picture }} style={styles.summaryImage} />
                      )}

                      {data.loc && (
                        <TouchableOpacity
                          style={styles.summaryLocationBtn}
                          onPress={() => {
                            try {
                              const coords = JSON.parse(data.loc);
                              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`);
                            } catch (e) { }
                          }}
                        >
                          <Ionicons name="location" size={16} color="#64748b" />
                          <Text style={styles.summaryLocationText}>View Captured Location</Text>
                          <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
                        </TouchableOpacity>
                      )}

                      {attendancePhase === 'check_in' && todayStatus?.status && (
                        <View style={styles.statusInfoRow}>
                          <Text style={styles.statusInfoLabel}>Day Status:</Text>
                          <Text style={[styles.statusInfoValue, { color: getStatusStyle(todayStatus.status).color }]}>
                            {todayStatus.status.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                }

                return (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.dashedCameraTrigger,
                        { borderColor: attendancePhase === 'check_in' ? '#2563eb' : attendancePhase === 'check_out' ? '#f59e0b' : attendancePhase === 'overtime_in' ? '#7c3aed' : '#10b981' }
                      ]}
                      onPress={takeSelfie}
                      activeOpacity={0.7}
                    >
                      {image ? (
                        <Image source={{ uri: image }} style={styles.fullPreview} />
                      ) : (
                        <View style={styles.cameraCenter}>
                          <View style={[styles.cameraIconBg, { backgroundColor: attendancePhase === 'check_in' ? '#eff6ff' : attendancePhase === 'check_out' ? '#fff7ed' : attendancePhase === 'overtime_in' ? '#f5f3ff' : '#f0fdf4' }]}>
                            <Ionicons
                              name="camera"
                              size={30}
                              color={attendancePhase === 'check_in' ? '#2563eb' : attendancePhase === 'check_out' ? '#f59e0b' : attendancePhase === 'overtime_in' ? '#7c3aed' : '#10b981'}
                            />
                          </View>
                          <Text style={[styles.cameraPromptText, { color: attendancePhase === 'check_in' ? '#2563eb' : attendancePhase === 'check_out' ? '#f59e0b' : attendancePhase === 'overtime_in' ? '#7c3aed' : '#10b981' }]}>
                            Take {attendancePhase.replace('_', ' ').toUpperCase()} Selfie
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {attendancePhase === 'check_in' && !todayStatus?.check_in && (
                      <>
                        <Text style={[styles.selectStatusLabel, statusError && { color: '#ef4444', fontWeight: '900' }]}>
                          {statusError ? "⚠ SELECTION REQUIRED" : "SELECT YOUR STATUS"}
                        </Text>
                        <View style={styles.statusBarRow}>
                          {['present', 'late', 'absent', 'leave'].map((s) => {
                            const style = getStatusStyle(s);
                            const isActive = status === s;
                            return (
                              <TouchableOpacity
                                key={s}
                                onPress={() => selectStatus(s)}
                                style={[
                                  styles.statusSelectBtn,
                                  isActive && { backgroundColor: style.color, borderColor: style.color, shadowColor: style.color, shadowOpacity: 0.3, elevation: 4 }
                                ]}
                              >
                                <Text style={[
                                  styles.statusSelectText,
                                  !isActive && { color: style.color },
                                  isActive && { color: '#ffffff' }
                                ]}>
                                  {s.toUpperCase()}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    )}

                    {status === 'leave' && attendancePhase === 'check_in' && (
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

                    <TouchableOpacity
                      style={[
                        styles.confirmBtn,
                        { backgroundColor: attendancePhase === 'check_in' ? '#2563eb' : attendancePhase === 'check_out' ? '#f59e0b' : attendancePhase === 'overtime_in' ? '#7c3aed' : '#10b981' },
                        (!image || submitting) && styles.confirmBtnDisabled
                      ]}
                      onPress={handleManualSubmit}
                      disabled={!image || submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.confirmBtnText}>SUBMIT {attendancePhase.replace('_', ' ').toUpperCase()}</Text>
                          <Ionicons name={"cloud-upload" as any} size={20} color="#fff" style={{ marginLeft: 12 }} />
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                );
              })()}
            </View>
          )}
        </View>

        <View style={styles.historySectionLabel}>
          <View>
            <Text style={styles.historyMainTitle}>Timeline History</Text>
            <Text style={styles.historySubtitle}>View logs and attendance trends</Text>
          </View>
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => router.push('/(tabs)/history')}
          >
            <Text style={styles.viewAllText}>View Full History</Text>
            <Ionicons name="chevron-forward" size={14} color="#2563eb" />
          </TouchableOpacity>
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
              const phases = [
                { id: 'check_in', label: 'CHECK IN', time: item.check_in, pic: item.picture, loc: item.location, icon: 'enter-outline', color: '#2563eb' },
                { id: 'check_out', label: 'CHECK OUT', time: item.check_out, pic: item.check_out_picture, loc: item.check_out_location, icon: 'exit-outline', color: '#f59e0b' },
                { id: 'overtime_in', label: 'OT IN', time: item.overtime_in, pic: item.overtime_in_picture, loc: item.overtime_in_location, icon: 'play-outline', color: '#7c3aed' },
                { id: 'overtime_out', label: 'OT OUT', time: item.overtime_out, pic: item.overtime_out_picture, loc: item.overtime_out_location, icon: 'stop-outline', color: '#10b981' },
              ].filter(p => !!p.time);

              return (
                <View key={`record-${index}`} style={styles.recordWrapper}>
                  {phases.length > 0 ? phases.map((phase, pIdx) => {
                    const statusStyle = getStatusStyle(item.status);
                    const isCheckIn = phase.id === 'check_in';

                    return (
                      <View key={`${phase.id}-${pIdx}`} style={styles.timelineItem}>
                        <View style={styles.timelineSidebar}>
                          <View style={[styles.timelineIconBg, { backgroundColor: phase.color + '15' }]}>
                            <Ionicons name={phase.icon as any} size={16} color={phase.color} />
                          </View>
                          {pIdx < phases.length - 1 && <View style={styles.timelineConnector} />}
                        </View>

                        <View style={styles.timelineContent}>
                          <View style={styles.timelineHeader}>
                            <View>
                              <Text style={[styles.timelineLabel, { color: phase.color }]}>{phase.label}</Text>
                              <Text style={styles.timelineTime}>{phase.time}</Text>
                            </View>
                            {isCheckIn && (
                              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                                <Text style={[styles.statusLabel, { color: statusStyle.color }]}>{item.status.toUpperCase()}</Text>
                              </View>
                            )}
                          </View>

                          {phase.pic && (
                            <Image source={{ uri: phase.pic }} style={styles.timelineImage} />
                          )}

                          {phase.loc && (
                            <TouchableOpacity
                              style={styles.timelineLocationBtn}
                              onPress={() => {
                                try {
                                  const coords = JSON.parse(phase.loc);
                                  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`);
                                } catch (e) { }
                              }}
                            >
                              <Ionicons name="location" size={12} color="#64748b" />
                              <Text style={styles.timelineLocationText}>View Location</Text>
                            </TouchableOpacity>
                          )}

                          {item.note && isCheckIn && (
                            <View style={styles.timelineNoteBox}>
                              <Ionicons name="chatbubble-outline" size={12} color="#64748b" />
                              <Text style={styles.timelineNoteText}>{item.note}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  }) : (
                    <View style={styles.dayRecordCard}>
                      <View style={styles.dayRecordHeader}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(item.status).bg }]}>
                          <Text style={[styles.statusLabel, { color: getStatusStyle(item.status).color }]}>{item.status.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.dayRecordTime}>{item.date}</Text>
                      </View>
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
  confirmBtn: { height: 64, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },

  // Timeline Styles
  recordWrapper: { backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  timelineItem: { flexDirection: 'row', gap: 12 },
  timelineSidebar: { width: 32, alignItems: 'center' },
  timelineIconBg: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  timelineConnector: { width: 2, flex: 1, backgroundColor: '#f1f5f9', marginVertical: 4 },
  timelineContent: { flex: 1, paddingBottom: 20 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  timelineLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  timelineTime: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  timelineImage: { width: '100%', height: 160, borderRadius: 12, marginVertical: 8, backgroundColor: '#f8fafc' },
  timelineLocationBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
  timelineLocationText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  timelineNoteBox: { flexDirection: 'row', gap: 6, marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: '#f8fafc' },
  timelineNoteText: { flex: 1, fontSize: 12, color: '#64748b', fontStyle: 'italic' },

  // Summary Display
  phaseSummaryCard: { backgroundColor: '#f8fafc', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#eff6ff' },
  summaryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  summaryStatusText: { fontSize: 11, fontWeight: '800' },
  summaryTimeText: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  summaryImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: 12, backgroundColor: '#cbd5e1' },
  summaryLocationBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  summaryLocationText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#64748b' },
  statusInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 4 },
  statusInfoLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  statusInfoValue: { fontSize: 12, fontWeight: '900' },

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
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 4 },
  viewAllText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },

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
  tabContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 16, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#1e293b' },
  phaseSelectorRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  phaseBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 1, borderColor: 'transparent' },
  phaseBtnActive: { backgroundColor: '#fff', borderColor: '#2563eb', shadowColor: '#2563eb', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  phaseBtnDone: { backgroundColor: '#f0fdf4' },
  phaseBtnText: { fontSize: 10, fontWeight: '800', color: '#64748b' },
  phaseBtnTextActive: { color: '#2563eb' },
  phaseBtnTextDone: { color: '#10b981' },
  bottomSpacer: { height: 40 },
});
