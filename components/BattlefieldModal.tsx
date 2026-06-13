import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from "react-native";
import { C } from "../lib/types";
import type { GameState, Action, CastSpell, CreatureCounterType } from "../lib/types";

type Props = {
  visible: boolean;
  onClose: () => void;
  state: GameState;
  dispatch: React.Dispatch<Action>;
  onOpenHub: () => void;
};

const COUNTER_TYPES: CreatureCounterType[] = ["+1/+1", "+1/+0", "+0/+1", "-1/-1", "-1/-0", "-0/-1"];

function getEffectivePT(creature: CastSpell): { power?: number; toughness?: number } {
  if (creature.power === undefined || creature.toughness === undefined) return {};
  let p = creature.power;
  let t = creature.toughness;
  const c = creature.counters ?? {};
  p += (c["+1/+1"] ?? 0) + (c["+1/+0"] ?? 0) - (c["-1/-1"] ?? 0) - (c["-1/-0"] ?? 0);
  t += (c["+1/+1"] ?? 0) + (c["+0/+1"] ?? 0) - (c["-1/-1"] ?? 0) - (c["-0/-1"] ?? 0);
  return { power: p, toughness: t };
}

export default function BattlefieldModal({ visible, onClose, state, dispatch, onOpenHub }: Props) {
  const [activeSpell, setActiveSpell] = useState<CastSpell | null>(null);
  const [assignBlockerFor, setAssignBlockerFor] = useState<CastSpell | null>(null);

  const creatures = state.spellLog.filter(sp =>
    sp.zone === "active" &&
    (sp.type === "Creature" || (sp.isToken && sp.tokenCategory === "creature"))
  );

  const attackers = creatures.filter(sp => sp.attacking);

  function creatureName(id: string) {
    return state.spellLog.find(x => x.id === id)?.name ?? id;
  }

  // Keep action sheet in sync with live state
  const liveActive = activeSpell ? state.spellLog.find(x => x.id === activeSpell.id) ?? activeSpell : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Battlefield</Text>
          <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
            <TouchableOpacity onPress={() => dispatch({ type: "CLEAR_COMBAT" })} activeOpacity={0.7}>
              <Text style={styles.clearText}>Clear Combat</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
          </View>
        </View>

        {creatures.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>No creatures on the battlefield yet.</Text></View>
        ) : (
          <ScrollView contentContainerStyle={styles.grid}>
            {creatures.map(sp => {
              const owner = state.players.find(p => p.id === sp.playerId);
              const isMine = owner?.isUser ?? true;
              const ownerColor = isMine ? C.accent : "#F59E0B";
              const blockerNames = (sp.blockedByIds ?? []).map(creatureName).join(", ");
              const blockingName = sp.blockingId ? creatureName(sp.blockingId) : null;
              const { power: ep, toughness: et } = getEffectivePT(sp);
              const counterEntries = Object.entries(sp.counters ?? {}).filter(([, v]) => (v ?? 0) > 0);
              return (
                <TouchableOpacity
                  key={sp.id}
                  style={[styles.tile, { borderColor: sp.attacking ? C.danger : ownerColor }, sp.tapped && styles.tileTapped]}
                  onPress={() => setActiveSpell(sp)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tileName}>{sp.name}</Text>
                  {ep !== undefined && et !== undefined && (
                    <Text style={styles.tilePT}>{ep}/{et}</Text>
                  )}
                  <Text style={[styles.tileOwner, { color: ownerColor }]}>{owner?.name ?? "Unknown"}</Text>
                  <View style={styles.tileStatusRow}>
                    {sp.tapped && <Text style={styles.tileStatus}>TAPPED</Text>}
                    {sp.attacking && <Text style={[styles.tileStatus, { color: C.danger }]}>ATTACKING</Text>}
                    {blockingName && <Text style={[styles.tileStatus, { color: C.warning }]}>BLOCKING</Text>}
                  </View>
                  {sp.attacking && blockerNames.length > 0 && (
                    <Text style={styles.tileBlocked}>Blocked by: {blockerNames}</Text>
                  )}
                  {blockingName && (
                    <Text style={styles.tileBlocked}>Blocking: {blockingName}</Text>
                  )}
                  {counterEntries.length > 0 && (
                    <Text style={styles.tileCounters}>
                      Counters: {counterEntries.map(([k, v]) => `${k} x${v}`).join(", ")}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <TouchableOpacity style={styles.hubButton} onPress={onOpenHub} activeOpacity={0.85}>
          <Text style={styles.hubButtonIcon}>◈</Text>
        </TouchableOpacity>

        {/* ── ACTION SHEET ── */}
        <Modal visible={!!liveActive} transparent animationType="fade" onRequestClose={() => setActiveSpell(null)}>
          <ScrollView style={styles.overlayScroll} contentContainerStyle={styles.overlayContent}>
            <View style={styles.actionSheet}>
              <Text style={styles.title}>{liveActive?.name}</Text>

              {/* Combat actions */}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  if (liveActive) dispatch({ type: "TOGGLE_TAPPED", spellId: liveActive.id });
                  setActiveSpell(null);
                }}
              >
                <Text style={styles.actionBtnText}>{liveActive?.tapped ? "Untap" : "Tap"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  if (liveActive) {
                    dispatch({ type: liveActive.attacking ? "REMOVE_FROM_COMBAT" : "DECLARE_ATTACKER", spellId: liveActive.id });
                  }
                  setActiveSpell(null);
                }}
              >
                <Text style={styles.actionBtnText}>{liveActive?.attacking ? "Remove from Combat" : "Declare as Attacker"}</Text>
              </TouchableOpacity>

              {liveActive && !liveActive.attacking && (
                liveActive.blockingId ? (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                      dispatch({ type: "REMOVE_BLOCKER", blockerId: liveActive.id });
                      setActiveSpell(null);
                    }}
                  >
                    <Text style={styles.actionBtnText}>Remove Blocker</Text>
                  </TouchableOpacity>
                ) : attackers.length > 0 ? (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => { setAssignBlockerFor(liveActive); setActiveSpell(null); }}
                  >
                    <Text style={styles.actionBtnText}>Assign as Blocker</Text>
                  </TouchableOpacity>
                ) : null
              )}

              {/* Counter section */}
              {liveActive && (
                <>
                  <View style={styles.counterHeader}>
                    <Text style={styles.counterHeaderText}>Counters</Text>
                  </View>
                  {COUNTER_TYPES.map(ct => {
                    const count = liveActive.counters?.[ct] ?? 0;
                    return (
                      <View key={ct} style={styles.counterRow}>
                        <Text style={styles.counterLabel}>{ct}</Text>
                        <Text style={styles.counterCount}>{count}</Text>
                        <TouchableOpacity
                          style={[styles.counterBtn, count === 0 && styles.counterBtnDisabled]}
                          onPress={() => dispatch({ type: "CHANGE_CREATURE_COUNTER", spellId: liveActive.id, counterType: ct, delta: -1 })}
                          disabled={count === 0}
                        >
                          <Text style={styles.counterBtnText}>−</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.counterBtn}
                          onPress={() => dispatch({ type: "CHANGE_CREATURE_COUNTER", spellId: liveActive.id, counterType: ct, delta: 1 })}
                        >
                          <Text style={styles.counterBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </>
              )}

              <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setActiveSpell(null)}>
                <Text style={styles.actionBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Modal>

        {/* ── ATTACKER PICKER ── */}
        <Modal visible={!!assignBlockerFor} transparent animationType="fade" onRequestClose={() => setAssignBlockerFor(null)}>
          <View style={styles.overlay}>
            <View style={styles.actionSheet}>
              <Text style={styles.title}>Block which attacker?</Text>
              {attackers.map(att => (
                <TouchableOpacity
                  key={att.id}
                  style={styles.actionBtn}
                  onPress={() => {
                    if (assignBlockerFor) {
                      dispatch({ type: "ASSIGN_BLOCKER", blockerId: assignBlockerFor.id, attackerId: att.id });
                    }
                    setAssignBlockerFor(null);
                  }}
                >
                  <Text style={styles.actionBtnText}>
                    {att.name}{att.power !== undefined ? ` (${att.power}/${att.toughness})` : ""}
                    {(att.blockedByIds ?? []).length > 0 ? " — already blocked" : ""}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setAssignBlockerFor(null)}>
                <Text style={styles.actionBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg, paddingTop: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 20, fontWeight: "800", color: C.text, marginBottom: 8 },
  closeText: { color: C.accent, fontSize: 15, fontWeight: "700" },
  clearText: { color: C.warning, fontSize: 13, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: C.dim, fontSize: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, padding: 16 },
  tile: { width: "47%", backgroundColor: C.card, borderRadius: 12, borderWidth: 2, padding: 12, gap: 4 },
  tileTapped: { opacity: 0.6 },
  tileName: { color: C.text, fontSize: 14, fontWeight: "700" },
  tilePT: { color: C.muted, fontSize: 12 },
  tileOwner: { fontSize: 11, fontWeight: "700" },
  tileStatusRow: { flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" },
  tileStatus: { fontSize: 10, fontWeight: "700", color: C.warning },
  tileBlocked: { fontSize: 10, color: C.muted, marginTop: 2 },
  tileCounters: { fontSize: 10, color: C.accent, marginTop: 2 },
  hubButton: { position: "absolute", bottom: 30, right: 16, width: 52, height: 52, borderRadius: 26, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  hubButtonIcon: { fontSize: 22, color: C.text, fontWeight: "700" },
  overlayScroll: { flex: 1, backgroundColor: C.overlay },
  overlayContent: { justifyContent: "center", alignItems: "center", padding: 20, flexGrow: 1 },
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: "center", alignItems: "center", padding: 20 },
  actionSheet: { backgroundColor: C.card, borderRadius: 16, padding: 20, width: "100%", maxWidth: 360, borderWidth: 1, borderColor: C.border, gap: 10 },
  actionBtn: { backgroundColor: C.cardAlt, borderRadius: 10, paddingVertical: 13, alignItems: "center", borderWidth: 1, borderColor: C.border },
  cancelBtn: { marginTop: 4 },
  actionBtnText: { color: C.text, fontSize: 14, fontWeight: "700" },
  counterHeader: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, marginTop: 2 },
  counterHeaderText: { color: C.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  counterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  counterLabel: { color: C.text, fontSize: 13, fontWeight: "700", flex: 1 },
  counterCount: { color: C.text, fontSize: 16, fontWeight: "900", minWidth: 24, textAlign: "center" },
  counterBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  counterBtnDisabled: { opacity: 0.35 },
  counterBtnText: { color: C.text, fontSize: 18, lineHeight: 22 },
});
