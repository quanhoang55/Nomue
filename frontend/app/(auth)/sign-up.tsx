import { Text, View } from "react-native";
import {Link} from "expo-router";

export default function SignUp() {
  return (
    <View>
      <Text className="--color-foreground text-xl font-bold">Sign Up</Text>
      <Link href="/(auth)/sign-in">Sign In</Link>
    </View>
  )
}
