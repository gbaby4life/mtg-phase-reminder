import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { C } from "../lib/types";
import { MTG_KEYWORD_ABILITIES } from "../lib/constants";

type KeywordPickerProps = {
  selected: string[];
  onChange: (next: string[]) => void;
  label?: string;
};

export default function KeywordPicker({ selected, onChange, label = "Keyword Abilities" }: KeywordPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MTG_KEYWORD_ABILITIES;
    return MTG_KEYWORD_ABILITIES.filter(ab => ab.toLowerCase().includes(q));
  }, [query]);

  function toggle(ab: string) {
    onChange(selected.includes(ab) ? selected.filter(x => x !== ab) : [...selected, ab]);
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <TouchableOpacity
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}
        onPress={() => setExpanded(prev => !prev)}
        activeOpacity={0.75}
      >
        <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700" }}>
          {label}{selected.length > 0 ? ` (${selected.length})` : ""}
        </Text>
        <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700" }}>{expanded ? "▾" : "▸"}</Text>
      </TouchableOpacity>

      {expanded && (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 10 }}>
            <TextInput
              style={{
                flex: 1, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border,
                borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: C.text, fontSize: 13,
              }}
              value={query}
              onChangeText={setQuery}
              placeholder="Search keywords"
              placeholderTextColor={C.dim}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity
                style={{
                  marginLeft: 8, width: 34, height: 34, borderRadius: 17, alignItems: "center",
                  justifyContent: "center", backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border,
                }}
                onPress={() => setQuery("")}
                activeOpacity={0.75}
              >
                <Text style={{ color: C.muted, fontSize: 16, fontWeight: "700" }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {filtered.map(ab => (
              <TouchableOpacity
                key={ab}
                style={[
                  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5 },
                  selected.includes(ab)
                    ? { backgroundColor: C.successDim, borderColor: C.success }
                    : { backgroundColor: C.cardAlt, borderColor: C.border },
                ]}
                onPress={() => toggle(ab)}
              >
                <Text style={{ color: selected.includes(ab) ? C.success : C.muted, fontSize: 12, fontWeight: "600" }}>{ab}</Text>
              </TouchableOpacity>
            ))}
            {filtered.length === 0 && (
              <Text style={{ color: C.dim, fontSize: 12 }}>No keywords match “{query}”.</Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}
