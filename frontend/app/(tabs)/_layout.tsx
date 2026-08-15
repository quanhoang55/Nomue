import { NativeTabs, Label, Icon } from "expo-router/unstable-native-tabs";
import { COLORS } from "@/constants/colors";

export default function RootLayout() {
  // ===========================================================
  // Main
  // ===========================================================
  return (
    <NativeTabs
      iconColor={{
        default: COLORS.foreground,
        selected: COLORS.red,
      }}
    >
      <NativeTabs.Trigger name="index">
        <Icon
          sf={{ default: "house", selected: "house.fill" }}
          drawable="custom_home_drawable"
        />
        <Label hidden={true}>Home</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <Icon
          sf={{ default: "message", selected: "message.fill" }}
          drawable="custom_chat_drawable"
        />
        <Label hidden={true}>Chat</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Icon
          sf={{ default: "person", selected: "person.fill" }}
          drawable="custom_profile_drawable"
        />
        <Label hidden={true}>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
