import { ListTree } from "lucide-react-native";
import { useWindowDimensions } from "react-native";
import { useFlowNavigation } from "./data";
import { Button } from "./ui";

export function LiveOperationsButton() {
  const { go } = useFlowNavigation();
  const { width } = useWindowDimensions();
  return <Button title="Live operations" style={{ alignSelf: width >= 768 ? "flex-start" : "stretch", maxWidth: "100%" }} icon={<ListTree size={20} color="white" />} onPress={() => go("shop-live-operations")} />;
}
