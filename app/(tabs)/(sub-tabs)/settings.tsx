import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ban, Info, ChevronLeft, ChevronRight, Globe2, Moon, Phone, PhoneCall, PhoneForwarded, Plus, Smartphone, Volume2 } from "lucide-react-native";
import { router } from "expo-router";
import { getMyNumbers, setActiveNumber, type OwnedNumber } from "@/services/numbers";
import { getCallerIdVerificationStatus, type CallerIdStatus } from "@/services/callerid";
import GetNumberFlow, { type GetNumberFlowHandle } from "@/components/GetNumberFlow";
import { useCountryData } from "@/hooks/useCountryData";
import { TAB_BAR_CLEARANCE } from "@/constants/layout";
import { themedStyles, themeColor, useTheme } from "@/theme";
import { useTranslation } from "react-i18next";
import { languageLabel } from "@/utils/language";
import Constants from "expo-constants";
import { tr } from "@/utils/tr";

export default function Settings() {
  const { preference } = useTheme();
  const { t, i18n } = useTranslation();
  const appearanceLabel = preference === "system" ? t("prefs.appearance.system", "System default") : preference === "dark" ? t("prefs.appearance.dark", "Dark") : t("prefs.appearance.light", "Light");
  const [wifi, setWifi] = useState(true);
  const [alerts, setAlerts] = useState(true);

  // Every 9tel number the user owns; exactly one is "active" (used for calls).
  const [numbers, setNumbers] = useState<OwnedNumber[]>([]);
  const [loadingNumber, setLoadingNumber] = useState(true);
  const getNumberRef = useRef<GetNumberFlowHandle>(null);
  const [switchingNumber, setSwitchingNumber] = useState<string | null>(null);
  const myNumber = numbers.find((n) => n.isActive && !n.expired)?.phoneNumber ?? null;

  const [callerId, setCallerId] = useState<string | null>(null);
  const [callerIdStatus, setCallerIdStatus] = useState<CallerIdStatus>("unverified");
  const [callerIdMethod, setCallerIdMethod] = useState<string | undefined>();
  const [loadingCallerId, setLoadingCallerId] = useState(true);
  const { countries } = useCountryData();


  useEffect(() => {
    getMyNumbers()
      .then(setNumbers)
      .catch(() => setNumbers([]))
      .finally(() => setLoadingNumber(false));
    getCallerIdVerificationStatus()
      .then((status) => {
        setCallerId(status.verifiedCallerId || (status.method === "developer_test" ? status.phoneNumber || null : null));
        setCallerIdStatus(status.callerIdStatus);
        setCallerIdMethod(status.method);
      })
      .catch(() => {
        setCallerId(null);
        setCallerIdStatus("unverified");
      })
      .finally(() => setLoadingCallerId(false));
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.page}>
        <View style={s.top}>
          <Pressable onPress={() => router.back()} style={s.back}>
            <ChevronLeft size={23} color={themeColor("#211B59")} />
          </Pressable>
          <Text style={s.title}>{tr("Settings")}</Text>
          <View style={s.back} />
        </View>
        <Text style={s.sub}>{tr("Personalize your calling experience.")}</Text>

        <Text style={s.heading}>{tr("YOUR 9TEL NUMBER")}</Text>
        <View style={s.group}>
          {loadingNumber ? (
            <View style={s.row}>
              <View style={s.rowIcon}><Phone size={20} color={themeColor("#5147AF")} /></View>
              <View style={s.rowCopy}><ActivityIndicator size="small" color={themeColor("#5147AF")} /></View>
            </View>
          ) : numbers.length === 0 ? (
            <View style={s.row}>
              <View style={s.rowIcon}><Phone size={20} color={themeColor("#5147AF")} /></View>
              <View style={s.rowCopy}>
                <Text style={s.rowLabel}>{tr("No number yet")}</Text>
                <Text style={s.rowDetail}>{tr("Get a number so people can call you")}</Text>
              </View>
              <Pressable style={s.getNumberBtn} onPress={() => getNumberRef.current?.start()}>
                <Text style={s.getNumberText}>{tr("Get number")}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {numbers.map((n) => {
                const country = n.countryCode
                  ? countries.find((c: { label: string; value: string }) => c.value.toLowerCase() === n.countryCode!.toLowerCase())?.label
                  : undefined;
                const busy = switchingNumber === n.phoneNumber;
                return (
                  <View key={n.phoneNumber} style={s.row}>
                    <View style={[s.rowIcon, n.isActive && s.rowIconActive]}>
                      <Phone size={20} color={themeColor(n.isActive ? "#2EAF7D" : "#5147AF")} />
                    </View>
                    <View style={s.rowCopy}>
                      <Text style={s.rowLabel}>{n.phoneNumber}</Text>
                      <Text style={s.rowDetail}>
                        {[country, n.expired ? tr("Expired — renew to use") : n.isActive ? tr("Used for your calls") : null].filter(Boolean).join(" · ") || tr("Tap to use for calls")}
                      </Text>
                    </View>
                    {n.isActive && !n.expired ? (
                      <View style={s.activePill}><Text style={s.activePillText}>{tr("Active")}</Text></View>
                    ) : n.expired ? null : (
                      <Pressable
                        style={[s.useBtn, busy && { opacity: 0.6 }]}
                        disabled={switchingNumber !== null}
                        accessibilityRole="button"
                        accessibilityLabel={tr("Use {{number}} for calls", { number: n.phoneNumber })}
                        onPress={async () => {
                          setSwitchingNumber(n.phoneNumber);
                          try {
                            setNumbers(await setActiveNumber(n.phoneNumber));
                          } catch (error) {
                            Alert.alert(tr("Couldn't switch number"), (error as Error).message);
                          } finally {
                            setSwitchingNumber(null);
                          }
                        }}
                      >
                        {busy ? <ActivityIndicator size="small" color={themeColor("#5147AF")} /> : <Text style={s.useBtnText}>{tr("Use for calls")}</Text>}
                      </Pressable>
                    )}
                  </View>
                );
              })}
              <Pressable style={s.addRow} accessibilityRole="button" onPress={() => getNumberRef.current?.start()}>
                <View style={s.rowIcon}><Plus size={20} color={themeColor("#5147AF")} /></View>
                <View style={s.rowCopy}>
                  <Text style={s.rowLabel}>{tr("Add another number")}</Text>
                  <Text style={s.rowDetail}>{tr("Buy a 9tel number from another country")}</Text>
                </View>
                <ChevronRight size={18} color={themeColor("#9693A7")} />
              </Pressable>
            </>
          )}
        </View>

        <Text style={s.heading}>{tr("YOUR CALLER ID")}</Text>
        <View style={s.group}>
          <View style={s.row}>
            <View style={s.rowIcon}>
              <PhoneCall size={20} color={themeColor("#5147AF")} />
            </View>
            <View style={s.rowCopy}>
              {loadingCallerId ? (
                <ActivityIndicator size="small" color={themeColor("#5147AF")} />
              ) : callerId ? (
                <>
                  <Text style={s.rowLabel}>{callerIdMethod === "developer_test" ? tr("Test number · {{number}}", { number: callerId }) : callerId}</Text>
                  <Text style={s.rowDetail}>
                    {callerIdMethod === "developer_test"
                      ? "Synthetic local/test state; calls use the configured Twilio caller ID"
                      : callerIdMethod === "spoken_code"
                        ? tr("Verified as yours. Calls show 9tel's shared number until the provider approves yours")
                        : tr("Shown to people you call, instead of the shared number")}
                  </Text>
                </>
              ) : callerIdStatus === "pending" ? (
                <>
                  <Text style={s.rowLabel}>{tr("Verification in progress")}</Text>
                  <Text style={s.rowDetail}>{tr("Enter the code spoken on the verification call in the app")}</Text>
                </>
              ) : callerIdStatus === "failed" || callerIdStatus === "expired" ? (
                <>
                  <Text style={s.rowLabel}>{tr("Verification {{status}}", { status: callerIdStatus })}</Text>
                  <Text style={s.rowDetail}>{tr("Calls still work and show 9tel's shared number until verification succeeds")}</Text>
                </>
              ) : (
                <>
                  <Text style={s.rowLabel}>{tr("Unverified caller ID")}</Text>
                  <Text style={s.rowDetail}>{tr("You can still call. Recipients see 9tel's shared number, not yours. Verify to use your own.")}</Text>
                </>
              )}
            </View>
            {!loadingCallerId && !callerId && (
              <Pressable style={s.getNumberBtn} onPress={() => router.push("/verify-phone")}>
                <Text style={s.getNumberText}>{callerIdStatus === "pending" ? tr("View") : tr("Verify")}</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text style={s.heading}>{tr("CALL PREFERENCES")}</Text>
        <View style={s.group}>
          <Toggle icon={Volume2} label={tr("Call sound")} detail={tr("Ringtone & vibration")} value={alerts} onChange={setAlerts} />
          <Toggle icon={Smartphone} label={tr("Wi-Fi calling")} detail={tr("Make calls over Wi-Fi")} value={wifi} onChange={setWifi} />
          <Link icon={PhoneForwarded} label={tr("Call forwarding")} detail={tr("Send calls to another number")} onPress={() => router.push("/(tabs)/(sub-tabs)/call-forwarding")} />
          <Link icon={Ban} label={tr("Blocked numbers")} detail={tr("Manage blocked contacts")} onPress={() => router.push("/(tabs)/(sub-tabs)/blocked-numbers")} />
        </View>

        <Text style={s.heading}>{tr("GENERAL")}</Text>
        <View style={s.group}>
          <Link icon={Globe2} label={t("prefs.language.title", "Language")} detail={languageLabel(i18n.language)} onPress={() => router.push("/(tabs)/(sub-tabs)/language")} />
          <Link icon={Moon} label={t("prefs.appearance.title", "Appearance")} detail={appearanceLabel} onPress={() => router.push("/(tabs)/(sub-tabs)/appearance")} />
          <Link icon={Info} label={t("prefs.about.title", "About")} detail={t("prefs.about.detail", "Version, updates, legal")} onPress={() => router.push("/(tabs)/(sub-tabs)/about")} />
        </View>

        <View style={s.version}>
          <Text style={s.versionBrand}>{tr("9tel")}</Text>
          <Text style={s.versionCopy}>{tr("Version {{version}} · Built for connection", { version: Constants.expoConfig?.version ?? "1.0.0" })}</Text>
        </View>
        <Pressable onPress={() => Alert.alert(tr("Account deletion"), tr("Please contact support to complete this request."))}>
          <Text style={s.delete}>{tr("Delete account")}</Text>
        </Pressable>
      </ScrollView>

      <GetNumberFlow ref={getNumberRef} onPurchased={() => { getMyNumbers().then(setNumbers).catch(() => undefined); }} />
    </SafeAreaView>
  );
}

function Toggle({ icon: Icon, label, detail, value, onChange }: { icon: any; label: string; detail: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.row}>
      <View style={s.rowIcon}>
        <Icon size={20} color={themeColor("#5147AF")} />
      </View>
      <View style={s.rowCopy}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowDetail}>{detail}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: "#D9D6E6", true: "#9B95E7" }} thumbColor={value ? "#5F56C6" : "#FFF"} />
    </View>
  );
}

function Link({ icon: Icon, label, detail, onPress }: { icon: any; label: string; detail: string; onPress?: () => void }) {
  return (
    <Pressable style={s.row} onPress={onPress ?? (() => Alert.alert(label, detail))}>
      <View style={s.rowIcon}>
        <Icon size={20} color={themeColor("#5147AF")} />
      </View>
      <View style={s.rowCopy}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowDetail}>{detail}</Text>
      </View>
      <ChevronRight size={19} color={themeColor("#AAA6B7")} />
    </Pressable>
  );
}

const s = themedStyles({
  safe: { flex: 1, backgroundColor: "#F8F8FD" },
  page: { padding: 20, paddingBottom: TAB_BAR_CLEARANCE },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { height: 43, width: 43, borderRadius: 15, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  title: { color: "#211B59", fontFamily: "Poppins-SemiBold", fontSize: 21 },
  sub: { color: "#85829B", fontFamily: "Poppins-Regular", fontSize: 12, marginTop: 17 },
  heading: { color: "#908CA2", fontFamily: "Poppins-SemiBold", fontSize: 10, letterSpacing: 1, marginTop: 27, marginBottom: 9 },
  group: { backgroundColor: "#FFF", borderRadius: 20, paddingHorizontal: 14 },
  row: { minHeight: 68, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#F1F0F6" },
  rowIcon: { height: 40, width: 40, borderRadius: 14, backgroundColor: "#EEECFF", alignItems: "center", justifyContent: "center" },
  rowCopy: { flex: 1, marginLeft: 12 },
  rowLabel: { color: "#383452", fontFamily: "Poppins-Medium", fontSize: 12.5 },
  rowDetail: { color: "#9693A7", fontFamily: "Poppins-Regular", fontSize: 10, marginTop: 1 },
  rowIconActive: { backgroundColor: "#E4F6EE" },
  activePill: { backgroundColor: "#E4F6EE", borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12 },
  activePillText: { color: "#2EAF7D", fontFamily: "Poppins-SemiBold", fontSize: 11 },
  useBtn: { backgroundColor: "#EEECFF", borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, minWidth: 92, alignItems: "center" },
  useBtnText: { color: "#5147AF", fontFamily: "Poppins-SemiBold", fontSize: 11 },
  addRow: { minHeight: 68, flexDirection: "row", alignItems: "center" },
  getNumberBtn: { backgroundColor: "#5147AF", borderRadius: 14, paddingVertical: 9, paddingHorizontal: 14, minWidth: 92, alignItems: "center" },
  getNumberText: { color: "#FFF", fontFamily: "Poppins-SemiBold", fontSize: 11.5 },
  version: { alignItems: "center", marginTop: 33 },
  versionBrand: { color: "#211B59", fontFamily: "Poppins-Bold", fontSize: 23, letterSpacing: -1 },
  versionCopy: { color: "#A29EAF", fontFamily: "Poppins-Regular", fontSize: 10.5, marginTop: 2 },
  delete: { color: "#E36A65", fontFamily: "Poppins-Medium", fontSize: 12, textAlign: "center", marginTop: 24 },
});
