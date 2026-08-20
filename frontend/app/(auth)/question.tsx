import { useAuth } from "@/providers/AuthProvider";
import { Redirect } from "expo-router";
import { Text, View } from "react-native";

export default function SignIn() {
  const { isLogIn } = useAuth();

  if (!isLogIn) return <Redirect href="/(auth)/sign-in" />;

  return (
    <View>
      <Text className="--color-foreground text-xl font-bold">
        Question for new user
      </Text>
    </View>
  );
}
