import { Text, View } from "react-native";
import {Link} from "expo-router";

export default function SignIn(){
  return (
    <View>
      <Text className="--color-foreground text-xl font-bold">Sign In</Text>
      <Link href="/(auth)/sign-up">Create Account</Link>
    </View>
  )
}
