import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, MailCheck } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AuthBackground, AuthLogo, AuthCard } from "../../components/AuthKit";
import OTPInput from "../../components/OTPInput";
import { verifyOTP } from "../../services/auth";

const OTPValidation = () => {
    const [isSubmitting, setSubmitting] = useState(false);
    const { email } = useLocalSearchParams();
    const address = Array.isArray(email) ? email[0] : email;

    useEffect(() => {
        if (!address) {
            Alert.alert('Error', 'Email Is missing');
            router.replace("/(auth)/sign-in");
        }
    }, [address]);

    if (!address) return null;

    const handleOTPSubmit = async (code) => {
        if (isSubmitting) return;
        setSubmitting(true);
        try {
            const res = await verifyOTP(address, code);
            if (res.data) {
                const result = res.data
                //const isValidOTP = code === "123456"; // Mock valid OTP

                // if (!isValidOTP) {
                if (result.isCodeValid !== true) {
                    Alert.alert('Error', 'Invalid OTP, please try again.');
                    //console.log("isValidOTP ", result)
                } else {
                    Alert.alert('Success', 'OTP verified successfully!');
                    router.replace({
                        pathname: "/(auth)/reset-password",
                        params: { code, email: address },
                    })
                }
            } else {
                Alert.alert('Error', 'Invalid OTP, please try again.');
            }

        } catch (error) {
            Alert.alert("Error", error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthBackground>
        <SafeAreaView style={styles.safe}>
            <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
                <Pressable accessibilityLabel="Back to forgot password" onPress={() => router.back()} style={styles.back}>
                    <ArrowLeft size={21} color="#FFFFFF" />
                </Pressable>
                <AuthLogo style={{ marginTop: 28 }} />
                <LinearGradient colors={["#F4F5FA", "#8E92AD", "#F4F5FA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconRim}>
                    <View style={styles.icon}><MailCheck size={28} color="#FFE27A" /></View>
                </LinearGradient>
                <Text style={styles.title}>Verify your email</Text>
                <Text style={styles.copy}>Enter the 6-digit code we sent to</Text>
                <Text style={styles.email}>{address}</Text>
                <AuthCard style={styles.otpCard}>
                    <OTPInput onSubmit={handleOTPSubmit} email={address} />
                    {isSubmitting && <ActivityIndicator color="#FFE27A" style={styles.loading} />}
                </AuthCard>
                <Text style={styles.help}>Check your inbox and spam folder if the code isn’t there.</Text>
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
    copy: { color: "#CFCBFF", fontFamily: "Poppins-Regular", fontSize: 13, marginTop: 8 },
    email: { color: "#FFE27A", fontFamily: "Poppins-SemiBold", fontSize: 13, marginTop: 3 },
    otpCard: { marginTop: 30 },
    loading: { position: "absolute", right: 18, bottom: 14 },
    help: { color: "#B9B5E0", fontFamily: "Poppins-Regular", fontSize: 11, textAlign: "center", lineHeight: 18, marginTop: 20 },
});
export default OTPValidation;