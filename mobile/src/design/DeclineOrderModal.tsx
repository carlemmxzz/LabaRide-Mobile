import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { X } from "lucide-react-native";
import { Button, Field, IconButton, Txt, usePalette } from "./ui";
import { message } from "./data";

export function DeclineOrderModal({ id, onClose, onDecline }: { id: number; onClose: () => void; onDecline: (reason: string) => Promise<void> }) {
  const palette = usePalette();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const close = () => { if (!busy) onClose(); };
  return <Modal visible transparent animationType="fade" onRequestClose={close}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "rgba(17, 24, 39, 0.45)" }}>
      <Pressable accessibilityLabel="Dismiss decline dialog" onPress={close} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} />
      <View testID="decline-order-modal" accessibilityViewIsModal role="dialog" aria-label={`Decline order ${id}`} style={{ width: "100%", maxWidth: 480, maxHeight: "90%", borderRadius: 20, backgroundColor: "white", padding: 24, gap: 18 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}><Txt accessibilityRole="header" style={{ fontSize: 22, fontWeight: "700" }}>Decline order #{id}</Txt><Txt style={{ fontSize: 13, color: palette.muted }}>Choose a reason to share with the customer.</Txt></View>
          <IconButton label="Close decline dialog" onPress={close}><X size={20} color={palette.muted} /></IconButton>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>
          <View accessibilityRole="radiogroup" style={{ gap: 8 }}>{["Shop closed", "Too busy", "Service currently unavailable", "Other"].map(option => <Pressable key={option} accessibilityRole="radio" accessibilityLabel={option} accessibilityState={{ checked: reason === option, disabled: busy }} disabled={busy} onPress={() => { setReason(option); setError(""); }} style={{ minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: reason === option ? palette.primary : palette.line, backgroundColor: reason === option ? palette.soft : "white", flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: reason === option ? 5 : 1, borderColor: reason === option ? palette.primary : palette.muted }} /><Txt style={{ flex: 1, fontSize: 14 }}>{option}</Txt>
          </Pressable>)}</View>
          {reason === "Other" && <Field label="Reason" placeholder="Tell the customer why you’re declining" value={details} onChangeText={setDetails} multiline maxLength={500} editable={!busy} />}
          {!!error && <Txt accessibilityRole="alert" style={{ color: palette.danger }}>{error}</Txt>}
        </ScrollView>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button title="Keep order" outline disabled={busy} onPress={close} style={{ flex: 1 }} />
          <Button title="Decline order" color={palette.danger} busy={busy} disabled={!reason || (reason === "Other" && details.trim().length < 5)} style={{ flex: 1 }} onPress={async () => {
            setBusy(true); setError("");
            try { await onDecline(reason === "Other" ? details.trim() : reason); onClose(); }
            catch (failure) { setError(message(failure)); }
            finally { setBusy(false); }
          }} />
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
