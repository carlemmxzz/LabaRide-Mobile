import { useState } from "react";
import { Image, View } from "react-native";
import { API_URL } from "../api/client";
import { Txt, usePalette } from "./ui";
import { CallContactButton } from "./CallContactButton";

export type AssignedRider = { riderId: number; rider?: { id?: number; name: string; phone?: string | null; photoUrl?: string | null } };
export function AssignedRiderCard({ assignment }: { assignment: AssignedRider }) {
  const palette = usePalette();
  const [failedUrl, setFailedUrl] = useState<string>();
  const rider = assignment.rider;
  const name = rider?.name || "Assigned rider";
  const id = assignment.riderId;
  const photoUrl = rider?.photoUrl;
  const uri = photoUrl && new RegExp(`^/api/users/${id}/photo\\?v=\\d+$`).test(photoUrl) ? `${API_URL.replace(/\/$/, "")}${photoUrl}` : undefined;
  const initials = name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase();
  return <View testID="assigned-return-rider" style={{ borderWidth: 1, borderColor: palette.line, borderRadius: 14, padding: 14, gap: 10, backgroundColor: "white" }}>
    <Txt style={{ fontSize: 11, fontWeight: "600", color: palette.muted, letterSpacing: 0.5 }}>DELIVERY RIDER</Txt>
    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
      {uri && failedUrl !== uri ? <Image accessibilityLabel={`${name}'s profile photo`} source={{ uri }} onError={() => setFailedUrl(uri)} style={{ width: 52, height: 52, borderRadius: 26 }} /> : <View testID="rider-avatar-fallback" style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: palette.soft, alignItems: "center", justifyContent: "center" }}><Txt style={{ fontSize: 18, fontWeight: "700", color: palette.primary }}>{initials}</Txt></View>}
      <View style={{ flex: 1, minWidth: 120, gap: 3 }}>
        <Txt style={{ fontSize: 16, fontWeight: "700" }}>{name}</Txt>
        <Txt style={{ color: palette.muted, fontSize: 12 }}>Rider ID #{id}</Txt>
        {!!rider?.phone && <Txt selectable style={{ color: palette.muted, fontSize: 13 }}>{rider.phone}</Txt>}
      </View>
      {!!rider?.phone && <CallContactButton name={name} phone={rider.phone} />}
    </View>
  </View>;
}
