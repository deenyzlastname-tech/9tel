import { useCallback, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowDownLeft, ArrowUpRight, Bell, Phone, PhoneMissed, X } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCallHistory } from "@/services/calls";
import { themedStyles, themeColor, useThemeVersion } from "@/theme";
import { tr } from "@/utils/tr";

// Bell button + "Call activity" sheet, shared with the Dialer screen's copy:
// both use the same "read at" key, so unread badges stay in sync.
const CALLS_READ_AT_KEY = "home-call-notifications-read-at";

function isMissedCall(call: any) {
  return call.direction === "inbound" && call.status !== "completed";
}

function displayCallNumber(counterparty: any) {
  const number = String(counterparty ?? "");
  const clientMatch = number.match(/^client:user-(.+)$/);
  return clientMatch ? tr("9tel user {{id}}", { id: clientMatch[1].slice(0, 6) }) : number;
}

export default function CallNotificationsBell() {
  useThemeVersion();
  const [callNotifications, setCallNotifications] = useState<any[] | null>(null);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [unreadMissedCalls, setUnreadMissedCalls] = useState(0);
  const [notificationsFailed, setNotificationsFailed] = useState(false);

  const loadCallNotifications = useCallback(async () => {
    try {
      const [records, lastReadAt] = await Promise.all([
        getCallHistory(),
        AsyncStorage.getItem(CALLS_READ_AT_KEY),
      ]);
      setCallNotifications(records.slice(0, 10));
      setNotificationsFailed(false);
      if (lastReadAt) {
        const readTimestamp = new Date(lastReadAt).getTime();
        setUnreadMissedCalls(records.filter(
          (call: any) => isMissedCall(call) && new Date(call.at).getTime() > readTimestamp
        ).length);
      } else {
        setUnreadMissedCalls(0);
      }
    } catch {
      setCallNotifications([]);
      setNotificationsFailed(true);
      setUnreadMissedCalls(0);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadCallNotifications();
  }, [loadCallNotifications]));

  return (
    <>
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={unreadMissedCalls ? tr("{{count}} new missed calls", { count: unreadMissedCalls }) : tr("Call notifications")}
    onPress={async () => {
      setNotificationsVisible(true);
      setUnreadMissedCalls(0);
      await AsyncStorage.setItem(CALLS_READ_AT_KEY, new Date().toISOString()).catch(() => undefined);
      await loadCallNotifications();
    }}
    style={styles.iconButton}
  >
    <Bell color={themeColor("#211B59")} size={21} />
    {unreadMissedCalls > 0 && (
      <View style={styles.notice}>
        <Text style={styles.noticeText}>{unreadMissedCalls > 9 ? "9+" : unreadMissedCalls}</Text>
      </View>
    )}
  </Pressable>

  <Modal
    visible={notificationsVisible}
    animationType="slide"
    transparent
    onRequestClose={() => setNotificationsVisible(false)}
  >
    <View style={styles.modalBackdrop}>
      <Pressable
        accessibilityLabel={tr("Close call notifications")}
        onPress={() => setNotificationsVisible(false)}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.notificationSheet}>
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>{tr("Call activity")}</Text>
            <Text style={styles.sheetSubtitle}>{tr("Recent incoming, outgoing, and missed calls")}</Text>
          </View>
          <Pressable accessibilityLabel={tr("Close")} onPress={() => setNotificationsVisible(false)} style={styles.closeButton}>
            <X size={19} color={themeColor("#5147AF")} />
          </Pressable>
        </View>
        {callNotifications === null ? (
          <View style={styles.notificationState}><ActivityIndicator color={themeColor("#5147AF")} /></View>
        ) : notificationsFailed ? (
          <View style={styles.notificationState}>
            <Text style={styles.notificationEmpty}>{tr("Call activity is unavailable right now.")}</Text>
          </View>
        ) : callNotifications.length === 0 ? (
          <View style={styles.notificationState}>
            <Text style={styles.notificationEmpty}>{tr("Your call updates will appear here after your first call.")}</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.notificationList}>
            {callNotifications.map((call) => {
              const missed = isMissedCall(call);
              const callNumber = displayCallNumber(call.counterparty);
              const canCallBack = /^\+?[0-9][0-9\s().-]{4,}$/.test(call.counterparty);
              const label = missed ? tr("Missed call") : call.direction === "outbound" ? tr("Outgoing call") : tr("Incoming call");
              return (
                <Pressable
                  key={call.id}
                  disabled={!canCallBack}
                  onPress={() => {
                    setNotificationsVisible(false);
                    router.push({ pathname: "/(screens)/call", params: { number: call.counterparty } });
                  }}
                  style={styles.notificationRow}
                >
                  <View style={[styles.callDirection, missed && styles.missedDirection]}>
                    {missed ? <PhoneMissed size={17} color={themeColor("#E66763")} /> : call.direction === "inbound" ? <ArrowDownLeft size={17} color={themeColor("#2EAF7D")} /> : <ArrowUpRight size={17} color={themeColor("#2EAF7D")} />}
                  </View>
                  <View style={styles.notificationCopy}>
                    <Text style={[styles.callLabel, missed && styles.missedText]}>{label}</Text>
                    <Text style={styles.callNumber} numberOfLines={1}>{callNumber}</Text>
                    <Text style={styles.callDate}>{new Date(call.at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</Text>
                  </View>
                  {canCallBack && <Phone size={18} color={themeColor("#5147AF")} />}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  </Modal>
    </>
  );
}

const styles = themedStyles({
  iconButton: { height: 45, width: 45, borderRadius: 15, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#29205F", shadowOpacity: 0.09, shadowRadius: 12, elevation: 3 },
  notice: { minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: "#FF6D63", position: "absolute", top: 5, right: 5, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FFF" },
  noticeText: { color: "#FFF", fontFamily: "Poppins-SemiBold", fontSize: 8 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(24,20,56,.38)", justifyContent: "flex-end" },
  notificationSheet: { maxHeight: "78%", minHeight: 250, backgroundColor: "#F8F8FD", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 28 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 17 },
  sheetTitle: { color: "#211B59", fontFamily: "Poppins-SemiBold", fontSize: 20 },
  sheetSubtitle: { color: "#85829B", fontFamily: "Poppins-Regular", fontSize: 10.5, marginTop: 2 },
  closeButton: { height: 38, width: 38, borderRadius: 13, backgroundColor: "#EEECFF", alignItems: "center", justifyContent: "center" },
  notificationState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  notificationEmpty: { color: "#85829B", fontFamily: "Poppins-Regular", fontSize: 12, textAlign: "center", lineHeight: 19 },
  notificationList: { paddingBottom: 12 },
  notificationRow: { backgroundColor: "#FFF", borderRadius: 17, minHeight: 76, paddingHorizontal: 13, paddingVertical: 11, flexDirection: "row", alignItems: "center", marginBottom: 9 },
  callDirection: { height: 37, width: 37, borderRadius: 13, backgroundColor: "#E4F6EE", alignItems: "center", justifyContent: "center", marginRight: 11 },
  missedDirection: { backgroundColor: "#FFE6E4" },
  notificationCopy: { flex: 1, marginRight: 8 },
  callLabel: { color: "#302C4C", fontFamily: "Poppins-Medium", fontSize: 11.5 },
  missedText: { color: "#E66763" },
  callNumber: { color: "#514D66", fontFamily: "Poppins-Regular", fontSize: 10.5, marginTop: 1 },
  callDate: { color: "#9693A9", fontFamily: "Poppins-Regular", fontSize: 9, marginTop: 2 },
});
