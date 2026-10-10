import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowDownLeft, ArrowUpRight, Bell, ChevronDown, Delete, Phone, PhoneMissed, Search, UsersRound, Video, X } from "lucide-react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { router, useFocusEffect } from "expo-router";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCallHistory } from "@/services/calls";
import { normalizeDestination } from "@/utils/phone";
import { PICKER_COUNTRIES, countryByIso, flagEmoji, matchCallingCode } from "@/constants/callingCodes";
import { themedStyles, themeColor, useThemeVersion } from "@/theme";
import { tr } from "@/utils/tr";
import { useTranslation } from "react-i18next";

const CALLS_READ_AT_KEY = "home-call-notifications-read-at";
const DEFAULT_COUNTRY_KEY = "dialer-default-country";

// Light grouping so long numbers stay readable: "+234 801 234 5678".
function formatTyped(value) {
  if (!value) return "";
  const lead = value.startsWith("+") ? "+" : "";
  const digits = value.replace(/\D/g, "");
  return lead + digits.replace(/(\d{3})(?=\d)/g, "$1 ");
}

function isMissedCall(call) {
  return call.direction === "inbound" && call.status !== "completed";
}

function displayCallNumber(counterparty) {
  const number = String(counterparty ?? "");
  const clientMatch = number.match(/^client:user-(.+)$/);
  return clientMatch ? tr("9tel user {{id}}", { id: clientMatch[1].slice(0, 6) }) : number;
}

const keys = [
  ["1", ""], ["2", "ABC"], ["3", "DEF"],
  ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
  ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
  ["*", ""], ["0", "+"], ["#", ""],
];

// Real DTMF (dual-tone multi-frequency) tones — the actual sound a phone
// keypad makes — one per key. require() needs static string literals, so
// this can't be built from a loop; the filenames match assets/sounds/dtmf.
const DTMF_SOUNDS = {
  "1": require("../../assets/sounds/dtmf/1.wav"),
  "2": require("../../assets/sounds/dtmf/2.wav"),
  "3": require("../../assets/sounds/dtmf/3.wav"),
  "4": require("../../assets/sounds/dtmf/4.wav"),
  "5": require("../../assets/sounds/dtmf/5.wav"),
  "6": require("../../assets/sounds/dtmf/6.wav"),
  "7": require("../../assets/sounds/dtmf/7.wav"),
  "8": require("../../assets/sounds/dtmf/8.wav"),
  "9": require("../../assets/sounds/dtmf/9.wav"),
  "*": require("../../assets/sounds/dtmf/star.wav"),
  "0": require("../../assets/sounds/dtmf/0.wav"),
  "#": require("../../assets/sounds/dtmf/hash.wav"),
};

export default function Dialer() {
  useTranslation();
  useThemeVersion();
  // The default country, used for numbers typed without a "+"; it is the
  // person's saved choice, else detected from their network, else Nigeria.
  const [country, setCountry] = useState({ iso: "ng", name: "Nigeria", code: "+234" });
  const [countryChosen, setCountryChosen] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const { height: windowHeight } = useWindowDimensions();
  const [number, setNumber] = useState("");
  const [callNotifications, setCallNotifications] = useState(null);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [unreadMissedCalls, setUnreadMissedCalls] = useState(0);
  const [notificationsFailed, setNotificationsFailed] = useState(false);
  const digits = useMemo(() => number.replace(/\D/g, ""), [number]);
  const soundsRef = useRef({});

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
          (call) => isMissedCall(call) && new Date(call.at).getTime() > readTimestamp
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // A country the person picked themselves always wins over detection.
      const saved = await AsyncStorage.getItem(DEFAULT_COUNTRY_KEY).catch(() => null);
      const savedCountry = countryByIso(saved);
      if (savedCountry && !cancelled) {
        setCountry({ iso: savedCountry.iso, name: savedCountry.name, code: `+${savedCountry.code}` });
        setCountryChosen(true);
        return;
      }
      // country_name and country_calling_code both come from the same ipapi
      // lookup, so they always describe the same country.
      fetch("https://ipapi.co/json/")
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((location) => {
          if (cancelled) return;
          setCountry({
            iso: String(location.country_code || "ng").toLowerCase(),
            name: location.country_name || "Nigeria",
            code: location.country_calling_code || "+234",
          });
        })
        .catch(() => undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The country shown follows what is being typed: a number starting with
  // "+" or "00" is matched by its calling code as you type; otherwise the
  // default country applies.
  const typedCountry = useMemo(() => matchCallingCode(number), [number]);
  const international = number.startsWith("+") || number.startsWith("00");
  const activeCountry = typedCountry
    ? { iso: typedCountry.iso, name: typedCountry.name, code: `+${typedCountry.code}` }
    : international
      ? { iso: "", name: digits.length > 2 ? tr("Unknown country code") : tr("Enter country code"), code: "+" }
      : country;

  const chooseCountry = async (picked) => {
    setCountry({ iso: picked.iso, name: picked.name, code: `+${picked.code}` });
    setCountryChosen(true);
    setCountryPickerVisible(false);
    setCountrySearch("");
    await AsyncStorage.setItem(DEFAULT_COUNTRY_KEY, picked.iso).catch(() => undefined);
  };

  const filteredPickerCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase().replace(/^\+/, "");
    if (!q) return PICKER_COUNTRIES;
    return PICKER_COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.code.startsWith(q));
  }, [countrySearch]);

  // Recent numbers that can be called back, for one-tap redial.
  const recentNumbers = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const call of callNotifications ?? []) {
      const n = String(call.counterparty ?? "");
      if (!/^\+?[0-9][0-9\s().-]{4,}$/.test(n) || seen.has(n)) continue;
      seen.add(n);
      list.push(n);
      if (list.length >= 6) break;
    }
    return list;
  }, [callNotifications]);

  const pasteNumber = async () => {
    try {
      const text = (await Clipboard.getString()).trim();
      const cleaned = text.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
      if (cleaned.replace(/\D/g, "").length >= 3) {
        setNumber(cleaned.slice(0, 20));
        Haptics.selectionAsync().catch(() => undefined);
      }
    } catch {
      // clipboard unavailable — nothing to paste
    }
  };

  // Preload every DTMF tone once so playback on tap is instant rather than
  // decoding a file on every keypress.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Configure the audio session once, explicitly, rather than relying on
      // expo-av's defaults — without this, rapid repeated playback of short
      // SFX (a fast sequence of keypresses) can play back inconsistently on
      // some devices, which is consistent with "tone doesn't always match
      // the key" and "sometimes no sound at all".
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      }).catch(() => undefined);

      const entries = await Promise.all(
        Object.entries(DTMF_SOUNDS).map(async ([key, source]) => {
          try {
            const { sound } = await Audio.Sound.createAsync(source);
            return [key, sound];
          } catch {
            return [key, null];
          }
        })
      );
      if (cancelled) {
        entries.forEach(([, sound]) => sound?.unloadAsync());
        return;
      }
      soundsRef.current = Object.fromEntries(entries);
    })();
    return () => {
      cancelled = true;
      Object.values(soundsRef.current).forEach((sound) => sound?.unloadAsync());
    };
  }, []);

  const playDtmf = async (key) => {
    const sound = soundsRef.current[key];
    if (sound) {
      // Explicit stop + seek-to-0 + play, rather than replayAsync(). If a
      // key is tapped again before the previous tone finished, replayAsync()
      // racing against still-in-progress playback is what produced tones
      // that didn't match the key just pressed; this sequence is the more
      // defensive, well-documented way to force a clean restart.
      try {
        await sound.stopAsync();
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } catch {
        // ignore — a missed tone isn't worth surfacing to the user
      }
      return;
    }
    // Preloading hadn't finished yet (e.g. a key tapped in the first instant
    // after this screen mounts) — load this one tone on demand so a press
    // never silently produces nothing, and cache it for next time.
    const source = DTMF_SOUNDS[key];
    if (!source) return;
    try {
      const { sound: freshSound } = await Audio.Sound.createAsync(source, { shouldPlay: true });
      soundsRef.current[key] = freshSound;
    } catch {
      // ignore
    }
  };

  const pressKey = (key) => {
    setNumber((value) => value + key);
    Haptics.selectionAsync().catch(() => undefined);
    playDtmf(key);
  };

  // Long-press "0" to insert "+" — the "+" shown under "0" was previously
  // just decorative text with nothing wired to it. This is the standard
  // phone-dialer convention (iOS and Android both do this), not a custom
  // gesture. zeroHeldRef suppresses the short-press "0" that would
  // otherwise also fire on release right after a long-press — Pressable
  // fires onPress on release regardless of whether onLongPress already
  // fired, so without this guard a long-press would insert "0+" instead of
  // just "+".
  const zeroHeldRef = useRef(false);
  const handleZeroPress = () => {
    if (zeroHeldRef.current) {
      zeroHeldRef.current = false;
      return;
    }
    pressKey("0");
  };
  const handleZeroLongPress = () => {
    zeroHeldRef.current = true;
    setNumber((value) => value + "+");
    Haptics.selectionAsync().catch(() => undefined);
    // "+" isn't a real DTMF tone (it's a dialing convention, not a signal
    // Twilio sends) — haptic-only feedback here is correct, not a gap.
  };

  // Navigate to the call screen immediately rather than waiting here for
  // startVoiceCall() to resolve — that call involves a mic-permission
  // prompt, a network round trip for the access token, and the SDK's own
  // connect() handshake, so awaiting it before navigating was the delay
  // between tapping call and anything appearing on screen. The call screen
  // already starts the call itself (see app/(screens)/call.tsx) and shows
  // "Connecting…" the moment it mounts, so nothing here needs to wait.
  const startCall = (video = false) => {
    if (!digits) return Alert.alert(tr("Enter a number"), tr("Choose a contact or enter the number you want to call."));
    const destination = normalizeDestination(number, activeCountry.code);
    router.push({ pathname: "/(screens)/call", params: { number: destination, video: video ? "true" : "false" } });
  };

  // Scale the keypad to the screen so it fits small phones and uses the
  // space on tall ones.
  const compact = windowHeight < 700;
  const keyHeight = Math.max(46, Math.min(66, Math.round(windowHeight * 0.074)));
  const keyFont = compact ? 24 : 27;
  const numberFont = number.length > 14 ? 22 : compact ? 25 : 28;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.page}>
        <View style={styles.topbar}>
          <View style={styles.brandCopy}>
            <Text style={styles.brand}>{tr("9tel")}</Text>
            <Text style={styles.welcome}>{tr("Borderless call, wherever you are")}</Text>
          </View>
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
        </View>

        <View style={styles.quickRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("Contacts")}
            onPress={() => router.push("/(screens)/contacts")}
            style={styles.contactsBtn}
          >
            <UsersRound color={themeColor("#5147AF")} size={17} />
            <Text style={styles.contactsText}>{tr("Contacts")}</Text>
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            {recentNumbers.length === 0 ? (
              <Text style={styles.chipsHint}>{tr("Recent numbers appear here")}</Text>
            ) : (
              recentNumbers.map((n) => (
                <Pressable key={n} accessibilityLabel={tr("Dial {{number}}", { number: n })} onPress={() => setNumber(n)} style={styles.chip}>
                  <Text style={styles.chipText} numberOfLines={1}>{n}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>

        <View style={styles.numberArea}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("Change country")}
            style={styles.countryPill}
            onPress={() => setCountryPickerVisible(true)}
          >
            <Text style={styles.flag}>{activeCountry.iso ? flagEmoji(activeCountry.iso) : "🌐"}</Text>
            <Text style={styles.countryText}>{activeCountry.code}</Text>
            <Text style={styles.countryName} numberOfLines={1}>{activeCountry.name}</Text>
            <ChevronDown color={themeColor("#625BC1")} size={15} />
          </Pressable>
          <Pressable onLongPress={pasteNumber} delayLongPress={400} style={styles.numberWrap} accessibilityHint={tr("Long-press to paste a number")}>
            <Text
              style={[styles.number, !number && styles.numberPlaceholder, { fontSize: numberFont }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {formatTyped(number) || tr("Enter phone number")}
            </Text>
          </Pressable>
        </View>

        <View style={styles.pad}>
          {keys.map(([key, letters]) => (
            <Pressable
              key={key}
              onPress={key === "0" ? handleZeroPress : () => pressKey(key)}
              onLongPress={key === "0" ? handleZeroLongPress : undefined}
              delayLongPress={350}
              style={[styles.key, { height: keyHeight }]}
            >
              <Text style={[styles.keyNumber, { fontSize: keyFont, lineHeight: keyFont + 2 }]}>{key}</Text>
              <Text style={styles.letters}>{letters}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.callRow}>
          <Pressable accessibilityLabel={tr("Video call")} onPress={() => startCall(true)} style={styles.video}>
            <Video color={themeColor("#625BC1")} size={22} />
          </Pressable>
          <Pressable accessibilityLabel={tr("Start call")} onPress={() => startCall(false)} style={styles.call}>
            <Phone color={themeColor("#FFF")} size={26} fill="#FFF" />
          </Pressable>
          <Pressable accessibilityLabel={tr("Delete number")} onPress={() => setNumber((value) => value.slice(0, -1))} onLongPress={() => setNumber("")} delayLongPress={450} style={styles.video}>
            <Delete color={themeColor("#625BC1")} size={22} />
          </Pressable>
        </View>
      </View>
      <Modal visible={countryPickerVisible} animationType="slide" transparent onRequestClose={() => setCountryPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable accessibilityLabel={tr("Close")} onPress={() => setCountryPickerVisible(false)} style={StyleSheet.absoluteFill} />
          <View style={styles.notificationSheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{tr("Default country")}</Text>
                <Text style={styles.sheetSubtitle}>{tr("Used for numbers you type without a country code")}</Text>
              </View>
              <Pressable accessibilityLabel={tr("Close")} onPress={() => setCountryPickerVisible(false)} style={styles.closeButton}>
                <X size={19} color={themeColor("#5147AF")} />
              </Pressable>
            </View>
            <View style={styles.pickerSearch}>
              <Search size={17} color={themeColor("#9894A9")} />
              <TextInput
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder={tr("Search country or code")}
                placeholderTextColor={themeColor("#9995A8")}
                style={styles.pickerSearchInput}
              />
            </View>
            <FlatList
              data={filteredPickerCountries}
              keyExtractor={(item) => item.iso}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable onPress={() => chooseCountry(item)} style={styles.pickerRow}>
                  <Text style={styles.pickerFlag}>{item.flag}</Text>
                  <Text style={styles.pickerName} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.pickerCode, item.iso === country.iso && styles.pickerCodeActive]}>+{item.code}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.notificationEmpty}>{tr("No matching country")}</Text>}
            />
          </View>
        </View>
      </Modal>
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
    </SafeAreaView>
  );
}

const styles = themedStyles({
  safe: { flex: 1, backgroundColor: "#F8F8FD" },
  page: { flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 96 },
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  brandCopy: { flex: 1, marginRight: 12 },
  brand: { color: "#211B59", fontFamily: "Poppins-Bold", fontSize: 28, letterSpacing: -1.5 },
  welcome: { color: "#85829B", fontFamily: "Poppins-Regular", fontSize: 11.5, marginTop: -4 },
  iconButton: { height: 45, width: 45, borderRadius: 15, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#29205F", shadowOpacity: 0.09, shadowRadius: 12, elevation: 3 },
  notice: { minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: "#FF6D63", position: "absolute", top: 5, right: 5, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FFF" },
  noticeText: { color: "#FFF", fontFamily: "Poppins-SemiBold", fontSize: 8 },
  quickRow: { flexDirection: "row", alignItems: "center", gap: 10, height: 46 },
  contactsBtn: { height: 42, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, borderRadius: 15, backgroundColor: "#EEECFF" },
  contactsText: { color: "#5147AF", fontFamily: "Poppins-SemiBold", fontSize: 12 },
  chips: { alignItems: "center", gap: 8, paddingRight: 8 },
  chip: { height: 38, justifyContent: "center", paddingHorizontal: 13, borderRadius: 14, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#ECEAF5" },
  chipText: { color: "#302C4C", fontFamily: "Poppins-Medium", fontSize: 11.5 },
  chipsHint: { color: "#9995A8", fontFamily: "Poppins-Regular", fontSize: 11 },
  flag: { fontSize: 16 },
  numberWrap: { alignSelf: "stretch", alignItems: "center", paddingHorizontal: 8 },
  numberPlaceholder: { color: "#B5B1C6", fontFamily: "Poppins-Regular" },
  pickerSearch: { height: 46, borderRadius: 14, backgroundColor: "#FFF", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 8 },
  pickerSearchInput: { flex: 1, marginLeft: 9, color: "#211B59", fontFamily: "Poppins-Regular", fontSize: 12.5 },
  pickerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#EFEEF6" },
  pickerFlag: { fontSize: 22, width: 36 },
  pickerName: { flex: 1, color: "#302C4C", fontFamily: "Poppins-Medium", fontSize: 13 },
  pickerCode: { color: "#8F8BA3", fontFamily: "Poppins-Medium", fontSize: 12.5 },
  pickerCodeActive: { color: "#5147AF", fontFamily: "Poppins-SemiBold" },
  search: { height: 54, borderRadius: 18, backgroundColor: "#FFF", flexDirection: "row", alignItems: "center", paddingHorizontal: 16, shadowColor: "#29205F", shadowOpacity: 0.05, shadowRadius: 11, elevation: 2 },
  searchInput: { flex: 1, marginLeft: 10, color: "#211B59", fontFamily: "Poppins-Regular", fontSize: 12 },
  numberArea: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8, minHeight: 90 },
  countryPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#EEECFF", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 13, maxWidth: "100%" },
  countryText: { color: "#5147AF", fontFamily: "Poppins-SemiBold", fontSize: 12, marginLeft: 6 },
  countryName: { flexShrink: 1, color: "#7C7894", fontFamily: "Poppins-Regular", fontSize: 11, marginLeft: 7, marginRight: 4 },
  number: { color: "#211B59", fontFamily: "Poppins-SemiBold", marginTop: 10, minHeight: 36 },
  // Shifted down from the number display — was flush right underneath it.
  pad: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: 12, marginTop: 4 },
  key: { width: "33.33%", alignItems: "center", justifyContent: "center" },
  keyNumber: { color: "#211B59", fontFamily: "Poppins-Medium", fontSize: 27, lineHeight: 29 },
  letters: { color: "#8F8BA3", fontFamily: "Poppins-Medium", fontSize: 8, letterSpacing: 1.5, height: 10 },
  callRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 27, marginTop: 6 },
  video: { height: 51, width: 51, borderRadius: 18, backgroundColor: "#EEECFF", alignItems: "center", justifyContent: "center" },
  call: { height: 68, width: 68, borderRadius: 25, backgroundColor: "#5F56C6", alignItems: "center", justifyContent: "center", shadowColor: "#5147B6", shadowOpacity: 0.35, shadowRadius: 15, elevation: 7 },
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
