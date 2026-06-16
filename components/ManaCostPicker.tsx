import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { C, formatManaCostLabel, getManaCostValue, hasManaCost } from "../lib/types";
import type { ManaCost } from "../lib/types";
import { MANA_COST_TYPES } from "../lib/constants";
import { s } from "../lib/styles";

type ManaCostPickerProps = {
  value: ManaCost;
  onChange: (next: ManaCost) => void;
  label?: string;
};

export default function ManaCostPicker({ value, onChange, label = "Mana Cost (optional)" }: ManaCostPickerProps) {
  const [expanded, setExpanded] = useState(false);

  const manaValue = getManaCostValue(value) ?? 0;
  const summary = hasManaCost(value) ? formatManaCostLabel(value) : "None";

  function adjust(key: keyof ManaCost, delta: number) {
    onChange({ ...value, [key]: Math.max(0, (value[key] ?? 0) + delta) });
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <TouchableOpacity
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}
        onPress={() => setExpanded(prev => !prev)}
        activeOpacity={0.75}
      >
        <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700" }}>
          {label}{hasManaCost(value) ? ` · ${summary}` : ""}
        </Text>
        <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700" }}>{expanded ? "▾" : "▸"}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={{ backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, gap: 8, marginTop: 8 }}>
          {MANA_COST_TYPES.map(item => (
            <View key={item.key} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: "700", flex: 1 }}>{item.label}</Text>
              <TouchableOpacity style={[s.qtyBtn, { width: 34, height: 34 }]} onPress={() => adjust(item.key, -1)}>
                <Text style={s.lifeBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: "900", minWidth: 24, textAlign: "center", fontVariant: ["tabular-nums"] }}>
                {value[item.key] ?? 0}
              </Text>
              <TouchableOpacity style={[s.qtyBtn, { width: 34, height: 34 }]} onPress={() => adjust(item.key, 1)}>
                <Text style={s.lifeBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          ))}
          <Text style={s.reminderDesc}>Cost: {summary}</Text>
          <Text style={s.reminderDesc}>Mana Value: {manaValue}</Text>
        </View>
      )}
    </View>
  );
}
