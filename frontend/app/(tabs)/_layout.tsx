import { NativeTabs } from "expo-router/unstable-native-tabs";
import { COLORS } from "@/constants/colors";
import { usePathname } from "expo-router";

export default function TabsLayout() {
  const pathname = usePathname();
  const isChatTab = pathname === "/chat";

  return (
    <NativeTabs
      iconColor={{
        default: COLORS.foreground,
        selected: COLORS.red,
      }}
      minimizeBehavior={isChatTab ? "onScrollDown" : "never"}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          drawable="custom_home_drawable"
        />
        <NativeTabs.Trigger.Label>{""}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Icon
          sf={{ default: "message", selected: "message.fill" }}
          drawable="custom_chat_drawable"
        />
        <NativeTabs.Trigger.Label>{""}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          drawable="custom_profile_drawable"
        />
        <NativeTabs.Trigger.Label>{""}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
