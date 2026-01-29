import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/config';

export default function AttendanceHistoryScreen() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [markedDates, setMarkedDates] = useState({});
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedRecords, setSelectedRecords] = useState<any[]>([]);
    const router = useRouter();

    const fetchHistory = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${CONFIG.API_BASE_URL}/attendance/my-history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
                generateMarkedDates(data);
            }
        } catch (e) {
            console.error('Failed to fetch history', e);
        } finally {
            setLoading(false);
        }
    };

    const generateMarkedDates = (data: any[]) => {
        const marks: any = {};
        data.forEach(item => {
            const dateStr = new Date(item.date).toISOString().split('T')[0];
            let dotColor = '#64748b';
            switch (item.status) {
                case 'present': dotColor = '#10b981'; break;
                case 'late': dotColor = '#f59e0b'; break;
                case 'absent': dotColor = '#ef4444'; break;
                case 'leave': dotColor = '#3b82f6'; break;
            }

            marks[dateStr] = {
                marked: true,
                dotColor: dotColor,
                selected: selectedDate === dateStr,
                selectedColor: selectedDate === dateStr ? '#1e293b' : undefined,
            };
        });
        setMarkedDates(marks);
    };

    useEffect(() => {
        fetchHistory();
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
    }, []);

    useEffect(() => {
        if (history.length > 0 && selectedDate) {
            const filtered = history.filter(item =>
                new Date(item.date).toISOString().split('T')[0] === selectedDate
            );
            setSelectedRecords(filtered);
        }
    }, [selectedDate, history]);

    const onDayPress = (day: any) => {
        setSelectedDate(day.dateString);
        generateMarkedDates(history);
    };

    const getStatusStyle = (s: string) => {
        switch (s) {
            case 'present': return { color: '#10b981', bg: '#ecfdf5', label: 'Present' };
            case 'late': return { color: '#f59e0b', bg: '#fffbeb', label: 'Late' };
            case 'absent': return { color: '#ef4444', bg: '#fef2f2', label: 'Absent' };
            case 'leave': return { color: '#3b82f6', bg: '#eff6ff', label: 'Leave' };
            default: return { color: '#64748b', bg: '#f8fafc', label: s.toUpperCase() };
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1e293b" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Attendance History</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <Calendar
                    onDayPress={onDayPress}
                    markedDates={markedDates}
                    theme={{
                        backgroundColor: '#ffffff',
                        calendarBackground: '#ffffff',
                        textSectionTitleColor: '#b6c1cd',
                        selectedDayBackgroundColor: '#1e293b',
                        selectedDayTextColor: '#ffffff',
                        todayTextColor: '#2563eb',
                        dayTextColor: '#2d4150',
                        textDisabledColor: '#d9e1e8',
                        dotColor: '#2563eb',
                        selectedDotColor: '#ffffff',
                        arrowColor: '#1e293b',
                        monthTextColor: '#1e293b',
                        indicatorColor: '#1e293b',
                        textDayFontWeight: '600',
                        textMonthFontWeight: '800',
                        textDayHeaderFontWeight: '600',
                        textDayFontSize: 14,
                        textMonthFontSize: 18,
                        textDayHeaderFontSize: 12
                    }}
                    style={styles.calendar}
                />

                <View style={styles.detailsContainer}>
                    <Text style={styles.selectedDateText}>
                        {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Select a date'}
                    </Text>

                    {selectedRecords.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Ionicons name="calendar-outline" size={48} color="#e2e8f0" />
                            <Text style={styles.emptyText}>No attendance records found for this date.</Text>
                        </View>
                    ) : (
                        selectedRecords.map((item, index) => {
                            const style = getStatusStyle(item.status);
                            return (
                                <View key={index} style={styles.recordCard}>
                                    <View style={styles.recordHeader}>
                                        <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
                                            <Text style={[styles.statusLabel, { color: style.color }]}>{style.label}</Text>
                                        </View>
                                        <Text style={styles.timeText}>{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </View>

                                    {item.note && (
                                        <View style={styles.noteContainer}>
                                            <Text style={styles.noteTitle}>NOTE</Text>
                                            <Text style={styles.noteText}>{item.note}</Text>
                                        </View>
                                    )}

                                    {item.location && (
                                        <TouchableOpacity
                                            onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${JSON.parse(item.location).latitude},${JSON.parse(item.location).longitude}`)}
                                            style={styles.locationLink}
                                        >
                                            <Ionicons name="location" size={16} color="#2563eb" />
                                            <Text style={styles.locationText}>View Location on Maps</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })
                    )}
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    calendar: {
        margin: 16,
        borderRadius: 24,
        paddingBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    detailsContainer: { paddingHorizontal: 20 },
    selectedDateText: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 16, marginTop: 8 },
    recordCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 15,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    statusLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    timeText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
    noteContainer: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 16 },
    noteTitle: { fontSize: 10, fontWeight: '800', color: '#94a3b8', marginBottom: 4, letterSpacing: 0.5 },
    noteText: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
    locationLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    locationText: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
    emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: '#fff', borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0' },
    emptyText: { marginTop: 12, fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 40, fontWeight: '500' },
});
