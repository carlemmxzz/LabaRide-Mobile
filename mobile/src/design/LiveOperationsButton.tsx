import { ListTree } from "lucide-react-native";
import { useWindowDimensions } from "react-native";
import { useFlowNavigation } from "./data";
import { IconButton, usePalette } from "./ui";

export function LiveOperationsButton() {
  const { go } = useFlowNavigation();
  const { width } = useWindowDimensions();
  const palette = usePalette();
  if (width >= 1024) return null;
  return <IconButton label="Live operations" onPress={() => go("shop-live-operations")}><ListTree size={22} color={palette.primary} /></IconButton>;
}
