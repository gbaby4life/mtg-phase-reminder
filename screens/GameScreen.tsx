import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  TextInput, Platform, KeyboardAvoidingView, StatusBar, Animated, Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Reminder, ReminderFireInstance, ReminderEffect, ReminderEffectType, ReminderCondition,
  ReminderFrequency, GAME_EVENTS, CONDITION_OPTIONS, EFFECT_TYPE_OPTIONS,
  getPassiveEffects,
} from "../System/reminderSystem";
import { searchCardNames } from "../System/cardSearchSystem";
import type { CardNameRecord } from "../System/cardSearchSystem";
import { C, MANA_COLOR_ICONS, emptyManaCost, formatManaCostLabel, getManaCostValue, hasManaCost } from "../lib/types";
import type { CastSpell, GraveyardEntry, ExileEntry, ManaPool, GameState, Action, CreatureCounterType, ManaCost } from "../lib/types";
import {
  PHASES, PINNED_TOKENS, COMMON_TOKENS, CREATURE_COUNTER_TYPES, MANA_COST_TYPES,
  SPELL_TYPES, MANA_COLORS, RESOURCE_TOKENS, RAINBOW_COLORS, MTG_SUPERTYPES,
  MTG_ARTIFACT_SUBTYPES, MTG_BATTLE_SUBTYPES, MTG_CREATURE_SUBTYPES, MTG_ENCHANTMENT_SUBTYPES,
  MTG_LAND_SUBTYPES, MTG_PLANESWALKER_SUBTYPES, MTG_SPELL_SUBTYPES, MTG_KEYWORD_ABILITIES,
  MTG_SUBTYPES_BY_TYPE,
} from "../lib/constants";
import { buildBaseContext, combatPT } from "../lib/gameHelpers";
import { s } from "../lib/styles";
import BattlefieldModal from "../components/BattlefieldModal";
import { getResourceTokenKind, getResourceTokenCompactText } from "../System/resourceTokenSystem";

type CommanderLethalAlert = {
  defendingPlayerId: string;
  commanderId: string;
  defenderName: string;
  commanderName: string;
  amount: number;
};

export default function GameScreen({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [confirmModal, setConfirmModal] = useState(false);
  const [hubModal, setHubModal] = useState(false);
  const [specialStateOpen, setSpecialStateOpen] = useState(false);
  const [battlefieldModal, setBattlefieldModal] = useState(false);
  const [returnToBattlefieldAfterCounter, setReturnToBattlefieldAfterCounter] = useState(false);
  const [endGameModal, setEndGameModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [historyTab, setHistoryTab] = useState<string>("all");
  const [spellLogModal, setSpellLogModal] = useState(false);
  const [spellModal, setSpellModal] = useState(false);
  const [spellNameSuggestions, setSpellNameSuggestions] = useState<CardNameRecord[]>([]);
  const [drawModal, setDrawModal] = useState(false);
  const [creatureModal, setCreatureModal] = useState(false);
  const [landModal, setLandModal] = useState(false);
  const [tokenModal, setTokenModal] = useState(false);
  const [genericEvent, setGenericEvent] = useState<string | null>(null);
  const [counterModal, setCounterModal] = useState(false);
  const [counterTargetId, setCounterTargetId] = useState<string | null>(null);
  const [counterType, setCounterType] = useState<CreatureCounterType>("+1/+1");
  const [counterHint, setCounterHint] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState(1);
  const [drawQty, setDrawQty] = useState(0);
  const [discardQty, setDiscardQty] = useState(0);
  const [landQty, setLandQty] = useState(1);
  const [landWarningModal, setLandWarningModal] = useState(false);
  const [tokenSearch, setTokenSearch] = useState("");
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [tokenQty, setTokenQty] = useState(1);
  const [tokenPower, setTokenPower] = useState<string>("");
  const [tokenToughness, setTokenToughness] = useState<string>("");
  const [creatureName, setCreatureName] = useState("");
  const [selectedSpell, setSelectedSpell] = useState<string | null>(null);
  const [spellName, setSpellName] = useState("");
  const [genericNote, setGenericNote] = useState("");
  const [editSpellModal, setEditSpellModal] = useState(false);
  const [activeSpell, setActiveSpell] = useState<CastSpell | null>(null);
  const [returnToBattlefieldAfterEdit, setReturnToBattlefieldAfterEdit] = useState(false);
  const [editSpellName, setEditSpellName] = useState("");
  const [editSpellType, setEditSpellType] = useState<string | null>(null);
  const [manaModal, setManaModal] = useState(false);
  const [treasureColorModal, setTreasureColorModal] = useState(false);
  const [mapModal, setMapModal] = useState(false);
  const [mapSpellId, setMapSpellId] = useState<string | null>(null);
  const [mapResult, setMapResult] = useState<"land" | "nonland" | "unknown" | null>(null);
  const [mapTargetId, setMapTargetId] = useState<string | null>(null);
  const [gyModal, setGyModal] = useState(false);
  const [gyTab, setGyTab] = useState<"graveyard" | "exile">("graveyard");
  const [gyPlayerFilter, setGyPlayerFilter] = useState<string>("all");
  const [tokenGyModal, setTokenGyModal] = useState(false);
  const [spellActionModal, setSpellActionModal] = useState(false);
  const [gyEntryActionModal, setGyEntryActionModal] = useState(false);
  const [activeGYEntry, setActiveGYEntry] = useState<GraveyardEntry | null>(null);
  const [exileEntryActionModal, setExileEntryActionModal] = useState(false);
  const [activeExileEntry, setActiveExileEntry] = useState<ExileEntry | null>(null);
  const [addManaModal, setAddManaModal] = useState(false);
  const [othersModal, setOthersModal] = useState(false);
  const [millModal, setMillModal] = useState(false);
  const [tutorModal, setTutorModal] = useState(false);
  const [dealDamageModal, setDealDamageModal] = useState(false);
  const [copyModal, setCopyModal] = useState(false);
  const [manaEventAmounts, setManaEventAmounts] = useState<Record<string, number>>({ white: 0, blue: 0, black: 0, red: 0, green: 0, colorless: 0 });
  const [millTarget, setMillTarget] = useState<"self" | "opponent">("self");
  const [millQty, setMillQty] = useState(1);
  const [tutorNote, setTutorNote] = useState("");
  const [dealDamageNote, setDealDamageNote] = useState("");
  const [copyNote, setCopyNote] = useState("");

  // Spell detail form state — used for both Cast and Edit
  const [spellSupertype, setSpellSupertype] = useState<string | null>(null);
  const [spellSubtype, setSpellSubtype] = useState<string | null>(null);
  const [spellSubtype2, setSpellSubtype2] = useState<string | null>(null);
  const [spellPower, setSpellPower] = useState<string>("");
  const [spellToughness, setSpellToughness] = useState<string>("");
  const [spellManaCost, setSpellManaCost] = useState<ManaCost>(() => emptyManaCost());
  const [spellAbilities, setSpellAbilities] = useState<string[]>([]);
  const [spellLoyalty, setSpellLoyalty] = useState<string>("");
  const [spellDefense, setSpellDefense] = useState<string>("");
  const [spellProduces, setSpellProduces] = useState<string | null>(null);
  const [spellAttachedTo, setSpellAttachedTo] = useState<string>("");
  const [spellEffectNote, setSpellEffectNote] = useState<string>("");
  const [subtypeSearch, setSubtypeSearch] = useState<string>("");
  const [spellDetailModal, setSpellDetailModal] = useState(false);

  // Reminder system state
  const [remindersListModal, setRemindersListModal] = useState(false);
  const [reminderBuilderModal, setReminderBuilderModal] = useState(false);
  const [activeReminderModal, setActiveReminderModal] = useState(false);
  const [activeReminderItem, setActiveReminderItem] = useState<Reminder | null>(null);
  const [eventReminderToggle, setEventReminderToggle] = useState(false);
  const [phaseReminderPopup, setPhaseReminderPopup] = useState(false);
  const [reminderPopupMode, setReminderPopupMode] = useState<"once-per-phase-per-turn" | "always">("once-per-phase-per-turn");
  const [shownPhaseReminderKeys, setShownPhaseReminderKeys] = useState<string[]>([]);
  const [lifeCounterModal, setLifeCounterModal] = useState(false);
  const [lifeCounterHint, setLifeCounterHint] = useState<string | null>(null);
  const [commanderDamageEdit, setCommanderDamageEdit] = useState<{ defendingPlayerId: string; commanderId: string; amount: number } | null>(null);
  const [commanderLethalAlerts, setCommanderLethalAlerts] = useState<CommanderLethalAlert[]>([]);
  // Unified reminder builder state
  const [ubName, setUbName] = useState("");
  const [ubNameSuggestions, setUbNameSuggestions] = useState<CardNameRecord[]>([]);
  const [ubDescription, setUbDescription] = useState("");
  const [ubFireMode, setUbFireMode] = useState<"phase" | "event">("phase");
  const [ubPhases, setUbPhases] = useState<string[]>([]);
  const [ubTriggerEvent, setUbTriggerEvent] = useState<string | null>(null);
  const [ubTriggerEventSearch, setUbTriggerEventSearch] = useState("");
  const [ubConditions, setUbConditions] = useState<ReminderCondition[]>([]);
  const [ubActivePhases, setUbActivePhases] = useState<string[]>([]);
  const [ubActiveDuring, setUbActiveDuring] = useState<"mine" | "both" | "opponent">("mine");
  const [ubFrequency, setUbFrequency] = useState<ReminderFrequency>("each-turn");
  const [ubEffects, setUbEffects] = useState<ReminderEffect[]>([]);
  const [ubIsEditing, setUbIsEditing] = useState(false);
  const [ubActiveItem, setUbActiveItem] = useState<Reminder | null>(null);
  const [ubEffectBuilderOpen, setUbEffectBuilderOpen] = useState(false);
  const [ubEffectTiming, setUbEffectTiming] = useState<"immediate" | "passive">("immediate");
  const [ubEffectType, setUbEffectType] = useState<ReminderEffectType>("log-only");
  const [ubEffectAmount, setUbEffectAmount] = useState(1);
  const [ubEffectColor, setUbEffectColor] = useState<"white" | "blue" | "black" | "red" | "green" | "colorless" | null>(null);
  const [ubEffectCounterType, setUbEffectCounterType] = useState("");
  const [ubEffectCustomText, setUbEffectCustomText] = useState("");
  const [hubEventsModal, setHubEventsModal] = useState(false);
  const [hubEventOwner, setHubEventOwner] = useState<string>("");
  const hubOwnerRef = useRef<string | null>(null);
  const prevActivePhaseViewRef = useRef<string | null>(null);
  const prevCommanderDamageRef = useRef<GameState["commanderDamage"] | null>(null);

  const phase = PHASES[state.phaseIndex];
  const { extraLandPlays } = getPassiveEffects(state.reminders);
  const canPlayExtraLands = extraLandPlays > 0;
  const isOppTurn = !state.isMyTurn;
  const currentTurnPlayerId = state.turnOrder[state.currentPlayerIndex];
  const userLife = state.players.find(p => p.id === currentTurnPlayerId)?.life ?? state.life;
  const displayLands = isOppTurn
    ? state.spellLog.filter(sp =>
        sp.type === "Land" &&
        sp.playerId === currentTurnPlayerId &&
        sp.turnNumber === state.turnNumber
      ).length
    : state.landsPlayed;
  const activeCreatures = state.spellLog.filter(sp =>
    sp.zone === "active" &&
    (sp.type === "Creature" || (sp.type === "Token" && sp.tokenCategory === "creature"))
  );
  const userPlayer = state.players.find(p => p.isUser);
  const userColor = userPlayer?.color ?? C.accent;
  const activeOppPlayer = isOppTurn
    ? (state.players.find(p => p.id === currentTurnPlayerId && !p.isUser) ?? state.players.find(p => !p.isUser))
    : state.players.find(p => !p.isUser);
  const oppColor = activeOppPlayer?.color ?? "#F59E0B";
  const accentColor = isOppTurn ? oppColor : userColor;
  const accentDimColor = accentColor + "22";
  const [confirmedOppPhases, setConfirmedOppPhases] = useState<string[]>([]);
  const [confirmedMyPhases, setConfirmedMyPhases] = useState<string[]>([]);
  const [cleanupModal, setCleanupModal] = useState(false);
  const activePhase = state.activePhaseView ?? phase;
  const activeReminders = state.reminders.filter(r => {
    if (r.fireMode !== "phase") return false;
    if (r.status === "missed") return false;
    if (r.status === "inactive") return false;

    const turnMatches =
      r.activeDuring === "both" ||
      (r.activeDuring === "mine" && !isOppTurn) ||
      (r.activeDuring === "opponent" && isOppTurn);

    if (!turnMatches) return false;

    const phaseMatches =
      r.phases.length === 0 ||
      r.phases.includes(activePhase);

    if (!phaseMatches) return false;

    return r.status === "active" || r.status === "pending" || r.status === "skipped" || r.status === "resolved";
  });
  const unresolved = activeReminders.filter(r => r.status === "active" || r.status === "pending");
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [rainbowIndex, setRainbowIndex] = useState(0);
  const commanderLethalAlert = commanderLethalAlerts[0] ?? null;

  useEffect(() => {
    if (unresolved.length > 0) {
      const colorCycle = setInterval(() => {
        setRainbowIndex(i => (i + 1) % RAINBOW_COLORS.length);
      }, 400);
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => { clearInterval(colorCycle); anim.stop(); };
    } else {
      pulseAnim.setValue(0);
      setRainbowIndex(0);
    }
  }, [unresolved.length]);

  useEffect(() => {
    if (isOppTurn) {
      setConfirmedOppPhases([]);
    } else {
      setConfirmedMyPhases([]);
    }
    setShownPhaseReminderKeys([]);
    setHubEventOwner("");
  }, [state.turnNumber, state.isMyTurn]);

  useEffect(() => {
    const prevDamage = prevCommanderDamageRef.current;
    if (!prevDamage) {
      prevCommanderDamageRef.current = state.commanderDamage;
      return;
    }

    const newAlerts: CommanderLethalAlert[] = [];
    for (const [defendingPlayerId, damageByCommander] of Object.entries(state.commanderDamage)) {
      for (const [commanderId, amount] of Object.entries(damageByCommander)) {
        const previousAmount = prevDamage[defendingPlayerId]?.[commanderId] ?? 0;
        if (previousAmount < 21 && amount >= 21) {
          const defender = state.players.find(p => p.id === defendingPlayerId);
          const commander = state.commanders.find(c => c.id === commanderId);
          newAlerts.push({
            defendingPlayerId,
            commanderId,
            defenderName: defender?.name ?? "Player",
            commanderName: commander?.name ?? "Commander",
            amount,
          });
        }
      }
    }

    prevCommanderDamageRef.current = state.commanderDamage;
    if (newAlerts.length > 0) {
      setCommanderLethalAlerts(queue => [...queue, ...newAlerts]);
    }
  }, [state.commanderDamage, state.players, state.commanders]);

  useEffect(() => {
    const anyOpen =
      spellModal || spellDetailModal || drawModal || creatureModal ||
      landModal || tokenModal || addManaModal || othersModal ||
      counterModal || genericEvent !== null;
    if (!anyOpen) {
      hubOwnerRef.current = null;
      dispatch({ type: "RESET_EVENT_OWNER" });
    }
  }, [spellModal, spellDetailModal, drawModal, creatureModal, landModal,
      tokenModal, addManaModal, othersModal, counterModal, genericEvent]);

  useEffect(() => {
    const prevPhaseView = prevActivePhaseViewRef.current;
    prevActivePhaseViewRef.current = state.activePhaseView;
    if (state.activePhaseView === null || prevPhaseView === state.activePhaseView) return;
    const enteredPhase = state.activePhaseView;
    const pendingForPhase = state.reminders.filter(r => {
      if (r.fireMode !== "phase") return false;
      if (r.status !== "active" && r.status !== "pending") return false;
      const turnMatches =
        r.activeDuring === "both" ||
        (r.activeDuring === "mine" && !isOppTurn) ||
        (r.activeDuring === "opponent" && isOppTurn);
      if (!turnMatches) return false;
      return r.phases.length === 0 || r.phases.includes(enteredPhase);
    });
    if (pendingForPhase.length === 0) return;
    const key = `${state.turnNumber}-${enteredPhase}`;
    if (reminderPopupMode === "once-per-phase-per-turn" && shownPhaseReminderKeys.includes(key)) return;
    setPhaseReminderPopup(true);
    if (reminderPopupMode === "once-per-phase-per-turn") {
      setShownPhaseReminderKeys(keys => [...keys, key]);
    }
  }, [state.activePhaseView, state.reminders, state.turnNumber, isOppTurn, reminderPopupMode, shownPhaseReminderKeys]);

  useEffect(() => {
    if (!phaseReminderPopup || state.activePhaseView === null) return;
    const enteredPhase = state.activePhaseView;
    const remaining = state.reminders.filter(r => {
      if (r.fireMode !== "phase") return false;
      if (r.status !== "active" && r.status !== "pending") return false;
      const turnMatches =
        r.activeDuring === "both" ||
        (r.activeDuring === "mine" && !isOppTurn) ||
        (r.activeDuring === "opponent" && isOppTurn);
      if (!turnMatches) return false;
      return r.phases.length === 0 || r.phases.includes(enteredPhase);
    });
    if (remaining.length === 0) setPhaseReminderPopup(false);
  }, [state.reminders, phaseReminderPopup]);

  const rainbowColor = RAINBOW_COLORS[rainbowIndex];
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });

  function markAllMissed() { unresolved.forEach(r => dispatch({ type: "MISS_REMINDER", id: r.id })); setConfirmModal(false); dispatch({ type: "LOCK_PHASE" }); }

  function manaCostFromSpell(spell: Pick<CastSpell, "manaCost" | "manaValue">): ManaCost {
    if (hasManaCost(spell.manaCost)) return { ...emptyManaCost(), ...spell.manaCost };
    if (spell.manaValue !== undefined) return { ...emptyManaCost(), generic: Math.max(0, Math.floor(spell.manaValue)) };
    return emptyManaCost();
  }

  function updateSpellManaCost(key: keyof ManaCost, delta: number) {
    setSpellManaCost(prev => ({
      ...prev,
      [key]: Math.max(0, (prev[key] ?? 0) + delta),
    }));
  }

  function getSpellManaCostForSave(): { manaCost?: ManaCost; manaValue?: number } {
    const manaCost = hasManaCost(spellManaCost) ? spellManaCost : undefined;
    return { manaCost, manaValue: getManaCostValue(manaCost) };
  }

  function getSpellCostMeta(spell: Pick<CastSpell, "manaCost" | "manaValue">): string | null {
    const manaValue = getManaCostValue(spell.manaCost, spell.manaValue);
    if (hasManaCost(spell.manaCost)) return `Cost ${formatManaCostLabel(spell.manaCost)} · MV ${manaValue ?? 0}`;
    return manaValue !== undefined ? `MV ${manaValue}` : null;
  }

  function openEditSpellModal(spell: CastSpell, returnToBattlefield = false) {
    setActiveSpell(spell);
    setEditSpellName(spell.name);
    setEditSpellType(spell.type);
    setSpellSupertype(spell.supertype ?? null);
    setSpellSubtype(spell.subtype ?? null);
    setSpellSubtype2(spell.subtype2 ?? null);
    setSpellPower(spell.power?.toString() ?? "");
    setSpellToughness(spell.toughness?.toString() ?? "");
    setSpellManaCost(manaCostFromSpell(spell));
    setSpellAbilities(spell.abilities ?? []);
    setSpellLoyalty((spell.currentLoyalty ?? spell.startingLoyalty)?.toString() ?? "");
    setSpellDefense((spell.currentDefense ?? spell.startingDefense)?.toString() ?? "");
    setSpellProduces(spell.produces ?? null);
    setSpellAttachedTo(spell.attachedTo ?? "");
    setSpellEffectNote(spell.effectNote ?? "");
    setSubtypeSearch("");
    setReturnToBattlefieldAfterEdit(returnToBattlefield);
    setEditSpellModal(true);
  }

  function closeEditSpellModal(reopenBattlefield = true) {
    setEditSpellModal(false);
    if (reopenBattlefield && returnToBattlefieldAfterEdit) {
      setReturnToBattlefieldAfterEdit(false);
      setBattlefieldModal(true);
    }
  }

  function renderManaCostEditor() {
    const manaValue = getManaCostValue(spellManaCost) ?? 0;
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={s.sectionLabel}>Mana Cost (optional)</Text>
        <View style={{ backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, gap: 8 }}>
          {MANA_COST_TYPES.map(item => (
            <View key={item.key} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: "700", flex: 1 }}>{item.label}</Text>
              <TouchableOpacity style={[s.qtyBtn, { width: 34, height: 34 }]} onPress={() => updateSpellManaCost(item.key, -1)}>
                <Text style={s.lifeBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: "900", minWidth: 24, textAlign: "center", fontVariant: ["tabular-nums"] }}>
                {spellManaCost[item.key] ?? 0}
              </Text>
              <TouchableOpacity style={[s.qtyBtn, { width: 34, height: 34 }]} onPress={() => updateSpellManaCost(item.key, 1)}>
                <Text style={s.lifeBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          ))}
          <Text style={s.reminderDesc}>Cost: {hasManaCost(spellManaCost) ? formatManaCostLabel(spellManaCost) : "None"}</Text>
          <Text style={s.reminderDesc}>Mana Value: {manaValue}</Text>
        </View>
      </View>
    );
  }

  function resetSpellDetailForm() {
    setSpellSupertype(null);
    setSpellSubtype(null);
    setSpellSubtype2(null);
    setSpellPower("");
    setSpellToughness("");
    setSpellManaCost(emptyManaCost());
    setSpellAbilities([]);
    setSpellLoyalty("");
    setSpellDefense("");
    setSpellProduces(null);
    setSpellAttachedTo("");
    setSpellEffectNote("");
    setSubtypeSearch("");
  }

  function getLifeEffectHint(r: Reminder): string | null {
    const fx = r.effects.find(e =>
      e.timing === "immediate" &&
      (e.effectType === "gain-life" || e.effectType === "lose-life" || e.effectType === "pay-life")
    );
    if (!fx) return null;
    const sign = fx.effectType === "gain-life" ? "+" : "−";
    return `${r.name} — suggested ${sign}${fx.amount ?? 1} life`;
  }

  function getCounterEffectHint(r: Reminder): { hint: string; counterType: CreatureCounterType; amount: number } | null {
    const fx = r.effects.find(e => e.timing === "immediate" && e.effectType === "add-counter");
    if (!fx) return null;

    const allowedTypes: CreatureCounterType[] = ["+1/+0", "+0/+1", "+1/+1", "-1/-0", "-0/-1", "-1/-1"];
    const chosenType = allowedTypes.includes(fx.counterType as CreatureCounterType)
      ? fx.counterType as CreatureCounterType
      : "+1/+1";

    return {
      hint: `${r.name} — add ${fx.amount ?? 1} ${chosenType} counter${(fx.amount ?? 1) === 1 ? "" : "s"}`,
      counterType: chosenType,
      amount: fx.amount ?? 1,
    };
  }

  function openCounterModalForHint(effectHint: { hint: string; counterType: CreatureCounterType; amount: number }) {
    setCounterHint(effectHint.hint);
    setCounterType(effectHint.counterType);
    setCounterAmount(effectHint.amount);
    setCounterTargetId(null);
    setCounterModal(true);
  }

  function openPostResolveEffectModal(r: Reminder) {
    const lifeHint = getLifeEffectHint(r);
    if (lifeHint) {
      setLifeCounterHint(lifeHint);
      setLifeCounterModal(true);
      return;
    }

    const counterEffectHint = getCounterEffectHint(r);
    if (counterEffectHint) {
      openCounterModalForHint(counterEffectHint);
    }
  }

  function eventForSpellType(type: string | null): string {
    return type === "Creature" ? "Creature enters the battlefield"
      : type === "Instant" ? "Instant is cast"
      : type === "Sorcery" ? "Sorcery is cast"
      : type === "Land" ? "Land is played"
      : type === "Enchantment" ? "Enchantment is cast"
      : type === "Artifact" ? "Artifact is cast"
      : type === "Planeswalker" ? "Planeswalker is cast"
      : "Spell is cast";
  }

  function resetReminderBuilder() {
    setUbNameSuggestions([]);
    setUbName(""); setUbDescription(""); setUbFireMode("phase");
    setUbPhases([]); setUbTriggerEvent(null); setUbTriggerEventSearch("");
    setUbConditions([]); setUbActivePhases([]); setUbActiveDuring("mine");
    setUbFrequency("each-turn"); setUbEffects([]);
    setUbIsEditing(false); setUbActiveItem(null);
    setUbEffectBuilderOpen(false); setUbEffectTiming("immediate");
    setUbEffectType("log-only"); setUbEffectAmount(1);
    setUbEffectColor(null); setUbEffectCounterType(""); setUbEffectCustomText("");
  }

  function openReminderBuilder(existing?: Reminder) {
    setUbNameSuggestions([]);
    if (existing) {
      setUbName(existing.name);
      setUbDescription(existing.description ?? "");
      setUbFireMode(existing.fireMode);
      setUbPhases(existing.phases);
      setUbTriggerEvent(existing.triggerEvent ?? null);
      setUbConditions([...existing.conditions]);
      setUbActivePhases([...existing.activePhases]);
      setUbActiveDuring(existing.activeDuring);
      setUbFrequency(existing.frequency);
      setUbEffects([...existing.effects]);
      setUbIsEditing(true);
      setUbActiveItem(existing);
    } else {
      resetReminderBuilder();
    }
    setReminderBuilderModal(true);
  }

  function openReminderBuilderForEvent(event: string, cardName?: string) {
    resetReminderBuilder();
    setUbFireMode("event");
    setUbTriggerEvent(event);
    setUbFrequency("each-time");
    if (cardName && cardName.trim()) setUbName(cardName.trim());
    setReminderBuilderModal(true);
    setEventReminderToggle(false);
  }

  function saveReminder() {
    if (!ubName.trim()) return;
    const baseEffects: ReminderEffect[] = ubEffects.length > 0
      ? ubEffects
      : [{ id: `fx-${Date.now()}`, timing: "immediate", effectType: "log-only" }];
    const reminder: Reminder = {
      id: (ubIsEditing && ubActiveItem) ? ubActiveItem.id : `rem-${Date.now()}-${Math.random()}`,
      name: ubName.trim(),
      description: ubDescription.trim() || undefined,
      fireMode: ubFireMode,
      phases: ubPhases,
      triggerEvent: ubFireMode === "event" ? (ubTriggerEvent ?? undefined) : undefined,
      conditions: ubConditions,
      activePhases: ubActivePhases,
      activeDuring: ubActiveDuring,
      frequency: ubFrequency,
      effects: baseEffects,
      status: "active",
      sourceLabel: "Custom",
      firedCount: (ubIsEditing && ubActiveItem) ? ubActiveItem.firedCount : 0,
      firedThisTurn: false,
    };
    if (ubIsEditing && ubActiveItem) {
      dispatch({ type: "EDIT_REMINDER", id: ubActiveItem.id, updates: reminder });
    } else {
      dispatch({ type: "ADD_REMINDER", reminder });
    }
    setReminderBuilderModal(false);
    resetReminderBuilder();
  }


  const eventButtons = [
    { id: "spell-cast", label: "Spell Cast", icon: "✦", color: C.accent },
    { id: "land-played", label: "Land Played", icon: "🌲", color: C.success },
    { id: "cards-drawn-discarded", label: "Cards", icon: "🃏", color: "#60A5FA" },
    { id: "add-mana", label: "Add Mana", icon: "💎", color: C.warning },
    { id: "creature-died", label: "Creature Died", icon: "💀", color: C.danger },
    { id: "token-created", label: "Token", icon: "◈", color: C.warning },
    { id: "counter-added", label: "Counters", icon: "+1", color: "#A78BFA" },
    { id: "others", label: "Others", icon: "★", color: C.muted },
  ];

  function handleEvent(id: string) {
    if (id !== "counter-added") setReturnToBattlefieldAfterCounter(false);
    if (id === "spell-cast") { setSelectedSpell(null); setSpellName(""); setSpellNameSuggestions([]); setSpellModal(true); }
    else if (id === "land-played") { setLandQty(1); setLandModal(true); }
    else if (id === "cards-drawn-discarded") { setDrawQty(0); setDiscardQty(0); setDrawModal(true); }
    else if (id === "creature-died") { setCreatureName(""); setCreatureModal(true); }
    else if (id === "token-created") { setTokenSearch(""); setSelectedToken(null); setTokenQty(1); setTokenModal(true); }
    else if (id === "add-mana") { setManaEventAmounts({ white: 0, blue: 0, black: 0, red: 0, green: 0, colorless: 0 }); setAddManaModal(true); }
    else if (id === "others") { setOthersModal(true); }
    else if (id === "counter-added") { setCounterModal(true); }
    else { setGenericNote(""); setGenericEvent(id); }
  }

  function closeCounterModal() {
    setCounterModal(false);
    setCounterTargetId(null);
    setCounterType("+1/+1");
    setCounterHint(null);
    setCounterAmount(1);
    if (returnToBattlefieldAfterCounter) {
      setReturnToBattlefieldAfterCounter(false);
      setBattlefieldModal(true);
    }
  }

  function closeHubModal() {
    setHubModal(false);
    if (returnToBattlefieldAfterCounter) {
      setReturnToBattlefieldAfterCounter(false);
      setBattlefieldModal(true);
    }
  }

  function closeHubEventsModal() {
    setHubEventsModal(false);
    if (returnToBattlefieldAfterCounter) {
      setReturnToBattlefieldAfterCounter(false);
      setBattlefieldModal(true);
    }
  }

  function returnToBattlefieldIfNeeded() {
    if (returnToBattlefieldAfterCounter) {
      setReturnToBattlefieldAfterCounter(false);
      setBattlefieldModal(true);
    }
  }

  function openGyExileModalFromHub() {
    setHubModal(false);
    setGyTab("graveyard");
    setGyModal(true);
  }

  function closeGyModal() {
    setGyModal(false);
    returnToBattlefieldIfNeeded();
  }

  function closeGyEntryActionModal() {
    setGyEntryActionModal(false);
    returnToBattlefieldIfNeeded();
  }

  function closeExileEntryActionModal() {
    setExileEntryActionModal(false);
    returnToBattlefieldIfNeeded();
  }

  function applyCounterChange(delta: number) {
    if (!counterTargetId) return;
    dispatch({ type: "CHANGE_CREATURE_COUNTER", spellId: counterTargetId, counterType, delta });
    if (returnToBattlefieldAfterCounter) closeCounterModal();
  }

  const typeIcons: Record<string, string> = { Creature: "🐉", Instant: "⚡", Sorcery: "🌀", Enchantment: "✨", Artifact: "⚙️", Planeswalker: "👁️", Battle: "⚔️", Token: "◈", Other: "★" };

  // ── PHASE LIST VIEW — shown when no phase is open ──────────────────────────
  if (state.activePhaseView === null) {
    const currentPlayer = state.players.find(p => p.id === state.turnOrder[state.currentPlayerIndex]);
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.card} />

        {/* PHASE LIST TOP BAR */}
        <View style={[s.topBar, { paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 10 : 20, paddingBottom: 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <View>
              <Text style={[s.topPlayerName, { fontSize: 18 }]}>{currentPlayer?.name ?? state.playerName}</Text>
              <Text style={[s.statLabel, { marginTop: 2 }]}>
                {isOppTurn ? "Opponent's Turn" : "Your Turn"} · Turn {state.turnNumber}
              </Text>
            </View>
            <TouchableOpacity onPress={() => { setLifeCounterHint(null); setLifeCounterModal(true); }} activeOpacity={0.7}>
              <Text style={{ color: C.danger, fontSize: 20, fontWeight: "900" }}>{userLife} life</Text>
            </TouchableOpacity>
          </View>
          {isOppTurn && (
            <View style={{ backgroundColor: accentDimColor, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: accentColor, alignSelf: "flex-start" }}>
              <Text style={{ color: accentColor, fontSize: 11, fontWeight: "700" }}>⚡ Opponent's Turn — tap any phase</Text>
            </View>
          )}
        </View>

        {/* PHASE LIST */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <Text style={[s.sectionLabel, { marginBottom: 12 }]}>
            {isOppTurn ? "Track opponent phases — tap to open" : "Tap a phase to open it"}
          </Text>
          {PHASES.map((ph, i) => {
            const isCurrentPhase = ph === PHASES[state.phaseIndex];
            const isDone = isOppTurn
              ? confirmedOppPhases.includes(ph)
              : confirmedMyPhases.includes(ph);
            const isActive = isCurrentPhase;
            return (
              <TouchableOpacity
                key={ph}
                style={[
                  s.phaseListCard,
                  isActive && { borderColor: accentColor, backgroundColor: accentDimColor },
                  isDone && { borderColor: C.success },
                ]}
                onPress={() => dispatch({ type: "SET_ACTIVE_PHASE", phase: ph })}
                activeOpacity={0.75}
              >
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {isActive && <Text style={{ fontSize: 12, color: accentColor }}>▶</Text>}
                    <Text style={{
                      fontSize: 16, fontWeight: "700",
                      color: isDone ? C.success : isActive ? accentColor : C.text
                    }}>{ph}</Text>
                  </View>
                  <Text style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>
                    Phase {i + 1} of {PHASES.length}{ph === "Cleanup" ? (isOppTurn ? " — ends opponent's turn" : " — ends your turn") : ""}
                  </Text>
                </View>
                {isDone
                  ? <Text style={{ color: C.success, fontSize: 18, fontWeight: "700" }}>✓</Text>
                  : <Text style={{ color: accentColor, fontSize: 22 }}>›</Text>
                }
              </TouchableOpacity>
            );
          })}

        </ScrollView>

        {/* HUB BUTTON */}
        <View style={{ position: "absolute", bottom: 40, right: 16 }}>
          <TouchableOpacity style={[s.bottomBarHub, { backgroundColor: accentColor }]} onPress={() => setHubModal(true)} activeOpacity={0.85}>
            <Text style={s.bottomBarHubIcon}>◈</Text>
          </TouchableOpacity>
        </View>

        {/* All modals still rendered so Hub works from phase list */}
        {renderModals()}
      </SafeAreaView>
    );
  }

  // ── PHASE DETAIL VIEW — shown when a phase is open ────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.card} />

      {/* TOP BAR */}
      <View style={s.topBar}>
        <View style={s.topBarRow}>
          <TouchableOpacity onPress={() => dispatch({ type: "CLEAR_ACTIVE_PHASE" })} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ color: accentColor, fontSize: 18, fontWeight: "700" }}>‹</Text>
            <Text style={{ color: accentColor, fontSize: 13, fontWeight: "600" }}>Phases</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setLifeCounterHint(null); setLifeCounterModal(true); }} activeOpacity={0.7}>
            <Text style={{ color: C.danger, fontSize: 18, fontWeight: "900" }}>{userLife} life</Text>
          </TouchableOpacity>
          <View style={[s.turnBadge, { backgroundColor: accentDimColor, borderColor: accentColor }]}>
            <Text style={[s.turnBadgeText, { color: accentColor }]}>
              {isOppTurn ? "Opp Turn" : `Turn ${state.turnNumber}`}
            </Text>
          </View>
        </View>
        <View style={s.statsRow}>
          <View style={s.stat}><Text style={s.statVal}>{state.cardsDrawn}</Text><Text style={s.statLabel}>Draw</Text></View>
          <View style={s.statDiv} />
          <View style={s.stat}><Text style={s.statVal}>{displayLands}</Text><Text style={s.statLabel}>Lands</Text></View>
          <View style={s.statDiv} />
          <TouchableOpacity style={s.stat} onPress={() => { setGyTab("graveyard"); setGyModal(true); }} activeOpacity={0.7}>
            <Text style={[s.statVal, { color: accentColor }]}>{state.graveyard.length}</Text>
            <Text style={s.statLabel}>GY</Text>
          </TouchableOpacity>
          <View style={s.statDiv} />
          <TouchableOpacity style={s.stat} onPress={() => { setGyTab("exile"); setGyModal(true); }} activeOpacity={0.7}>
            <Text style={[s.statVal, { color: accentColor }]}>{state.exile.length}</Text>
            <Text style={s.statLabel}>Exile</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>

        {/* PHASE CARD */}
        <View style={[s.card, { borderColor: accentColor }]}>
          <View style={{ alignItems: "center", paddingHorizontal: 14, paddingTop: 14, marginBottom: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {state.phaseLocked && !isOppTurn && <Text style={{ fontSize: 16 }}>🔒</Text>}
              {isOppTurn && <Text style={{ fontSize: 16, color: accentColor }}>⚡</Text>}
              <Text style={[s.phaseName, { color: accentColor }]}>{activePhase}</Text>
            </View>
            <Text style={[s.phaseProgress, { marginTop: 8 }]}>
              {isOppTurn ? "Opponent's Turn" : `Phase ${state.phaseIndex + 1} of ${PHASES.length}`}
            </Text>
          </View>
          <View style={s.dotRowContainer}>
            {PHASES.map((ph, i) => {
              const isThis = ph === activePhase;
              const isPast = isOppTurn ? confirmedOppPhases.includes(ph) : i < state.phaseIndex;
              return <View key={i} style={[s.dot, isThis && { ...s.dotActive, backgroundColor: accentColor }, isPast && s.dotPast]} />;
            })}
          </View>
        </View>

        <View style={{ height: 10 }} />

        {/* SPECIAL STATE */}
        <TouchableOpacity
          style={[s.card, { padding: 0, overflow: "hidden" }]}
          onPress={() => setSpecialStateOpen(o => !o)}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: C.muted }}>Special State / Counters</Text>
              {(state.isMonarch || state.hasInitiative || state.hasCityBlessing || state.poisonCounters > 0 || state.energyCounters > 0) && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accentColor }} />
              )}
            </View>
            <Text style={{ color: C.dim, fontSize: 13 }}>{specialStateOpen ? "▲" : "▼"}</Text>
          </View>
          {specialStateOpen && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 12 }}>
              {/* Toggle rows */}
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <TouchableOpacity
                  onPress={() => dispatch({ type: "SET_MONARCH", value: !state.isMonarch })}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: state.isMonarch ? C.warning : C.border, backgroundColor: state.isMonarch ? C.warningDim : C.cardAlt }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: state.isMonarch ? C.warning : C.muted, fontWeight: "700", fontSize: 12 }}>
                    {state.isMonarch ? "👑 Monarch" : "Become Monarch"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => dispatch({ type: "SET_INITIATIVE", value: !state.hasInitiative })}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: state.hasInitiative ? accentColor : C.border, backgroundColor: state.hasInitiative ? accentDimColor : C.cardAlt }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: state.hasInitiative ? accentColor : C.muted, fontWeight: "700", fontSize: 12 }}>
                    {state.hasInitiative ? "⚔ Initiative" : "Take Initiative"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => dispatch({ type: "SET_CITY_BLESSING", value: !state.hasCityBlessing })}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: state.hasCityBlessing ? C.success : C.border, backgroundColor: state.hasCityBlessing ? C.successDim : C.cardAlt }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: state.hasCityBlessing ? C.success : C.muted, fontWeight: "700", fontSize: 12 }}>
                    {state.hasCityBlessing ? "✨ City's Blessing" : "Gain City's Blessing"}
                  </Text>
                </TouchableOpacity>
              </View>
              {/* Counter rows */}
              <View style={{ flexDirection: "row", gap: 16 }}>
                <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
                  <Text style={{ color: C.danger, fontSize: 12, fontWeight: "700" }}>☠ Poison</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TouchableOpacity onPress={() => dispatch({ type: "CHANGE_POISON", delta: -1 })} style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: C.cardAlt, alignItems: "center", justifyContent: "center" }}><Text style={{ color: C.text, fontWeight: "700" }}>−</Text></TouchableOpacity>
                    <Text style={{ color: state.poisonCounters >= 10 ? C.danger : C.text, fontWeight: "900", fontSize: 18, minWidth: 24, textAlign: "center" }}>{state.poisonCounters}</Text>
                    <TouchableOpacity onPress={() => dispatch({ type: "CHANGE_POISON", delta: 1 })} style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: C.cardAlt, alignItems: "center", justifyContent: "center" }}><Text style={{ color: C.text, fontWeight: "700" }}>+</Text></TouchableOpacity>
                  </View>
                </View>
                <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
                  <Text style={{ color: C.success, fontSize: 12, fontWeight: "700" }}>⚡ Energy</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TouchableOpacity onPress={() => dispatch({ type: "CHANGE_ENERGY", delta: -1 })} style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: C.cardAlt, alignItems: "center", justifyContent: "center" }}><Text style={{ color: C.text, fontWeight: "700" }}>−</Text></TouchableOpacity>
                    <Text style={{ color: C.text, fontWeight: "900", fontSize: 18, minWidth: 24, textAlign: "center" }}>{state.energyCounters}</Text>
                    <TouchableOpacity onPress={() => dispatch({ type: "CHANGE_ENERGY", delta: 1 })} style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: C.cardAlt, alignItems: "center", justifyContent: "center" }}><Text style={{ color: C.text, fontWeight: "700" }}>+</Text></TouchableOpacity>
                  </View>
                </View>
                <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
                  <Text style={{ color: accentColor, fontSize: 12, fontWeight: "700" }}>🃏 Hand</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TouchableOpacity onPress={() => dispatch({ type: "CHANGE_CARDS_IN_HAND", delta: -1 })} style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: C.cardAlt, alignItems: "center", justifyContent: "center" }}><Text style={{ color: C.text, fontWeight: "700" }}>−</Text></TouchableOpacity>
                    <Text style={{ color: C.text, fontWeight: "900", fontSize: 18, minWidth: 24, textAlign: "center" }}>{state.cardsInHand}</Text>
                    <TouchableOpacity onPress={() => dispatch({ type: "CHANGE_CARDS_IN_HAND", delta: 1 })} style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: C.cardAlt, alignItems: "center", justifyContent: "center" }}><Text style={{ color: C.text, fontWeight: "700" }}>+</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ height: 10 }} />

        {/* REMINDERS */}
        <View style={[s.card, { height: 200 }, unresolved.length > 0 && { borderColor: rainbowColor }]}>
          <View style={[s.sectionHead, unresolved.length > 0 && { borderBottomColor: rainbowColor }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {unresolved.length > 0 && (
                <Animated.View style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: rainbowColor,
                  transform: [{ scale: pulseScale }],
                }} />
              )}
              <Text style={s.sectionTitle}>Reminders</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {unresolved.length > 0 && (
                <View style={[s.badge, { backgroundColor: C.warningDim, borderWidth: 1, borderColor: rainbowColor }]}>
                  <Text style={[s.badgeText, { color: rainbowColor }]}>{unresolved.length} pending</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => setRemindersListModal(true)}>
                <Text style={{ color: accentColor, fontSize: 12, fontWeight: "700" }}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 6 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {activeReminders.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 28 }}><Text style={{ color: C.dim, fontSize: 13 }}>No reminders for this phase.</Text></View>
            ) : activeReminders.map(r => (
              <View key={r.id} style={[s.reminderItem, r.status !== "pending" && { opacity: 0.55 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.reminderTitle, r.status === "resolved" && { textDecorationLine: "line-through" as const }]}>{r.name}</Text>
                  {r.description ? <Text style={s.reminderDesc}>{r.description}</Text> : null}
                </View>
                {(r.status === "active" || r.status === "pending") && (
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TouchableOpacity style={s.resolveBtn} onPress={() => {
                      dispatch({ type: "RESOLVE_REMINDER", id: r.id });
                      openPostResolveEffectModal(r);
                    }}><Text style={s.resolveBtnText}>Resolve</Text></TouchableOpacity>
                    <TouchableOpacity style={s.skipBtn} onPress={() => dispatch({ type: "SKIP_REMINDER", id: r.id })}><Text style={s.skipBtnText}>Skip</Text></TouchableOpacity>
                  </View>
                )}
                {r.status !== "pending" && r.status !== "active" && (
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={{ fontSize: 11, color: r.status === "resolved" ? C.success : r.status === "missed" ? C.danger : C.warning, fontWeight: "700" }}>
                      {r.status === "skipped" ? "PARKED" : r.status.toUpperCase()}
                    </Text>
                    {r.status === "skipped" && (
                      <TouchableOpacity
                        style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border }}
                        onPress={() => dispatch({ type: "UNSKIP_REMINDER", id: r.id })}
                      >
                        <Text style={{ fontSize: 10, color: C.muted, fontWeight: "600" }}>↩ Unpark</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 10 }} />

        {/* BATTLEFIELD PREVIEW */}
        {(() => {
          const activePerm = state.spellLog.filter(sp => sp.zone === "active");
          const bfCreatures = activePerm.filter(sp => sp.type === "Creature" && !sp.isToken);
          const bfTokens = activePerm.filter(sp => sp.isToken || sp.type === "Token");
          const bfOther = activePerm.filter(sp =>
            !sp.isToken && sp.type !== "Token" && sp.type !== "Creature" &&
            sp.type !== "Instant" && sp.type !== "Sorcery"
          );
          const hasAnything = bfCreatures.length > 0 || bfTokens.length > 0 || bfOther.length > 0;

          const renderBFRow = (sp: (typeof activePerm)[0]) => {
            const bfOwner = sp.playerId ? state.players.find(p => p.id === sp.playerId) : undefined;
            const ownerColor = bfOwner ? (bfOwner.color ?? (bfOwner.isUser ? userColor : oppColor)) : C.border;
            const pt = (sp.power !== undefined && sp.toughness !== undefined) ? `${sp.power}/${sp.toughness}` : null;
            const resourceLabel = sp.isToken && sp.tokenCategory === "resource"
              ? getResourceTokenCompactText(getResourceTokenKind(sp.name))
              : null;
            const badges: string[] = [];
            if (sp.tapped) badges.push("TAPPED");
            if (sp.attacking) badges.push("ATK");
            if (sp.isCommander) badges.push("CDR");
            const ownerName = state.players.length > 1 && sp.playerId
              ? state.players.find(p => p.id === sp.playerId)?.name ?? null
              : null;
            const meta = [
              sp.isToken ? (sp.tokenCategory === "resource" ? "Resource Token" : sp.tokenCategory === "creature" ? "Creature Token" : "Token") : sp.type,
              pt,
              resourceLabel,
              ownerName,
              ...badges,
            ].filter(Boolean).join(" · ");
            return (
              <TouchableOpacity
                key={sp.id}
                style={[s.reminderItem, { borderLeftWidth: 3, borderLeftColor: ownerColor }]}
                onPress={() => { setActiveSpell(sp); setSpellActionModal(true); }}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 16 }}>{typeIcons[sp.type] ?? "◈"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.reminderTitle}>{sp.name}</Text>
                  <Text style={s.reminderDesc}>{meta}</Text>
                </View>
              </TouchableOpacity>
            );
          };

          return (
            <>
              <View style={s.card}>
                <View style={s.sectionHead}>
                  <Text style={s.sectionTitle}>Battlefield Preview</Text>
                  <TouchableOpacity onPress={() => setBattlefieldModal(true)}>
                    <Text style={{ color: accentColor, fontSize: 12, fontWeight: "700" }}>BF</Text>
                  </TouchableOpacity>
                </View>
                {!hasAnything ? (
                  <Text style={{ color: C.dim, fontSize: 12, paddingHorizontal: 14, paddingVertical: 10 }}>No permanents or tokens on the battlefield.</Text>
                ) : (
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                    {bfCreatures.length > 0 && (
                      <>
                        <Text style={[s.sectionLabel, { paddingTop: 8, paddingHorizontal: 14, marginBottom: 4 }]}>Creatures</Text>
                        {bfCreatures.map(renderBFRow)}
                      </>
                    )}
                    {bfTokens.length > 0 && (
                      <>
                        <Text style={[s.sectionLabel, { paddingTop: bfCreatures.length > 0 ? 8 : 4, paddingHorizontal: 14, marginBottom: 4 }]}>Tokens</Text>
                        {bfTokens.map(renderBFRow)}
                      </>
                    )}
                    {bfOther.length > 0 && (
                      <>
                        <Text style={[s.sectionLabel, { paddingTop: (bfCreatures.length > 0 || bfTokens.length > 0) ? 8 : 4, paddingHorizontal: 14, marginBottom: 4 }]}>Other Permanents</Text>
                        {bfOther.map(renderBFRow)}
                      </>
                    )}
                  </ScrollView>
                )}
              </View>
              <View style={{ height: 10 }} />
            </>
          );
        })()}

        {/* EVENTS */}
        <View style={s.card}>
          <View style={s.sectionHead}><Text style={s.sectionTitle}>Game Events</Text></View>
          <View style={s.eventGrid}>
            {eventButtons.map(btn => (
              <TouchableOpacity key={btn.id} style={s.eventBtn} onPress={() => handleEvent(btn.id)} activeOpacity={0.75}>
                <Text style={[s.eventIcon, { color: btn.color }]}>{btn.icon}</Text>
                <Text style={s.eventLabel}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* FIXED BOTTOM BAR */}
      <View style={s.bottomBar}>
        {/* PHASE DONE — always shown */}
        <TouchableOpacity
          style={[s.bottomBarConfirm, { backgroundColor: accentDimColor, borderColor: accentColor }]}
          onPress={() => {
            const ap = state.activePhaseView;
            if (!ap) return;
            if (isOppTurn) {
              setConfirmedOppPhases(prev =>
                prev.includes(ap) ? prev.filter(p => p !== ap) : [...prev, ap]
              );
              dispatch({ type: "CLEAR_ACTIVE_PHASE" });
            } else {
              setConfirmedMyPhases(prev =>
                prev.includes(ap) ? prev.filter(p => p !== ap) : [...prev, ap]
              );
              dispatch({ type: "CLEAR_ACTIVE_PHASE" });
            }
          }}
          activeOpacity={0.85}
        >
          <Text style={[s.bottomBarConfirmText, { color: accentColor }]}>
            {isOppTurn
              ? (confirmedOppPhases.includes(state.activePhaseView ?? "") ? "✕ Unconfirm Phase" : "✓ Phase Done")
              : (confirmedMyPhases.includes(state.activePhaseView ?? "") ? "✕ Unconfirm Phase" : "✓ Phase Done")
            }
          </Text>
        </TouchableOpacity>

        {/* END MY TURN — only shown on Cleanup on your turn */}
        {!isOppTurn && state.activePhaseView === "Cleanup" && (
          <TouchableOpacity
            style={[s.bottomBarConfirm, { backgroundColor: accentDimColor, borderColor: accentColor, marginLeft: 8 }]}
            onPress={() => setCleanupModal(true)}
            activeOpacity={0.85}
          >
            <Text style={[s.bottomBarConfirmText, { color: accentColor }]}>✓ End My Turn</Text>
          </TouchableOpacity>
        )}

        {/* END OPPONENT TURN — only shown on Cleanup on opponent's turn */}
        {isOppTurn && state.activePhaseView === "Cleanup" && (
          <TouchableOpacity
            style={[s.bottomBarConfirm, { backgroundColor: accentDimColor, borderColor: accentColor, marginLeft: 8 }]}
            onPress={() => dispatch({ type: "END_OPPONENT_TURN" })}
            activeOpacity={0.85}
          >
            <Text style={[s.bottomBarConfirmText, { color: accentColor }]}>✓ End Opp Turn</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[s.bottomBarHub, { backgroundColor: accentColor }]} onPress={() => setHubModal(true)} activeOpacity={0.85}>
          <Text style={s.bottomBarHubIcon}>◈</Text>
        </TouchableOpacity>
      </View>

      {renderModals()}
    </SafeAreaView>
  );

  function renderModals() { return (<>

      {/* CLEANUP / END TURN MODAL */}
      <Modal visible={cleanupModal} transparent animationType="fade" onRequestClose={() => setCleanupModal(false)}>
        <View style={s.centeredOverlay}>
          <View style={[s.centeredModal, { maxHeight: "80%" }]}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🔄</Text>
            <Text style={s.sheetTitle}>End Your Turn?</Text>
            {(() => {
              const allUnresolved = state.reminders.filter(r =>
                r.fireMode === "phase" &&
                (r.status === "active" || r.status === "pending" || r.status === "skipped") &&
                r.activeDuring !== "opponent" &&
                r.frequency !== "manual"
              );
              return allUnresolved.length > 0 ? (
                <>
                  <Text style={[s.reminderDesc, { textAlign: "center", marginBottom: 12 }]}>
                    You have <Text style={{ color: C.warning, fontWeight: "700" }}>{allUnresolved.length} unresolved reminder{allUnresolved.length > 1 ? "s" : ""}</Text> this turn:
                  </Text>
                  <ScrollView style={{ width: "100%", maxHeight: 200, marginBottom: 16 }} showsVerticalScrollIndicator={false}>
                    {allUnresolved.map(r => (
                      <TouchableOpacity
                        key={r.id}
                        style={[s.reminderItem, { borderRadius: 8, marginBottom: 4, backgroundColor: C.cardAlt }]}
                        onPress={() => {
                          setCleanupModal(false);
                          dispatch({ type: "SET_ACTIVE_PHASE", phase: r.phases[0] ?? "Cleanup" });
                        }}
                        activeOpacity={0.75}
                      >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.warning, marginTop: 4 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.reminderTitle}>{r.name}</Text>
                          {r.phases.length > 0 && (
                            <Text style={s.reminderDesc}>Phase: {r.phases.join(", ")} — tap to go there</Text>
                          )}
                        </View>
                        <Text style={{ color: C.accent, fontSize: 13, fontWeight: "600" }}>→</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity
                    style={[s.actionBtn, s.confirmBtnWarn, { marginBottom: 8 }]}
                    onPress={() => {
                      allUnresolved.forEach(r => dispatch({ type: "MISS_REMINDER", id: r.id }));
                      setCleanupModal(false);
                      setConfirmedMyPhases([]);
                      dispatch({ type: "END_MY_TURN" });
                    }}
                  >
                    <Text style={s.confirmBtnText}>Skip All & End Turn</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.closeBtn]}
                    onPress={() => setCleanupModal(false)}
                  >
                    <Text style={s.closeBtnText}>Go Back & Resolve</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={[s.reminderDesc, { textAlign: "center", marginBottom: 20 }]}>
                    All reminders are handled. Ready to end your turn.
                  </Text>
                  <TouchableOpacity
                    style={[s.actionBtn, s.confirmBtnOk, { marginBottom: 8 }]}
                    onPress={() => {
                      setCleanupModal(false);
                      setConfirmedMyPhases([]);
                      dispatch({ type: "END_MY_TURN" });
                    }}
                  >
                    <Text style={s.confirmBtnText}>✓ End Turn</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.closeBtn]}
                    onPress={() => setCleanupModal(false)}
                  >
                    <Text style={s.closeBtnText}>Go Back</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* CONFIRM PHASE MODAL */}
      <Modal visible={confirmModal} transparent animationType="fade" onRequestClose={() => setConfirmModal(false)}>
        <View style={s.centeredOverlay}>
          <View style={s.centeredModal}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>⚠️</Text>
            <Text style={s.sheetTitle}>Unresolved Reminders</Text>
            <Text style={[s.phaseDesc, { textAlign: "center", marginBottom: 12 }]}>Still pending for <Text style={{ color: C.accent, fontWeight: "700" }}>{phase}</Text>:</Text>
            {unresolved.map(r => (
              <View key={r.id} style={[s.reminderItem, { marginBottom: 6 }]}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.warning, marginRight: 8, marginTop: 3 }} />
                <Text style={{ color: C.text, fontSize: 13, flex: 1 }}>{r.name}</Text>
              </View>
            ))}
            <TouchableOpacity style={[s.actionBtn, s.confirmBtnWarn, { marginTop: 12 }]} onPress={markAllMissed}><Text style={s.confirmBtnText}>Mark Missed & Lock Phase</Text></TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.closeBtn, { marginTop: 8 }]} onPress={() => setConfirmModal(false)}><Text style={s.closeBtnText}>Go Back & Resolve</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* HUB MODAL */}
      <Modal visible={hubModal} transparent animationType="slide" onRequestClose={closeHubModal}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={closeHubModal} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={s.sheetTitle}>Game Hub</Text>
              <TouchableOpacity
                style={{ alignItems: "center" }}
                onPress={() => setEndGameModal(true)}
                activeOpacity={0.7}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.dangerDim, borderWidth: 1.5, borderColor: C.danger, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 16, lineHeight: 20 }}>🔴</Text>
                </View>
                <Text style={{ fontSize: 10, color: C.danger, fontWeight: "700", marginTop: 4 }}>End Game</Text>
              </TouchableOpacity>
            </View>
            {isOppTurn && (
              <View style={{ backgroundColor: "#1A1200", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#F59E0B", marginBottom: 12 }}>
                <Text style={{ color: "#F59E0B", fontSize: 12, fontWeight: "700" }}>⚡ Opponent's Turn</Text>
                <Text style={{ color: "#F59E0B", fontSize: 11, marginTop: 2, opacity: 0.8 }}>Events you log here track your stats and fire triggers with isMyTurn = false.</Text>
              </View>
            )}
            <View style={s.hubGrid}>
              {[
                { icon: "📜", label: "History", sub: `${state.history.length} entries`, action: () => { setHubModal(false); setHistoryModal(true); } },
                { icon: "✦", label: "Spell Log", sub: `${state.spellLog.length} spells`, action: () => { setHubModal(false); setSpellLogModal(true); } },
                !isOppTurn ? { icon: "↩", label: "Undo Last", sub: "Coming soon", action: () => {} } : null,
                { icon: "⚔️", label: "Battlefield", sub: "View the field", action: () => { setHubModal(false); setBattlefieldModal(true); } },
                { icon: "☠", label: "GY / Exile", sub: `GY ${state.graveyard.length} · Exile ${state.exile.length}`, action: openGyExileModalFromHub },
                { icon: "💎", label: "Mana Pool", sub: "Track mana", action: () => { setHubModal(false); setManaModal(true); } },
                { icon: "🔔", label: "Reminders", sub: `${state.reminders.filter(r => r.status === "pending").length} pending`, action: () => { setHubModal(false); setRemindersListModal(true); } },
                { icon: "⚡", label: "Game Events", sub: "Any player · any phase", action: () => { setHubEventOwner(state.turnOrder[state.currentPlayerIndex]); setHubModal(false); setHubEventsModal(true); } },
              ].filter(Boolean).map(item => {
                const it = item!;
                return (
                  <TouchableOpacity key={it.label} style={s.hubItem} onPress={it.action} activeOpacity={0.8}>
                    <Text style={{ fontSize: 22, marginBottom: 4 }}>{it.icon}</Text>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>{it.label}</Text>
                    <Text style={{ fontSize: 11, color: C.dim }}>{it.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={s.closeBtnWide} onPress={closeHubModal}><Text style={s.closeBtnText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* HUB GAME EVENTS MODAL */}
      <Modal visible={hubEventsModal} transparent animationType="slide" onRequestClose={closeHubEventsModal}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={closeHubEventsModal} />
          <View style={[s.sheet, { maxHeight: "80%", flex: 1 }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Game Events</Text>
            <Text style={[s.reminderDesc, { marginTop: -12, marginBottom: 16 }]}>
              Select who is performing this action, then tap an event.
            </Text>

            {/* PLAYER SELECTOR */}
            {(() => {
              const effectiveOwner = hubEventOwner || state.turnOrder[state.currentPlayerIndex];
              const ownerIndex = state.players.findIndex(p => p.id === effectiveOwner);
              const ownerPlayer = state.players[ownerIndex] ?? state.players[0];
              const isOwnerUser = ownerPlayer?.isUser ?? false;
              const selectorAccent = ownerPlayer?.color ?? (isOwnerUser ? userColor : oppColor);
              const selectorDim = selectorAccent + "22";
              const cyclePlayer = () => {
                const nextIndex = (ownerIndex + 1) % state.players.length;
                setHubEventOwner(state.players[nextIndex].id);
              };
              return (
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: selectorDim, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1.5, borderColor: selectorAccent, marginBottom: 20 }}
                  onPress={cyclePlayer}
                  activeOpacity={0.8}
                >
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: selectorAccent, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>Logging for</Text>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: selectorAccent }}>{ownerPlayer?.name ?? "Unknown"}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 11, color: selectorAccent, opacity: 0.7 }}>
                      {state.players.length > 1 ? "tap to switch ↕" : ""}
                    </Text>
                    <Text style={{ fontSize: 11, color: selectorAccent, opacity: 0.7, marginTop: 2 }}>
                      {isOwnerUser ? "Your player" : "Opponent"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })()}

            {/* EVENT GRID */}
            <View style={s.eventGrid}>
              {eventButtons.map(btn => {
                const effectiveOwner = hubEventOwner || state.turnOrder[state.currentPlayerIndex];
                const ownerPlayer = state.players.find(p => p.id === effectiveOwner) ?? state.players[0];
                return (
                  <TouchableOpacity
                    key={btn.id}
                    style={s.eventBtn}
                    onPress={() => {
                      hubOwnerRef.current = ownerPlayer.id;
                      dispatch({ type: "SET_EVENT_OWNER", playerId: ownerPlayer.id });
                      setHubEventsModal(false);
                      handleEvent(btn.id);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.eventIcon, { color: btn.color }]}>{btn.icon}</Text>
                    <Text style={s.eventLabel}>{btn.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={[s.closeBtnWide, { marginTop: 8 }]} onPress={closeHubEventsModal}>
              <Text style={s.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QUICK COUNTER MODAL */}
      <Modal visible={counterModal} transparent animationType="slide" onRequestClose={closeCounterModal}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={closeCounterModal} />
          <View style={[s.sheet, { maxHeight: "82%", flex: 1 }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Counters</Text>

            {counterHint && (
              <View style={{ backgroundColor: C.accentDim, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.accent, marginBottom: 14 }}>
                <Text style={{ color: C.accent, fontSize: 13, fontWeight: "700" }}>{counterHint}</Text>
              </View>
            )}

            {activeCreatures.length === 0 ? (
              <Text style={[s.reminderDesc, { marginBottom: 16 }]}>No active creatures.</Text>
            ) : (
              <>
                <Text style={s.sectionLabel}>Active Creature</Text>
                <ScrollView style={{ maxHeight: 260, marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: C.border }} showsVerticalScrollIndicator={false}>
                  {activeCreatures.map(creature => {
                    const selected = counterTargetId === creature.id;
                    const owner = creature.playerId ? state.players.find(p => p.id === creature.playerId) : null;
                    const { power: cPower, toughness: cToughness } = combatPT(creature);
                    const currentPT = cPower !== undefined && cToughness !== undefined ? `${cPower}/${cToughness}` : null;
                    return (
                      <TouchableOpacity
                        key={creature.id}
                        style={[s.gyRow, selected && { backgroundColor: C.accentDim }]}
                        onPress={() => setCounterTargetId(creature.id)}
                        activeOpacity={0.75}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[s.reminderTitle, selected && { color: C.accent }]}>{creature.name}</Text>
                          <Text style={s.reminderDesc}>
                            {[currentPT ? `${currentPT}` : null, owner?.name ?? creature.playerId ?? null].filter(Boolean).join(" · ")}
                          </Text>
                        </View>
                        {selected && <Text style={{ color: C.accent, fontSize: 16 }}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={s.sectionLabel}>Counter Type</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {CREATURE_COUNTER_TYPES.map(ct => (
                    <TouchableOpacity
                      key={ct}
                      style={[{ width: "31%", paddingVertical: 11, borderRadius: 10, alignItems: "center", borderWidth: 1 }, counterType === ct ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]}
                      onPress={() => setCounterType(ct)}
                      activeOpacity={0.75}
                    >
                      <Text style={{ color: counterType === ct ? C.accent : C.muted, fontWeight: "800" }}>{ct}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={closeCounterModal}><Text style={s.closeBtnText}>Close</Text></TouchableOpacity>
              <TouchableOpacity
                style={[s.modalConfirmBtn, { backgroundColor: C.dangerDim, borderWidth: 1, borderColor: C.danger }, !counterTargetId && { opacity: 0.4 }]}
                disabled={!counterTargetId}
                onPress={() => {
                  applyCounterChange(-1);
                }}
              >
                <Text style={s.startBtnText}>Remove</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalConfirmBtn, !counterTargetId && { opacity: 0.4 }]}
                disabled={!counterTargetId}
                onPress={() => {
                  applyCounterChange(counterAmount);
                }}
              >
                <Text style={s.startBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MANA POOL MODAL */}
      <Modal visible={manaModal} transparent animationType="slide" onRequestClose={() => setManaModal(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={() => setManaModal(false)} />
          <View style={[s.sheet, { maxHeight: "85%", flex: 1 }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Mana Pool</Text>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
              {MANA_COLORS.map(c => {
                const pool = state.manaPool[c.key];
                const total = pool.auto + pool.manual;
                return (
                  <View key={c.key} style={s.manaRow}>
                    <Text style={s.manaEmoji}>{c.emoji}</Text>
                    <Text style={s.manaLabel}>{c.label}</Text>
                    <View style={{ alignItems: "center", minWidth: 52 }}>
                      <Text style={s.manaTotal}>{total}</Text>
                      <Text style={s.manaAutoLabel}>auto: {pool.auto}</Text>
                    </View>
                    <TouchableOpacity
                      style={[s.manaBtn, pool.manual === 0 && { opacity: 0.4 }]}
                      onPress={() => dispatch({ type: "SUBTRACT_MANUAL_MANA", color: c.key, amount: 1 })}
                      disabled={pool.manual === 0}
                    >
                      <Text style={s.manaBtnText}>−</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.manaBtn}
                      onPress={() => dispatch({ type: "ADD_MANUAL_MANA", color: c.key, amount: 1 })}
                    >
                      <Text style={s.manaBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[s.closeBtnWide, { marginBottom: 8, backgroundColor: C.dangerDim, borderColor: C.danger }]}
              onPress={() => dispatch({ type: "RESET_AUTO_MANA" })}
            >
              <Text style={[s.closeBtnText, { color: C.danger }]}>Reset Auto Mana</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.closeBtnWide, { marginBottom: 8, backgroundColor: C.warningDim, borderColor: C.warning }]}
              onPress={() => dispatch({ type: "RESET_MANUAL_MANA" })}
            >
              <Text style={[s.closeBtnText, { color: C.warning }]}>Reset Manual Mana</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.closeBtnWide} onPress={() => setManaModal(false)}>
              <Text style={s.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* TREASURE COLOR PICKER MODAL */}
      <Modal visible={treasureColorModal} transparent animationType="fade" onRequestClose={() => setTreasureColorModal(false)}>
        <View style={s.centeredOverlay}>
          <View style={s.centeredModal}>
            <Text style={s.sheetTitle}>Crack Treasure</Text>
            <Text style={[s.reminderDesc, { textAlign: "center", marginBottom: 16 }]}>Choose a mana color to add:</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 16 }}>
              {MANA_COLORS.map(c => (
                <TouchableOpacity
                  key={c.key}
                  style={[s.spellTypeBtn, { width: "44%" }]}
                  onPress={() => {
                    if (activeSpell) {
                      dispatch({ type: "RESOLVE_RESOURCE_TOKEN", spellId: activeSpell.id, intent: "use", manaColor: c.key });
                    }
                    setTreasureColorModal(false);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={s.spellTypeIcon}>{c.emoji}</Text>
                  <Text style={s.spellTypeLabel}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.closeBtnWide} onPress={() => setTreasureColorModal(false)}>
              <Text style={s.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MAP EXPLORE MODAL */}
      <Modal visible={mapModal} transparent animationType="fade" onRequestClose={() => { setMapModal(false); setMapResult(null); setMapSpellId(null); setMapTargetId(null); }}>
        <View style={s.centeredOverlay}>
          <View style={s.centeredModal}>
            <Text style={s.sheetTitle}>Map — Explore</Text>
            {mapResult === null ? (<>
              <Text style={[s.reminderDesc, { textAlign: "center", marginBottom: 16 }]}>Target creature explores. What did you reveal?</Text>
              <TouchableOpacity style={[s.actionBtn, s.confirmBtnOk, { marginBottom: 8 }]} onPress={() => {
                if (mapSpellId) dispatch({ type: "RESOLVE_RESOURCE_TOKEN", spellId: mapSpellId, intent: "use", mapResult: "land" });
                setMapModal(false); setMapSpellId(null);
              }}>
                <Text style={s.confirmBtnText}>🌲 Land</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 8 }]} onPress={() => setMapResult("nonland")}>
                <Text style={s.confirmBtnText}>📄 Nonland — pick creature for +1/+1</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.cardAlt, borderColor: C.border, marginBottom: 8 }]} onPress={() => {
                if (mapSpellId) dispatch({ type: "RESOLVE_RESOURCE_TOKEN", spellId: mapSpellId, intent: "use", mapResult: "unknown" });
                setMapModal(false); setMapSpellId(null);
              }}>
                <Text style={s.confirmBtnText}>? Unknown / Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.closeBtn]} onPress={() => { setMapModal(false); setMapSpellId(null); }}>
                <Text style={s.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </>) : (<>
              <Text style={[s.reminderDesc, { textAlign: "center", marginBottom: 8 }]}>Nonland revealed. Select a creature to get +1/+1 (optional):</Text>
              <ScrollView style={{ maxHeight: 200, marginBottom: 8 }}>
                {state.spellLog.filter(sp => sp.zone === "active" && (sp.type === "Creature" || (sp.isToken && sp.tokenCategory === "creature"))).map(sp => (
                  <TouchableOpacity
                    key={sp.id}
                    style={[s.actionBtn, mapTargetId === sp.id && { borderColor: C.accent, backgroundColor: C.accentDim }, { marginBottom: 6 }]}
                    onPress={() => setMapTargetId(prev => prev === sp.id ? null : sp.id)}
                  >
                    <Text style={s.confirmBtnText}>{sp.name}{sp.power !== undefined ? ` (${sp.power}/${sp.toughness})` : ""}</Text>
                  </TouchableOpacity>
                ))}
                {state.spellLog.filter(sp => sp.zone === "active" && (sp.type === "Creature" || (sp.isToken && sp.tokenCategory === "creature"))).length === 0 && (
                  <Text style={{ color: C.dim, textAlign: "center", paddingVertical: 8 }}>No creatures on battlefield</Text>
                )}
              </ScrollView>
              <TouchableOpacity style={[s.actionBtn, s.confirmBtnOk, { marginBottom: 8 }]} onPress={() => {
                if (mapSpellId) dispatch({ type: "RESOLVE_RESOURCE_TOKEN", spellId: mapSpellId, intent: "use", mapResult: "nonland", mapTargetSpellId: mapTargetId ?? undefined });
                setMapModal(false); setMapResult(null); setMapSpellId(null); setMapTargetId(null);
              }}>
                <Text style={s.confirmBtnText}>Confirm{mapTargetId ? " (+1/+1 added)" : " (no target)"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.closeBtn]} onPress={() => { setMapModal(false); setMapResult(null); setMapSpellId(null); setMapTargetId(null); }}>
                <Text style={s.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </>)}
          </View>
        </View>
      </Modal>

      {/* END GAME CONFIRM MODAL */}
      <Modal visible={endGameModal} transparent animationType="fade" onRequestClose={() => setEndGameModal(false)}>
        <View style={s.centeredOverlay}>
          <View style={s.centeredModal}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🔴</Text>
            <Text style={s.sheetTitle}>End Game?</Text>
            <Text style={[s.phaseDesc, { textAlign: "center", marginBottom: 20 }]}>All progress will be lost.</Text>
            <TouchableOpacity style={[s.actionBtn, s.confirmBtnWarn, { marginBottom: 8 }]} onPress={() => { setEndGameModal(false); setHubModal(false); dispatch({ type: "GO_MENU" }); }}>
              <Text style={s.confirmBtnText}>Yes, End Game</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.closeBtn]} onPress={() => setEndGameModal(false)}>
              <Text style={s.closeBtnText}>No, Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* HISTORY MODAL */}
      <Modal visible={historyModal} transparent animationType="slide" onRequestClose={() => setHistoryModal(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={() => setHistoryModal(false)} />
          <View style={[s.sheet, { maxHeight: "75%", flex: 1 }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Game History</Text>
            {(() => {
              const playerIds = Array.from(new Set(state.history.map(e => e.playerId).filter(id => id && id !== "system")));
              const tabs = [{ id: "all", label: "All", color: null as string | null }, ...playerIds.map(id => {
                const p = state.players.find(pl => pl.id === id);
                return { id, label: p?.name ?? id, color: p?.color ?? null };
              })];
              const filtered = historyTab === "all"
                ? state.history
                : state.history.filter(e => e.playerId === historyTab);
              return (
                <>
                  {tabs.length > 1 && (
                    <View style={[s.gyTabRow, { flexWrap: "wrap" }]}>
                      {tabs.map(tab => {
                        const tabColor = tab.color ?? C.accent;
                        const isActive = historyTab === tab.id;
                        return (
                          <TouchableOpacity
                            key={tab.id}
                            onPress={() => setHistoryTab(tab.id)}
                            style={[s.gyTab, isActive
                              ? { backgroundColor: tabColor + "22", borderColor: tabColor }
                              : s.gyTabInactive
                            ]}
                          >
                            <Text style={[s.gyTabText, isActive && { color: tabColor }]}>{tab.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  {filtered.length === 0 ? (
                    <Text style={{ color: C.dim, textAlign: "center", paddingVertical: 24 }}>No events logged yet.</Text>
                  ) : (
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
                      {[...filtered].reverse().map(entry => {
                        const entryPlayer = state.players.find(p => p.id === entry.playerId);
                        const labelColor = entryPlayer?.color ?? (entryPlayer?.isUser ? userColor : oppColor);
                        const isMissed = entry.message.startsWith("✗ Missed");
                        const isResolved = entry.message.startsWith("✓");
                        const msgColor = isMissed ? C.danger : isResolved ? C.success : C.text;
                        return (
                          <View key={entry.id} style={[s.reminderItem, { flexDirection: "column", gap: 2 }]}>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                              <Text style={{ fontSize: 11, fontWeight: "700", color: labelColor }}>T{entry.turnNumber}</Text>
                              <Text style={{ fontSize: 11, color: C.muted }}>{entry.phase}</Text>
                            </View>
                            <Text style={{ fontSize: 13, color: msgColor }}>{entry.message}</Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </>
              );
            })()}
            <TouchableOpacity style={[s.closeBtnWide, { marginTop: 8 }]} onPress={() => setHistoryModal(false)}><Text style={s.closeBtnText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SPELL LOG MODAL */}
      <Modal visible={spellLogModal} transparent animationType="slide" onRequestClose={() => setSpellLogModal(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={() => setSpellLogModal(false)} />
          <View style={[s.sheet, { maxHeight: "75%", flex: 1 }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Spell Log</Text>
            {!state.spellLog.some(sp => sp.type !== "Land") ? (
              <Text style={{ color: C.dim, textAlign: "center", paddingVertical: 24 }}>No spells cast yet.</Text>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
                {/* Active spells */}
                {state.spellLog.filter(sp => sp.zone === "active" && sp.type !== "Land").length > 0 && (
                  <>
                    <Text style={[s.sectionLabel, { paddingHorizontal: 14, paddingTop: 8 }]}>On Battlefield</Text>
                    {state.spellLog.filter(sp => sp.zone === "active" && sp.type !== "Land").map(sp => {
                      const spOwner = sp.playerId ? state.players.find(p => p.id === sp.playerId) : undefined;
                      const spellOwnerColor = spOwner ? (spOwner.color ?? (spOwner.isUser ? userColor : oppColor)) : C.border;
                      return (
                        <TouchableOpacity key={sp.id} style={[s.reminderItem, { borderLeftWidth: 3, borderLeftColor: spellOwnerColor }]} onPress={() => { setActiveSpell(sp); setSpellLogModal(false); setSpellActionModal(true); }} activeOpacity={0.7}>
                          <Text style={{ fontSize: 18 }}>{typeIcons[sp.type] ?? "★"}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={s.reminderTitle}>{sp.name}</Text>
                            <Text style={s.reminderDesc}>{[sp.supertype, sp.type, (sp.subtype || sp.subtype2) ? `— ${[sp.subtype, sp.subtype2].filter(Boolean).join("/")}` : null, (sp.power !== undefined && sp.toughness !== undefined) ? `${sp.power}/${sp.toughness}` : null, getSpellCostMeta(sp), sp.currentLoyalty !== undefined ? `👁 ${sp.currentLoyalty}` : null, `· T${sp.turnNumber}`, sp.playerId ? `· ${state.players.find(p => p.id === sp.playerId)?.name ?? sp.playerId}` : null].filter(Boolean).join(" ")}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}
                {/* Historical spells — GY and Exile */}
                {state.spellLog.filter(sp => sp.zone !== "active" && sp.type !== "Land").length > 0 && (
                  <>
                    <Text style={[s.sectionLabel, { paddingHorizontal: 14, paddingTop: 12 }]}>Left Battlefield</Text>
                    {state.spellLog.filter(sp => sp.zone !== "active" && sp.type !== "Land").map(sp => {
                      const spOwner = sp.playerId ? state.players.find(p => p.id === sp.playerId) : undefined;
                      const spellOwnerColor = spOwner ? (spOwner.color ?? (spOwner.isUser ? userColor : oppColor)) : C.border;
                      return (
                        <View key={sp.id} style={[s.reminderItem, { opacity: 0.5, borderLeftWidth: 3, borderLeftColor: spellOwnerColor }]}>
                          <Text style={{ fontSize: 18 }}>{typeIcons[sp.type] ?? "★"}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={s.reminderTitle}>{sp.name}</Text>
                            <Text style={s.reminderDesc}>{[sp.supertype, sp.type, getSpellCostMeta(sp), `· T${sp.turnNumber}`, sp.zone === "graveyard" ? "· GY" : "· Exile", sp.playerId ? `· ${state.players.find(p => p.id === sp.playerId)?.name ?? sp.playerId}` : null].filter(Boolean).join(" ")}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </>
                )}
              </ScrollView>
            )}
            <TouchableOpacity style={[s.closeBtnWide, { marginTop: 8 }]} onPress={() => setSpellLogModal(false)}><Text style={s.closeBtnText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SPELL ACTION MODAL */}
      <Modal visible={spellActionModal} transparent animationType="fade" onRequestClose={() => setSpellActionModal(false)}>
        <View style={s.centeredOverlay}>
          <View style={s.centeredModal}>
            <Text style={{ fontSize: 22, marginBottom: 4 }}>{typeIcons[activeSpell?.type ?? ""] ?? "★"}</Text>
            <Text style={s.sheetTitle}>{activeSpell?.name}</Text>
            <Text style={[s.reminderDesc, { textAlign: "center", marginBottom: 16 }]}>{activeSpell?.type} · Turn {activeSpell?.turnNumber}</Text>

            {/* Creature */}
            {activeSpell?.type === "Creature" && (<>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]} onPress={() => { if (activeSpell) dispatch({ type: "MOVE_TO_GY", spellId: activeSpell.id, source: "died" }); setSpellActionModal(false); }}>
                <Text style={s.confirmBtnText}>☠ Die</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]} onPress={() => { if (activeSpell) dispatch({ type: "MOVE_TO_GY", spellId: activeSpell.id, source: "sacrificed" }); setSpellActionModal(false); }}>
                <Text style={s.confirmBtnText}>⚔ Sacrifice</Text>
              </TouchableOpacity>
            </>)}

            {/* Sorcery / Instant */}
            {(activeSpell?.type === "Sorcery" || activeSpell?.type === "Instant") && (
              <TouchableOpacity style={[s.actionBtn, s.confirmBtnOk, { marginBottom: 8 }]} onPress={() => { if (activeSpell) dispatch({ type: "MOVE_TO_GY", spellId: activeSpell.id, source: "resolved" }); setSpellActionModal(false); }}>
                <Text style={s.confirmBtnText}>☠ Send to GY</Text>
              </TouchableOpacity>
            )}

            {/* Planeswalker — Loyalty counters */}
            {activeSpell?.type === "Planeswalker" && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[s.reminderDesc, { textAlign: "center", marginBottom: 8 }]}>👁 Loyalty: {activeSpell.currentLoyalty ?? activeSpell.startingLoyalty ?? 0}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  {[-3, -2, -1, 1, 2, 3].map(delta => (
                    <TouchableOpacity key={delta} style={[s.actionBtn, { backgroundColor: delta < 0 ? C.dangerDim : C.accentDim, borderColor: delta < 0 ? C.danger : C.accent, paddingHorizontal: 14, paddingVertical: 8, minWidth: 50 }]}
                      onPress={() => { if (activeSpell) dispatch({ type: "UPDATE_LOYALTY", id: activeSpell.id, delta }); }}>
                      <Text style={[s.confirmBtnText, { textAlign: "center" }]}>{delta > 0 ? `+${delta}` : String(delta)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Battle — Defense counters */}
            {activeSpell?.type === "Battle" && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[s.reminderDesc, { textAlign: "center", marginBottom: 8 }]}>⚔ Defense: {activeSpell.currentDefense ?? activeSpell.startingDefense ?? 0}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  {[-3, -2, -1, 1, 2, 3].map(delta => (
                    <TouchableOpacity key={delta} style={[s.actionBtn, { backgroundColor: delta < 0 ? C.dangerDim : C.accentDim, borderColor: delta < 0 ? C.danger : C.accent, paddingHorizontal: 14, paddingVertical: 8, minWidth: 50 }]}
                      onPress={() => { if (activeSpell) dispatch({ type: "UPDATE_DEFENSE", id: activeSpell.id, delta }); }}>
                      <Text style={[s.confirmBtnText, { textAlign: "center" }]}>{delta > 0 ? `+${delta}` : String(delta)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Enchantment / Artifact / Planeswalker / Battle */}
            {(activeSpell?.type === "Enchantment" || activeSpell?.type === "Artifact" || activeSpell?.type === "Planeswalker" || activeSpell?.type === "Battle") && (<>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]} onPress={() => { if (activeSpell) dispatch({ type: "MOVE_TO_GY", spellId: activeSpell.id, source: "destroyed" }); setSpellActionModal(false); }}>
                <Text style={s.confirmBtnText}>☠ Send to GY</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]} onPress={() => { if (activeSpell) dispatch({ type: "MOVE_TO_GY", spellId: activeSpell.id, source: "sacrificed" }); setSpellActionModal(false); }}>
                <Text style={s.confirmBtnText}>⚔ Sacrifice</Text>
              </TouchableOpacity>
            </>)}

            {/* Land */}
            {activeSpell?.type === "Land" && (<>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]} onPress={() => { if (activeSpell) dispatch({ type: "MOVE_TO_GY", spellId: activeSpell.id, source: "destroyed" }); setSpellActionModal(false); }}>
                <Text style={s.confirmBtnText}>☠ Send to GY</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]} onPress={() => { if (activeSpell) dispatch({ type: "MOVE_TO_EXILE", spellId: activeSpell.id }); setSpellActionModal(false); }}>
                <Text style={s.confirmBtnText}>↗ Exile</Text>
              </TouchableOpacity>
            </>)}

            {/* Token — resource */}
            {activeSpell?.type === "Token" && activeSpell?.tokenCategory === "resource" && (() => {
              const spell = activeSpell!;
              const baseName = spell.name.replace(/^\d+x\s*/, "").toLowerCase();
              const use = (extra?: object) => {
                dispatch({ type: "RESOLVE_RESOURCE_TOKEN", spellId: spell.id, intent: "use", ...extra });
                setSpellActionModal(false);
              };
              const sac = () => { dispatch({ type: "RESOLVE_RESOURCE_TOKEN", spellId: spell.id, intent: "sacrifice" }); setSpellActionModal(false); };
              const del = () => { dispatch({ type: "RESOLVE_RESOURCE_TOKEN", spellId: spell.id, intent: "delete" }); setSpellActionModal(false); };
              const cancelBtn = (
                <TouchableOpacity style={[s.actionBtn, s.closeBtn]} onPress={() => setSpellActionModal(false)}>
                  <Text style={s.closeBtnText}>Cancel</Text>
                </TouchableOpacity>
              );

              if (baseName.includes("treasure")) return (<>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 8 }]}
                  onPress={() => { setSpellActionModal(false); setTreasureColorModal(true); }}>
                  <Text style={s.confirmBtnText}>◈ Crack</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]} onPress={sac}>
                  <Text style={s.confirmBtnText}>⚔ Sacrifice</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]} onPress={del}>
                  <Text style={s.confirmBtnText}>✕ Delete</Text>
                </TouchableOpacity>
                {cancelBtn}
              </>);

              if (baseName.includes("food")) return (<>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 8 }]}
                  onPress={() => use()}>
                  <Text style={s.confirmBtnText}>Use — Gain 3 Life</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]} onPress={sac}>
                  <Text style={s.confirmBtnText}>⚔ Sacrifice</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]} onPress={del}>
                  <Text style={s.confirmBtnText}>✕ Delete</Text>
                </TouchableOpacity>
                {cancelBtn}
              </>);

              if (baseName.includes("clue")) return (<>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 8 }]}
                  onPress={() => use()}>
                  <Text style={s.confirmBtnText}>Use — Draw 1 Card</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]} onPress={sac}>
                  <Text style={s.confirmBtnText}>⚔ Sacrifice</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]} onPress={del}>
                  <Text style={s.confirmBtnText}>✕ Delete</Text>
                </TouchableOpacity>
                {cancelBtn}
              </>);

              if (baseName.includes("blood")) return (<>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 8 }]}
                  onPress={() => use()}>
                  <Text style={s.confirmBtnText}>Use — Draw 1, Discard 1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]} onPress={sac}>
                  <Text style={s.confirmBtnText}>⚔ Sacrifice</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]} onPress={del}>
                  <Text style={s.confirmBtnText}>✕ Delete</Text>
                </TouchableOpacity>
                {cancelBtn}
              </>);

              if (baseName.includes("map")) return (<>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 8 }]}
                  onPress={() => { setMapSpellId(spell.id); setSpellActionModal(false); setMapModal(true); }}>
                  <Text style={s.confirmBtnText}>Use — Explore</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]} onPress={sac}>
                  <Text style={s.confirmBtnText}>⚔ Sacrifice</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]} onPress={del}>
                  <Text style={s.confirmBtnText}>✕ Delete</Text>
                </TouchableOpacity>
                {cancelBtn}
              </>);

              if (baseName.includes("powerstone")) return (<>
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 4 }, spell.tapped && { opacity: 0.4 }]}
                  disabled={!!spell.tapped}
                  onPress={() => use()}>
                  <Text style={s.confirmBtnText}>Tap for 1 Colorless Mana</Text>
                </TouchableOpacity>
                <Text style={{ color: C.muted, fontSize: 11, textAlign: "center", marginBottom: 8 }}>Powerstone mana cannot cast nonartifact spells</Text>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]} onPress={sac}>
                  <Text style={s.confirmBtnText}>⚔ Sacrifice</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]} onPress={del}>
                  <Text style={s.confirmBtnText}>✕ Delete</Text>
                </TouchableOpacity>
                {cancelBtn}
              </>);

              return (<>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 8 }]}
                  onPress={() => use()}>
                  <Text style={s.confirmBtnText}>Use</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]} onPress={sac}>
                  <Text style={s.confirmBtnText}>⚔ Sacrifice</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]} onPress={del}>
                  <Text style={s.confirmBtnText}>✕ Delete</Text>
                </TouchableOpacity>
                {cancelBtn}
              </>);
            })()}

            {/* Token — creature */}
            {activeSpell?.type === "Token" && activeSpell?.tokenCategory === "creature" && (<>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]} onPress={() => {
                if (!activeSpell) return;
                dispatch({ type: "CREATURE_TOKEN_EXIT", spellId: activeSpell.id, reason: "died" });
                setSpellActionModal(false);
              }}>
                <Text style={s.confirmBtnText}>☠ Die</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]} onPress={() => {
                if (!activeSpell) return;
                dispatch({ type: "CREATURE_TOKEN_EXIT", spellId: activeSpell.id, reason: "sacrificed" });
                setSpellActionModal(false);
              }}>
                <Text style={s.confirmBtnText}>⚔ Sacrifice</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]} onPress={() => {
                if (!activeSpell) return;
                dispatch({ type: "CREATURE_TOKEN_EXIT", spellId: activeSpell.id, reason: "destroyed" });
                setSpellActionModal(false);
              }}>
                <Text style={s.confirmBtnText}>💥 Destroy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.confirmBtnWarn, { marginBottom: 8 }]} onPress={() => {
                if (!activeSpell) return;
                dispatch({ type: "CREATURE_TOKEN_EXIT", spellId: activeSpell.id, reason: "delete" });
                setSpellActionModal(false);
              }}>
                <Text style={s.confirmBtnText}>✕ Delete</Text>
              </TouchableOpacity>
            </>)}

            {/* Delete + Cancel — non-resource-token types only */}
            {!(activeSpell?.type === "Token" && activeSpell?.tokenCategory === "resource") && (<>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 8 }]} onPress={() => {
                if (activeSpell) {
                  setSpellActionModal(false);
                  openEditSpellModal(activeSpell);
                }
              }}>
                <Text style={s.confirmBtnText}>✎ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.confirmBtnWarn, { marginBottom: 8 }]} onPress={() => { if (activeSpell) dispatch({ type: "DELETE_SPELL", id: activeSpell.id }); setSpellActionModal(false); }}>
                <Text style={s.confirmBtnText}>✕ Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.closeBtn]} onPress={() => setSpellActionModal(false)}>
                <Text style={s.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </>)}
          </View>
        </View>
      </Modal>

      {/* GY ENTRY ACTION MODAL */}
      <Modal visible={gyEntryActionModal} transparent animationType="fade" onRequestClose={closeGyEntryActionModal}>
        <View style={s.centeredOverlay}>
          <View style={s.centeredModal}>
            <Text style={{ fontSize: 22, marginBottom: 4 }}>{typeIcons[activeGYEntry?.type ?? ""] ?? "★"}</Text>
            <Text style={s.sheetTitle}>{activeGYEntry?.name}</Text>
            <Text style={[s.reminderDesc, { textAlign: "center", marginBottom: 16 }]}>{activeGYEntry?.type}</Text>
            <TouchableOpacity style={[s.actionBtn, s.confirmBtnOk, { marginBottom: 8 }]} onPress={() => { if (activeGYEntry) dispatch({ type: "RETURN_FROM_GY", gyEntryId: activeGYEntry.id }); closeGyEntryActionModal(); }}>
              <Text style={s.confirmBtnText}>↩ Return to Battlefield</Text>
            </TouchableOpacity>
            {activeGYEntry?.isCommander && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]}
                onPress={() => { if (activeGYEntry) dispatch({ type: "MOVE_GY_COMMANDER_TO_COMMAND_ZONE", gyEntryId: activeGYEntry.id }); closeGyEntryActionModal(); }}
              >
                <Text style={s.confirmBtnText}>Move to Command Zone</Text>
              </TouchableOpacity>
            )}
            {activeGYEntry?.type === "Instant" && (
              <TouchableOpacity style={[s.actionBtn, s.confirmBtnOk, { marginBottom: 8 }]} onPress={() => { if (activeGYEntry) dispatch({ type: "RETURN_FROM_GY", gyEntryId: activeGYEntry.id }); closeGyEntryActionModal(); }}>
                <Text style={s.confirmBtnText}>⚡ Flashback</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.cardAlt, borderColor: C.warning, marginBottom: 8 }]} onPress={() => {
              if (activeGYEntry) {
                const match = state.spellLog.find(sp => sp.name === activeGYEntry.name && sp.zone === "graveyard");
                dispatch({ type: "DELETE_FROM_GY", gyEntryId: activeGYEntry.id });
                if (match) dispatch({ type: "MOVE_TO_EXILE", spellId: match.id });
                else dispatch({ type: "LOG", message: `↗ ${activeGYEntry.name} → exile` });
              }
              closeGyEntryActionModal();
            }}>
              <Text style={[s.confirmBtnText, { color: C.warning }]}>↗ Exile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.confirmBtnWarn, { marginBottom: 8 }]} onPress={() => { if (activeGYEntry) dispatch({ type: "DELETE_FROM_GY", gyEntryId: activeGYEntry.id }); closeGyEntryActionModal(); }}>
              <Text style={s.confirmBtnText}>✕ Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.closeBtn]} onPress={closeGyEntryActionModal}>
              <Text style={s.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EXILE ENTRY ACTION MODAL */}
      <Modal visible={exileEntryActionModal} transparent animationType="fade" onRequestClose={closeExileEntryActionModal}>
        <View style={s.centeredOverlay}>
          <View style={s.centeredModal}>
            <Text style={{ fontSize: 22, marginBottom: 4 }}>{typeIcons[activeExileEntry?.type ?? ""] ?? "★"}</Text>
            <Text style={s.sheetTitle}>{activeExileEntry?.name}</Text>
            <Text style={[s.reminderDesc, { textAlign: "center", marginBottom: 16 }]}>{activeExileEntry?.type}</Text>
            <TouchableOpacity style={[s.actionBtn, s.confirmBtnOk, { marginBottom: 8 }]} onPress={() => { if (activeExileEntry) dispatch({ type: "RETURN_FROM_EXILE", exileEntryId: activeExileEntry.id }); closeExileEntryActionModal(); }}>
              <Text style={s.confirmBtnText}>↩ Return to Battlefield</Text>
            </TouchableOpacity>
            {activeExileEntry?.isCommander && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]}
                onPress={() => { if (activeExileEntry) dispatch({ type: "MOVE_EXILE_COMMANDER_TO_COMMAND_ZONE", exileEntryId: activeExileEntry.id }); closeExileEntryActionModal(); }}
              >
                <Text style={s.confirmBtnText}>Move to Command Zone</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.actionBtn, s.confirmBtnWarn, { marginBottom: 8 }]} onPress={() => { if (activeExileEntry) dispatch({ type: "DELETE_FROM_EXILE", exileEntryId: activeExileEntry.id }); closeExileEntryActionModal(); }}>
              <Text style={s.confirmBtnText}>✕ Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.closeBtn]} onPress={closeExileEntryActionModal}>
              <Text style={s.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* GY / EXILE MODAL */}
      <Modal visible={gyModal} transparent animationType="slide" onRequestClose={closeGyModal}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={closeGyModal} />
          <View style={[s.sheet, { maxHeight: "80%", flex: 1 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <View style={s.handle} />
              <TouchableOpacity style={s.tokenGySmallBtn} onPress={() => setTokenGyModal(true)}>
                <Text style={s.tokenGySmallBtnText}>◈ Tokens</Text>
              </TouchableOpacity>
            </View>
            {/* Zone tabs */}
            <View style={s.gyTabRow}>
              <TouchableOpacity style={[s.gyTab, gyTab === "graveyard" ? s.gyTabActive : s.gyTabInactive]} onPress={() => setGyTab("graveyard")}>
                <Text style={s.gyTabText}>☠ Graveyard ({state.graveyard.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.gyTab, gyTab === "exile" ? s.gyTabActive : s.gyTabInactive]} onPress={() => setGyTab("exile")}>
                <Text style={s.gyTabText}>↗ Exile ({state.exile.length})</Text>
              </TouchableOpacity>
            </View>
            {/* Player filter tabs — only shown for multiplayer games */}
            {state.players.length > 1 && (
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                <TouchableOpacity
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignItems: "center", borderWidth: 1,
                    backgroundColor: gyPlayerFilter === "all" ? C.accentDim : C.cardAlt,
                    borderColor: gyPlayerFilter === "all" ? C.accent : C.border }}
                  onPress={() => setGyPlayerFilter("all")}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>All</Text>
                </TouchableOpacity>
                {state.players.map(p => {
                  const isActive = gyPlayerFilter === p.id;
                  const activeBorder = p.color ?? (p.isUser ? userColor : oppColor);
                  const activeBg = activeBorder + "22";
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignItems: "center", borderWidth: 1,
                        backgroundColor: isActive ? activeBg : C.cardAlt,
                        borderColor: isActive ? activeBorder : C.border }}
                      onPress={() => setGyPlayerFilter(p.id)}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: isActive ? activeBorder : C.text }}>{p.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {gyTab === "graveyard" ? (() => {
              const filtered = gyPlayerFilter === "all"
                ? state.graveyard
                : state.graveyard.filter(e => e.playerId === gyPlayerFilter);
              return filtered.length === 0 ? (
                <Text style={{ color: C.dim, textAlign: "center", paddingVertical: 24, fontSize: 14 }}>No cards in graveyard.</Text>
              ) : (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
                  {[...filtered].reverse().map(entry => (
                    <TouchableOpacity key={entry.id} style={s.gyRow} onPress={() => { setActiveGYEntry(entry); setGyModal(false); setGyEntryActionModal(true); }} activeOpacity={0.75}>
                      <Text style={{ fontSize: 20 }}>{typeIcons[entry.type] ?? "★"}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.reminderTitle}>{entry.name}</Text>
                        <Text style={s.reminderDesc}>{[entry.type, entry.isCommander ? "Commander" : null, `T${entry.turnNumber}`, entry.source, entry.playerId ? state.players.find(p => p.id === entry.playerId)?.name : null].filter(Boolean).join(" · ")}</Text>
                      </View>
                      <Text style={{ fontSize: 18, color: C.dim }}>›</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              );
            })() : (() => {
              const filtered = gyPlayerFilter === "all"
                ? state.exile
                : state.exile.filter(e => e.playerId === gyPlayerFilter);
              return filtered.length === 0 ? (
                <Text style={{ color: C.dim, textAlign: "center", paddingVertical: 24, fontSize: 14 }}>No cards in exile.</Text>
              ) : (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
                  {[...filtered].reverse().map(entry => (
                    <TouchableOpacity key={entry.id} style={s.gyRow} onPress={() => { setActiveExileEntry(entry); setGyModal(false); setExileEntryActionModal(true); }} activeOpacity={0.75}>
                      <Text style={{ fontSize: 20 }}>{typeIcons[entry.type] ?? "★"}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.reminderTitle}>{entry.name}</Text>
                        <Text style={s.reminderDesc}>{[entry.type, entry.isCommander ? "Commander" : null, `T${entry.turnNumber}`, entry.playerId ? state.players.find(p => p.id === entry.playerId)?.name : null].filter(Boolean).join(" · ")}</Text>
                      </View>
                      <Text style={{ fontSize: 18, color: C.dim }}>›</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              );
            })()}
            <TouchableOpacity style={[s.closeBtnWide, { marginTop: 8 }]} onPress={closeGyModal}>
              <Text style={s.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* TOKEN GY MODAL */}
      <Modal visible={tokenGyModal} transparent animationType="slide" onRequestClose={() => setTokenGyModal(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={() => setTokenGyModal(false)} />
          <View style={[s.sheet, { maxHeight: "75%", flex: 1 }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Token Graveyard</Text>
            <Text style={[s.reminderDesc, { marginBottom: 12 }]}>All tokens that have left play this game.</Text>
            {state.tokenGY.length === 0 ? (
              <Text style={{ color: C.dim, textAlign: "center", paddingVertical: 24, fontSize: 14 }}>No tokens used yet.</Text>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
                {[...state.tokenGY].reverse().map(entry => (
                  <View key={entry.id} style={s.gyRow}>
                    <Text style={{ fontSize: 18, color: C.warning }}>◈</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.reminderTitle}>{entry.name}</Text>
                      <Text style={s.reminderDesc}>{[entry.action, `T${entry.turnNumber}`, entry.playerId ? state.players.find(p => p.id === entry.playerId)?.name : null].filter(Boolean).join(" · ")}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={[s.closeBtnWide, { marginTop: 8 }]} onPress={() => setTokenGyModal(false)}>
              <Text style={s.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EDIT SPELL MODAL */}
      <Modal visible={editSpellModal} transparent animationType="slide" onRequestClose={() => closeEditSpellModal()}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableOpacity style={s.backdrop} onPress={() => closeEditSpellModal()} />
          <View style={[s.sheet, { maxHeight: "92%", flex: 1 }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Edit: {activeSpell?.name}</Text>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.sectionLabel}>Name</Text>
              <TextInput style={[s.input, { marginBottom: 16 }]} value={editSpellName} onChangeText={setEditSpellName} placeholder="Card name" placeholderTextColor={C.dim} />
              <Text style={s.sectionLabel}>Card Type</Text>
              {activeSpell?.type === "Token" ? (
                <View style={{ backgroundColor: C.cardAlt, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ color: C.muted, fontSize: 13 }}>◈ Token — {activeSpell.tokenCategory === "resource" ? "Resource" : "Creature"}</Text>
                </View>
              ) : (
                <View style={[s.spellGrid, { marginBottom: 16 }]}>
                  {SPELL_TYPES.map(t => (
                    <TouchableOpacity key={t.key} style={[s.spellTypeBtn, editSpellType === t.key && s.spellTypeBtnActive]} onPress={() => setEditSpellType(t.key)}>
                      <Text style={s.spellTypeIcon}>{t.icon}</Text>
                      <Text style={[s.spellTypeLabel, editSpellType === t.key && { color: C.text }]}>{t.key}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={s.sectionLabel}>Supertype</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {MTG_SUPERTYPES.map(st => (
                  <TouchableOpacity key={st} style={[{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 }, spellSupertype === st ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]} onPress={() => setSpellSupertype(spellSupertype === st ? null : st)}>
                    <Text style={{ color: spellSupertype === st ? C.accent : C.muted, fontWeight: "700", fontSize: 13 }}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {(() => {
                const isCreatureToken = editSpellType === "Token" && activeSpell?.tokenCategory === "creature";
                const subtypeList = isCreatureToken ? MTG_CREATURE_SUBTYPES : (MTG_SUBTYPES_BY_TYPE[editSpellType ?? ""] ?? []);
                const subtypeLabel = isCreatureToken ? "Creature" : editSpellType;
                if (!subtypeList.length) return null;
                return (<>
                  <Text style={s.sectionLabel}>Subtype</Text>
                  <TextInput style={[s.input, { marginBottom: 8 }]} value={subtypeSearch} onChangeText={setSubtypeSearch} placeholder={`Search ${subtypeLabel} subtypes...`} placeholderTextColor={C.dim} />
                  <ScrollView style={{ maxHeight: 140, marginBottom: 12 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {(subtypeList as readonly string[]).filter(st => !subtypeSearch || st.toLowerCase().includes(subtypeSearch.toLowerCase())).map(st => (
                        <TouchableOpacity key={st} style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5 }, spellSubtype === st ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]} onPress={() => setSpellSubtype(spellSubtype === st ? null : st)}>
                          <Text style={{ color: spellSubtype === st ? C.accent : C.muted, fontSize: 12, fontWeight: "600" }}>{st}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>);
              })()}
              {(editSpellType === "Creature" || (editSpellType === "Token" && activeSpell?.tokenCategory === "creature")) && (<>
                <Text style={s.sectionLabel}>Power / Toughness</Text>
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                  <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={spellPower} onChangeText={setSpellPower} placeholder="Power" placeholderTextColor={C.dim} keyboardType="numeric" />
                  <Text style={{ color: C.muted, fontSize: 24, alignSelf: "center" }}>/</Text>
                  <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={spellToughness} onChangeText={setSpellToughness} placeholder="Toughness" placeholderTextColor={C.dim} keyboardType="numeric" />
                </View>
                {renderManaCostEditor()}
                <Text style={s.sectionLabel}>Keyword Abilities</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {MTG_KEYWORD_ABILITIES.map(ab => (
                    <TouchableOpacity key={ab} style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5 }, spellAbilities.includes(ab) ? { backgroundColor: C.successDim, borderColor: C.success } : { backgroundColor: C.cardAlt, borderColor: C.border }]} onPress={() => setSpellAbilities(prev => prev.includes(ab) ? prev.filter(x => x !== ab) : [...prev, ab])}>
                      <Text style={{ color: spellAbilities.includes(ab) ? C.success : C.muted, fontSize: 12, fontWeight: "600" }}>{ab}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>)}
              {editSpellType === "Planeswalker" && (<>
                <Text style={s.sectionLabel}>Current Loyalty</Text>
                <TextInput style={[s.input, { marginBottom: 16 }]} value={spellLoyalty} onChangeText={setSpellLoyalty} placeholder="e.g. 4" placeholderTextColor={C.dim} keyboardType="numeric" />
              </>)}
              {editSpellType === "Battle" && (<>
                <Text style={s.sectionLabel}>Current Defense</Text>
                <TextInput style={[s.input, { marginBottom: 16 }]} value={spellDefense} onChangeText={setSpellDefense} placeholder="e.g. 7" placeholderTextColor={C.dim} keyboardType="numeric" />
              </>)}
              {editSpellType && !["Creature", "Land"].includes(editSpellType) && !(editSpellType === "Token" && activeSpell?.tokenCategory === "creature") && (<>
                <Text style={s.sectionLabel}>Effect Note</Text>
                <TextInput style={[s.input, { minHeight: 60, textAlignVertical: "top" }]} value={spellEffectNote} onChangeText={setSpellEffectNote} placeholder="What does this card do?" placeholderTextColor={C.dim} multiline />
              </>)}
              {/* REMINDER TOGGLE */}
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 2, marginBottom: 4 }}
                onPress={() => setEventReminderToggle(prev => !prev)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 15 }}>🔔</Text>
                  <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600" }}>Add a Reminder</Text>
                </View>
                <View style={[{ width: 44, height: 26, borderRadius: 13, borderWidth: 1.5, justifyContent: "center" },
                  eventReminderToggle ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                  <View style={[{ width: 18, height: 18, borderRadius: 9, marginHorizontal: 2 },
                    eventReminderToggle ? { backgroundColor: C.accent, alignSelf: "flex-end" } : { backgroundColor: C.dim, alignSelf: "flex-start" }]} />
                </View>
              </TouchableOpacity>
            </ScrollView>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => closeEditSpellModal()}><Text style={s.closeBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.modalConfirmBtn, (!editSpellType || !editSpellName.trim()) && { opacity: 0.4 }]} disabled={!editSpellType || !editSpellName.trim()}
                onPress={() => {
                  if (activeSpell && editSpellType && editSpellName.trim()) {
                    const loyalty = parseInt(spellLoyalty, 10);
                    const defense = parseInt(spellDefense, 10);
                    const isCreatureLikeEdit = editSpellType === "Creature" || (editSpellType === "Token" && activeSpell.tokenCategory === "creature");
                    const manaFields = isCreatureLikeEdit ? getSpellManaCostForSave() : {};
                    dispatch({
                      type: "EDIT_SPELL",
                      id: activeSpell.id,
                      updates: {
                        name: editSpellName.trim(),
                        type: editSpellType,
                        supertype: spellSupertype ?? undefined,
                        subtype: spellSubtype ?? undefined,
                        power: spellPower !== "" ? parseInt(spellPower, 10) : undefined,
                        toughness: spellToughness !== "" ? parseInt(spellToughness, 10) : undefined,
                        ...manaFields,
                        abilities: spellAbilities.length > 0 ? spellAbilities : undefined,
                        currentLoyalty: !isNaN(loyalty) ? loyalty : undefined,
                        currentDefense: !isNaN(defense) ? defense : undefined,
                        effectNote: spellEffectNote.trim() || undefined,
                      },
                    });
                    if (eventReminderToggle) {
                      closeEditSpellModal(false);
                      setReturnToBattlefieldAfterEdit(false);
                      openReminderBuilderForEvent(eventForSpellType(editSpellType), editSpellName.trim());
                    } else {
                      closeEditSpellModal();
                    }
                  }
                }}>
                <Text style={s.startBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* SPELL CAST MODAL — STEP 1: Type Selection */}
      <Modal visible={spellModal} transparent animationType="slide" onRequestClose={() => setSpellModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableOpacity style={s.backdrop} onPress={() => setSpellModal(false)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Spell Cast</Text>
            <Text style={s.sectionLabel}>Spell Name (optional)</Text>
            <TextInput
              style={s.input}
              value={spellName}
              onChangeText={(text) => {
                setSpellName(text);
                setSpellNameSuggestions(searchCardNames(text));
              }}
              placeholder="Search card name..."
              placeholderTextColor={C.dim}
            />
            {spellNameSuggestions.length > 0 && (
              <View style={{
                backgroundColor: C.cardAlt,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: C.border,
                marginBottom: 12,
                overflow: "hidden"
              }}>
                {spellNameSuggestions.map((card) => (
                  <TouchableOpacity
                    key={card.name}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: C.border
                    }}
                    onPress={() => {
                      setSpellName(card.name);
                      setSpellNameSuggestions([]);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={{ color: C.text, fontSize: 13, fontWeight: "600" }}>
                      {card.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={s.sectionLabel}>Card Type</Text>
            <View style={s.spellGrid}>
              {SPELL_TYPES.map(t => (
                <TouchableOpacity key={t.key} style={[s.spellTypeBtn, selectedSpell === t.key && s.spellTypeBtnActive]} onPress={() => setSelectedSpell(t.key)} activeOpacity={0.8}>
                  <Text style={s.spellTypeIcon}>{t.icon}</Text>
                  <Text style={[s.spellTypeLabel, selectedSpell === t.key && { color: C.text }]}>{t.key}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => { setSpellModal(false); setSpellNameSuggestions([]); }}><Text style={s.closeBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.modalConfirmBtn, !selectedSpell && { opacity: 0.4 }]} disabled={!selectedSpell}
                onPress={() => {
                  if (selectedSpell) {
                    resetSpellDetailForm();
                    setSpellModal(false);
                    setSpellDetailModal(true);
                  }
                }}>
                <Text style={s.startBtnText}>Next →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* SPELL DETAIL MODAL — STEP 2: Type-specific fields */}
      <Modal visible={spellDetailModal} transparent animationType="slide" onRequestClose={() => setSpellDetailModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableOpacity style={s.backdrop} onPress={() => setSpellDetailModal(false)} />
          <View style={[s.sheet, { maxHeight: "92%", flex: 1 }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>{selectedSpell ?? "Spell"} Details</Text>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* SUPERTYPE */}
              <Text style={s.sectionLabel}>Supertype (optional)</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {MTG_SUPERTYPES.map(st => (
                  <TouchableOpacity key={st} style={[{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 }, spellSupertype === st ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]} onPress={() => setSpellSupertype(spellSupertype === st ? null : st)}>
                    <Text style={{ color: spellSupertype === st ? C.accent : C.muted, fontWeight: "700", fontSize: 13 }}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* SUBTYPE — searchable */}
              {MTG_SUBTYPES_BY_TYPE[selectedSpell ?? ""] && MTG_SUBTYPES_BY_TYPE[selectedSpell ?? ""].length > 0 && (<>
                <Text style={s.sectionLabel}>Subtype (optional)</Text>
                <TextInput style={[s.input, { marginBottom: 8 }]} value={subtypeSearch} onChangeText={setSubtypeSearch} placeholder={`Search ${selectedSpell} subtypes...`} placeholderTextColor={C.dim} />
                <ScrollView style={{ maxHeight: 160, marginBottom: 4 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingBottom: 8 }}>
                    {(MTG_SUBTYPES_BY_TYPE[selectedSpell ?? ""] as readonly string[])
                      .filter(st => !subtypeSearch || st.toLowerCase().includes(subtypeSearch.toLowerCase()))
                      .map(st => (
                        <TouchableOpacity key={st}
                          style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5 },
                            spellSubtype === st ? { backgroundColor: C.accentDim, borderColor: C.accent }
                            : spellSubtype2 === st ? { backgroundColor: C.accentDim, borderColor: C.accent }
                            : { backgroundColor: C.cardAlt, borderColor: C.border }]}
                          onPress={() => {
                            if (spellSubtype === st) { setSpellSubtype(null); }
                            else if (spellSubtype === null) { setSpellSubtype(st); }
                            else { setSpellSubtype2(spellSubtype2 === st ? null : st); }
                          }}>
                          <Text style={{ color: (spellSubtype === st || spellSubtype2 === st) ? C.accent : C.muted, fontSize: 12, fontWeight: "600" }}>{st}</Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                </ScrollView>
                {(spellSubtype || spellSubtype2) && (
                  <Text style={[s.reminderDesc, { marginBottom: 12 }]}>
                    Selected: {[spellSubtype, spellSubtype2].filter(Boolean).join(" / ")}{"  "}
                    <Text style={{ color: C.danger }} onPress={() => { setSpellSubtype(null); setSpellSubtype2(null); }}>✕ Clear</Text>
                  </Text>
                )}
              </>)}

              {/* CREATURE-SPECIFIC */}
              {selectedSpell === "Creature" && (<>
                <Text style={s.sectionLabel}>Power / Toughness</Text>
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                  <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={spellPower} onChangeText={setSpellPower} placeholder="Power" placeholderTextColor={C.dim} keyboardType="numeric" />
                  <Text style={{ color: C.muted, fontSize: 24, alignSelf: "center" }}>/</Text>
                  <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={spellToughness} onChangeText={setSpellToughness} placeholder="Toughness" placeholderTextColor={C.dim} keyboardType="numeric" />
                </View>
                {renderManaCostEditor()}
                <Text style={s.sectionLabel}>Keyword Abilities (optional)</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {MTG_KEYWORD_ABILITIES.map(ab => (
                    <TouchableOpacity key={ab} style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5 }, spellAbilities.includes(ab) ? { backgroundColor: C.successDim, borderColor: C.success } : { backgroundColor: C.cardAlt, borderColor: C.border }]} onPress={() => setSpellAbilities(prev => prev.includes(ab) ? prev.filter(x => x !== ab) : [...prev, ab])}>
                      <Text style={{ color: spellAbilities.includes(ab) ? C.success : C.muted, fontSize: 12, fontWeight: "600" }}>{ab}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>)}

              {/* PLANESWALKER */}
              {selectedSpell === "Planeswalker" && (<>
                <Text style={s.sectionLabel}>Starting Loyalty</Text>
                <TextInput style={[s.input, { marginBottom: 16 }]} value={spellLoyalty} onChangeText={setSpellLoyalty} placeholder="e.g. 4" placeholderTextColor={C.dim} keyboardType="numeric" />
              </>)}

              {/* BATTLE */}
              {selectedSpell === "Battle" && (<>
                <Text style={s.sectionLabel}>Starting Defense</Text>
                <TextInput style={[s.input, { marginBottom: 16 }]} value={spellDefense} onChangeText={setSpellDefense} placeholder="e.g. 7" placeholderTextColor={C.dim} keyboardType="numeric" />
              </>)}

              {/* LAND */}
              {selectedSpell === "Land" && (<>
                <Text style={s.sectionLabel}>Produces Mana (optional)</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {["White ☀️", "Blue 💧", "Black 💀", "Red 🔥", "Green 🌲", "Colorless ⚪", "Any 🌈"].map(opt => {
                    const val = opt.split(" ")[0];
                    return (
                      <TouchableOpacity key={val} style={[{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1.5 }, spellProduces === val ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]} onPress={() => setSpellProduces(spellProduces === val ? null : val)}>
                        <Text style={{ color: spellProduces === val ? C.accent : C.muted, fontSize: 12, fontWeight: "600" }}>{opt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>)}

              {/* AURA */}
              {selectedSpell === "Enchantment" && spellSubtype === "Aura" && (<>
                <Text style={s.sectionLabel}>Attached To (optional)</Text>
                <TextInput style={[s.input, { marginBottom: 16 }]} value={spellAttachedTo} onChangeText={setSpellAttachedTo} placeholder="e.g. Llanowar Elves" placeholderTextColor={C.dim} />
              </>)}

              {/* EQUIPMENT */}
              {selectedSpell === "Artifact" && spellSubtype === "Equipment" && (<>
                <Text style={s.sectionLabel}>Equipped To (optional)</Text>
                <TextInput style={[s.input, { marginBottom: 16 }]} value={spellAttachedTo} onChangeText={setSpellAttachedTo} placeholder="e.g. Llanowar Elves" placeholderTextColor={C.dim} />
              </>)}

              {/* EFFECT NOTE */}
              {selectedSpell && !["Creature", "Land"].includes(selectedSpell) && (<>
                <Text style={s.sectionLabel}>Effect Note (optional)</Text>
                <TextInput style={[s.input, { minHeight: 60, textAlignVertical: "top", marginBottom: 8 }]} value={spellEffectNote} onChangeText={setSpellEffectNote} placeholder="Brief description of what this card does..." placeholderTextColor={C.dim} multiline />
              </>)}

            </ScrollView>
              {/* REMINDER TOGGLE */}
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 2, marginBottom: 4 }}
                onPress={() => setEventReminderToggle(prev => !prev)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 15 }}>🔔</Text>
                  <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600" }}>Add a Reminder</Text>
                </View>
                <View style={[{ width: 44, height: 26, borderRadius: 13, borderWidth: 1.5, justifyContent: "center" },
                  eventReminderToggle ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                  <View style={[{ width: 18, height: 18, borderRadius: 9, marginHorizontal: 2 },
                    eventReminderToggle ? { backgroundColor: C.accent, alignSelf: "flex-end" } : { backgroundColor: C.dim, alignSelf: "flex-start" }]} />
                </View>
              </TouchableOpacity>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => { setSpellDetailModal(false); setSpellNameSuggestions([]); setSpellModal(true); }}>
                <Text style={s.closeBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirmBtn}
                onPress={() => {
                  if (!selectedSpell) return;
                  const loyalty = parseInt(spellLoyalty, 10);
                  const defense = parseInt(spellDefense, 10);
                  const manaFields = selectedSpell === "Creature" ? getSpellManaCostForSave() : {};
                  dispatch({
                    type: "CAST_SPELL",
                    spellData: {
                      name: spellName.trim() || selectedSpell,
                      type: selectedSpell,
                      supertype: spellSupertype ?? undefined,
                      subtype: spellSubtype ?? undefined,
                      subtype2: spellSubtype2 ?? undefined,
                      isToken: false,
                      power: spellPower !== "" ? parseInt(spellPower, 10) : undefined,
                      toughness: spellToughness !== "" ? parseInt(spellToughness, 10) : undefined,
                      ...manaFields,
                      abilities: spellAbilities.length > 0 ? spellAbilities : undefined,
                      startingLoyalty: !isNaN(loyalty) ? loyalty : undefined,
                      currentLoyalty: !isNaN(loyalty) ? loyalty : undefined,
                      startingDefense: !isNaN(defense) ? defense : undefined,
                      currentDefense: !isNaN(defense) ? defense : undefined,
                      produces: spellProduces ?? undefined,
                      attachedTo: spellAttachedTo.trim() || undefined,
                      effectNote: spellEffectNote.trim() || undefined,
                    },
                  });
                  setSpellDetailModal(false);
                  setSpellNameSuggestions([]);
                  const spellReminderEvent = selectedSpell === "Creature" ? "Creature enters the battlefield"
                    : selectedSpell === "Instant" ? "Instant is cast"
                    : selectedSpell === "Sorcery" ? "Sorcery is cast"
                    : selectedSpell === "Land" ? "Land is played"
                    : selectedSpell === "Enchantment" ? "Enchantment is cast"
                    : selectedSpell === "Artifact" ? "Artifact is cast"
                    : selectedSpell === "Planeswalker" ? "Planeswalker is cast"
                    : "Spell is cast";
                  const castName = spellName.trim() || selectedSpell;
                  setSelectedSpell(null);
                  setSpellName("");
                  resetSpellDetailForm();
                  if (eventReminderToggle) openReminderBuilderForEvent(spellReminderEvent, castName);
                }}>
                <Text style={s.startBtnText}>Log Spell</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CARDS DRAWN / DISCARDED MODAL */}
      <Modal visible={drawModal} transparent animationType="slide" onRequestClose={() => setDrawModal(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={() => setDrawModal(false)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Cards Drawn / Discarded</Text>
            <Text style={s.sectionLabel}>Cards Drawn</Text>
            <View style={s.qtyRow}>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setDrawQty(q => Math.max(0, q - 1))}><Text style={s.lifeBtnText}>−</Text></TouchableOpacity>
              <Text style={[s.lifeVal, { fontSize: 48 }]}>{drawQty}</Text>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setDrawQty(q => q + 1)}><Text style={s.lifeBtnText}>+</Text></TouchableOpacity>
            </View>
            <Text style={[s.sectionLabel, { marginTop: 8 }]}>Cards Discarded</Text>
            <View style={s.qtyRow}>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setDiscardQty(q => Math.max(0, q - 1))}><Text style={s.lifeBtnText}>−</Text></TouchableOpacity>
              <Text style={[s.lifeVal, { fontSize: 48 }]}>{discardQty}</Text>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setDiscardQty(q => q + 1)}><Text style={s.lifeBtnText}>+</Text></TouchableOpacity>
            </View>
              {/* REMINDER TOGGLE */}
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 2, marginBottom: 4 }}
                onPress={() => setEventReminderToggle(prev => !prev)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 15 }}>🔔</Text>
                  <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600" }}>Add a Reminder</Text>
                </View>
                <View style={[{ width: 44, height: 26, borderRadius: 13, borderWidth: 1.5, justifyContent: "center" },
                  eventReminderToggle ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                  <View style={[{ width: 18, height: 18, borderRadius: 9, marginHorizontal: 2 },
                    eventReminderToggle ? { backgroundColor: C.accent, alignSelf: "flex-end" } : { backgroundColor: C.dim, alignSelf: "flex-start" }]} />
                </View>
              </TouchableOpacity>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setDrawModal(false)}><Text style={s.closeBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.modalConfirmBtn, (drawQty === 0 && discardQty === 0) && { opacity: 0.4 }]} disabled={drawQty === 0 && discardQty === 0}
                onPress={() => {
                  if (drawQty > 0) { dispatch({ type: "ADD_CARDS_DRAWN", amount: drawQty }); dispatch({ type: "LOG_EVENT", eventType: "Card Drawn", detail: `Drew ${drawQty} card${drawQty > 1 ? "s" : ""}` }); }
                  if (discardQty > 0) { dispatch({ type: "LOG_EVENT", eventType: "Card Discarded", detail: `Discarded ${discardQty} card${discardQty > 1 ? "s" : ""}` }); }
                  setDrawModal(false);
                  if (eventReminderToggle) openReminderBuilderForEvent("Card is drawn");
                }}>
                <Text style={s.startBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CREATURE DIED MODAL */}
      <Modal visible={creatureModal} transparent animationType="slide" onRequestClose={() => setCreatureModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableOpacity style={s.backdrop} onPress={() => setCreatureModal(false)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Creature Died</Text>
            <Text style={s.sectionLabel}>Creature Name (optional)</Text>
            <TextInput style={s.input} value={creatureName} onChangeText={setCreatureName} placeholder="e.g. Llanowar Elves" placeholderTextColor={C.dim} />
              {/* REMINDER TOGGLE */}
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 2, marginBottom: 4 }}
                onPress={() => setEventReminderToggle(prev => !prev)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 15 }}>🔔</Text>
                  <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600" }}>Add a Reminder</Text>
                </View>
                <View style={[{ width: 44, height: 26, borderRadius: 13, borderWidth: 1.5, justifyContent: "center" },
                  eventReminderToggle ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                  <View style={[{ width: 18, height: 18, borderRadius: 9, marginHorizontal: 2 },
                    eventReminderToggle ? { backgroundColor: C.accent, alignSelf: "flex-end" } : { backgroundColor: C.dim, alignSelf: "flex-start" }]} />
                </View>
              </TouchableOpacity>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setCreatureModal(false)}><Text style={s.closeBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalConfirmBtn}
                onPress={() => {
                  const detail = creatureName.trim() ? `Creature died: ${creatureName.trim()}` : "Creature died";
                  dispatch({ type: "LOG_EVENT", eventType: "Creature Died", detail });
                  setCreatureModal(false);
                  if (eventReminderToggle) openReminderBuilderForEvent("Creature dies", creatureName.trim());
                }}>
                <Text style={s.startBtnText}>Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* LAND PLAYED MODAL */}
      <Modal visible={landModal} transparent animationType="slide" onRequestClose={() => setLandModal(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={() => setLandModal(false)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Land Played</Text>
            <Text style={s.sectionLabel}>Quantity</Text>
            <View style={s.qtyRow}>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setLandQty(q => Math.max(1, q - 1))}><Text style={s.lifeBtnText}>−</Text></TouchableOpacity>
              <Text style={[s.lifeVal, { fontSize: 48 }]}>{landQty}</Text>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setLandQty(q => q + 1)}><Text style={s.lifeBtnText}>+</Text></TouchableOpacity>
            </View>
              {/* REMINDER TOGGLE */}
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 2, marginBottom: 4 }}
                onPress={() => setEventReminderToggle(prev => !prev)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 15 }}>🔔</Text>
                  <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600" }}>Add a Reminder</Text>
                </View>
                <View style={[{ width: 44, height: 26, borderRadius: 13, borderWidth: 1.5, justifyContent: "center" },
                  eventReminderToggle ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                  <View style={[{ width: 18, height: 18, borderRadius: 9, marginHorizontal: 2 },
                    eventReminderToggle ? { backgroundColor: C.accent, alignSelf: "flex-end" } : { backgroundColor: C.dim, alignSelf: "flex-start" }]} />
                </View>
              </TouchableOpacity>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setLandModal(false)}><Text style={s.closeBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalConfirmBtn}
                onPress={() => {
                  // Step 1: determine owner ID — ref wins (Hub flow), falls back to current turn player
                  const landLogPlayerId = hubOwnerRef.current ?? state.turnOrder[state.currentPlayerIndex];
                  const landOwner = state.players.find(p => p.id === landLogPlayerId);
                  const isLandForSelf = landOwner?.isUser ?? false;
                  hubOwnerRef.current = null;

                  // Step 2: land limit check — only applies to user's own lands
                  if (isLandForSelf && !canPlayExtraLands && state.landsPlayed >= 1) {
                    setLandWarningModal(true);
                    return;
                  }

                  // Step 3: increment user's land counter only for their own lands
                  if (isLandForSelf) {
                    for (let i = 0; i < landQty; i++) dispatch({ type: "ADD_LAND" });
                  }

                  // Step 4: always add to spell log regardless of whose land it is
                  for (let i = 0; i < landQty; i++) {
                    dispatch({
                      type: "CAST_SPELL",
                      spellData: {
                        name: "Land",
                        type: "Land",
                        isToken: false,
                        playerId: landLogPlayerId,
                      },
                    });
                  }

                  // Step 5: always log to history
                  const landOwnerName = landOwner?.name ?? "Unknown";
                  dispatch({ type: "LOG_EVENT", eventType: "Land Played", detail: `${landOwnerName} played ${landQty} land${landQty > 1 ? "s" : ""}`, playerId: landLogPlayerId });

                  // Step 6: auto-resolve land reminder only for user's own lands on their turn
                  if (isLandForSelf && !isOppTurn) {
                    const landReminder = state.reminders.find(r => r.id === "system-land" && r.status === "pending");
                    if (landReminder) dispatch({ type: "RESOLVE_REMINDER", id: "system-land", skipEffect: true });
                  }

                  setLandModal(false);
                  if (eventReminderToggle) openReminderBuilderForEvent("Land is played");
                }}>
                <Text style={s.startBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LAND WARNING MODAL */}
      <Modal visible={landWarningModal} transparent animationType="fade" onRequestClose={() => setLandWarningModal(false)}>
        <View style={s.centeredOverlay}>
          <View style={s.centeredModal}>
            <Text style={{ fontSize: 32, textAlign: "center", marginBottom: 8 }}>🌲</Text>
            <Text style={[s.sheetTitle, { textAlign: "center" }]}>Land Limit Reached</Text>
            <Text style={[s.reminderDesc, { textAlign: "center", marginBottom: 20 }]}>
              You've already played {state.landsPlayed} land{state.landsPlayed > 1 ? "s" : ""} this turn.{"\n\n"}
              You need a card effect like Exploration or Azusa to play additional lands.{"\n\n"}
              Set up a Reminder with fire mode "Event-based" and a passive "Extra Land Play" effect to enable this permanently while that card is on the battlefield.
            </Text>
            <View style={{ width: "100%", gap: 8 }}>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning }]}
                onPress={() => {
                  for (let i = 0; i < landQty; i++) dispatch({ type: "ADD_LAND" });
                  dispatch({ type: "LOG_EVENT", eventType: "Land Played", detail: `Played ${landQty} extra land${landQty > 1 ? "s" : ""} (override)` });
                  setLandWarningModal(false);
                  setLandModal(false);
                  if (eventReminderToggle) openReminderBuilderForEvent("Land is played");
                }}
              >
                <Text style={s.confirmBtnText}>⚠️ Play Anyway — I Have a Reason</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.closeBtn]} onPress={() => setLandWarningModal(false)}>
                <Text style={s.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* TOKEN CREATED MODAL */}
      <Modal visible={tokenModal} transparent animationType="slide" onRequestClose={() => setTokenModal(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={() => setTokenModal(false)} />
          <View style={[s.sheet, { maxHeight: "82%", flex: 1 }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Token Created</Text>
            <TextInput
              style={[s.input, { marginBottom: 12 }]}
              value={tokenSearch}
              onChangeText={setTokenSearch}
              placeholder="Search tokens..."
              placeholderTextColor={C.dim}
            />
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {PINNED_TOKENS.filter(t => !tokenSearch || t.toLowerCase().includes(tokenSearch.toLowerCase())).length > 0 && (
                <>
                  <Text style={[s.sectionLabel, { marginBottom: 8, paddingHorizontal: 14 }]}>Pinned</Text>
                  {PINNED_TOKENS.filter(t => !tokenSearch || t.toLowerCase().includes(tokenSearch.toLowerCase())).map(token => (
                    <TouchableOpacity
                      key={token}
                      style={[{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: C.border }, selectedToken === token && { backgroundColor: C.accentDim }]}
                      onPress={() => {
                        setSelectedToken(token);
                        if (!RESOURCE_TOKENS.includes(token)) {
                          const pt = token.match(/^(\d+)\/(\d+)\s/);
                          setTokenPower(pt ? pt[1] : "");
                          setTokenToughness(pt ? pt[2] : "");
                        } else {
                          setTokenPower(""); setTokenToughness("");
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 16, color: C.warning }}>◈</Text>
                      <Text style={[s.reminderTitle, { flex: 1 }, selectedToken === token && { color: C.accent }]}>{token}</Text>
                      {selectedToken === token && <Text style={{ color: C.accent, fontSize: 16 }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {COMMON_TOKENS.filter(t => !tokenSearch || t.toLowerCase().includes(tokenSearch.toLowerCase())).length > 0 && (
                <>
                  <Text style={[s.sectionLabel, { marginTop: 12, marginBottom: 8, paddingHorizontal: 14 }]}>Common Tokens</Text>
                  {COMMON_TOKENS.filter(t => !tokenSearch || t.toLowerCase().includes(tokenSearch.toLowerCase())).map(token => (
                    <TouchableOpacity
                      key={token}
                      style={[{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: C.border }, selectedToken === token && { backgroundColor: C.accentDim }]}
                      onPress={() => {
                        setSelectedToken(token);
                        const pt = token.match(/^(\d+)\/(\d+)\s/);
                        setTokenPower(pt ? pt[1] : "");
                        setTokenToughness(pt ? pt[2] : "");
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 16, color: C.dim }}>◈</Text>
                      <Text style={[s.reminderTitle, { flex: 1 }, selectedToken === token && { color: C.accent }]}>{token}</Text>
                      {selectedToken === token && <Text style={{ color: C.accent, fontSize: 16 }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {PINNED_TOKENS.filter(t => !tokenSearch || t.toLowerCase().includes(tokenSearch.toLowerCase())).length === 0 &&
               COMMON_TOKENS.filter(t => !tokenSearch || t.toLowerCase().includes(tokenSearch.toLowerCase())).length === 0 && (
                <Text style={{ color: C.dim, textAlign: "center", paddingVertical: 20, fontSize: 13 }}>No tokens match "{tokenSearch}"</Text>
              )}
            </ScrollView>
            <View style={[s.qtyRow, { marginTop: 8, marginBottom: 4 }]}>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setTokenQty(q => Math.max(1, q - 1))}><Text style={s.lifeBtnText}>−</Text></TouchableOpacity>
              <Text style={[s.lifeVal, { fontSize: 36 }]}>{tokenQty}×</Text>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setTokenQty(q => q + 1)}><Text style={s.lifeBtnText}>+</Text></TouchableOpacity>
            </View>
            {/* P/T — shown for creature tokens only */}
            {selectedToken && !RESOURCE_TOKENS.includes(selectedToken) && (
              <View style={{ paddingHorizontal: 2, marginBottom: 8 }}>
                <Text style={[s.sectionLabel, { marginBottom: 8 }]}>Power / Toughness <Text style={{ color: C.dim, textTransform: "none", fontWeight: "400" }}>(optional — override if entering with bonuses)</Text></Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <TextInput
                    style={[s.input, { flex: 1, marginBottom: 0, textAlign: "center" }]}
                    value={tokenPower}
                    onChangeText={setTokenPower}
                    placeholder="Power"
                    placeholderTextColor={C.dim}
                    keyboardType="numeric"
                  />
                  <Text style={{ color: C.muted, fontSize: 24, fontWeight: "300" }}>/</Text>
                  <TextInput
                    style={[s.input, { flex: 1, marginBottom: 0, textAlign: "center" }]}
                    value={tokenToughness}
                    onChangeText={setTokenToughness}
                    placeholder="Toughness"
                    placeholderTextColor={C.dim}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}
              {/* REMINDER TOGGLE */}
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 2, marginBottom: 4 }}
                onPress={() => setEventReminderToggle(prev => !prev)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 15 }}>🔔</Text>
                  <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600" }}>Add a Reminder</Text>
                </View>
                <View style={[{ width: 44, height: 26, borderRadius: 13, borderWidth: 1.5, justifyContent: "center" },
                  eventReminderToggle ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                  <View style={[{ width: 18, height: 18, borderRadius: 9, marginHorizontal: 2 },
                    eventReminderToggle ? { backgroundColor: C.accent, alignSelf: "flex-end" } : { backgroundColor: C.dim, alignSelf: "flex-start" }]} />
                </View>
              </TouchableOpacity>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setTokenModal(false)}><Text style={s.closeBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity
                style={[s.modalConfirmBtn, !selectedToken && { opacity: 0.4 }]}
                disabled={!selectedToken}
                onPress={() => {
                  if (selectedToken) {
                    const tokenCat = RESOURCE_TOKENS.includes(selectedToken) ? "resource" : "creature";
                    const tPower = tokenPower !== "" ? parseInt(tokenPower, 10) : undefined;
                    const tToughness = tokenToughness !== "" ? parseInt(tokenToughness, 10) : undefined;
                    for (let i = 0; i < tokenQty; i++) {
                      dispatch({
                        type: "CAST_SPELL",
                        spellData: {
                          name: selectedToken,
                          type: "Token",
                          isToken: true,
                          tokenCategory: tokenCat,
                          power: tPower,
                          toughness: tToughness,
                        },
                      });
                    }
                    setTokenPower(""); setTokenToughness("");
                    setTokenModal(false);
                    if (eventReminderToggle) openReminderBuilderForEvent("Token is created", selectedToken ?? undefined);
                  }
                }}>
                <Text style={s.startBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD MANA MODAL */}
      <Modal visible={addManaModal} transparent animationType="slide" onRequestClose={() => setAddManaModal(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={() => setAddManaModal(false)} />
          <View style={[s.sheet, { maxHeight: "85%", flex: 1 }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Add Mana</Text>
            <Text style={{ color: C.dim, fontSize: 13, marginBottom: 16, marginTop: -8 }}>Adjust quantities then confirm</Text>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {MANA_COLORS.map(mc => (
                <View key={mc.key} style={s.manaRow}>
                  <Text style={{ fontSize: 18, marginRight: 8 }}>{mc.emoji}</Text>
                  <Text style={{ flex: 1, color: C.text, fontSize: 15 }}>{mc.label}</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => setManaEventAmounts(prev => ({ ...prev, [mc.key]: Math.max(0, prev[mc.key] - 1) }))}>
                    <Text style={s.lifeBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={{ color: C.text, fontSize: 18, fontWeight: "700", minWidth: 36, textAlign: "center" }}>{manaEventAmounts[mc.key]}</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => setManaEventAmounts(prev => ({ ...prev, [mc.key]: prev[mc.key] + 1 }))}>
                    <Text style={s.lifeBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            {(() => {
              const allZero = Object.values(manaEventAmounts).every(v => v === 0);
              const doConfirm = (perm: boolean) => {
                const colorSummary = MANA_COLORS.filter(c => manaEventAmounts[c.key] > 0).map(c => `${manaEventAmounts[c.key]} ${c.label}`).join(", ");
                MANA_COLORS.forEach(c => {
                  if (manaEventAmounts[c.key] > 0) dispatch({ type: perm ? "ADD_AUTO_MANA" : "ADD_MANUAL_MANA", color: c.key, amount: manaEventAmounts[c.key] });
                });
                dispatch({ type: "LOG", message: `Added mana (${perm ? "perm" : "temp"}): ${colorSummary}` });
                setManaEventAmounts({ white: 0, blue: 0, black: 0, red: 0, green: 0, colorless: 0 });
                setAddManaModal(false);
              };
              return (
                <View style={{ gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[{ backgroundColor: C.accentDim, borderRadius: 10, paddingVertical: 13, alignItems: "center", borderWidth: 1, borderColor: C.accent }, allZero && { opacity: 0.4 }]}
                    disabled={allZero}
                    onPress={() => doConfirm(true)}
                  >
                    <Text style={s.startBtnText}>Confirm Perm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[{ backgroundColor: C.warningDim, borderRadius: 10, paddingVertical: 13, alignItems: "center", borderWidth: 1, borderColor: C.warning }, allZero && { opacity: 0.4 }]}
                    disabled={allZero}
                    onPress={() => doConfirm(false)}
                  >
                    <Text style={s.startBtnText}>Confirm Temp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.closeBtnWide} onPress={() => { setManaEventAmounts({ white: 0, blue: 0, black: 0, red: 0, green: 0, colorless: 0 }); setAddManaModal(false); }}>
                    <Text style={s.closeBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* OTHERS MODAL */}
      <Modal visible={othersModal} transparent animationType="slide" onRequestClose={() => setOthersModal(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={() => setOthersModal(false)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Other Events</Text>
            {[
              { icon: "❤️", label: "Gain / Lose Life", onPress: () => { setOthersModal(false); setLifeCounterHint(null); setLifeCounterModal(true); } },
              { icon: "🔍", label: "Tutor / Search", onPress: () => { setOthersModal(false); setTutorModal(true); } },
              { icon: "💨", label: "Mill", onPress: () => { setOthersModal(false); setMillModal(true); } },
              { icon: "⚡", label: "Deal Damage", onPress: () => { setOthersModal(false); setDealDamageModal(true); } },
              { icon: "📋", label: "Copy", onPress: () => { setOthersModal(false); setCopyModal(true); } },
            ].map(item => (
              <TouchableOpacity key={item.label} style={s.gyRow} onPress={item.onPress} activeOpacity={0.7}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>{item.icon}</Text>
                <Text style={{ flex: 1, color: C.text, fontSize: 15 }}>{item.label}</Text>
                <Text style={{ color: C.dim, fontSize: 16 }}>›</Text>
              </TouchableOpacity>
            ))}
            <View style={{ marginTop: 16 }}>
              <TouchableOpacity style={s.closeBtnWide} onPress={() => setOthersModal(false)}>
                <Text style={s.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* TUTOR / SEARCH MODAL */}
      <Modal visible={tutorModal} transparent animationType="slide" onRequestClose={() => setTutorModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableOpacity style={s.backdrop} onPress={() => setTutorModal(false)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Tutor / Search</Text>
            <Text style={{ color: C.dim, fontSize: 13, marginBottom: 12, marginTop: -8 }}>Searching your library will be logged to history</Text>
            <TextInput
              style={[s.input, { marginBottom: 12 }]}
              value={tutorNote}
              onChangeText={setTutorNote}
              placeholder="Optional notes..."
              placeholderTextColor={C.dim}
            />
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setTutorModal(false)}><Text style={s.closeBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalConfirmBtn} onPress={() => {
                dispatch({ type: "LOG", message: `🔍 Searched library${tutorNote.trim() ? ": " + tutorNote.trim() : ""}` });
                setTutorNote("");
                setTutorModal(false);
              }}>
                <Text style={s.startBtnText}>Log Search</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MILL MODAL */}
      <Modal visible={millModal} transparent animationType="slide" onRequestClose={() => setMillModal(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={() => setMillModal(false)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Mill</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              <TouchableOpacity
                style={[{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", borderWidth: 1 }, millTarget === "self" ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]}
                onPress={() => setMillTarget("self")}
              >
                <Text style={{ color: millTarget === "self" ? C.accent : C.muted, fontWeight: "700" }}>You</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", borderWidth: 1 }, millTarget === "opponent" ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]}
                onPress={() => setMillTarget("opponent")}
              >
                <Text style={{ color: millTarget === "opponent" ? C.accent : C.muted, fontWeight: "700" }}>Opponent</Text>
              </TouchableOpacity>
            </View>
            <View style={s.qtyRow}>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setMillQty(q => Math.max(1, q - 1))}><Text style={s.lifeBtnText}>−</Text></TouchableOpacity>
              <Text style={[s.lifeVal, { fontSize: 36 }]}>{millQty}</Text>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setMillQty(q => q + 1)}><Text style={s.lifeBtnText}>+</Text></TouchableOpacity>
            </View>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setMillModal(false)}><Text style={s.closeBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalConfirmBtn} onPress={() => {
                dispatch({ type: "LOG", message: `💨 ${millTarget === "self" ? "You milled" : "Opponent milled"} ${millQty} card${millQty > 1 ? "s" : ""}` });
                setMillQty(1);
                setMillModal(false);
              }}>
                <Text style={s.startBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DEAL DAMAGE MODAL */}
      <Modal visible={dealDamageModal} transparent animationType="slide" onRequestClose={() => setDealDamageModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableOpacity style={s.backdrop} onPress={() => setDealDamageModal(false)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Deal Damage</Text>
            <TextInput
              style={[s.input, { marginBottom: 12 }]}
              value={dealDamageNote}
              onChangeText={setDealDamageNote}
              placeholder="e.g. Lightning Bolt deals 3 to player"
              placeholderTextColor={C.dim}
            />
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setDealDamageModal(false)}><Text style={s.closeBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalConfirmBtn} onPress={() => {
                dispatch({ type: "LOG_EVENT", eventType: "Deal Damage", detail: dealDamageNote.trim() || "No details" });
                setDealDamageNote("");
                setDealDamageModal(false);
              }}>
                <Text style={s.startBtnText}>Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* COPY MODAL */}
      <Modal visible={copyModal} transparent animationType="slide" onRequestClose={() => setCopyModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableOpacity style={s.backdrop} onPress={() => setCopyModal(false)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Copy</Text>
            <TextInput
              style={[s.input, { marginBottom: 12 }]}
              value={copyNote}
              onChangeText={setCopyNote}
              placeholder="e.g. Copied Lightning Bolt"
              placeholderTextColor={C.dim}
            />
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setCopyModal(false)}><Text style={s.closeBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalConfirmBtn} onPress={() => {
                dispatch({ type: "LOG_EVENT", eventType: "Copy", detail: copyNote.trim() || "No details" });
                setCopyNote("");
                setCopyModal(false);
              }}>
                <Text style={s.startBtnText}>Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* GENERIC EVENT MODAL */}
      <Modal visible={!!genericEvent} transparent animationType="slide" onRequestClose={() => setGenericEvent(null)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableOpacity style={s.backdrop} onPress={() => setGenericEvent(null)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>{genericEvent?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</Text>
            <Text style={s.sectionLabel}>Optional notes:</Text>
            <TextInput style={[s.input, { minHeight: 80, textAlignVertical: "top" }]} value={genericNote} onChangeText={setGenericNote} placeholder="Add details (optional)" placeholderTextColor={C.dim} multiline />
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setGenericEvent(null)}><Text style={s.closeBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalConfirmBtn} onPress={() => { if (genericEvent) dispatch({ type: "LOG_EVENT", eventType: genericEvent, detail: genericNote || "No details" }); setGenericEvent(null); }}>
                <Text style={s.startBtnText}>Log Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* REMINDERS LIST MODAL — unified list */}
      <Modal visible={remindersListModal} transparent animationType="slide" onRequestClose={() => setRemindersListModal(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={() => setRemindersListModal(false)} />
          <View style={[s.sheet, { maxHeight: "92%", flex: 1 }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Reminders ({state.reminders.length})</Text>

            <TouchableOpacity
              style={[s.closeBtnWide, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 12 }]}
              onPress={() => { openReminderBuilder(); }}
            >
              <Text style={{ color: C.accent, fontWeight: "700", fontSize: 13 }}>+ Add Reminder</Text>
            </TouchableOpacity>

            {state.reminders.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <Text style={{ color: C.dim, fontSize: 14, textAlign: "center" }}>No reminders yet.{"\n"}Add one to track phase notes or event triggers.</Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
                {state.reminders.map(r => {
                  const fireModeIcon = r.fireMode === "event" ? "⚡" : "📍";
                  const effectSummary = r.effects.filter(e => e.timing === "immediate").map(e =>
                    e.effectType === "gain-life" ? `+${e.amount ?? 1} life`
                    : e.effectType === "lose-life" ? `-${e.amount ?? 1} life`
                    : e.effectType === "draw-cards" ? `Draw ${e.amount ?? 1}`
                    : e.effectType === "add-mana" ? `+${e.amount ?? 1} ${e.color ?? "C"} mana`
                    : e.effectType === "play-land" ? "Play land"
                    : e.effectType === "log-only" ? "" : e.effectType
                  ).filter(Boolean).join(", ");
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={s.gyRow}
                      onPress={() => { setActiveReminderItem(r); setActiveReminderModal(true); }}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <Text style={{ fontSize: 13, color: r.fireMode === "event" ? C.warning : C.accent }}>{fireModeIcon}</Text>
                          <Text style={s.reminderTitle}>{r.name}</Text>
                          {r.isSystem && <Text style={{ fontSize: 9, color: C.dim, fontWeight: "700" }}>SYS</Text>}
                          <Text style={{
                            fontSize: 10, fontWeight: "700",
                            color: r.status === "resolved" ? C.success
                              : r.status === "missed" ? C.danger
                              : r.status === "inactive" ? C.dim
                              : r.status === "skipped" ? C.warning
                              : C.accent,
                          }}>
                            {r.status === "active" ? "ON" : r.status.toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                          {r.fireMode === "event" && r.triggerEvent
                            ? <Text style={{ fontSize: 10, color: C.dim }}>⚡ {r.triggerEvent}</Text>
                            : r.phases.length > 0 ? <Text style={{ fontSize: 10, color: C.dim }}>📍 {r.phases.join(", ")}</Text>
                            : null}
                          <Text style={{ fontSize: 10, color: C.dim }}>🔁 {r.frequency}</Text>
                          {effectSummary ? <Text style={{ fontSize: 10, color: C.success }}>→ {effectSummary}</Text> : null}
                          <Text style={{ fontSize: 10, color: r.activeDuring === "mine" ? userColor : r.activeDuring === "opponent" ? (state.players.find(p => !p.isUser)?.color ?? "#F59E0B") : C.muted }}>
                            {r.activeDuring === "mine" ? "👤 Mine" : r.activeDuring === "opponent" ? "⚡ Opp" : "↔ Both"}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: C.accent, fontSize: 18 }}>›</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity style={[s.closeBtnWide, { marginTop: 8 }]} onPress={() => setRemindersListModal(false)}>
              <Text style={s.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* REMINDER POPUP MODAL */}
      <Modal visible={state.pendingReminderFires.length > 0} transparent animationType="fade" onRequestClose={() => dispatch({ type: "CLEAR_PENDING_REMINDER_FIRES" })}>
        <View style={s.centeredOverlay}>
          <View style={[s.centeredModal, { maxHeight: "80%" }]}>
            <Text style={{ fontSize: 28, textAlign: "center", marginBottom: 4 }}>🔔</Text>
            <Text style={[s.sheetTitle, { textAlign: "center", marginBottom: 4 }]}>Reminder Fired!</Text>
            <Text style={[s.phaseDesc, { textAlign: "center", marginBottom: 12, color: C.muted }]}>{state.pendingReminderFires.length} reminder{state.pendingReminderFires.length !== 1 ? "s" : ""} need attention</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: "100%" }} contentContainerStyle={{ gap: 10 }}>
              {state.pendingReminderFires.map(instance => {
                const r = state.reminders.find(x => x.id === instance.reminderId);
                if (!r) return null;
                const effectSummary = r.effects.map(fx =>
                  fx.effectType === "gain-life" ? `You gain ${fx.amount ?? 1} life`
                  : fx.effectType === "lose-life" ? `You lose ${fx.amount ?? 1} life`
                  : fx.effectType === "draw-cards" ? `You draw ${fx.amount ?? 1} card(s)`
                  : fx.effectType === "add-mana" ? `Add ${fx.amount ?? 1} ${fx.color ?? "colorless"} to your mana`
                  : fx.effectType === "extra-land" ? "You get an extra land play"
                  : fx.effectType === "custom" ? (fx.customText ?? "Custom")
                  : "Log only"
                ).join(", ");
                const hint = getLifeEffectHint(r);
                const counterEffectHint = getCounterEffectHint(r);
                const canResolve = instance.triggeredByUser || !!hint || !!counterEffectHint;
                return (
                  <View key={instance.id} style={{ backgroundColor: C.cardAlt, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12 }}>
                    <Text style={{ color: C.accent, fontWeight: "700", fontSize: 14, marginBottom: 2 }}>🔔 {r.name}</Text>
                    {r.triggerEvent ? <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Event: {r.triggerEvent}</Text> : null}
                    {r.description ? <Text style={{ color: C.dim, fontSize: 11, marginBottom: 6 }}>{r.description}</Text> : null}
                    {canResolve
                      ? <Text style={{ color: C.text, fontSize: 12, marginBottom: 4 }}>Effect: {effectSummary}</Text>
                      : <Text style={{ color: C.warning, fontSize: 12, marginBottom: 4 }}>⚠️ Opponent's action — effect logged only, no stat change</Text>
                    }
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity style={[s.actionBtn, { flex: 1, backgroundColor: canResolve ? C.successDim : C.cardAlt, borderColor: canResolve ? C.success : C.border, paddingVertical: 8 }]} onPress={() => {
                        dispatch({ type: "RESOLVE_REMINDER_FIRE", fireId: instance.id });
                        if (hint) {
                          setLifeCounterHint(hint);
                          setLifeCounterModal(true);
                        } else if (counterEffectHint) {
                          openCounterModalForHint(counterEffectHint);
                        }
                      }}>
                        <Text style={[s.confirmBtnText, { fontSize: 13 }]}>{canResolve ? "✓ Resolve" : "📋 Log & Dismiss"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.actionBtn, { flex: 1, backgroundColor: C.warningDim, borderColor: C.warning, paddingVertical: 8 }]} onPress={() => dispatch({ type: "PARK_REMINDER_FIRE", fireId: instance.id })}>
                        <Text style={[s.confirmBtnText, { fontSize: 13 }]}>⏸ Park</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[s.actionBtn, s.closeBtn, { marginTop: 12 }]} onPress={() => dispatch({ type: "CLEAR_PENDING_REMINDER_FIRES" })}>
              <Text style={s.closeBtnText}>Dismiss All</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* UNIFIED REMINDER BUILDER MODAL */}
      <Modal visible={reminderBuilderModal} transparent animationType="slide" onRequestClose={() => { setReminderBuilderModal(false); resetReminderBuilder(); }}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableOpacity style={s.backdrop} onPress={() => { setReminderBuilderModal(false); resetReminderBuilder(); }} />
          <View style={[s.sheet, { maxHeight: "96%", flex: 1 }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>{ubIsEditing ? "Edit Reminder" : "New Reminder"}</Text>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* NAME */}
              <Text style={s.sectionLabel}>Name *</Text>
              <TextInput
                style={s.input}
                value={ubName}
                onChangeText={(text) => {
                  setUbName(text);
                  setUbNameSuggestions(searchCardNames(text));
                }}
                placeholder="e.g. Soul Warden, Propaganda, Rhystic Study"
                placeholderTextColor={C.dim}
              />
              {ubNameSuggestions.length > 0 && (
                <View style={{ backgroundColor: C.cardAlt, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 12, overflow: "hidden" }}>
                  {ubNameSuggestions.map((card) => (
                    <TouchableOpacity
                      key={card.name}
                      style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}
                      onPress={() => { setUbName(card.name); setUbNameSuggestions([]); }}
                      activeOpacity={0.75}
                    >
                      <Text style={{ color: C.text, fontSize: 13, fontWeight: "600" }}>{card.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* FIRE MODE */}
              <Text style={s.sectionLabel}>How does it fire?</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {([["phase", "📍 During a Phase"], ["event", "⚡ When an Event Happens"]] as const).map(([mode, label]) => (
                  <TouchableOpacity key={mode}
                    style={[{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", borderWidth: 1.5 },
                      ubFireMode === mode ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]}
                    onPress={() => { setUbFireMode(mode); setUbFrequency(mode === "phase" ? "each-turn" : "each-time"); }}>
                    <Text style={{ color: ubFireMode === mode ? C.accent : C.muted, fontSize: 11, fontWeight: "700", textAlign: "center" }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* PHASE PICKER — phase mode */}
              {ubFireMode === "phase" && (
                <>
                  <Text style={s.sectionLabel}>Active During Phases (empty = all phases)</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                    {PHASES.map(ph => (
                      <TouchableOpacity key={ph}
                        style={[{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5 },
                          ubPhases.includes(ph) ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]}
                        onPress={() => setUbPhases(prev => prev.includes(ph) ? prev.filter(x => x !== ph) : [...prev, ph])}>
                        <Text style={{ color: ubPhases.includes(ph) ? C.accent : C.muted, fontSize: 11, fontWeight: "600" }}>{ph}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* EVENT PICKER — event mode */}
              {ubFireMode === "event" && (
                <>
                  <Text style={s.sectionLabel}>Trigger Event *</Text>
                  {ubTriggerEvent ? (
                    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.accentDim, borderRadius: 8, padding: 10, marginBottom: 8 }}>
                      <Text style={{ flex: 1, color: C.accent, fontSize: 13 }}>⚡ {ubTriggerEvent}</Text>
                      <TouchableOpacity onPress={() => setUbTriggerEvent(null)}><Text style={{ color: C.danger, fontSize: 16 }}>✕</Text></TouchableOpacity>
                    </View>
                  ) : null}
                  <TextInput style={[s.input, { marginBottom: 6 }]} placeholder="Search events…" placeholderTextColor={C.dim} value={ubTriggerEventSearch} onChangeText={setUbTriggerEventSearch} />
                  {ubTriggerEventSearch.length > 0 && (
                    <View style={{ maxHeight: 180, backgroundColor: C.cardAlt, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 12, overflow: "hidden" }}>
                      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {(GAME_EVENTS as readonly string[]).filter(e => e.toLowerCase().includes(ubTriggerEventSearch.toLowerCase())).slice(0, 20).map(e => (
                          <TouchableOpacity key={e} style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: C.border }} onPress={() => { setUbTriggerEvent(e); setUbTriggerEventSearch(""); }}>
                            <Text style={{ color: C.text, fontSize: 13 }}>⚡ {e}</Text>
                          </TouchableOpacity>
                        ))}
                        {(GAME_EVENTS as readonly string[]).filter(e => e.toLowerCase().includes(ubTriggerEventSearch.toLowerCase())).length === 0 && (
                          <Text style={{ color: C.dim, textAlign: "center", padding: 12, fontSize: 13 }}>No matches</Text>
                        )}
                      </ScrollView>
                    </View>
                  )}

                  <Text style={s.sectionLabel}>Phase Restriction (optional — leave empty to fire in any phase)</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                    {PHASES.map(ph => (
                      <TouchableOpacity key={ph}
                        style={[{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1.5 },
                          ubActivePhases.includes(ph) ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]}
                        onPress={() => setUbActivePhases(prev => prev.includes(ph) ? prev.filter(x => x !== ph) : [...prev, ph])}>
                        <Text style={{ color: ubActivePhases.includes(ph) ? C.accent : C.muted, fontSize: 10, fontWeight: "600" }}>{ph}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={s.sectionLabel}>Conditions (optional — all must match)</Text>
                  {ubConditions.map((cond, i) => {
                    const opt = CONDITION_OPTIONS.find(o => o.id === cond.type);
                    return (
                      <View key={cond.id} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        {i > 0 && (
                          <TouchableOpacity style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border }}
                            onPress={() => setUbConditions(prev => prev.map((c, idx) => idx === i - 1 ? { ...c, connector: c.connector === "AND" ? "OR" : "AND" } : c))}>
                            <Text style={{ color: C.accent, fontSize: 10, fontWeight: "700" }}>{ubConditions[i - 1]?.connector ?? "AND"}</Text>
                          </TouchableOpacity>
                        )}
                        <View style={{ flex: 1, backgroundColor: C.cardAlt, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: C.border }}>
                          <Text style={{ color: C.text, fontSize: 12 }}>{opt?.label ?? cond.type}{cond.value ? ` "${cond.value}"` : ""}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setUbConditions(prev => prev.filter((_, idx) => idx !== i))}><Text style={{ color: C.danger, fontSize: 16 }}>✕</Text></TouchableOpacity>
                      </View>
                    );
                  })}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: "row", gap: 6, paddingBottom: 2 }}>
                      {CONDITION_OPTIONS.slice(0, 12).map(opt => (
                        <TouchableOpacity key={opt.id}
                          style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border }}
                          onPress={() => {
                            const val = opt.requiresValue ? "" : undefined;
                            setUbConditions(prev => [...prev, { id: `cond-${Date.now()}`, type: opt.id, value: val, connector: "AND" }]);
                          }}>
                          <Text style={{ color: C.muted, fontSize: 11 }}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              {/* ACTIVE DURING */}
              <Text style={s.sectionLabel}>Active During</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {(["mine", "both", "opponent"] as const).map(opt => (
                  <TouchableOpacity key={opt}
                    style={[{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1.5 },
                      ubActiveDuring === opt ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]}
                    onPress={() => setUbActiveDuring(opt)}>
                    <Text style={{ color: ubActiveDuring === opt ? C.accent : C.muted, fontSize: 11, fontWeight: "700", textAlign: "center" }}>
                      {opt === "mine" ? "👤 My Turn" : opt === "both" ? "↔ Both" : "⚡ Opp Turn"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* FREQUENCY */}
              <Text style={s.sectionLabel}>How Often?</Text>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 16 }}>
                {(ubFireMode === "phase"
                  ? [["each-turn", "Each Turn"], ["once", "Once Only"], ["manual", "Manual"]]
                  : [["each-time", "Each Time"], ["once-per-turn", "Once/Turn"], ["once-per-game", "Once/Game"]]
                ).map(([f, label]) => (
                  <TouchableOpacity key={f}
                    style={[{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1.5 },
                      ubFrequency === f ? { backgroundColor: C.accentDim, borderColor: C.accent } : { backgroundColor: C.cardAlt, borderColor: C.border }]}
                    onPress={() => setUbFrequency(f as ReminderFrequency)}>
                    <Text style={{ color: ubFrequency === f ? C.accent : C.muted, fontSize: 10, fontWeight: "700", textAlign: "center" }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* EFFECTS */}
              <Text style={s.sectionLabel}>Effects on Resolve</Text>
              {ubEffects.length === 0 ? (
                <Text style={{ color: C.dim, fontSize: 12, marginBottom: 8 }}>No effects — reminder will log only.</Text>
              ) : (
                ubEffects.map((eff, i) => (
                  <View key={eff.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.cardAlt, borderRadius: 8, padding: 8, marginBottom: 6, borderWidth: 1, borderColor: C.border }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: eff.timing === "passive" ? C.warning : C.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: eff.timing === "passive" ? C.warningDim : C.successDim }}>
                      {eff.timing === "passive" ? "PASSIVE" : "ON RESOLVE"}
                    </Text>
                    <Text style={{ flex: 1, color: C.text, fontSize: 12 }}>
                      {eff.effectType === "gain-life" ? `Gain ${eff.amount ?? 1} life`
                        : eff.effectType === "lose-life" ? `Lose ${eff.amount ?? 1} life`
                        : eff.effectType === "draw-cards" ? `Draw ${eff.amount ?? 1} card(s)`
                        : eff.effectType === "add-mana" ? `Add ${eff.amount ?? 1} ${eff.color ?? "C"} mana`
                        : eff.effectType === "play-land" ? "Play a land"
                        : eff.effectType === "extra-land" ? "Extra land play"
                        : eff.effectType === "discard" ? `Discard ${eff.amount ?? 1}`
                        : eff.effectType === "surveil" ? `Surveil ${eff.amount ?? 1}`
                        : eff.effectType === "mill" ? `Mill ${eff.amount ?? 1}`
                        : eff.customText ?? eff.effectType}
                    </Text>
                    <TouchableOpacity onPress={() => setUbEffects(prev => prev.filter((_, idx) => idx !== i))}><Text style={{ color: C.danger, fontSize: 16 }}>✕</Text></TouchableOpacity>
                  </View>
                ))
              )}

              {ubEffectBuilderOpen ? (
                <View style={{ backgroundColor: C.cardAlt, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.accent }}>
                  <Text style={[s.sectionLabel, { marginBottom: 8 }]}>Add Effect</Text>
                  <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
                    {(["immediate", "passive"] as const).map(t => (
                      <TouchableOpacity key={t}
                        style={[{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", borderWidth: 1 },
                          ubEffectTiming === t ? { backgroundColor: t === "passive" ? C.warningDim : C.successDim, borderColor: t === "passive" ? C.warning : C.success } : { backgroundColor: C.bg, borderColor: C.border }]}
                        onPress={() => { setUbEffectTiming(t); setUbEffectType("log-only"); }}>
                        <Text style={{ color: ubEffectTiming === t ? C.text : C.dim, fontSize: 11, fontWeight: "700" }}>{t === "immediate" ? "On Resolve" : "Always-On Passive"}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {EFFECT_TYPE_OPTIONS.filter(o => o.supportsTiming.includes(ubEffectTiming)).map(o => (
                        <TouchableOpacity key={o.value}
                          style={[s.gyTab, ubEffectType === o.value ? s.gyTabActive : s.gyTabInactive, { paddingHorizontal: 10, paddingVertical: 6 }]}
                          onPress={() => setUbEffectType(o.value)}>
                          <Text style={[s.gyTabText, { color: ubEffectType === o.value ? C.accent : C.muted }]}>{o.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  {EFFECT_TYPE_OPTIONS.find(o => o.value === ubEffectType)?.requiresAmount && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <Text style={{ color: C.muted, fontSize: 13 }}>Amount:</Text>
                      <TouchableOpacity style={[s.gyTab, s.gyTabInactive, { paddingHorizontal: 12, paddingVertical: 5 }]} onPress={() => setUbEffectAmount(Math.max(1, ubEffectAmount - 1))}><Text style={{ color: C.text }}>−</Text></TouchableOpacity>
                      <Text style={{ color: C.text, fontSize: 16, minWidth: 28, textAlign: "center" }}>{ubEffectAmount}</Text>
                      <TouchableOpacity style={[s.gyTab, s.gyTabInactive, { paddingHorizontal: 12, paddingVertical: 5 }]} onPress={() => setUbEffectAmount(ubEffectAmount + 1)}><Text style={{ color: C.text }}>+</Text></TouchableOpacity>
                    </View>
                  )}
                  {EFFECT_TYPE_OPTIONS.find(o => o.value === ubEffectType)?.requiresColor && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {MANA_COLORS.map(mc => (
                        <TouchableOpacity key={mc.key} style={[s.gyTab, ubEffectColor === mc.key ? s.gyTabActive : s.gyTabInactive, { paddingHorizontal: 8, paddingVertical: 5 }]} onPress={() => setUbEffectColor(mc.key as typeof ubEffectColor)}>
                          <Text style={[s.gyTabText, { color: ubEffectColor === mc.key ? C.accent : C.muted }]}>{mc.emoji} {mc.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {ubEffectType === "add-counter" && (
                    <TextInput style={[s.input, { marginBottom: 8 }]} placeholder="Counter type (e.g. +1/+1, charge, lore)" placeholderTextColor={C.dim} value={ubEffectCounterType} onChangeText={setUbEffectCounterType} />
                  )}
                  {ubEffectType === "custom" && (
                    <TextInput style={[s.input, { marginBottom: 8 }]} placeholder="Describe the effect…" placeholderTextColor={C.dim} value={ubEffectCustomText} onChangeText={setUbEffectCustomText} multiline />
                  )}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity style={[s.actionBtn, { flex: 1, backgroundColor: C.successDim, borderColor: C.success }]}
                      onPress={() => {
                        const newEff: ReminderEffect = {
                          id: `fx-${Date.now()}-${Math.random()}`,
                          timing: ubEffectTiming,
                          effectType: ubEffectType,
                          amount: EFFECT_TYPE_OPTIONS.find(o => o.value === ubEffectType)?.requiresAmount ? ubEffectAmount : undefined,
                          color: EFFECT_TYPE_OPTIONS.find(o => o.value === ubEffectType)?.requiresColor ? (ubEffectColor ?? "colorless") : undefined,
                          counterType: ubEffectType === "add-counter" ? ubEffectCounterType || "+1/+1" : undefined,
                          customText: ubEffectType === "custom" ? ubEffectCustomText : undefined,
                        };
                        setUbEffects(prev => [...prev, newEff]);
                        setUbEffectBuilderOpen(false);
                        setUbEffectType("log-only"); setUbEffectAmount(1); setUbEffectColor(null);
                        setUbEffectCounterType(""); setUbEffectCustomText("");
                      }}>
                      <Text style={s.confirmBtnText}>+ Add Effect</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, s.closeBtn, { flex: 1 }]} onPress={() => setUbEffectBuilderOpen(false)}>
                      <Text style={s.closeBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={[s.closeBtnWide, { borderColor: C.border, marginBottom: 16 }]} onPress={() => setUbEffectBuilderOpen(true)}>
                  <Text style={{ color: C.muted, fontWeight: "700", fontSize: 13 }}>+ Add Effect</Text>
                </TouchableOpacity>
              )}

              {/* DESCRIPTION */}
              <Text style={s.sectionLabel}>Description (optional)</Text>
              <TextInput style={[s.input, { marginBottom: 8, minHeight: 56, textAlignVertical: "top" }]} value={ubDescription} onChangeText={setUbDescription} placeholder="What should this reminder tell you?" placeholderTextColor={C.dim} multiline />

            </ScrollView>

            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => { setReminderBuilderModal(false); resetReminderBuilder(); }}>
                <Text style={s.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalConfirmBtn, !ubName.trim() && { opacity: 0.4 }]} disabled={!ubName.trim()} onPress={saveReminder}>
                <Text style={s.startBtnText}>{ubIsEditing ? "Save Changes" : "Save Reminder"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* REMINDER DETAIL MODAL */}
      <Modal visible={activeReminderModal} transparent animationType="fade" onRequestClose={() => { setActiveReminderModal(false); setActiveReminderItem(null); }}>
        <View style={s.centeredOverlay}>
          <View style={[s.centeredModal, { maxHeight: "80%" }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: "center", paddingBottom: 8 }}>
              <Text style={[s.sheetTitle, { textAlign: "center" }]}>{activeReminderItem?.name}</Text>

              {activeReminderItem?.description ? (
                <Text style={[s.reminderDesc, { textAlign: "center", marginBottom: 12 }]}>{activeReminderItem.description}</Text>
              ) : null}

              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 8 }}>
                {activeReminderItem?.phases && activeReminderItem.phases.length > 0 ? (
                  <Text style={{ fontSize: 10, color: C.dim }}>📍 {activeReminderItem.phases.join(", ")}</Text>
                ) : null}
                {activeReminderItem?.triggerEvent ? <Text style={{ fontSize: 10, color: C.accent }}>⚡ {activeReminderItem.triggerEvent}</Text> : null}
                <Text style={{ fontSize: 10, color: C.dim }}>🔁 {activeReminderItem?.frequency}</Text>
                <Text style={{ fontSize: 10, color: C.dim }}>Status: {activeReminderItem?.status}</Text>
                {activeReminderItem?.sourceLabel ? <Text style={{ fontSize: 10, color: C.dim }}>Source: {activeReminderItem.sourceLabel}</Text> : null}
              </View>

              {activeReminderItem?.effects && activeReminderItem.effects.length > 0 && (
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 8 }}>
                  {activeReminderItem.effects.map(fx => (
                    <Text key={fx.id} style={{ fontSize: 10, color: C.success }}>
                      → {fx.effectType === "gain-life" ? `Gain ${fx.amount ?? 1} life`
                        : fx.effectType === "lose-life" ? `Lose ${fx.amount ?? 1} life`
                        : fx.effectType === "draw-cards" ? `Draw ${fx.amount ?? 1} card(s)`
                        : fx.effectType === "add-mana" ? `Add ${fx.amount ?? 1} ${fx.color ?? "colorless"} mana`
                        : fx.effectType === "extra-land" ? "🌲 Extra land play"
                        : fx.effectType === "custom" ? (fx.customText ?? "Custom")
                        : "Log only"}
                    </Text>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={{ width: "100%", gap: 8, marginTop: 12 }}>
              {activeReminderItem?.status === "skipped" && (
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: C.successDim, borderColor: C.success }]}
                  onPress={() => { if (activeReminderItem) dispatch({ type: "UNSKIP_REMINDER", id: activeReminderItem.id }); setActiveReminderModal(false); setActiveReminderItem(null); }}
                >
                  <Text style={s.confirmBtnText}>↩ Unpark</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: C.accentDim, borderColor: C.accent }]}
                onPress={() => { setActiveReminderModal(false); if (activeReminderItem) openReminderBuilder(activeReminderItem); }}
              >
                <Text style={s.confirmBtnText}>✎ Edit Reminder</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger }]}
                onPress={() => { if (activeReminderItem) dispatch({ type: "DELETE_REMINDER", id: activeReminderItem.id }); setActiveReminderModal(false); setActiveReminderItem(null); }}
              >
                <Text style={s.confirmBtnText}>✕ Delete Reminder</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, s.closeBtn]}
                onPress={() => { setActiveReminderModal(false); setActiveReminderItem(null); }}
              >
                <Text style={s.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PHASE REMINDER POPUP */}
      <Modal visible={phaseReminderPopup} transparent animationType="fade" onRequestClose={() => setPhaseReminderPopup(false)}>
        <View style={s.centeredOverlay}>
          <View style={[s.centeredModal, { maxHeight: "80%" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={[s.sheetTitle, { flex: 1 }]}>📍 Phase Reminders</Text>
              <TouchableOpacity onPress={() => setPhaseReminderPopup(false)} style={{ padding: 6 }}>
                <Text style={{ color: C.muted, fontSize: 22, fontWeight: "700", lineHeight: 24 }}>✕</Text>
              </TouchableOpacity>
            </View>
            {state.activePhaseView !== null && (
              <Text style={[s.reminderDesc, { textAlign: "center", marginBottom: 12 }]}>{state.activePhaseView}</Text>
            )}
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: "100%" }} contentContainerStyle={{ gap: 8 }}>
              {(state.activePhaseView !== null
                ? state.reminders.filter(r => {
                    if (r.fireMode !== "phase") return false;
                    if (r.status !== "active" && r.status !== "pending") return false;
                    const turnMatches =
                      r.activeDuring === "both" ||
                      (r.activeDuring === "mine" && !isOppTurn) ||
                      (r.activeDuring === "opponent" && isOppTurn);
                    if (!turnMatches) return false;
                    return r.phases.length === 0 || r.phases.includes(state.activePhaseView!);
                  })
                : []
              ).map(r => (
                <View key={r.id} style={{ backgroundColor: C.cardAlt, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12 }}>
                  <Text style={s.reminderTitle}>{r.name}</Text>
                  {r.description ? <Text style={[s.reminderDesc, { marginBottom: 8 }]}>{r.description}</Text> : null}
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                    <TouchableOpacity
                      style={[s.resolveBtn, { flex: 1, alignItems: "center" }]}
                      onPress={() => {
                        dispatch({ type: "RESOLVE_REMINDER", id: r.id });
                        openPostResolveEffectModal(r);
                      }}
                    >
                      <Text style={s.resolveBtnText}>Resolve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.skipBtn, { flex: 1, alignItems: "center" }]}
                      onPress={() => dispatch({ type: "SKIP_REMINDER", id: r.id })}
                    >
                      <Text style={s.skipBtnText}>Skip</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* LIFE MODAL */}
      <Modal visible={!!commanderLethalAlert} transparent animationType="fade" onRequestClose={() => setCommanderLethalAlerts(queue => queue.slice(1))}>
        <View style={s.centeredOverlay}>
          <View style={[s.centeredModal, { borderColor: C.danger }]}>
            <Text style={{ fontSize: 38, marginBottom: 8 }}>⚠</Text>
            <Text style={[s.sheetTitle, { textAlign: "center", color: C.danger, marginBottom: 8 }]}>Lethal Commander Damage</Text>
            <Text style={[s.phaseDesc, { textAlign: "center", marginBottom: 8 }]}>
              {commanderLethalAlert?.defenderName ?? "Player"} has taken {commanderLethalAlert?.amount ?? 21}/21 commander damage from {commanderLethalAlert?.commanderName ?? "Commander"}.
            </Text>
            <Text style={[s.reminderDesc, { textAlign: "center", marginBottom: 18 }]}>
              This player has lethal commander damage from that commander.
            </Text>
            <TouchableOpacity
              style={[s.actionBtn, s.confirmBtnWarn]}
              onPress={() => setCommanderLethalAlerts(queue => queue.slice(1))}
            >
              <Text style={s.confirmBtnText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={lifeCounterModal} transparent animationType="slide" onRequestClose={() => { setLifeCounterModal(false); setLifeCounterHint(null); }}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={() => { setLifeCounterModal(false); setLifeCounterHint(null); }} />
          <View style={[s.sheet, { maxHeight: "85%", flex: 1 }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Life</Text>
            {lifeCounterHint && (
              <View style={{ backgroundColor: C.accentDim, borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: C.accent }}>
                <Text style={{ color: C.accent, fontSize: 12, fontWeight: "700" }}>{lifeCounterHint}</Text>
              </View>
            )}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {state.players.map(p => {
                const commanderDamageEntries = Object.entries(state.commanderDamage[p.id] ?? {})
                  .map(([commanderId, amount]) => ({
                    commanderId,
                    amount,
                    commander: state.commanders.find(c => c.id === commanderId),
                  }))
                  .filter(entry => entry.amount > 0);
                return (
                  <View key={p.id} style={{ borderBottomWidth: 1, borderBottomColor: C.border }}>
                    <View style={[s.manaRow, { borderBottomWidth: 0 }]}>
                      <Text style={[s.manaLabel]}>{p.name}{p.isUser ? " (You)" : ""}</Text>
                      <Text style={s.manaTotal}>{p.life}</Text>
                      <TouchableOpacity style={s.manaBtn} onPress={() => dispatch({ type: "CHANGE_LIFE", delta: -1, playerId: p.id })}>
                        <Text style={s.manaBtnText}>−</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.manaBtn} onPress={() => dispatch({ type: "CHANGE_LIFE", delta: 1, playerId: p.id })}>
                        <Text style={s.manaBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    {commanderDamageEntries.length > 0 && (
                      <View style={{ paddingHorizontal: 4, paddingBottom: 12, gap: 4 }}>
                        <Text style={{ color: C.warning, fontSize: 12, fontWeight: "800" }}>{p.name} Commander Damage:</Text>
                        {commanderDamageEntries.map(entry => {
                          const isLethal = entry.amount >= 21;
                          return (
                            <TouchableOpacity
                              key={entry.commanderId}
                              style={[
                                { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingVertical: 4 },
                                isLethal && { backgroundColor: C.dangerDim, borderColor: C.danger, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, marginTop: 2 },
                              ]}
                              onPress={() => setCommanderDamageEdit({ defendingPlayerId: p.id, commanderId: entry.commanderId, amount: entry.amount })}
                              activeOpacity={0.75}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: isLethal ? C.danger : C.muted, fontSize: 12, fontWeight: isLethal ? "800" : "400" }}>
                                  {(entry.commander?.name ?? entry.commanderId)}: {entry.amount}/21
                                </Text>
                                {isLethal && (
                                  <Text style={{ color: C.danger, fontSize: 11, fontWeight: "800", marginTop: 2 }}>
                                    Lethal commander damage
                                  </Text>
                                )}
                              </View>
                              <Text style={{ color: isLethal ? C.danger : C.accent, fontSize: 11, fontWeight: "700" }}>Edit</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[s.closeBtnWide, { marginTop: 8 }]} onPress={() => { setLifeCounterModal(false); setLifeCounterHint(null); }}>
              <Text style={s.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!commanderDamageEdit} transparent animationType="fade" onRequestClose={() => setCommanderDamageEdit(null)}>
        <View style={s.centeredOverlay}>
          <View style={s.centeredModal}>
            {(() => {
              const defender = commanderDamageEdit ? state.players.find(p => p.id === commanderDamageEdit.defendingPlayerId) : null;
              const commander = commanderDamageEdit ? state.commanders.find(c => c.id === commanderDamageEdit.commanderId) : null;
              return (
                <>
                  <Text style={[s.sheetTitle, { textAlign: "center" }]}>Edit Commander Damage</Text>
                  <Text style={[s.reminderDesc, { textAlign: "center", marginBottom: 4 }]}>{defender?.name ?? "Player"}</Text>
                  <Text style={[s.reminderTitle, { textAlign: "center", marginBottom: 12 }]}>{commander?.name ?? "Commander"}</Text>
                  <Text style={[s.phaseDesc, { textAlign: "center", marginBottom: 12, color: C.muted }]}>
                    Current damage {commanderDamageEdit?.amount ?? 0}/21
                  </Text>
                  <View style={s.qtyRow}>
                    <TouchableOpacity
                      style={s.qtyBtn}
                      onPress={() => setCommanderDamageEdit(edit => edit ? { ...edit, amount: Math.max(0, edit.amount - 1) } : edit)}
                    >
                      <Text style={s.lifeBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={[s.lifeVal, { fontSize: 44 }]}>{commanderDamageEdit?.amount ?? 0}</Text>
                    <TouchableOpacity
                      style={s.qtyBtn}
                      onPress={() => setCommanderDamageEdit(edit => edit ? { ...edit, amount: edit.amount + 1 } : edit)}
                    >
                      <Text style={s.lifeBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={s.modalBtnRow}>
                    <TouchableOpacity style={s.modalCancelBtn} onPress={() => setCommanderDamageEdit(null)}>
                      <Text style={s.closeBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.modalConfirmBtn}
                      onPress={() => {
                        if (commanderDamageEdit) {
                          dispatch({
                            type: "SET_COMMANDER_DAMAGE",
                            defendingPlayerId: commanderDamageEdit.defendingPlayerId,
                            commanderId: commanderDamageEdit.commanderId,
                            amount: commanderDamageEdit.amount,
                          });
                        }
                        setCommanderDamageEdit(null);
                      }}
                    >
                      <Text style={s.startBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      <BattlefieldModal
        visible={battlefieldModal}
        onClose={() => setBattlefieldModal(false)}
        state={state}
        dispatch={dispatch}
        onOpenHub={() => { setBattlefieldModal(false); setReturnToBattlefieldAfterCounter(true); setHubModal(true); }}
        onEditSpell={(spell) => {
          setBattlefieldModal(false);
          openEditSpellModal(spell, true);
        }}
      />
    </> ); }

}
