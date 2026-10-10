import { useState } from "react";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react-native";
import { View, Text, ScrollView, Alert, Pressable, StyleSheet } from "react-native";

import { FormField } from "../../components";
import { LinearGradient } from "expo-linear-gradient";
import { AuthBackground, AuthLogo, AuthCard, AuthButton } from "../../components/AuthKit";

import { forgetPassword } from "../../services/auth";
import { useTranslation } from "react-i18next";

const ForgotPassword = () => {
    const [isSubmitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        email: "",
    });

    const submit = async () => {
        if (form.email === "") {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }
        setSubmitting(true);

        try {
            const result = await forgetPassword(form.email.toLowerCase());
            //console.log("result ", result)
            if (!result) {
                Alert.alert("Error", "User Not Found");
                return
            }
            if (result.data.success === false) {
                Alert.alert("Error", result.data.message)
                return;
            }

            Alert.alert("Success", "OTP Sent to your email");
            router.replace({
                pathname: "/(auth)/otp-validation",
                params: { email: form.email.toLowerCase() },
            })

        } catch (error) {
            Alert.alert("Error", error.message);
        } finally {
            setSubmitting(false);
        }
    };
    const { t } = useTranslation();
    return (
        <AuthBackground>
        <SafeAreaView style={styles.safe}>
            <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
                <Pressable accessibilityLabel="Back to sign in" onPress={() => router.back()} style={styles.back}>
                    <ArrowLeft size={21} color="#FFFFFF" />
                </Pressable>
                <AuthLogo style={{ marginTop: 28 }} />
                <LinearGradient
                    colors={["#F4F5FA", "#8E92AD", "#F4F5FA"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconRim}
                >
                    <View style={styles.icon}><Mail size={28} color="#FFE27A" /></View>
                </LinearGradient>
                <Text style={styles.title}>Forgot password?</Text>
                <Text style={styles.copy}>
                    Enter the email address linked to your account. We’ll send a verification code to help you reset your password.
                </Text>

                <AuthCard style={styles.form}>
                    <FormField
                        title={t("email")}
                        placeholder="you@example.com"
                        value={form.email}
                        handleChangeText={(e) => setForm({ ...form, email: e })}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        variant="auth"
                        icon={Mail}
                    />
                    <AuthButton title={t("buttons.submit")} onPress={submit} isLoading={isSubmitting} />
                </AuthCard>
                <View style={styles.security}>
                    <ShieldCheck size={17} color="#C9CCDD" />
                    <Text style={styles.securityText}>Your account details stay private and secure.</Text>
                </View>
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Remember your password? </Text>
                    <Link href="/sign-in" style={styles.link}>Sign in</Link>
                </View>
            </ScrollView>
        </SafeAreaView>
        </AuthBackground>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1 },
    page: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 30 },
    back: { height: 44, width: 44, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(201,204,221,0.3)", alignItems: "center", justifyContent: "center" },
    iconRim: { height: 66, width: 66, borderRadius: 22, padding: 1.5, marginTop: 40 },
    icon: { flex: 1, borderRadius: 20.5, backgroundColor: "#272166", alignItems: "center", justifyContent: "center" },
    title: { color: "#FFFFFF", fontFamily: "Poppins-SemiBold", fontSize: 28, marginTop: 20 },
    copy: { color: "#CFCBFF", fontFamily: "Poppins-Regular", fontSize: 13, lineHeight: 21, marginTop: 8 },
    form: { marginTop: 28 },
    security: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24 },
    securityText: { color: "#B9B5E0", fontFamily: "Poppins-Regular", fontSize: 11 },
    footer: { flexDirection: "row", justifyContent: "center", marginTop: "auto", paddingTop: 40 },
    footerText: { color: "#CFCBFF", fontFamily: "Poppins-Regular", fontSize: 12 },
    link: { color: "#FFE27A", fontFamily: "Poppins-SemiBold", fontSize: 12 },
});

export default ForgotPassword;
