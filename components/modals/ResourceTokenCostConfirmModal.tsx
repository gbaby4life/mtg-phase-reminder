import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { C } from "../../lib/types";

type Props = {
  visible: boolean;
  tokenName: string;
  rulesText: string;
  costText: string;
  effectText: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ResourceTokenCostConfirmModal({
  visible, tokenName, costText, effectText, onCancel, onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <Text style={s.heading}>Confirm Token Activation</Text>

          <View style={s.block}>
            <Text style={s.blockLabel}>{tokenName} requires:</Text>
            <Text style={s.costText}>{costText}</Text>
          </View>

          <View style={s.block}>
            <Text style={s.blockLabel}>Effect:</Text>
            <Text style={s.effectText}>{effectText}</Text>
          </View>

          <Text style={s.note}>
            Confirm that you will pay this cost. The app will resolve the token after confirmation.
          </Text>

          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, s.cancelBtn]} onPress={onCancel}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.confirmBtn]} onPress={onConfirm}>
              <Text style={s.confirmText}>Confirm & Use</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 20 },
  sheet: { backgroundColor: C.card, borderRadius: 16, padding: 20, width: "100%", maxWidth: 360, borderWidth: 1, borderColor: C.border, gap: 12 },
  heading: { color: C.text, fontSize: 17, fontWeight: "900", textAlign: "center" },
  block: { backgroundColor: C.cardAlt, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12, gap: 4 },
  blockLabel: { color: C.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  costText: { color: C.warning, fontSize: 14, fontWeight: "700" },
  effectText: { color: C.text, fontSize: 14, fontWeight: "700" },
  note: { color: C.dim, fontSize: 12, lineHeight: 18, textAlign: "center" },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, minHeight: 46, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  cancelBtn: { backgroundColor: C.cardAlt, borderColor: C.border },
  confirmBtn: { backgroundColor: C.accentDim, borderColor: C.accent },
  cancelText: { color: C.text, fontSize: 14, fontWeight: "800", textAlign: "center" },
  confirmText: { color: C.text, fontSize: 14, fontWeight: "900", textAlign: "center" },
});
