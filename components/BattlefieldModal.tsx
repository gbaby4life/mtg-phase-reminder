import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from "react-native";
import { C, formatManaCostLabel, formatManaCostSymbols, formatManaCostSymbolsWithTax, getManaCostValue, hasManaCost } from "../lib/types";
import type { GameState, Action, CastSpell, CreatureCounterType, CommanderRecord, ManaPool } from "../lib/types";
import { getResourceTokenKind, getResourceTokenCompactText, getResourceTokenFullText, getResourceTokenActivationCostText } from "../System/resourceTokenSystem";
import ResourceTokenCostConfirmModal from "./modals/ResourceTokenCostConfirmModal";

const MANA_COLORS_BF: { key: keyof ManaPool; label: string; emoji: string }[] = [
  { key: "white",    label: "White",    emoji: "☀️" },
  { key: "blue",     label: "Blue",     emoji: "💧" },
  { key: "black",    label: "Black",    emoji: "💀" },
  { key: "red",      label: "Red",      emoji: "🔥" },
  { key: "green",    label: "Green",    emoji: "🌲" },
  { key: "colorless",label: "Colorless",emoji: "⚪" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  state: GameState;
  dispatch: React.Dispatch<Action>;
  onOpenHub: () => void;
  onEditSpell?: (spell: CastSpell) => void;
};

const COUNTER_TYPES: CreatureCounterType[] = ["+1/+1", "+1/+0", "+0/+1", "-1/-1", "-1/-0", "-0/-1"];

function getCounterEntries(creature: CastSpell): [CreatureCounterType, number][] {
  return Object.entries(creature.counters ?? {})
    .filter(([, v]) => (v ?? 0) > 0) as [CreatureCounterType, number][];
}

function getCounterSummary(creature: CastSpell): string | null {
  const entries = getCounterEntries(creature);
  return entries.length > 0 ? entries.map(([k, v]) => `${k} x${v}`).join(", ") : null;
}

function getEffectivePT(creature: CastSpell): { power?: number; toughness?: number } {
  if (creature.power === undefined || creature.toughness === undefined) return {};
  let p = creature.power;
  let t = creature.toughness;
  const c = creature.counters ?? {};
  p += (c["+1/+1"] ?? 0) + (c["+1/+0"] ?? 0) - (c["-1/-1"] ?? 0) - (c["-1/-0"] ?? 0);
  t += (c["+1/+1"] ?? 0) + (c["+0/+1"] ?? 0) - (c["-1/-1"] ?? 0) - (c["-0/-1"] ?? 0);
  return { power: p, toughness: t };
}

function getPTColor(creature: CastSpell): string {
  if (creature.power === undefined || creature.toughness === undefined) return C.text;
  const { power, toughness } = getEffectivePT(creature);
  if (power === undefined || toughness === undefined) return C.text;
  const boosted = power > creature.power || toughness > creature.toughness;
  const reduced = power < creature.power || toughness < creature.toughness;
  if (boosted && reduced) return C.warning;
  if (reduced) return C.danger;
  if (boosted) return C.success;
  return C.text;
}

function getCostMeta(card: Pick<CastSpell, "manaCost" | "manaValue"> | Pick<CommanderRecord, "manaCost" | "manaValue">): string | null {
  const manaValue = getManaCostValue(card.manaCost, card.manaValue);
  if (hasManaCost(card.manaCost)) return `Cost ${formatManaCostLabel(card.manaCost)} · MV ${manaValue ?? 0}`;
  return manaValue !== undefined ? `MV ${manaValue}` : null;
}

export default function BattlefieldModal({ visible, onClose, state, dispatch, onOpenHub, onEditSpell }: Props) {
  const [activeSpell, setActiveSpell] = useState<CastSpell | null>(null);
  const [assignBlockerFor, setAssignBlockerFor] = useState<CastSpell | null>(null);
  const [pickColorSpellId, setPickColorSpellId] = useState<string | null>(null);
  const [mapPickSpellId, setMapPickSpellId] = useState<string | null>(null);
  const [mapPickResult, setMapPickResult] = useState<"land" | "nonland" | "unknown" | null>(null);
  const [mapPickTargetId, setMapPickTargetId] = useState<string | null>(null);
  const [costConfirmSpellId, setCostConfirmSpellId] = useState<string | null>(null);
  const [costConfirmFollowUp, setCostConfirmFollowUp] = useState<"dispatch" | "map" | null>(null);
  const [counterSheetSpellId, setCounterSheetSpellId] = useState<string | null>(null);
  const [commanderDamageSource, setCommanderDamageSource] = useState<CastSpell | null>(null);
  const [commanderDamageDefenderId, setCommanderDamageDefenderId] = useState<string | null>(null);
  const [commanderDamageAmount, setCommanderDamageAmount] = useState(1);
  const [recastCommander, setRecastCommander] = useState<CommanderRecord | null>(null);

  const creatures = state.spellLog.filter(sp =>
    sp.zone === "active" &&
    (sp.type === "Creature" || (sp.isToken && sp.tokenCategory === "creature"))
  );
  const resourceTokensOnBF = state.spellLog.filter(sp =>
    sp.zone === "active" && sp.isToken && sp.tokenCategory === "resource"
  );
  const allBattlefield = [...creatures, ...resourceTokensOnBF];
  const commandZoneCommanders = state.commanders.filter(c => c.currentZone === "commandZone");

  const attackers = creatures.filter(sp => sp.attacking);

  function creatureName(id: string) {
    return state.spellLog.find(x => x.id === id)?.name ?? id;
  }

  // Keep action sheet in sync with live state
  const liveActive = activeSpell ? state.spellLog.find(x => x.id === activeSpell.id) ?? activeSpell : null;
  const counterSheetSpell = counterSheetSpellId ? state.spellLog.find(x => x.id === counterSheetSpellId) ?? null : null;
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

        {allBattlefield.length === 0 && commandZoneCommanders.length === 0 ? (
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
            {allBattlefield.map(sp => {
              const owner = state.players.find(p => p.id === sp.playerId);
              const isMine = owner?.isUser ?? true;
              const ownerColor = isMine ? C.accent : "#F59E0B";
              const isResTok = sp.isToken && sp.tokenCategory === "resource";
              if (isResTok) {
                const kind = getResourceTokenKind(sp.name);
                return (
                  <TouchableOpacity
                    key={sp.id}
                    style={[styles.tile, { borderColor: C.warning }, sp.tapped && styles.tileTapped]}
                    onPress={() => setActiveSpell(sp)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.tileName}>{sp.name}</Text>
                    <Text style={styles.commanderBadge}>{kind === "generic" ? "Resource Token" : kind}</Text>
                    <Text style={styles.tileCounters}>{getResourceTokenCompactText(kind)}</Text>
                    <Text style={[styles.tileOwner, { color: ownerColor }]}>{owner?.name ?? "Unknown"}</Text>
                    <View style={styles.tileStatusRow}>
                      {sp.tapped && <Text style={styles.tileStatus}>TAPPED</Text>}
                    </View>
                  </TouchableOpacity>
                );
              }
              const { power: ep, toughness: et } = getEffectivePT(sp);
              const counterSummary = getCounterSummary(sp);
              const isCreatureTok = sp.isToken && sp.tokenCategory === "creature";
              return (
                <TouchableOpacity
                  key={sp.id}
                  style={[styles.tile, { borderColor: sp.attacking ? C.danger : ownerColor }, sp.tapped && styles.tileTapped]}
                  onPress={() => setActiveSpell(sp)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tileName}>{sp.name}</Text>
                  {isCreatureTok && <Text style={styles.commanderBadge}>Creature Token</Text>}
                  {sp.isCommander && <Text style={styles.commanderBadge}>Commander</Text>}
                  <Text style={[styles.tileOwner, { color: ownerColor }]}>{owner?.name ?? "Unknown"}</Text>
                  {counterSummary && (
                    <Text style={styles.tileCounters}>Counters: {counterSummary}</Text>
                  )}
                  {ep !== undefined && et !== undefined && (
                    <Text style={[styles.tilePTBadge, { color: getPTColor(sp) }]}>{ep}/{et}</Text>
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
              <View style={styles.sheetTitleRow}>
                <Text style={styles.sheetCreatureTitle}>{liveActive?.name}</Text>
                {liveActive && onEditSpell && !liveActive.isToken && (
                  <TouchableOpacity
                    style={styles.editIconBtn}
                    onPress={() => { const sp = liveActive; setActiveSpell(null); onEditSpell(sp); }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.editIconText}>✎</Text>
                  </TouchableOpacity>
                )}
              </View>

              {liveActive && (() => {
                const owner = state.players.find(p => p.id === liveActive.playerId);
                const { power: ep, toughness: et } = getEffectivePT(liveActive);
                const basePT = liveActive.power !== undefined && liveActive.toughness !== undefined
                  ? `${liveActive.power}/${liveActive.toughness}`
                  : null;
                const currentPT = ep !== undefined && et !== undefined ? `${ep}/${et}` : null;
                const counterSummary = getCounterSummary(liveActive);
                const costMeta = getCostMeta(liveActive);
                const statuses = [
                  liveActive.tapped ? "Tapped" : "Untapped",
                  liveActive.attacking ? "Attacking" : null,
                  liveActive.blockingId ? `Blocking ${creatureName(liveActive.blockingId)}` : null,
                  (liveActive.blockedByIds ?? []).length > 0 ? `Blocked by ${(liveActive.blockedByIds ?? []).map(creatureName).join(", ")}` : null,
                ].filter(Boolean).join(" · ");
                return (
                  <View style={styles.detailHeader}>
                    <View style={styles.detailTopRow}>
                      <Text style={styles.detailOwner}>{owner?.name ?? "Unknown"}</Text>
                      <View style={styles.detailBadges}>
                        {liveActive.isCommander && <Text style={styles.detailBadge}>Commander</Text>}
                        {liveActive.isToken && <Text style={styles.detailBadge}>{liveActive.tokenCategory === "creature" ? "Creature Token" : "Token"}</Text>}
                      </View>
                    </View>
                    <View style={styles.detailMetaGrid}>
                      {currentPT && (
                        <View style={styles.detailMetaItem}>
                          <Text style={styles.detailMetaLabel}>Current P/T</Text>
                          <Text style={[styles.detailPT, { color: getPTColor(liveActive) }]}>{currentPT}</Text>
                        </View>
                      )}
                      {basePT && (
                        <View style={styles.detailMetaItem}>
                          <Text style={styles.detailMetaLabel}>Base P/T</Text>
                          <Text style={styles.detailMetaValue}>{basePT}</Text>
                        </View>
                      )}
                    </View>
                    {counterSummary && <Text style={styles.detailLine}>Counters: {counterSummary}</Text>}
                    {costMeta && <Text style={styles.detailLine}>{costMeta}</Text>}
                    {statuses.length > 0 && <Text style={styles.detailLine}>{statuses}</Text>}
                  </View>
                );
              })()}

              {liveActive && (() => {
                const isResourceToken = liveActive.type === "Token" && liveActive.tokenCategory === "resource";
                const isCreatureToken = !!liveActive.isToken && liveActive.tokenCategory === "creature";
                const kind = isResourceToken ? getResourceTokenKind(liveActive.name) : null;
                return (
                  <>
                    {/* Edit — hide for tokens */}
                    {/* Commander actions */}
                    {liveActive.isCommander && (<>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnCommander]}
                        onPress={() => { dispatch({ type: "MOVE_COMMANDER_TO_COMMAND_ZONE", spellId: liveActive.id }); setActiveSpell(null); }}
                      >
                        <Text style={styles.actionBtnText}>Move to Command Zone</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.actionBtnCommander]} onPress={() => openCommanderDamage(liveActive)}>
                        <Text style={styles.actionBtnText}>Commander Damage</Text>
                      </TouchableOpacity>
                    </>)}

                    {/* Combat / zone / counters — hidden for resource tokens */}
                    {!isResourceToken && (<>
                      <View style={styles.actionButtonRow}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnFlex, styles.actionBtnCombat]}
                          onPress={() => { dispatch({ type: "TOGGLE_TAPPED", spellId: liveActive.id }); setActiveSpell(null); }}
                        >
                          <Text style={styles.actionBtnText}>{liveActive.tapped ? "Untap" : "Tap"}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnFlex, styles.actionBtnCombat]}
                          onPress={() => { dispatch({ type: liveActive.attacking ? "REMOVE_FROM_COMBAT" : "DECLARE_ATTACKER", spellId: liveActive.id }); setActiveSpell(null); }}
                        >
                          <Text style={styles.actionBtnText}>{liveActive.attacking ? "Remove Combat" : "Attack"}</Text>
                        </TouchableOpacity>
                      </View>

                      {!liveActive.attacking && (liveActive.blockingId ? (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnCombat]}
                          onPress={() => { dispatch({ type: "REMOVE_BLOCKER", blockerId: liveActive.id }); setActiveSpell(null); }}
                        >
                          <Text style={styles.actionBtnText}>Remove Blocker</Text>
                        </TouchableOpacity>
                      ) : attackers.length > 0 ? (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnCombat]}
                          onPress={() => { setAssignBlockerFor(liveActive); setActiveSpell(null); }}
                        >
                          <Text style={styles.actionBtnText}>Assign as Blocker</Text>
                        </TouchableOpacity>
                      ) : null)}

                      <View style={styles.counterHeader}>
                        <Text style={styles.counterHeaderText}>Zone</Text>
                      </View>
                      {isCreatureToken ? (<>
                        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => { dispatch({ type: "CREATURE_TOKEN_EXIT", spellId: liveActive.id, reason: "died" }); setActiveSpell(null); }}>
                          <Text style={styles.actionBtnText}>☠ Die</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => { dispatch({ type: "CREATURE_TOKEN_EXIT", spellId: liveActive.id, reason: "sacrificed" }); setActiveSpell(null); }}>
                          <Text style={styles.actionBtnText}>⚔ Sacrifice</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => { dispatch({ type: "CREATURE_TOKEN_EXIT", spellId: liveActive.id, reason: "destroyed" }); setActiveSpell(null); }}>
                          <Text style={styles.actionBtnText}>💥 Destroy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => { dispatch({ type: "CREATURE_TOKEN_EXIT", spellId: liveActive.id, reason: "delete" }); setActiveSpell(null); }}>
                          <Text style={styles.actionBtnText}>✕ Delete</Text>
                        </TouchableOpacity>
                      </>) : (
                        <View style={styles.actionButtonRow}>
                          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnFlex, styles.actionBtnDanger]} onPress={() => { dispatch({ type: "MOVE_TO_GY", spellId: liveActive.id, source: "died" }); setActiveSpell(null); }}>
                            <Text style={styles.actionBtnText}>Send to GY</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnFlex, styles.actionBtnDanger]} onPress={() => { dispatch({ type: "MOVE_TO_EXILE", spellId: liveActive.id }); setActiveSpell(null); }}>
                            <Text style={styles.actionBtnText}>Exile</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <TouchableOpacity style={[styles.actionBtn, styles.actionBtnCounter]} onPress={() => setCounterSheetSpellId(liveActive.id)}>
                        <Text style={styles.actionBtnText}>Counters</Text>
                        {getCounterSummary(liveActive) && (
                          <Text style={styles.actionBtnSubText}>{getCounterSummary(liveActive)}</Text>
                        )}
                      </TouchableOpacity>
                    </>)}

                    {/* Resource token actions */}
                    {isResourceToken && kind && (<>
                      <View style={styles.counterHeader}>
                        <Text style={styles.counterHeaderText}>Token Actions</Text>
                      </View>
                      <Text style={{ color: C.muted, fontSize: 12, fontStyle: "italic", textAlign: "center", paddingHorizontal: 4 }}>
                        {getResourceTokenFullText(kind)}
                      </Text>
                      {kind === "Treasure" && (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => { setPickColorSpellId(liveActive.id); setActiveSpell(null); }}>
                          <Text style={styles.actionBtnText}>◈ Crack Treasure</Text>
                        </TouchableOpacity>
                      )}
                      {kind === "Food" && (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => { setCostConfirmSpellId(liveActive.id); setCostConfirmFollowUp("dispatch"); setActiveSpell(null); }}>
                          <Text style={styles.actionBtnText}>Use — Gain 3 Life</Text>
                        </TouchableOpacity>
                      )}
                      {kind === "Clue" && (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => { setCostConfirmSpellId(liveActive.id); setCostConfirmFollowUp("dispatch"); setActiveSpell(null); }}>
                          <Text style={styles.actionBtnText}>Use — Draw 1 Card</Text>
                        </TouchableOpacity>
                      )}
                      {kind === "Blood" && (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => { setCostConfirmSpellId(liveActive.id); setCostConfirmFollowUp("dispatch"); setActiveSpell(null); }}>
                          <Text style={styles.actionBtnText}>Use — Draw 1, Discard 1</Text>
                        </TouchableOpacity>
                      )}
                      {kind === "Map" && (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => { setCostConfirmSpellId(liveActive.id); setCostConfirmFollowUp("map"); setActiveSpell(null); }}>
                          <Text style={styles.actionBtnText}>Use — Explore</Text>
                        </TouchableOpacity>
                      )}
                      {kind === "Powerstone" && (<>
                        <TouchableOpacity
                          style={[styles.actionBtn, !!liveActive.tapped && styles.counterBtnDisabled]}
                          disabled={!!liveActive.tapped}
                          onPress={() => { dispatch({ type: "RESOLVE_RESOURCE_TOKEN", spellId: liveActive.id, intent: "use" }); setActiveSpell(null); }}
                        >
                          <Text style={styles.actionBtnText}>Tap for 1 Colorless Mana</Text>
                        </TouchableOpacity>
                        <Text style={{ color: C.muted, fontSize: 11, textAlign: "center" }}>Cannot cast nonartifact spells</Text>
                      </>)}
                      {kind === "generic" && (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => { dispatch({ type: "RESOLVE_RESOURCE_TOKEN", spellId: liveActive.id, intent: "use" }); setActiveSpell(null); }}>
                          <Text style={styles.actionBtnText}>Use</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={styles.actionBtn} onPress={() => { dispatch({ type: "RESOLVE_RESOURCE_TOKEN", spellId: liveActive.id, intent: "sacrifice" }); setActiveSpell(null); }}>
                        <Text style={styles.actionBtnText}>⚔ Sacrifice</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => { dispatch({ type: "RESOLVE_RESOURCE_TOKEN", spellId: liveActive.id, intent: "destroy" }); setActiveSpell(null); }}>
                        <Text style={styles.actionBtnText}>💥 Destroy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => { dispatch({ type: "RESOLVE_RESOURCE_TOKEN", spellId: liveActive.id, intent: "delete" }); setActiveSpell(null); }}>
                        <Text style={styles.actionBtnText}>✕ Delete</Text>
                      </TouchableOpacity>
                    </>)}

                    <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setActiveSpell(null)}>
                      <Text style={styles.actionBtnText}>Done</Text>
                    </TouchableOpacity>
                  </>
                );
              })()}
            </View>
          </ScrollView>
        </Modal>

        {/* Counter controls */}
        <Modal visible={!!counterSheetSpellId} transparent animationType="fade" onRequestClose={() => setCounterSheetSpellId(null)}>
          <ScrollView style={styles.overlayScroll} contentContainerStyle={styles.overlayContent}>
            <View style={styles.actionSheet}>
              {counterSheetSpell ? (() => {
                const { power: ep, toughness: et } = getEffectivePT(counterSheetSpell);
                const basePT = counterSheetSpell.power !== undefined && counterSheetSpell.toughness !== undefined
                  ? `${counterSheetSpell.power}/${counterSheetSpell.toughness}`
                  : null;
                const currentPT = ep !== undefined && et !== undefined ? `${ep}/${et}` : null;
                const counterSummary = getCounterSummary(counterSheetSpell);
                return (
                  <>
                    <Text style={styles.title}>Counters</Text>
                    <View style={styles.detailHeader}>
                      <Text style={styles.detailOwner}>{counterSheetSpell.name}</Text>
                      <View style={styles.detailMetaGrid}>
                        {currentPT && (
                          <View style={styles.detailMetaItem}>
                            <Text style={styles.detailMetaLabel}>Current P/T</Text>
                            <Text style={[styles.detailPT, { color: getPTColor(counterSheetSpell) }]}>{currentPT}</Text>
                          </View>
                        )}
                        {basePT && (
                          <View style={styles.detailMetaItem}>
                            <Text style={styles.detailMetaLabel}>Base P/T</Text>
                            <Text style={styles.detailMetaValue}>{basePT}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.detailLine}>Counters: {counterSummary ?? "None"}</Text>
                    </View>
                    {COUNTER_TYPES.map(ct => {
                      const count = counterSheetSpell.counters?.[ct] ?? 0;
                      return (
                        <View key={ct} style={styles.counterRow}>
                          <Text style={styles.counterLabel}>{ct}</Text>
                          <Text style={styles.counterCount}>{count}</Text>
                          <TouchableOpacity
                            style={[styles.counterBtn, count === 0 && styles.counterBtnDisabled]}
                            onPress={() => dispatch({ type: "CHANGE_CREATURE_COUNTER", spellId: counterSheetSpell.id, counterType: ct, delta: -1 })}
                            disabled={count === 0}
                          >
                            <Text style={styles.counterBtnText}>−</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.counterBtn}
                            onPress={() => dispatch({ type: "CHANGE_CREATURE_COUNTER", spellId: counterSheetSpell.id, counterType: ct, delta: 1 })}
                          >
                            <Text style={styles.counterBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                    <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setCounterSheetSpellId(null)}>
                      <Text style={styles.actionBtnText}>Done</Text>
                    </TouchableOpacity>
                  </>
                );
              })() : (
                <>
                  <Text style={styles.title}>Counters</Text>
                  <Text style={styles.emptyText}>This creature is no longer active.</Text>
                  <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setCounterSheetSpellId(null)}>
                    <Text style={styles.actionBtnText}>Done</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </Modal>

        {/* ── TREASURE COLOR PICKER ── */}
        <Modal visible={!!pickColorSpellId} transparent animationType="fade" onRequestClose={() => setPickColorSpellId(null)}>
          <View style={styles.overlay}>
            <View style={styles.actionSheet}>
              <Text style={styles.title}>Crack Treasure</Text>
              <Text style={styles.tileOwner}>Choose a mana color:</Text>
              {MANA_COLORS_BF.map(c => (
                <TouchableOpacity
                  key={c.key}
                  style={styles.actionBtn}
                  onPress={() => {
                    if (pickColorSpellId) dispatch({ type: "RESOLVE_RESOURCE_TOKEN", spellId: pickColorSpellId, intent: "use", manaColor: c.key });
                    setPickColorSpellId(null);
                  }}
                >
                  <Text style={styles.actionBtnText}>{c.emoji} {c.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setPickColorSpellId(null)}>
                <Text style={styles.actionBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── MAP EXPLORE PICKER ── */}
        <Modal visible={!!mapPickSpellId} transparent animationType="fade" onRequestClose={() => { setMapPickSpellId(null); setMapPickResult(null); setMapPickTargetId(null); }}>
          <View style={styles.overlay}>
            <View style={styles.actionSheet}>
              <Text style={styles.title}>Map — Explore</Text>
              {mapPickResult === null ? (<>
                <Text style={styles.tileOwner}>What did you reveal?</Text>
                <TouchableOpacity style={styles.actionBtn} onPress={() => {
                  if (mapPickSpellId) dispatch({ type: "RESOLVE_RESOURCE_TOKEN", spellId: mapPickSpellId, intent: "use", mapResult: "land" });
                  setMapPickSpellId(null);
                }}>
                  <Text style={styles.actionBtnText}>🌲 Land</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setMapPickResult("nonland")}>
                  <Text style={styles.actionBtnText}>📄 Nonland — add +1/+1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => {
                  if (mapPickSpellId) dispatch({ type: "RESOLVE_RESOURCE_TOKEN", spellId: mapPickSpellId, intent: "use", mapResult: "unknown" });
                  setMapPickSpellId(null);
                }}>
                  <Text style={styles.actionBtnText}>? Unknown / Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setMapPickSpellId(null)}>
                  <Text style={styles.actionBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>) : (<>
                <Text style={styles.tileOwner}>Select creature for +1/+1 (optional):</Text>
                <ScrollView style={{ maxHeight: 180 }}>
                  {creatures.map(sp => (
                    <TouchableOpacity
                      key={sp.id}
                      style={[styles.actionBtn, mapPickTargetId === sp.id && { borderColor: C.accent, backgroundColor: C.accentDim }]}
                      onPress={() => setMapPickTargetId(prev => prev === sp.id ? null : sp.id)}
                    >
                      <Text style={styles.actionBtnText}>{sp.name}{sp.power !== undefined ? ` (${sp.power}/${sp.toughness})` : ""}</Text>
                    </TouchableOpacity>
                  ))}
                  {creatures.length === 0 && <Text style={{ color: C.muted, textAlign: "center", paddingVertical: 8 }}>No creatures</Text>}
                </ScrollView>
                <TouchableOpacity style={styles.actionBtn} onPress={() => {
                  if (mapPickSpellId) dispatch({ type: "RESOLVE_RESOURCE_TOKEN", spellId: mapPickSpellId, intent: "use", mapResult: "nonland", mapTargetSpellId: mapPickTargetId ?? undefined });
                  setMapPickSpellId(null); setMapPickResult(null); setMapPickTargetId(null);
                }}>
                  <Text style={styles.actionBtnText}>Confirm{mapPickTargetId ? " (+1/+1)" : " (no target)"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => { setMapPickResult(null); setMapPickTargetId(null); }}>
                  <Text style={styles.actionBtnText}>Back</Text>
                </TouchableOpacity>
              </>)}
            </View>
          </View>
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
                  const baseCost = formatManaCostSymbols(commander.manaCost, commander.manaValue);
                  const totalCost = formatManaCostSymbolsWithTax(commander.manaCost, tax, commander.manaValue);
                  return (
                    <>
                      <Text style={styles.recastTitle}>Cast {commander.name} from the command zone?</Text>
                      <View style={styles.recastRows}>
                        <View style={styles.recastRow}>
                          <Text style={styles.recastLabel}>Base Cost</Text>
                          <Text style={styles.recastValue}>{baseCost}</Text>
                        </View>
                        <View style={styles.recastRow}>
                          <Text style={styles.recastLabel}>Mana Value</Text>
                          <Text style={styles.recastValue}>{manaValue ?? "Unknown"}</Text>
                        </View>
                        <View style={styles.recastRow}>
                          <Text style={styles.recastLabel}>Commander Tax</Text>
                          <Text style={styles.recastTaxValue}>+{tax}</Text>
                        </View>
                        <View style={styles.recastRow}>
                          <Text style={styles.recastLabel}>Suggested Total</Text>
                          <Text style={styles.recastTotalValue}>{totalCost}</Text>
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

      {/* ── COST CONFIRMATION ── */}
      {(() => {
        const confirmSpell = costConfirmSpellId ? state.spellLog.find(x => x.id === costConfirmSpellId) : null;
        const confirmKind = confirmSpell ? getResourceTokenKind(confirmSpell.name) : "generic" as const;
        const fullText = getResourceTokenFullText(confirmKind);
        const costText = getResourceTokenActivationCostText(confirmKind);
        const colonIdx = fullText.indexOf(": ");
        const effectText = colonIdx >= 0 ? fullText.slice(colonIdx + 2) : fullText;
        return (
          <ResourceTokenCostConfirmModal
            visible={!!costConfirmSpellId}
            tokenName={confirmSpell?.name ?? ""}
            rulesText={fullText}
            costText={costText}
            effectText={effectText}
            onCancel={() => { setCostConfirmSpellId(null); setCostConfirmFollowUp(null); }}
            onConfirm={() => {
              if (costConfirmFollowUp === "dispatch" && costConfirmSpellId) {
                dispatch({ type: "RESOLVE_RESOURCE_TOKEN", spellId: costConfirmSpellId, intent: "use" });
              } else if (costConfirmFollowUp === "map" && costConfirmSpellId) {
                setMapPickSpellId(costConfirmSpellId);
              }
              setCostConfirmSpellId(null);
              setCostConfirmFollowUp(null);
            }}
          />
        );
      })()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg, paddingTop: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 20, fontWeight: "800", color: C.text, marginBottom: 8 },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sheetCreatureTitle: { color: C.text, fontSize: 20, fontWeight: "900", flex: 1 },
  editIconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.accent, alignItems: "center", justifyContent: "center" },
  editIconText: { color: C.text, fontSize: 18, fontWeight: "900", lineHeight: 22 },
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
  detailHeader: { backgroundColor: C.cardAlt, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, gap: 8 },
  detailTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  detailOwner: { color: C.text, fontSize: 13, fontWeight: "800" },
  detailBadges: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 6, flex: 1 },
  detailBadge: { color: C.warning, fontSize: 9, fontWeight: "900", borderWidth: 1, borderColor: C.warning, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  detailMetaGrid: { flexDirection: "row", gap: 8 },
  detailMetaItem: { flex: 1, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 8 },
  detailMetaLabel: { color: C.muted, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  detailMetaValue: { color: C.text, fontSize: 15, fontWeight: "900", marginTop: 2, fontVariant: ["tabular-nums"] },
  detailPT: { fontSize: 18, fontWeight: "900", marginTop: 2, fontVariant: ["tabular-nums"] },
  detailLine: { color: C.muted, fontSize: 12, fontWeight: "700" },
  recastScroll: { width: "100%", maxHeight: "90%" },
  recastContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: 12 },
  recastSheet: { backgroundColor: C.card, borderRadius: 16, padding: 22, width: "100%", maxWidth: 400, borderWidth: 1, borderColor: C.border, gap: 14 },
  recastTitle: { color: C.text, fontSize: 24, lineHeight: 30, fontWeight: "900" },
  recastRows: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, paddingVertical: 4 },
  recastRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 7 },
  recastLabel: { color: C.muted, fontSize: 14, fontWeight: "700", flex: 1 },
  recastValue: { color: C.text, fontSize: 16, fontWeight: "800", flex: 1.2, textAlign: "right" },
  recastTaxValue: { color: C.warning, fontSize: 15, fontWeight: "900", flex: 1.2, textAlign: "right" },
  recastTotalValue: { color: C.accent, fontSize: 19, fontWeight: "900", flex: 1.2, textAlign: "right" },
  recastNote: { color: C.muted, fontSize: 14, lineHeight: 20 },
  recastButtonRow: { flexDirection: "row", gap: 10 },
  recastButton: { flex: 1, minHeight: 48, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  recastCancelBtn: { backgroundColor: C.cardAlt, borderColor: C.border },
  recastConfirmBtn: { backgroundColor: C.accentDim, borderColor: C.accent },
  recastCancelText: { color: C.text, fontSize: 15, fontWeight: "800", textAlign: "center" },
  recastConfirmText: { color: C.text, fontSize: 15, fontWeight: "900", textAlign: "center" },
  actionBtn: { backgroundColor: C.cardAlt, borderRadius: 10, paddingVertical: 13, alignItems: "center", borderWidth: 1, borderColor: C.border },
  actionBtnCommander: { backgroundColor: C.warningDim, borderColor: C.warning },
  actionBtnCombat: { backgroundColor: C.accentDim, borderColor: C.accent },
  actionBtnDanger: { backgroundColor: C.dangerDim, borderColor: C.danger },
  actionBtnCounter: { backgroundColor: C.successDim, borderColor: C.success },
  actionButtonRow: { flexDirection: "row", gap: 8 },
  actionBtnFlex: { flex: 1, paddingHorizontal: 8 },
  actionBtnSubText: { color: C.muted, fontSize: 11, fontWeight: "700", marginTop: 3, textAlign: "center" },
  cancelBtn: { marginTop: 4 },
  actionBtnText: { color: C.text, fontSize: 14, fontWeight: "800", textAlign: "center" },
  counterHeader: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, marginTop: 2 },
  counterHeaderText: { color: C.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  counterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  counterLabel: { color: C.text, fontSize: 13, fontWeight: "700", flex: 1 },
  counterCount: { color: C.text, fontSize: 16, fontWeight: "900", minWidth: 24, textAlign: "center" },
  counterBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  counterBtnDisabled: { opacity: 0.35 },
  counterBtnText: { color: C.text, fontSize: 18, lineHeight: 22 },
});
