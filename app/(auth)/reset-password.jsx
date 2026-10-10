import { useEffect, useState } from "react";
import { Link, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, Alert } from "react-native";
import { Lock, ShieldCheck } from "lucide-react-native";

import { FormField } from "../../components";
import { AuthBackground, AuthLogo, AuthCard, AuthButton } from "../../components/AuthKit";
import { resetPassword } from "../../services/auth";
import { useTranslation } from "react-i18next";
import { validateForm } from "../../utils/validateForm";

const ResetPassword = () => {
    const [isSubmitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        password: "",
        cpassword: ""
    });
    const [errors, setErrors] = useState({});
    const { email, code } = useLocalSearchParams();
    const { t } = useTranslation();

    useEffect(() => {
        if (!email || !code) {
            Alert.alert('Error', 'Email or code Is missing');
            router.replace("/(auth)/sign-in");
        }
    }, [email, code]);

    if (!email || !code) return null;

    const submit = async () => {
        const { isValid, errors: validationErrors } = validateForm({
            ...form,
            email: 'resetpassword@norreplay.com',
            fullName: 'reset-password',
            selectedCountry: "reset-password",
            selectedLanguage: "reset-password",
        });
        if (isValid) {
            setSubmitting(true);
            try {
                const result = await resetPassword(email, code, form.password);

                if (result.status !== 200) {
                    Alert.alert("Error result", result.message)
                    return;
                }
                Alert.alert("Success", "Password Reset sucessfully, Sign in to continue");
                router.replace("/(auth)/sign-in");
            } catch (error) {
                Alert.alert("Error0", error.message);
            } finally {
                setSubmitting(false);
            }
        } else {

            setErrors(validationErrors); // display errors in UI
        }
    };

    return (
        <AuthBackground>
        <SafeAreaView style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                <View className="flex-1 justify-center px-5 py-8">
                    <AuthLogo style={{ marginBottom: 32 }} />
                    <Text className="text-white text-[30px] leading-10 font-psemibold">Reset password</Text>
                    <Text className="text-[#CFCBFF] text-sm font-pregular mt-2 mb-6">
                        Enter a new password to reset your account password.
                    </Text>

                    <AuthCard>
                        <FormField
                            title={t("password")}
                            placeholder="Password"
                            value={form.password}
                            handleChangeText={(e) => setForm({ ...form, password: e })}
                            otherStyles="mt-1"
                            variant="auth"
                            icon={Lock}
                            secureTextEntry
                        />
                        {errors.password && <Text className="text-red-400 text-sm mt-1">{errors.password}</Text>}

                        <FormField
                            title={t("confirm_password")}
                            placeholder="Confirm Password"
                            value={form.cpassword}
                            handleChangeText={(e) => setForm({ ...form, cpassword: e })}
                            otherStyles="mt-4"
                            variant="auth"
                            icon={ShieldCheck}
                            secureTextEntry
                        />
                        {errors.cpassword && <Text className="text-red-400 text-sm mt-1">{errors.cpassword}</Text>}

                        <AuthButton title={t("buttons.submit")} onPress={submit} isLoading={isSubmitting} />
                    </AuthCard>
                </View>
            </ScrollView>
        </SafeAreaView>
        </AuthBackground>
    );
};

export default ResetPassword;
