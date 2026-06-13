import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from "react-native";
import { C, formatManaCostLabel, getManaCostValue, hasManaCost } from "../lib/types";
import type { GameState, Action, CastSpell, CreatureCounterType, CommanderRecord } from "../lib/types";

type Props = {
  visible: boolean;
  onClose: () => void;
  state: GameState;
  dispatch: React.Dispatch<Action>;
  onOpenHub: () => void;
  onEditSpell?: (spell: CastSpell) => void;
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

function getCostMeta(card: Pick<CastSpell, "manaCost" | "manaValue"> | Pick<CommanderRecord, "manaCost" | "manaValue">): string | null {
  const manaValue = getManaCostValue(card.manaCost, card.manaValue);
  if (hasManaCost(card.manaCost)) return `Cost ${formatManaCostLabel(card.manaCost)} · MV ${manaValue ?? 0}`;
  return manaValue !== undefined ? `MV ${manaValue}` : null;
}

export default function BattlefieldModal({ visible, onClose, state, dispatch, onOpenHub, onEditSpell }: Props) {
  const [activeSpell, setActiveSpell] = useState<CastSpell | null>(null);
  const [assignBlockerFor, setAssignBlockerFor] = useState<CastSpell | null>(null);
  const [commanderDamageSource, setCommanderDamageSource] = useState<CastSpell | null>(null);
  const [commanderDamageDefenderId, setCommanderDamageDefenderId] = useState<string | null>(null);
  const [commanderDamageAmount, setCommanderDamageAmount] = useState(1);
  const [recastCommander, setRecastCommander] = useState<CommanderRecord | null>(null);

  const creatures = state.spellLog.filter(sp =>
    sp.zone === "active" &&
    (sp.type === "Creature" || (sp.isToken && sp.tokenCategory === "creature"))
  );
  const commandZoneCommanders = state.commanders.filter(c => c.currentZone === "commandZone");

  const attackers = creatures.filter(sp => sp.attacking);

  function creatureName(id: string) {
    return state.spellLog.find(x => x.id === id)?.name ?? id;
  }

  // Keep action sheet in sync with live state
  const liveActive = activeSpell ? state.spellLog.find(x => x.id === activeSpell.id) ?? activeSpell : null;
  const commanderDamageDefenders = commanderDamageSource?.commanderOwnerPlayerId
    ? state.players.filter(p => p.id !== commanderDamageSource.commanderOwnerPlayerId)
    : state.players;
  const selectedDamageDefender = commanderDamageDefenders.find(p => p.id === commanderDamageDefenderId) ?? commanderDamageDefenders[0];

  function openCommanderDamage(spell: CastSpell) {
    const defenders = spell.commanderOwnerPlayerId
      ? state.players.filter(p => p.id !== spell.commanderOwnerPlayerId)
      : state.players;
    setCommanderDamageSource(spell);
    setCommanderDamageDefenderId(defenders[0]?.id ?? null);
    setCommanderDamageAmount(1);
    setActiveSpell(null);
  }

  function closeCommanderDamage() {
    setCommanderDamageSource(null);
    setCommanderDamageDefenderId(null);
    setCommanderDamageAmount(1);
  }

  function getNextCommanderTax(commander: CommanderRecord): number {
    return Math.max(0, commander.timesCastFromCommandZone) * 2;
  }

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

        {creatures.length === 0 && commandZoneCommanders.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>No creatures on the battlefield yet.</Text></View>
        ) : (
          <ScrollView contentContainerStyle={styles.grid}>
            {commandZoneCommanders.map(commander => {
              const tax = getNextCommanderTax(commander);
              const owner = state.players.find(p => p.id === commander.ownerPlayerId);
              const costMeta = getCostMeta(commander);
              return (
                <View key={commander.id} style={styles.commandZoneTile}>
                  <View style={styles.commandZoneBody}>
                    <Text style={styles.tileName}>{commander.name}</Text>
                    <Text style={styles.tileOwner}>{owner?.name ?? "Unknown"} - Zone: Command Zone</Text>
                    {costMeta && <Text style={styles.tileOwner}>{costMeta}</Text>}
                    <Text style={styles.commandZoneTax}>Current Commander Tax +{tax}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.smallActionBtn, { borderColor: C.accent }]}
                    onPress={() => setRecastCommander(commander)}
                  >
                    <Text style={styles.smallActionText}>Cast from Command Zone</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            {creatures.map(sp => {
              const owner = state.players.find(p => p.id === sp.playerId);
              const isMine = owner?.isUser ?? true;
              const ownerColor = isMine ? C.accent : "#F59E0B";
              const blockerNames = (sp.blockedByIds ?? []).map(creatureName).join(", ");
              const blockingName = sp.blockingId ? creatureName(sp.blockingId) : null;
              const { power: ep, toughness: et } = getEffectivePT(sp);
              const counterEntries = Object.entries(sp.counters ?? {}).filter(([, v]) => (v ?? 0) > 0);
              const costMeta = getCostMeta(sp);
              return (
                <TouchableOpacity
                  key={sp.id}
                  style={[styles.tile, { borderColor: sp.attacking ? C.danger : ownerColor }, sp.tapped && styles.tileTapped]}
                  onPress={() => setActiveSpell(sp)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tileName}>{sp.name}</Text>
                  {sp.isCommander && <Text style={styles.commanderBadge}>Commander</Text>}
                  <Text style={[styles.tileOwner, { color: ownerColor }]}>{owner?.name ?? "Unknown"}</Text>
                  {costMeta && <Text style={styles.tileOwner}>{costMeta}</Text>}
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
                  {ep !== undefined && et !== undefined && (
                    <Text style={styles.tilePTBadge}>{ep}/{et}</Text>
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

              {/* Commander identity is setup-defined; manual mark/unmark stays hidden from player-facing actions. */}
              {liveActive && (
                <>
                  {onEditSpell && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => {
                        const spellToEdit = liveActive;
                        setActiveSpell(null);
                        onEditSpell(spellToEdit);
                      }}
                    >
                      <Text style={styles.actionBtnText}>Edit Creature</Text>
                    </TouchableOpacity>
                  )}
                  {liveActive.isCommander && (
                    <>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => {
                          dispatch({ type: "MOVE_COMMANDER_TO_COMMAND_ZONE", spellId: liveActive.id });
                          setActiveSpell(null);
                        }}
                      >
                        <Text style={styles.actionBtnText}>Move to Command Zone</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => openCommanderDamage(liveActive)}
                      >
                        <Text style={styles.actionBtnText}>Commander Damage</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}

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

              {liveActive && (
                <>
                  <View style={styles.counterHeader}>
                    <Text style={styles.counterHeaderText}>Zone</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                      dispatch({ type: "MOVE_TO_GY", spellId: liveActive.id, source: "died" });
                      setActiveSpell(null);
                    }}
                  >
                    <Text style={styles.actionBtnText}>Send to Graveyard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                      dispatch({ type: "MOVE_TO_EXILE", spellId: liveActive.id });
                      setActiveSpell(null);
                    }}
                  >
                    <Text style={styles.actionBtnText}>Exile</Text>
                  </TouchableOpacity>
                </>
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

        {/* Commander damage picker */}
        <Modal visible={!!commanderDamageSource} transparent animationType="fade" onRequestClose={closeCommanderDamage}>
          <View style={styles.overlay}>
            <View style={styles.actionSheet}>
              <Text style={styles.title}>Commander Damage</Text>
              <Text style={styles.tileOwner}>{commanderDamageSource?.name}</Text>

              <Text style={styles.counterHeaderText}>Defending Player</Text>
              {commanderDamageDefenders.length === 0 ? (
                <Text style={styles.emptyText}>No valid defending players.</Text>
              ) : (
                commanderDamageDefenders.map(player => (
                  <TouchableOpacity
                    key={player.id}
                    style={[styles.actionBtn, commanderDamageDefenderId === player.id && { borderColor: C.accent, backgroundColor: C.accentDim }]}
                    onPress={() => setCommanderDamageDefenderId(player.id)}
                  >
                    <Text style={styles.actionBtnText}>{player.name}{player.isUser ? " (You)" : ""}</Text>
                  </TouchableOpacity>
                ))
              )}

              <View style={styles.counterRow}>
                <Text style={styles.counterLabel}>Amount</Text>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setCommanderDamageAmount(v => Math.max(1, v - 1))}>
                  <Text style={styles.counterBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.counterCount}>{commanderDamageAmount}</Text>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setCommanderDamageAmount(v => v + 1)}>
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, (!commanderDamageSource?.commanderId || !selectedDamageDefender) && styles.counterBtnDisabled]}
                disabled={!commanderDamageSource?.commanderId || !selectedDamageDefender}
                onPress={() => {
                  if (commanderDamageSource?.commanderId && selectedDamageDefender) {
                    dispatch({ type: "APPLY_COMMANDER_DAMAGE", commanderId: commanderDamageSource.commanderId, defendingPlayerId: selectedDamageDefender.id, amount: commanderDamageAmount });
                    closeCommanderDamage();
                  }
                }}
              >
                <Text style={styles.actionBtnText}>Apply Damage</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={closeCommanderDamage}>
                <Text style={styles.actionBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Commander recast confirmation */}
        <Modal visible={!!recastCommander} transparent animationType="fade" onRequestClose={() => setRecastCommander(null)}>
          <View style={styles.overlay}>
            <ScrollView style={styles.recastScroll} contentContainerStyle={styles.recastContent} showsVerticalScrollIndicator={false}>
              <View style={styles.recastSheet}>
                {(() => {
                  const commander = recastCommander;
                  if (!commander) return null;
                  const tax = getNextCommanderTax(commander);
                  const manaValue = getManaCostValue(commander.manaCost, commander.manaValue);
                  const totalCost = manaValue === undefined ? null : manaValue + tax;
                  return (
                    <>
                      <Text style={styles.recastTitle}>Cast {commander.name} from the command zone?</Text>
                      <View style={styles.recastRows}>
                        <View style={styles.recastRow}>
                          <Text style={styles.recastLabel}>Base Cost</Text>
                          <Text style={styles.recastValue}>{hasManaCost(commander.manaCost) ? formatManaCostLabel(commander.manaCost) : "Unknown"}</Text>
                        </View>
                        <View style={styles.recastRow}>
                          <Text style={styles.recastLabel}>Mana Value</Text>
                          <Text style={styles.recastValue}>{manaValue ?? "Unknown"}</Text>
                        </View>
                        <View style={styles.recastRow}>
                          <Text style={styles.recastLabel}>Commander Tax</Text>
                          <Text style={styles.recastTaxValue}>+{tax} generic</Text>
                        </View>
                        <View style={styles.recastRow}>
                          <Text style={styles.recastLabel}>Suggested Total</Text>
                          <Text style={styles.recastTotalValue}>{totalCost ?? "Unknown"}</Text>
                        </View>
                      </View>
                      <Text style={styles.recastNote}>This will move the commander to the battlefield.</Text>
                      <View style={styles.recastButtonRow}>
                        <TouchableOpacity style={[styles.recastButton, styles.recastCancelBtn]} onPress={() => setRecastCommander(null)}>
                          <Text style={styles.recastCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.recastButton, styles.recastConfirmBtn]}
                          onPress={() => {
                            dispatch({ type: "CAST_COMMANDER_FROM_COMMAND_ZONE", commanderId: commander.id });
                            setRecastCommander(null);
                          }}
                        >
                          <Text style={styles.recastConfirmText}>Cast Commander</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  );
                })()}
              </View>
            </ScrollView>
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
  tile: { width: "47%", minHeight: 132, backgroundColor: C.card, borderRadius: 12, borderWidth: 2, padding: 12, paddingRight: 58, paddingBottom: 24, gap: 4 },
  tileTapped: { opacity: 0.6 },
  tileName: { color: C.text, fontSize: 14, fontWeight: "700" },
  commanderBadge: { alignSelf: "flex-start", color: C.warning, fontSize: 10, fontWeight: "900", borderWidth: 1, borderColor: C.warning, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  tilePTBadge: { position: "absolute", right: 12, bottom: 10, color: C.text, fontSize: 18, fontWeight: "900", fontVariant: ["tabular-nums"] },
  tileOwner: { color: C.muted, fontSize: 11, fontWeight: "700" },
  tileStatusRow: { flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" },
  tileStatus: { fontSize: 10, fontWeight: "700", color: C.warning },
  tileBlocked: { fontSize: 10, color: C.muted, marginTop: 2 },
  tileCounters: { fontSize: 10, color: C.accent, marginTop: 2 },
  commandZoneTile: { width: "100%", backgroundColor: C.cardAlt, borderRadius: 12, borderWidth: 1, borderColor: C.warning, padding: 12, gap: 12 },
  commandZoneBody: { gap: 4 },
  commandZoneTax: { color: C.warning, fontSize: 12, fontWeight: "800" },
  smallActionBtn: { minHeight: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
  smallActionText: { color: C.text, fontSize: 12, fontWeight: "800", textAlign: "center" },
  hubButton: { position: "absolute", bottom: 30, right: 16, width: 52, height: 52, borderRadius: 26, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  hubButtonIcon: { fontSize: 22, color: C.text, fontWeight: "700" },
  overlayScroll: { flex: 1, backgroundColor: C.overlay },
  overlayContent: { justifyContent: "center", alignItems: "center", padding: 20, flexGrow: 1 },
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: "center", alignItems: "center", padding: 20 },
  actionSheet: { backgroundColor: C.card, borderRadius: 16, padding: 20, width: "100%", maxWidth: 360, borderWidth: 1, borderColor: C.border, gap: 10 },
  recastScroll: { width: "100%", maxHeight: "90%" },
  recastContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: 12 },
  recastSheet: { backgroundColor: C.card, borderRadius: 16, padding: 22, width: "100%", maxWidth: 400, borderWidth: 1, borderColor: C.border, gap: 14 },
  recastTitle: { color: C.text, fontSize: 24, lineHeight: 30, fontWeight: "900" },
  recastRows: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, paddingVertical: 4 },
  recastRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 7 },
  recastLabel: { color: C.muted, fontSize: 14, fontWeight: "700", flex: 1 },
  recastValue: { color: C.text, fontSize: 15, fontWeight: "800", flex: 1.2, textAlign: "right" },
  recastTaxValue: { color: C.warning, fontSize: 15, fontWeight: "900", flex: 1.2, textAlign: "right" },
  recastTotalValue: { color: C.accent, fontSize: 17, fontWeight: "900", flex: 1.2, textAlign: "right" },
  recastNote: { color: C.muted, fontSize: 14, lineHeight: 20 },
  recastButtonRow: { flexDirection: "row", gap: 10 },
  recastButton: { flex: 1, minHeight: 48, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  recastCancelBtn: { backgroundColor: C.cardAlt, borderColor: C.border },
  recastConfirmBtn: { backgroundColor: C.accentDim, borderColor: C.accent },
  recastCancelText: { color: C.text, fontSize: 15, fontWeight: "800", textAlign: "center" },
  recastConfirmText: { color: C.text, fontSize: 15, fontWeight: "900", textAlign: "center" },
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
