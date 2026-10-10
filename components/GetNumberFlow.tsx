import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { CheckCircle2, Landmark, Search, X } from "lucide-react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { getMyNumbers } from "@/services/numbers";
import { checkNumberAvailability, createFlutterwaveCheckout, getAvailableNumberCountries, getOrderStatus, getPaymentPrices, toPaymentInitError, type PaymentCurrency, type PaymentPrices } from "@/services/payments";
import CurrencySelector from "@/components/CurrencySelector";
import { useLoginContext } from "@/context/LoginProvider";
import { useCountryData } from "@/hooks/useCountryData";
import { themedStyles, themeColor } from "@/theme";
import { tr } from "@/utils/tr";

type FlowStep = "country" | "preview" | "processing";

export type GetNumberFlowHandle = {
  /** Starts the "get a 9tel number" flow (asks guests to create an account first). */
  start: () => void;
};

// The whole "get / add a 9tel number" flow — country picker, availability
// preview, Flutterwave checkout and payment polling — as one self-contained
// component so Settings and Home can both start it without navigating away.
const GetNumberFlow = forwardRef<GetNumberFlowHandle, { onPurchased?: () => void }>(function GetNumberFlow({ onPurchased }, ref) {
  const { countries } = useCountryData();
  const { user } = useLoginContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [availableCountries, setAvailableCountries] = useState<{ label: string; value: string }[]>([]);
  const [loadingAvailableCountries, setLoadingAvailableCountries] = useState(false);
  const [availableCountriesError, setAvailableCountriesError] = useState("");
  const [countryRefreshKey, setCountryRefreshKey] = useState(0);
  const [step, setStep] = useState<FlowStep>("country");
  const [countrySearch, setCountrySearch] = useState("");
  const [preferredCountryCode, setPreferredCountryCode] = useState("us");
  // "US" until the ipapi lookup below resolves (or fails, in which case it
  // just stays US) — previously this was never anything BUT "US", for
  // every user regardless of where they actually are.
  const [selectedCountry, setSelectedCountry] = useState<{ label: string; value: string }>({ label: "United States", value: "us" });
  const selectedCountryRef = useRef(selectedCountry.value);

  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [previewNumber, setPreviewNumber] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [currency, setCurrency] = useState<PaymentCurrency>("USD");
  const [paymentPrices, setPaymentPrices] = useState<PaymentPrices | null>(null);
  const [processingMessage, setProcessingMessage] = useState(tr("Processing your payment…"));
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onPurchasedRef = useRef(onPurchased);
  onPurchasedRef.current = onPurchased;

  useEffect(() => {
    // Best-effort: pre-select the country 9tel already detects for the
    // dialer's own calling-code display, so the picker below opens on
    // something relevant instead of always defaulting to the US. The
    // person can still change it before confirming.
    fetch("https://ipapi.co/json/")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((location) => {
        if (location.country_code && location.country_name) {
          setPreferredCountryCode(String(location.country_code).toLowerCase());
        }
      })
      .catch(() => undefined);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return availableCountries;
    const q = countrySearch.trim().toLowerCase();
    return availableCountries.filter((c) => c.label.toLowerCase().includes(q));
  }, [availableCountries, countrySearch]);

  useEffect(() => {
    selectedCountryRef.current = selectedCountry.value;
  }, [selectedCountry.value]);

  useEffect(() => {
    if (!modalOpen || !countries.length) return;
    let cancelled = false;
    setLoadingAvailableCountries(true);
    setAvailableCountriesError("");
    getAvailableNumberCountries(countries)
      .then((countryCodes) => {
        if (cancelled) return;
        const available = countries.filter((country: { label: string; value: string }) =>
          countryCodes.includes(country.value.toUpperCase()),
        );
        setAvailableCountries(available);
        if (
          available.length &&
          !available.some((country) => country.value.toLowerCase() === selectedCountryRef.current.toLowerCase())
        ) {
          setSelectedCountry(
            available.find((country) => country.value.toLowerCase() === preferredCountryCode) || available[0],
          );
        }
      })
      .catch((error) => {
        if (!cancelled) setAvailableCountriesError((error as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoadingAvailableCountries(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, countries, countryRefreshKey, preferredCountryCode]);

  const closeModal = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setModalOpen(false);
    setStep("country");
    setPreviewNumber(null);
    setAvailabilityError("");
    setPaying(false);
  };

  // Checking availability is free — nothing is purchased here. This used to
  // go straight from picking a country to an "are you sure, this may
  // charge you" alert with no idea what number you'd even be paying for.
  const checkAvailability = async () => {
    setCheckingAvailability(true);
    setAvailabilityError("");
    try {
      const result = await checkNumberAvailability(selectedCountry.value.toUpperCase());
      if (result.alreadyProvisioned) {
        // One number per country: they already own one here.
        setAvailabilityError(tr("You already have {{number}} for {{country}}. Pick a different country to add another number.", { number: result.phoneNumber, country: selectedCountry.label }));
        return;
      }
      if (!result.available) {
        setAvailabilityError(result.message);
        const remainingCountries = availableCountries.filter(
          (country) => country.value.toUpperCase() !== selectedCountry.value.toUpperCase(),
        );
        setAvailableCountries(remainingCountries);
        if (remainingCountries.length) setSelectedCountry(remainingCountries[0]);
        return;
      }
      setPreviewNumber(result.phoneNumber);
      setStep("preview");
      getPaymentPrices().then(setPaymentPrices).catch(() => undefined);
    } catch (error) {
      setAvailabilityError((error as Error).message);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const pollForFulfillment = (orderId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    const deadline = Date.now() + 5 * 60 * 1000; // give a payment page plenty of time without polling forever
    pollRef.current = setInterval(async () => {
      if (Date.now() > deadline) {
        clearInterval(pollRef.current!);
        setProcessingMessage(tr("Still waiting on your payment. You can close this and check Settings again shortly."));
        return;
      }
      try {
        const order = await getOrderStatus(orderId);
        if (order.status === "paid" && order.phoneNumber) {
          clearInterval(pollRef.current!);
          const purchased = order.phoneNumber;
          closeModal();
          const fresh = await getMyNumbers().catch(() => null);
          const becameActive = fresh?.find((n) => n.phoneNumber === purchased)?.isActive === true;
          Alert.alert(
            tr("You're all set"),
            becameActive
              ? tr("{{number}} is now your active 9tel number.", { number: purchased })
              : tr("{{number}} was added to your numbers. Switch to it any time in Settings.", { number: purchased }),
          );
          onPurchasedRef.current?.();
        } else if (order.status === "cancelled") {
          clearInterval(pollRef.current!);
          setProcessingMessage("");
          Alert.alert(tr("Payment cancelled"), tr("Nothing was charged. You can try again anytime."));
          setStep("preview");
        } else if (order.status === "failed") {
          clearInterval(pollRef.current!);
          setProcessingMessage("");
          Alert.alert(tr("Payment didn't go through"), tr("Nothing was charged. You can try again."));
          setStep("preview");
        } else if (order.status === "paid_unfulfilled") {
          // Payment succeeded, but assigning the actual number then failed
          // (e.g. that country ran out of numbers in the few seconds
          // between checkout and fulfillment) — a refund has automatically
          // been requested. Keep polling briefly: "refunded" confirms it
          // actually completed, rather than just having been attempted.
          setProcessingMessage(tr("We couldn't assign a number — refunding your payment now…"));
        } else if (order.status === "refunded") {
          clearInterval(pollRef.current!);
          setProcessingMessage("");
          Alert.alert(
            tr("Payment refunded"),
            tr("We couldn't assign a number for that country, so your payment was refunded. Please try again — a different country may have availability.")
          );
          setStep("country");
        }
      } catch {
        // transient — keep polling until the deadline
      }
    }, 3000);
  };

  const displayedNumberPrice = paymentPrices?.ngn.number != null
    ? `₦${paymentPrices.ngn.number.toLocaleString("en-US")}`
    : tr("Loading current price…");
  const ngnNumberPriceReady = currency !== "NGN" || paymentPrices?.ngn.number != null;

  const payWithFlutterwave = async () => {
    if (!ngnNumberPriceReady) return;
    setPaying(true);
    try {
      const { orderId, url } = await createFlutterwaveCheckout(selectedCountry.value.toUpperCase(), currency);

      setStep("processing");
      setProcessingMessage(tr("Processing your payment…"));
      // Opens the provider's own hosted, secure checkout page — card details
      // are entered there, never inside this app. This resolves once the
      // person closes/returns from that browser, which is not the same as
      // payment having succeeded — actual confirmation only ever comes from
      // the provider's webhook on the backend, which is what the polling
      // below is watching for.
      await WebBrowser.openBrowserAsync(url);
      pollForFulfillment(orderId);
    } catch (error) {
      const paymentError = toPaymentInitError(error);
      Alert.alert(tr("Unable to start payment"), paymentError.message, [
        { text: tr("Not now"), style: "cancel" },
        { text: tr("Retry"), onPress: () => payWithFlutterwave() },
      ]);
      setStep("preview");
    } finally {
      setPaying(false);
    }
  };

  // Guests get the app instantly with no login screen (see
  // context/LoginProvider.js) — but a real, permanent number is exactly the
  // kind of thing a throwaway guest account shouldn't hold: uninstall the
  // app, clear storage, or lose the device, and a guest session is gone for
  // good along with whatever number was tied to it. This is the one place
  // sign-in is actually required, and only reached if someone tries to do
  // this specific thing.
  const start = () => {
    if (user?.isGuest) {
      Alert.alert(
        tr("Create a free account"),
        tr("Getting a 9tel number ties it to your account, so create a free account first to make sure you don't lose access to it."),
        [
          { text: tr("Not now"), style: "cancel" },
          { text: tr("Create account"), onPress: () => router.push("/sign-up") },
        ]
      );
      return;
    }
    setCountrySearch("");
    setAvailabilityError("");
    setModalOpen(true);
  };

  useImperativeHandle(ref, () => ({ start }));

  return (
    <>
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            {step === "country" && (
              <>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>{tr("Choose your country")}</Text>
                  <Pressable onPress={closeModal} style={s.modalClose}>
                    <X size={20} color={themeColor("#211B59")} />
                  </Pressable>
                </View>
                <Text style={s.modalSub}>{tr("Your number's area code depends on the country you pick.")}</Text>

                <View style={s.searchRow}>
                  <Search size={17} color={themeColor("#9894A9")} />
                  <TextInput
                    value={countrySearch}
                    onChangeText={setCountrySearch}
                    placeholder={tr("Search countries")}
                    placeholderTextColor={themeColor("#9995A8")}
                    style={s.searchInput}
                  />
                </View>

                <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
                  {loadingAvailableCountries ? (
                    <View style={{ alignItems: "center", paddingVertical: 24 }}>
                      <ActivityIndicator color={themeColor("#5147AF")} />
                      <Text style={[s.noResults, { paddingBottom: 0 }]}>{tr("Checking number availability…")}</Text>
                    </View>
                  ) : availableCountriesError ? (
                    <View>
                      <Text style={s.noResults}>{availableCountriesError}</Text>
                      <Text
                        onPress={() => setCountryRefreshKey((key) => key + 1)}
                        style={s.backLink}
                      >
                        Try again
                      </Text>
                    </View>
                  ) : availableCountries.length === 0 ? (
                    <Text style={s.noResults}>{tr("No countries currently have 9tel numbers available.")}</Text>
                  ) : filteredCountries.map((country) => (
                    <Pressable key={country.value} style={s.countryRow} onPress={() => setSelectedCountry(country)}>
                      <Text style={s.countryLabel}>{country.label}</Text>
                      {selectedCountry.value === country.value && <View style={s.countryCheck} />}
                    </Pressable>
                  ))}
                  {!loadingAvailableCountries && !availableCountriesError && availableCountries.length > 0 && filteredCountries.length === 0 && (
                    <Text style={s.noResults}>{tr('No countries match "{{query}}"', { query: countrySearch })}</Text>
                  )}
                </ScrollView>

                {!!availabilityError && <Text style={s.errorText}>{availabilityError}</Text>}

                {availableCountries.length > 0 && !loadingAvailableCountries && !availableCountriesError && (
                  <Pressable style={s.confirmBtn} onPress={checkAvailability} disabled={checkingAvailability}>
                    {checkingAvailability ? (
                      <ActivityIndicator color={themeColor("#FFF")} />
                    ) : (
                      <Text style={s.confirmBtnText}>{tr("Check {{country}} numbers", { country: selectedCountry.label })}</Text>
                    )}
                  </Pressable>
                )}
              </>
            )}

            {step === "preview" && (
              <>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>{tr("Your new number")}</Text>
                  <Pressable onPress={closeModal} style={s.modalClose}>
                    <X size={20} color={themeColor("#211B59")} />
                  </Pressable>
                </View>

                <View style={s.previewCard}>
                  <CheckCircle2 size={22} color={themeColor("#2EAF7D")} />
                  <Text style={s.previewNumber}>{previewNumber}</Text>
                  <Text style={s.previewNote}>
                    This exact number isn't reserved until payment completes — in the rare case someone else takes it
                    first, you'll automatically get the next available {selectedCountry.label} number instead. Your 9tel number access lasts 30 days after payment; renew with Flutterwave to keep it active.
                  </Text>
                </View>

                <Text style={s.modalSub}>{tr("Choose your payment currency")}</Text>

                <CurrencySelector value={currency} onChange={setCurrency} disabled={paying} />

                <Pressable style={s.paymentOption} onPress={payWithFlutterwave} disabled={paying || !ngnNumberPriceReady}>
                  <View style={[s.paymentIcon, { backgroundColor: "#FFF0E0" }]}>
                    <Landmark size={19} color={themeColor("#E17A2D")} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.paymentLabel}>{currency === "NGN" ? tr("Pay {{price}} in NGN with Flutterwave", { price: displayedNumberPrice }) : tr("Pay in USD with Flutterwave")}</Text>
                    <Text style={s.paymentDetail}>{tr("Cards, bank transfer, mobile money")}</Text>
                  </View>
                  {paying ? <ActivityIndicator color={themeColor("#E17A2D")} /> : <ChevronRight size={18} color={themeColor("#AAA6B7")} />}
                </Pressable>

                <Text
                  onPress={() => setStep("country")}
                  style={s.backLink}
                >
                  Choose a different country
                </Text>
              </>
            )}

            {step === "processing" && (
              <View style={{ alignItems: "center", paddingVertical: 30 }}>
                <ActivityIndicator size="large" color={themeColor("#5147AF")} />
                <Text style={[s.modalSub, { textAlign: "center", marginTop: 18 }]}>{processingMessage}</Text>
                <Text
                  onPress={closeModal}
                  style={[s.backLink, { marginTop: 20 }]}
                >
                  {tr("Close — I'll check back later")}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
});

export default GetNumberFlow;

const s = themedStyles({
  modalBackdrop: { flex: 1, backgroundColor: "rgba(20,16,45,0.45)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#FFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 30, minHeight: 300 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { color: "#211B59", fontFamily: "Poppins-SemiBold", fontSize: 17 },
  modalClose: { height: 34, width: 34, borderRadius: 12, backgroundColor: "#F1F0F6", alignItems: "center", justifyContent: "center" },
  modalSub: { color: "#8F8BA3", fontFamily: "Poppins-Regular", fontSize: 11.5, marginTop: 6, marginBottom: 16 },
  searchRow: { height: 46, borderRadius: 14, backgroundColor: "#F4F3F9", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 8 },
  searchInput: { flex: 1, marginLeft: 9, color: "#211B59", fontFamily: "Poppins-Regular", fontSize: 12.5 },
  countryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F4F3F9" },
  countryLabel: { color: "#302C4C", fontFamily: "Poppins-Medium", fontSize: 13 },
  countryCheck: { height: 10, width: 10, borderRadius: 5, backgroundColor: "#5F56C6" },
  noResults: { color: "#9693A7", fontFamily: "Poppins-Regular", fontSize: 12, textAlign: "center", paddingVertical: 20 },
  errorText: { color: "#D9534F", fontFamily: "Poppins-Regular", fontSize: 11.5, marginTop: 10, textAlign: "center" },
  confirmBtn: { marginTop: 16, height: 54, borderRadius: 17, backgroundColor: "#5F56C6", alignItems: "center", justifyContent: "center" },
  confirmBtnText: { color: "#FFF", fontFamily: "Poppins-SemiBold", fontSize: 13.5 },
  previewCard: { backgroundColor: "#F3FAF6", borderRadius: 18, padding: 18, alignItems: "center", marginBottom: 6 },
  previewNumber: { color: "#211B59", fontFamily: "Poppins-Bold", fontSize: 22, marginTop: 8 },
  previewNote: { color: "#7D9E8E", fontFamily: "Poppins-Regular", fontSize: 10.5, textAlign: "center", marginTop: 8, lineHeight: 15 },
  paymentOption: { flexDirection: "row", alignItems: "center", backgroundColor: "#FAFAFD", borderRadius: 16, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: "#F0EFF5" },
  paymentIcon: { height: 38, width: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 12 },
  paymentLabel: { color: "#302C4C", fontFamily: "Poppins-Medium", fontSize: 13 },
  paymentDetail: { color: "#9693A7", fontFamily: "Poppins-Regular", fontSize: 10, marginTop: 1 },
  backLink: { color: "#8B86B8", fontFamily: "Poppins-Regular", fontSize: 12, textAlign: "center", marginTop: 8, textDecorationLine: "underline" },
});
