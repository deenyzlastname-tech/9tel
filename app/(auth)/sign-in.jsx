import { useState } from "react";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { UserRound, Mail, Lock } from "lucide-react-native";

import { FormField } from "../../components";
import { AuthBackground, AuthLogo, AuthCard, AuthButton, AuthGhostButton } from "../../components/AuthKit";

import { useLoginContext } from "@/context/LoginProvider";
import { signInAsGuest, signInUser } from "../../services/auth";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import uuid from "react-native-uuid";

// Stored so the same device always signs back into the same guest account
const ANON_CREDENTIALS_KEY = "anonymous-credentials";
const GUEST_DEVICE_ID_KEY = "guest-device-id";


const SignIn = () => {
  const { setUser, setIsLogged } = useLoginContext();
  const [isSubmitting, setSubmitting] = useState(false);
  const [isAnonSubmitting, setAnonSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  // The API owns guest-account creation and returns a session in one request.
  // This avoids a partially-created account being treated as a failed sign-up.
  const submitAnonymous = async () => {
    setAnonSubmitting(true);
    try {
      // Keep supporting a guest account created by older app versions.
      let legacyCredentials = null;
      const stored = await AsyncStorage.getItem(ANON_CREDENTIALS_KEY);
      if (stored) legacyCredentials = JSON.parse(stored);

      if (legacyCredentials) {
        const legacyResult = await signInUser(legacyCredentials.email, legacyCredentials.password);
        if (legacyResult?.data?.success) {
          setUser(legacyResult.data.data.user);
          setIsLogged(true);
          router.replace("/(tabs)/dialer");
          return;
        }
        await AsyncStorage.removeItem(ANON_CREDENTIALS_KEY);
      }

      let deviceId = await AsyncStorage.getItem(GUEST_DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = String(uuid.v4());
        await AsyncStorage.setItem(GUEST_DEVICE_ID_KEY, deviceId);
      }
      const deviceName = (Constants.deviceName || "9tel").slice(0, 24);
      const result = await signInAsGuest(deviceId, deviceName);
      if (!result?.data?.success || !result.data?.data?.user) {
        Alert.alert("Guest sign-in", result?.data?.message || "Unable to start a guest session. Please try again.");
        return;
      }
      setUser(result.data.data.user);
      setIsLogged(true);
      router.replace("/(tabs)/dialer");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setAnonSubmitting(false);
    }
  };


  const submit = async () => {
    const email = form.email.trim().toLowerCase();
    if (email === "" || form.password === "") {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }
    if (form.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);

    try {

      const result = await signInUser(email, form.password);
      if (result !== undefined) {
        if (result?.data.success === false) {
          Alert.alert("Error", result?.data.message)
          return;
        }
        setUser(result.data.data.user);

        setIsLogged(true);

        //Alert.alert("Success", "User signed in successfully");
        router.replace("/(tabs)/dialer");
      } else {
        Alert.alert("Error", "Server Down, please try again later")
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };
  const { t } = useTranslation();

  return (
    <AuthBackground>
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-5 py-8">
          <View className="mb-9">
            <AuthLogo style={{ marginBottom: 32 }} />
            <Text className="text-white text-[32px] leading-10 font-psemibold">Welcome back</Text>
            <Text className="text-[#CFCBFF] text-sm font-pregular mt-2">
              Sign in to stay close to the people who matter.
            </Text>
          </View>

          <AuthCard>
            <FormField
              title={t("email")}
              value={form.email}
              placeholder="e.g. yourname@gmail.com"
              handleChangeText={(e) => setForm({ ...form, email: e })}
              otherStyles="mt-1"
              variant="auth"
              icon={Mail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              maxLength={60}
            />

            <FormField
              title={t("password")}
              placeholder="Password"
              value={form.password}
              handleChangeText={(e) => setForm({ ...form, password: e })}
              otherStyles="mt-5"
              variant="auth"
              icon={Lock}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              maxLength={64}
              secureTextEntry
            />

            <View className="flex-row justify-end mt-3">
              <Link href="/forgot-password" className="text-sm text-[#FFE27A] font-pmedium">
                Forgot password?
              </Link>
            </View>

            <AuthButton title={t("buttons.sign_in")} onPress={submit} isLoading={isSubmitting} />

            <View className="flex-row items-center my-5">
              <View className="flex-1 h-[1px] bg-[#C9CCDD]/25" />
              <Text className="text-[#B9B5E0] mx-3 font-pregular text-xs">OR</Text>
              <View className="flex-1 h-[1px] bg-[#C9CCDD]/25" />
            </View>

            <AuthGhostButton onPress={submitAnonymous} disabled={isAnonSubmitting}>
              {isAnonSubmitting ? (
                <ActivityIndicator color="#CFCBFF" />
              ) : (
                <>
                  <UserRound size={20} color="#FFE27A" />
                  <Text className="text-white font-pmedium text-sm ml-3">Continue as Guest</Text>
                </>
              )}
            </AuthGhostButton>
          </AuthCard>

          <View className="flex-row justify-center items-center pt-7 gap-2">
            <Text className="text-sm text-[#CFCBFF] font-pregular">New to 9tel?</Text>
            <Link href="/sign-up" className="text-sm font-psemibold text-[#FFE27A]">
              Create an account
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
    </AuthBackground>
  );
};

export default SignIn;
