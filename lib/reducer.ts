import {
  Reminder, ReminderFireInstance, ReminderContext, ReminderEffectResult,
  makeDefaultReminders, getMatchingEventReminders,
  recordEventReminderFires, applyImmediateEffects,
  resetPhaseReminders, activatePhaseReminders,
  resetEventReminderTurnFlags, deactivateRemindersForSpell,
} from "../System/reminderSystem";
import { resolveResourceToken } from "../System/resourceTokenSystem";
import { getManaCostValue } from "./types";
import type { GameState, Action, CastSpell, GraveyardEntry, ExileEntry, TokenGYEntry, ManaPool, HistoryEntry } from "./types";
import { PHASES } from "./constants";
import {
  logEntry, updatePlayerLife, getActivePlayerId,
  fireMatchingEvents, reminderHasLifeEffect,
  hasAbility, buildBaseContext,
} from "./gameHelpers";

export const INIT: GameState = {
  screen: "menu", isMyTurn: true, activePhaseView: null,
  playerName: "Player 1",
  gameType: "standard", turnNumber: 1, phaseIndex: 0,
  phaseLocked: false, cardsDrawn: 0, landsPlayed: 0,
  spellsCastThisTurn: 0, creaturesCastThisTurn: 0,
  lifeGainedThisTurn: 0, opponentLifeGainedThisTurn: 0,
  isMonarch: false, hasInitiative: false, hasCityBlessing: false,
  cardsInHand: 7,
  reminders: makeDefaultReminders(),
  pendingReminderFires: [],
  history: [], spellLog: [],
  graveyard: [], exile: [], tokenGY: [],
  manaPool: {
    white:     { auto: 0, manual: 0 },
    blue:      { auto: 0, manual: 0 },
    black:     { auto: 0, manual: 0 },
    red:       { auto: 0, manual: 0 },
    green:     { auto: 0, manual: 0 },
    colorless: { auto: 0, manual: 0 },
  },
  players: [{ id: "p1", name: "Player 1", isUser: true, life: 20 }],
  currentPlayerIndex: 0,
  turnOrder: ["p1"],
  firstPlayerIndex: 0,
  opponentPhaseIndex: 0,
  eventOwnerPlayerId: null,
  commanders: [],
  commanderDamage: {},
};

function advanceToNextPlayer(state: GameState): GameState {
  const nextIdx = (state.currentPlayerIndex + 1) % state.turnOrder.length;
  const nextPlayer = state.players.find(p => p.id === state.turnOrder[nextIdx]);
  const entry = logEntry(state, `→ ${nextPlayer?.name ?? "Next Player"}'s turn`);
  if (nextPlayer?.isUser) {
    const newTurnNum = state.turnNumber + 1;
    const resetR = resetPhaseReminders(state.reminders);
    const activatedR = activatePhaseReminders(resetR, PHASES[0], true);
    const reminders = resetEventReminderTurnFlags(activatedR);
    return { ...state, screen: "game", isMyTurn: true, activePhaseView: null, phaseIndex: 0, turnNumber: newTurnNum, phaseLocked: false, currentPlayerIndex: nextIdx, reminders, pendingReminderFires: [], cardsDrawn: 0, landsPlayed: 0, spellsCastThisTurn: 0, creaturesCastThisTurn: 0, lifeGainedThisTurn: 0, opponentLifeGainedThisTurn: 0, history: [...state.history, entry], eventOwnerPlayerId: null };
  }
  return { ...state, screen: "opponent-turn", isMyTurn: false, activePhaseView: null, currentPlayerIndex: nextIdx, opponentPhaseIndex: 0, spellsCastThisTurn: 0, creaturesCastThisTurn: 0, lifeGainedThisTurn: 0, opponentLifeGainedThisTurn: 0, history: [...state.history, entry], eventOwnerPlayerId: null };
}

function applyReminderManaAndLandEffects(
  state: GameState,
  result: ReminderEffectResult,
  manaPool: ManaPool,
  spellLog: CastSpell[],
): { manaPool: ManaPool; spellLog: CastSpell[] } {
  let nextManaPool = manaPool;
  let nextSpellLog = spellLog;

  if (result.manaAdded) {
    for (const m of result.manaAdded) {
      const ck = m.color as keyof ManaPool;
      nextManaPool = { ...nextManaPool, [ck]: { ...nextManaPool[ck], auto: nextManaPool[ck].auto + m.amount } };
    }
  }

  if ((result.landsPlayedDelta ?? 0) > 0) {
    const landSpell: CastSpell = {
      id: `spell-${Date.now()}-${Math.random()}`,
      name: "Land", type: "Land", isToken: false,
      turnNumber: state.turnNumber, phase: PHASES[state.phaseIndex],
      zone: "active", playerId: state.turnOrder[state.currentPlayerIndex],
    };
    nextSpellLog = [...nextSpellLog, landSpell];
  }

  return { manaPool: nextManaPool, spellLog: nextSpellLog };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "HYDRATE": {
      const normSpell = (s: CastSpell) =>
        s.isToken === undefined && s.type === "Token" ? { ...s, isToken: true as const } : s;
      const normZone = <T extends { isToken?: boolean; type: string }>(e: T): T =>
        e.isToken === undefined && e.type === "Token" ? { ...e, isToken: true as const } : e;
      return {
        ...INIT,
        ...action.state,
        spellLog: action.state.spellLog?.map(normSpell) ?? INIT.spellLog,
        graveyard: action.state.graveyard?.map(normZone) ?? INIT.graveyard,
        exile: action.state.exile?.map(normZone) ?? INIT.exile,
      };
    }
    case "GO_SETUP": return { ...state, screen: "setup" };
    case "GO_MENU": return { ...INIT };
    case "START_GAME": {
      const firstId = action.turnOrder[0];
      const firstPlayer = action.players.find(p => p.id === firstId);
      const startsAsOpponent = !firstPlayer?.isUser;
      return {
        ...state,
        screen: startsAsOpponent ? "opponent-turn" : "game",
        isMyTurn: !startsAsOpponent,
        activePhaseView: null,
        playerName: action.playerName,
        gameType: action.gameType, turnNumber: 1, phaseIndex: 0,
        phaseLocked: false, cardsDrawn: 0, landsPlayed: 0,
        spellsCastThisTurn: 0, creaturesCastThisTurn: 0,
        lifeGainedThisTurn: 0, opponentLifeGainedThisTurn: 0,
        isMonarch: false, hasInitiative: false, hasCityBlessing: false,
        cardsInHand: 7,
        reminders: activatePhaseReminders(makeDefaultReminders(), PHASES[0], !startsAsOpponent), pendingReminderFires: [],
        history: [], spellLog: [],
        commanders: action.commanders ?? [], commanderDamage: action.commanderDamage ?? {},
        players: action.players, turnOrder: action.turnOrder,
        firstPlayerIndex: action.firstPlayerIndex,
        currentPlayerIndex: 0, opponentPhaseIndex: 0,
      };
    }
    case "NEXT_PHASE": {
      const next = state.phaseIndex + 1;
      const newTurn = next >= PHASES.length;
      if (newTurn && state.turnOrder.length > 1) {
        return advanceToNextPlayer(state);
      }
      const newIdx = newTurn ? 0 : next;
      const newTurnNum = newTurn ? state.turnNumber + 1 : state.turnNumber;
      let reminders = newTurn ? resetPhaseReminders(state.reminders) : state.reminders;
      reminders = activatePhaseReminders(reminders, PHASES[newIdx], state.isMyTurn);
      if (newTurn) reminders = resetEventReminderTurnFlags(reminders);
      const entry = logEntry(state, `→ ${PHASES[newIdx]}${newTurn ? ` (Turn ${newTurnNum})` : ""}`);
      return { ...state, phaseIndex: newIdx, turnNumber: newTurnNum, phaseLocked: false, reminders, pendingReminderFires: [], cardsDrawn: newTurn ? 0 : state.cardsDrawn, landsPlayed: newTurn ? 0 : state.landsPlayed, spellsCastThisTurn: newTurn ? 0 : state.spellsCastThisTurn, creaturesCastThisTurn: newTurn ? 0 : state.creaturesCastThisTurn, lifeGainedThisTurn: newTurn ? 0 : state.lifeGainedThisTurn, opponentLifeGainedThisTurn: newTurn ? 0 : state.opponentLifeGainedThisTurn, history: [...state.history, entry] };
    }
    case "PREV_PHASE": {
      if (state.phaseIndex === 0) return state;
      const prev = state.phaseIndex - 1;
      const entry = logEntry(state, `← ${PHASES[prev]}`);
      return { ...state, phaseIndex: prev, phaseLocked: false, history: [...state.history, entry] };
    }
    case "SET_ACTIVE_PHASE": {
      const newPhaseIndex = PHASES.indexOf(action.phase);
      return {
        ...state,
        activePhaseView: action.phase,
        phaseIndex: newPhaseIndex >= 0 ? newPhaseIndex : state.phaseIndex,
      };
    }
    case "CLEAR_ACTIVE_PHASE": return { ...state, activePhaseView: null };
    case "LOCK_PHASE": return { ...state, phaseLocked: true };
    case "UNLOCK_PHASE": return { ...state, phaseLocked: false };
    case "CHANGE_LIFE": {
      const playerId = getActivePlayerId(state, action.playerId);
      const player = state.players.find(p => p.id === playerId);
      const oldLife = player?.life ?? 0;
      const newLife = oldLife + action.delta;
      const sign = action.delta > 0 ? "+" : "";
      const entry = logEntry(state, `${player?.name ?? state.playerName}: Life ${sign}${action.delta} → ${newLife}`, playerId);
      const players = updatePlayerLife(state.players, playerId, () => newLife);
      const isUserLifeChange = player?.isUser ?? false;
      const lifeGained = action.delta > 0 ? action.delta : 0;
      return {
        ...state, players,
        lifeGainedThisTurn: isUserLifeChange ? state.lifeGainedThisTurn + lifeGained : state.lifeGainedThisTurn,
        opponentLifeGainedThisTurn: !isUserLifeChange ? state.opponentLifeGainedThisTurn + lifeGained : state.opponentLifeGainedThisTurn,
        history: [...state.history, entry],
      };
    }
    case "CHANGE_LIFE_SILENT": {
      const playerId = getActivePlayerId(state, action.playerId);
      const player = state.players.find(p => p.id === playerId);
      const newLife = (player?.life ?? 0) + action.delta;
      const players = updatePlayerLife(state.players, playerId, () => newLife);
      const isUserLifeChange = player?.isUser ?? false;
      const lifeGained = action.delta > 0 ? action.delta : 0;
      return {
        ...state, players,
        lifeGainedThisTurn: isUserLifeChange ? state.lifeGainedThisTurn + lifeGained : state.lifeGainedThisTurn,
        opponentLifeGainedThisTurn: !isUserLifeChange ? state.opponentLifeGainedThisTurn + lifeGained : state.opponentLifeGainedThisTurn,
      };
    }
    case "SET_LIFE": {
      const playerId = getActivePlayerId(state, action.playerId);
      const player = state.players.find(p => p.id === playerId);
      const entry = logEntry(state, `${player?.name ?? state.playerName}: Life set to ${action.value}`, playerId);
      const players = updatePlayerLife(state.players, playerId, () => action.value);
      return { ...state, players, history: [...state.history, entry] };
    }
    case "RESOLVE_REMINDER": {
      const r = state.reminders.find(x => x.id === action.id);
      if (!r) return state;
      let reminders = state.reminders.map(x => x.id === action.id ? { ...x, status: "resolved" as const } : x);
      const entry = logEntry(state, `✓ Resolved: ${r.name}`);
      if (action.skipEffect) {
        return { ...state, reminders, history: [...state.history, entry] };
      }
      // Only apply stat effects on Player 1's turn — phase reminders showing during
      // opponent's turn are for tracking only, not for changing Player 1's stats
      if (!state.isMyTurn) {
        return { ...state, reminders, history: [...state.history, entry] };
      }
      const result = applyImmediateEffects(r);
      let players = state.players;
      let cardsDrawn = state.cardsDrawn + (result.cardsDrawnDelta ?? 0);
      let landsPlayed = state.landsPlayed + (result.landsPlayedDelta ?? 0);
      let manaPool = { ...state.manaPool };
      let spellLog = state.spellLog;
      const triggeredEvents: string[] = [];
      if ((result.cardsDrawnDelta ?? 0) > 0) triggeredEvents.push("Card is drawn");
      if ((result.landsPlayedDelta ?? 0) > 0) triggeredEvents.push("Land is played", "Basic land enters");

      const currentPhase = PHASES[state.phaseIndex];
      const firedR = triggeredEvents.length > 0
        ? getMatchingEventReminders(reminders, triggeredEvents, currentPhase, state.isMyTurn)
        : [];
      reminders = firedR.length > 0 ? recordEventReminderFires(reminders, firedR) : reminders;
      const newInstances: ReminderFireInstance[] = firedR.map(eventReminder => ({
        id: `fire-${eventReminder.id}-${Date.now()}-${Math.random()}`,
        reminderId: eventReminder.id,
        firedPhase: currentPhase,
        firedTurn: state.turnNumber,
        triggeredByUser: state.isMyTurn,
      }));
      ({ manaPool, spellLog } = applyReminderManaAndLandEffects(state, result, manaPool, spellLog));
      const histEntries = [entry];
      if (result.logMessage) histEntries.push(logEntry(state, result.logMessage));
      return {
        ...state,
        reminders,
        players,
        cardsDrawn,
        landsPlayed,
        spellLog,
        manaPool,
        pendingReminderFires: [...state.pendingReminderFires, ...newInstances],
        history: [...state.history, ...histEntries],
      };
    }
    case "SKIP_REMINDER": return { ...state, reminders: state.reminders.map(r => r.id === action.id ? { ...r, status: "skipped" as const } : r) };
    case "UNSKIP_REMINDER": return { ...state, reminders: state.reminders.map(r => r.id === action.id ? { ...r, status: "pending" as const } : r) };
    case "MISS_REMINDER": {
      const r = state.reminders.find(x => x.id === action.id);
      if (!r) return state;
      const reminders = state.reminders.map(x => x.id === action.id ? { ...x, status: "missed" as const } : x);
      const entry = logEntry(state, `✗ Missed: ${r.name}`);
      return { ...state, reminders, history: [...state.history, entry] };
    }
    case "CAST_SPELL": {
      const spell: CastSpell = {
        ...action.spellData,
        id: `spell-${Date.now()}-${Math.random()}`,
        turnNumber: state.turnNumber,
        phase: PHASES[state.phaseIndex],
        zone: "active",
        playerId: action.spellData.playerId ?? state.eventOwnerPlayerId ?? state.turnOrder[state.currentPlayerIndex],
      };
      const isToken = !!spell.isToken;
      const ptPart = spell.power !== undefined && spell.toughness !== undefined
        ? ` ${spell.power}/${spell.toughness}` : "";
      const superPart = spell.supertype ? `${spell.supertype} ` : "";
      const subPart = spell.subtype ? ` — ${spell.subtype}` : "";
      const entry = logEntry(state, isToken
        ? `◈ Token created: ${spell.name}`
        : `✦ Cast ${superPart}${spell.type}${subPart}: ${spell.name}${ptPart}`
      );
      const isCreatureToken = isToken && spell.tokenCategory === "creature";
      const isResourceToken = isToken && spell.tokenCategory === "resource";

      const trigEvents = isToken
        ? [
            "Token enters the battlefield",
            "Token is created",
            "Token created",
            isCreatureToken ? "Creature enters the battlefield" : null,
            isCreatureToken ? "Creature spell is cast" : null,
            isResourceToken && spell.name.includes("Treasure") ? "Treasure is created" : null,
            isResourceToken && spell.name.includes("Food") ? "Food is created" : null,
            isResourceToken && spell.name.includes("Clue") ? "Clue is created" : null,
            isResourceToken && spell.name.includes("Blood") ? "Blood is created" : null,
            isResourceToken && spell.name.includes("Map") ? "Map is created" : null,
            isResourceToken && spell.name.includes("Powerstone") ? "Powerstone is created" : null,
          ].filter(Boolean) as string[]
        : [
            "Spell is cast",
            spell.type === "Creature" ? "Creature spell is cast" : null,
            spell.type === "Creature" ? "Creature enters the battlefield" : null,
            spell.type === "Instant" ? "Instant is cast" : null,
            spell.type === "Sorcery" ? "Sorcery is cast" : null,
            spell.type === "Artifact" ? "Artifact is cast" : null,
            spell.type === "Enchantment" ? "Enchantment is cast" : null,
            spell.type === "Planeswalker" ? "Planeswalker is cast" : null,
          ].filter(Boolean) as string[];
      const currentPhase = PHASES[state.phaseIndex];
      const isNonTokenSpell = !isToken;
      const isCreatureSpell = spell.type === "Creature" && !isToken;
      const newSpellCount = state.spellsCastThisTurn + (isNonTokenSpell ? 1 : 0);
      const newCreatureCount = state.creaturesCastThisTurn + (isCreatureSpell ? 1 : 0);
      const userPlayerId = state.players.find(p => p.isUser)?.id;
      const castCtx: ReminderContext = {
        ...buildBaseContext(state, spell.playerId),
        spellType: spell.type, spellSupertype: spell.supertype,
        spellSubtype: spell.subtype, spellAbilities: spell.abilities,
        spellPower: spell.power, spellToughness: spell.toughness,
        spellManaValue: spell.manaValue, isToken,
        isMyTurn: state.isMyTurn, currentPhase,
        castByIsUser: spell.playerId === userPlayerId,
        spellsCastThisTurn: newSpellCount,
        creaturesCastThisTurn: newCreatureCount,
      };
      const firedR = getMatchingEventReminders(state.reminders, trigEvents, currentPhase, state.isMyTurn, castCtx);
      const updatedReminders = recordEventReminderFires(state.reminders, firedR);
      const newInstances: ReminderFireInstance[] = firedR.map(r => ({ id: `fire-${r.id}-${Date.now()}-${Math.random()}`, reminderId: r.id, firedPhase: currentPhase, firedTurn: state.turnNumber, triggeredByUser: state.isMyTurn }));
      const updatedHistory = spell.type === "Land" ? state.history : [...state.history, entry];
      return { ...state, spellLog: [...state.spellLog, spell], spellsCastThisTurn: newSpellCount, creaturesCastThisTurn: newCreatureCount, reminders: updatedReminders, pendingReminderFires: [...state.pendingReminderFires, ...newInstances], history: updatedHistory, eventOwnerPlayerId: null };
    }
    case "CAST_AS_COMMANDER": {
      const ownerPlayerId = action.spellData.playerId ?? state.eventOwnerPlayerId ?? state.turnOrder[state.currentPlayerIndex];
      const spellId = `spell-${Date.now()}-${Math.random()}`;
      const commanderId = `commander-${spellId}`;
      const spell: CastSpell = {
        ...action.spellData,
        id: spellId,
        turnNumber: state.turnNumber,
        phase: PHASES[state.phaseIndex],
        zone: "commandZone",
        playerId: ownerPlayerId,
        isCommander: true,
        commanderId,
        commanderOwnerPlayerId: ownerPlayerId,
      };
      const commanderRecord = {
        id: commanderId,
        ownerPlayerId,
        name: spell.name,
        manaValue: spell.manaValue,
        manaCost: spell.manaCost,
        type: spell.type,
        power: spell.power,
        toughness: spell.toughness,
        abilities: spell.abilities,
        supertype: spell.supertype,
        subtype: spell.subtype,
        subtype2: spell.subtype2,
        currentZone: "commandZone" as const,
        spellId: spell.id,
        timesCastFromCommandZone: 0,
      };
      const entry = logEntry(state, `★ ${spell.name} set as commander.`, ownerPlayerId);
      return { ...state, spellLog: [...state.spellLog, spell], commanders: [...state.commanders, commanderRecord], history: [...state.history, entry], eventOwnerPlayerId: null };
    }
    case "LOG": { const entry = logEntry(state, action.message, action.playerId); return { ...state, history: [...state.history, entry], eventOwnerPlayerId: null }; }
    case "LOG_EVENT": { const entry = logEntry(state, `[${action.eventType}] ${action.detail}`, action.playerId); return { ...state, history: [...state.history, entry], eventOwnerPlayerId: null }; }
    case "SET_EVENT_OWNER": return { ...state, eventOwnerPlayerId: action.playerId };
    case "RESET_EVENT_OWNER": return { ...state, eventOwnerPlayerId: null };
    case "MARK_AS_COMMANDER": {
      const sp = state.spellLog.find(x => x.id === action.spellId);
      if (!sp) return state;
      if (sp.zone !== "active") return state;
      const isCreatureLike = sp.type === "Creature" || (sp.isToken && sp.tokenCategory === "creature");
      if (!isCreatureLike || !sp.playerId) return state;
      const ownerPlayerId = sp.playerId;
      const initialCommanderId = sp.commanderId ?? `commander-${sp.id}`;
      const existingRecord = state.commanders.find(c => c.id === initialCommanderId || c.spellId === sp.id);
      const commanderId = existingRecord?.id ?? initialCommanderId;
      const commanderRecord = {
        id: commanderId,
        ownerPlayerId,
        name: sp.name,
        manaValue: sp.manaValue,
        manaCost: sp.manaCost,
        type: sp.type,
        power: sp.power,
        toughness: sp.toughness,
        abilities: sp.abilities,
        supertype: sp.supertype,
        subtype: sp.subtype,
        subtype2: sp.subtype2,
        currentZone: "battlefield" as const,
        spellId: sp.id,
        timesCastFromCommandZone: existingRecord?.timesCastFromCommandZone ?? 0,
      };
      const commanders = existingRecord
        ? state.commanders.map(c => c.id === existingRecord.id ? commanderRecord : c)
        : [...state.commanders, commanderRecord];
      const spellLog = state.spellLog.map(x => x.id === sp.id ? { ...x, isCommander: true, commanderId: commanderRecord.id, commanderOwnerPlayerId: ownerPlayerId } : x);
      const entry = logEntry(state, `${sp.name} marked as commander.`, ownerPlayerId);
      return { ...state, spellLog, commanders, history: [...state.history, entry] };
    }
    case "UNMARK_AS_COMMANDER": {
      const sp = state.spellLog.find(x => x.id === action.spellId);
      const commanderId = sp?.commanderId ?? state.commanders.find(c => c.spellId === action.spellId)?.id;
      if (!sp || !commanderId) return state;
      const spellLog = state.spellLog.map(x => x.id === action.spellId ? { ...x, isCommander: false, commanderId: undefined, commanderOwnerPlayerId: undefined } : x);
      const hasCommanderDamage = Object.values(state.commanderDamage).some(damageByCommander => (damageByCommander[commanderId] ?? 0) > 0);
      const commanders = hasCommanderDamage
        ? state.commanders.map(c => c.id === commanderId ? { ...c, currentZone: c.currentZone === "battlefield" ? "commandZone" as const : c.currentZone, spellId: undefined } : c)
        : state.commanders.filter(c => c.id !== commanderId);
      const entry = logEntry(state, `${sp.name} unmarked as commander.`, sp.playerId);
      return { ...state, spellLog, commanders, history: [...state.history, entry] };
    }
    case "APPLY_COMMANDER_DAMAGE": {
      if (action.amount <= 0) return state;
      const amount = action.amount;
      const commander = state.commanders.find(c => c.id === action.commanderId);
      const defender = state.players.find(p => p.id === action.defendingPlayerId);
      if (!commander || !defender) return state;
      if (commander.ownerPlayerId === action.defendingPlayerId) return state;
      const oldDamage = state.commanderDamage[action.defendingPlayerId]?.[action.commanderId] ?? 0;
      const newDamage = oldDamage + amount;
      const players = updatePlayerLife(state.players, action.defendingPlayerId, life => life - amount);
      const commanderDamage = {
        ...state.commanderDamage,
        [action.defendingPlayerId]: {
          ...(state.commanderDamage[action.defendingPlayerId] ?? {}),
          [action.commanderId]: newDamage,
        },
      };
      const entries = [
        logEntry(state, `${defender.name} took ${amount} commander damage from ${commander.name} (${newDamage}/21).`, action.defendingPlayerId),
      ];
      if (oldDamage < 21 && newDamage >= 21) {
        entries.push(logEntry(state, `⚠ ${defender.name} has lethal commander damage from ${commander.name}.`, action.defendingPlayerId));
      }
      return { ...state, players, commanderDamage, history: [...state.history, ...entries] };
    }
    case "SET_COMMANDER_DAMAGE": {
      const amount = Math.max(0, action.amount);
      const commander = state.commanders.find(c => c.id === action.commanderId);
      const defender = state.players.find(p => p.id === action.defendingPlayerId);
      if (!commander || !defender) return state;
      const commanderDamage = {
        ...state.commanderDamage,
        [action.defendingPlayerId]: {
          ...(state.commanderDamage[action.defendingPlayerId] ?? {}),
          [action.commanderId]: amount,
        },
      };
      const entries = [
        logEntry(state, `${defender.name} commander damage from ${commander.name} corrected to ${amount}/21.`, action.defendingPlayerId),
      ];
      if (amount >= 21) {
        entries.push(logEntry(state, `⚠ ${defender.name} has lethal commander damage from ${commander.name}.`, action.defendingPlayerId));
      }
      return { ...state, commanderDamage, history: [...state.history, ...entries] };
    }
    case "MOVE_COMMANDER_TO_COMMAND_ZONE": {
      const sp = state.spellLog.find(x => x.id === action.spellId);
      if (!sp || !sp.isCommander || !sp.commanderId) return state;
      const commander = state.commanders.find(c => c.id === sp.commanderId);
      if (!commander) return state;
      const commanders = state.commanders.map(c => c.id === commander.id ? {
        ...c,
        name: sp.name,
        manaValue: sp.manaValue,
        manaCost: sp.manaCost,
        type: sp.type,
        power: sp.power,
        toughness: sp.toughness,
        abilities: sp.abilities,
        supertype: sp.supertype,
        subtype: sp.subtype,
        subtype2: sp.subtype2,
        currentZone: "commandZone" as const,
        spellId: undefined,
      } : c);
      const spellLog = state.spellLog.map(x => x.id === action.spellId ? { ...x, zone: "commandZone" as const, attacking: false, defendingPlayerId: undefined, blockedByIds: [], blockingId: null } : x);
      const finalReminders = deactivateRemindersForSpell(state.reminders, action.spellId);
      const entry = logEntry(state, `${sp.name} moved to command zone.`, commander.ownerPlayerId);
      return { ...state, spellLog, commanders, reminders: finalReminders, history: [...state.history, entry] };
    }
    case "CAST_COMMANDER_FROM_COMMAND_ZONE": {
      const commander = state.commanders.find(c => c.id === action.commanderId);
      if (!commander) return state;
      const activeCommanderSpell = state.spellLog.find(x => x.zone === "active" && x.isCommander && x.commanderId === commander.id);
      if (activeCommanderSpell) return state;
      const currentTax = Math.max(0, commander.timesCastFromCommandZone) * 2;
      const spellId = `spell-${Date.now()}-${Math.random()}`;
      const commanderSpell: CastSpell = {
        id: spellId,
        name: commander.name,
        type: commander.type ?? "Creature",
        supertype: commander.supertype,
        subtype: commander.subtype,
        subtype2: commander.subtype2,
        power: commander.power,
        toughness: commander.toughness,
        manaValue: commander.manaValue,
        manaCost: commander.manaCost,
        abilities: commander.abilities,
        turnNumber: state.turnNumber,
        phase: PHASES[state.phaseIndex],
        zone: "active",
        isToken: false,
        playerId: commander.ownerPlayerId,
        isCommander: true,
        commanderId: commander.id,
        commanderOwnerPlayerId: commander.ownerPlayerId,
      };
      const spellLog = [...state.spellLog, commanderSpell];
      const commanders = state.commanders.map(c => c.id === commander.id
        ? { ...c, currentZone: "battlefield" as const, spellId, timesCastFromCommandZone: c.timesCastFromCommandZone + 1 }
        : c);
      const commanderManaValue = getManaCostValue(commander.manaCost, commander.manaValue);
      const mvText = commanderManaValue === undefined ? " Mana value unknown." : ` Mana value ${commanderManaValue}.`;
      const entry = logEntry(state, `${commander.name} cast from command zone. Commander tax for this cast was +${currentTax}.${mvText}`, commander.ownerPlayerId);
      return { ...state, spellLog, commanders, history: [...state.history, entry] };
    }
    case "DELETE_SPELL": return { ...state, spellLog: state.spellLog.filter(x => x.id !== action.id) };
    case "EDIT_SPELL": {
      const sp = state.spellLog.find(x => x.id === action.id);
      if (!sp) return state;
      const updated = { ...sp, ...action.updates } as CastSpell;
      const entry = logEntry(state, `✎ Edited: ${updated.name} (${updated.type})`);
      const commanders = updated.isCommander && updated.commanderId
        ? state.commanders.map(c => c.id === updated.commanderId ? {
            ...c,
            name: updated.name,
            manaValue: updated.manaValue,
            manaCost: updated.manaCost,
            type: updated.type,
            power: updated.power,
            toughness: updated.toughness,
            abilities: updated.abilities,
            supertype: updated.supertype,
            subtype: updated.subtype,
            subtype2: updated.subtype2,
          } : c)
        : state.commanders;
      return {
        ...state,
        spellLog: state.spellLog.map(x => x.id === action.id ? updated : x),
        commanders,
        history: [...state.history, entry],
      };
    }
    case "END_OPPONENT_TURN":
    case "END_MY_TURN":
      return advanceToNextPlayer(state);
    case "ADD_CARDS_DRAWN": {
      const drawEvents = ["Card is drawn"];
      const currentPhase = PHASES[state.phaseIndex];
      const firedR = getMatchingEventReminders(state.reminders, drawEvents, currentPhase, state.isMyTurn);
      const updatedReminders = recordEventReminderFires(state.reminders, firedR);
      const newInstances: ReminderFireInstance[] = firedR.map(r => ({ id: `fire-${r.id}-${Date.now()}-${Math.random()}`, reminderId: r.id, firedPhase: currentPhase, firedTurn: state.turnNumber, triggeredByUser: state.isMyTurn }));
      return { ...state, cardsDrawn: state.cardsDrawn + action.amount, reminders: updatedReminders, pendingReminderFires: [...state.pendingReminderFires, ...newInstances] };
    }
    case "ADD_LAND": {
      const landEvents = ["Land is played", "Basic land enters"];
      const currentPhase = PHASES[state.phaseIndex];
      const firedR = getMatchingEventReminders(state.reminders, landEvents, currentPhase, state.isMyTurn);
      const updatedReminders = recordEventReminderFires(state.reminders, firedR);
      const newInstances: ReminderFireInstance[] = firedR.map(r => ({ id: `fire-${r.id}-${Date.now()}-${Math.random()}`, reminderId: r.id, firedPhase: currentPhase, firedTurn: state.turnNumber, triggeredByUser: state.isMyTurn }));
      return { ...state, landsPlayed: state.landsPlayed + 1, reminders: updatedReminders, pendingReminderFires: [...state.pendingReminderFires, ...newInstances] };
    }
    case "MOVE_TO_GY": {
      const sp = state.spellLog.find(x => x.id === action.spellId);
      if (!sp) return state;
      const gyEntry: GraveyardEntry = {
        id: `gy-${Date.now()}`,
        name: sp.name,
        type: sp.type,
        turnNumber: state.turnNumber,
        phase: PHASES[state.phaseIndex],
        timestamp: Date.now(),
        source: action.source,
        playerId: sp.playerId,
        spellId: sp.id,
        supertype: sp.supertype,
        subtype: sp.subtype,
        subtype2: sp.subtype2,
        isToken: sp.isToken,
        tokenCategory: sp.tokenCategory,
        isCommander: sp.isCommander,
        commanderId: sp.commanderId,
        commanderOwnerPlayerId: sp.commanderOwnerPlayerId,
        power: sp.power,
        toughness: sp.toughness,
        manaValue: sp.manaValue,
        manaCost: sp.manaCost,
        abilities: sp.abilities,
      };
      const entry = logEntry(state, `☠ ${sp.name} → graveyard (${action.source})`);
      const gyEvents = action.source === "died"
        ? (sp.type === "Creature" ? ["Creature dies", "Creature enters your graveyard", "Card enters your graveyard"] : ["Card enters your graveyard"])
        : action.source === "sacrificed"
        ? ["Creature is sacrificed", "Card enters your graveyard"]
        : ["Card enters your graveyard"];
      const currentPhase = PHASES[state.phaseIndex];
      const gyCtx: ReminderContext = {
        ...buildBaseContext(state, sp.playerId),
        graveyardSize: state.graveyard.filter(g => g.playerId === sp.playerId && !g.isToken).length + 1,
        isMyTurn: state.isMyTurn, currentPhase,
      };
      const firedR = getMatchingEventReminders(state.reminders, gyEvents, currentPhase, state.isMyTurn, gyCtx);
      const firedUpdated = recordEventReminderFires(state.reminders, firedR);
      const finalReminders = deactivateRemindersForSpell(firedUpdated, action.spellId);
      const newInstances: ReminderFireInstance[] = firedR.map(r => ({ id: `fire-${r.id}-${Date.now()}-${Math.random()}`, reminderId: r.id, firedPhase: currentPhase, firedTurn: state.turnNumber, triggeredByUser: state.isMyTurn }));
      const commanders = state.commanders.map(c => c.spellId === action.spellId || c.id === sp.commanderId ? { ...c, currentZone: "graveyard" as const, spellId: action.spellId } : c);
      return {
        ...state,
        spellLog: state.spellLog.map(x => x.id === action.spellId ? { ...x, zone: "graveyard" as const } : x),
        graveyard: [...state.graveyard, gyEntry],
        commanders,
        reminders: finalReminders,
        pendingReminderFires: [...state.pendingReminderFires, ...newInstances],
        history: [...state.history, entry],
      };
    }
    case "MOVE_TO_EXILE": {
      const sp = state.spellLog.find(x => x.id === action.spellId);
      if (!sp) return state;
      const exEntry: ExileEntry = {
        id: `ex-${Date.now()}`,
        name: sp.name,
        type: sp.type,
        turnNumber: state.turnNumber,
        phase: PHASES[state.phaseIndex],
        timestamp: Date.now(),
        playerId: sp.playerId,
        spellId: sp.id,
        supertype: sp.supertype,
        subtype: sp.subtype,
        subtype2: sp.subtype2,
        isToken: sp.isToken,
        tokenCategory: sp.tokenCategory,
        isCommander: sp.isCommander,
        commanderId: sp.commanderId,
        commanderOwnerPlayerId: sp.commanderOwnerPlayerId,
        power: sp.power,
        toughness: sp.toughness,
        manaValue: sp.manaValue,
        manaCost: sp.manaCost,
        abilities: sp.abilities,
      };
      const entry = logEntry(state, `↗ ${sp.name} → exile`);
      const finalReminders = deactivateRemindersForSpell(state.reminders, action.spellId);
      const commanders = state.commanders.map(c => c.spellId === action.spellId || c.id === sp.commanderId ? { ...c, currentZone: "exile" as const, spellId: action.spellId } : c);
      return {
        ...state,
        spellLog: state.spellLog.map(x => x.id === action.spellId ? { ...x, zone: "exile" as const } : x),
        exile: [...state.exile, exEntry],
        commanders,
        reminders: finalReminders,
        history: [...state.history, entry],
      };
    }
    case "RETURN_FROM_GY": {
      const gy = state.graveyard.find(x => x.id === action.gyEntryId);
      if (!gy) return state;
      const commander = gy.commanderId
        ? state.commanders.find(c => c.id === gy.commanderId)
        : state.commanders.find(c => (gy.spellId && c.spellId === gy.spellId) || (gy.isCommander && c.name === gy.name));
      const returnedId = `spell-${Date.now()}-${Math.random()}`;
      const returned: CastSpell = {
        id: returnedId,
        name: gy.name,
        type: gy.type,
        supertype: gy.supertype,
        subtype: gy.subtype,
        subtype2: gy.subtype2,
        turnNumber: state.turnNumber,
        phase: PHASES[state.phaseIndex],
        zone: "active",
        isToken: gy.isToken ?? false,
        tokenCategory: gy.tokenCategory,
        playerId: gy.playerId,
        isCommander: gy.isCommander ?? !!commander,
        commanderId: gy.commanderId ?? commander?.id,
        commanderOwnerPlayerId: gy.commanderOwnerPlayerId ?? commander?.ownerPlayerId,
        power: gy.power,
        toughness: gy.toughness,
        manaValue: gy.manaValue,
        manaCost: gy.manaCost,
        abilities: gy.abilities,
      };
      const entry = logEntry(state, `↩ Returned to battlefield: ${gy.name}`);
      const commanders = returned.commanderId
        ? state.commanders.map(c => c.id === returned.commanderId ? { ...c, currentZone: "battlefield" as const, spellId: returnedId } : c)
        : state.commanders;
      return { ...state, graveyard: state.graveyard.filter(x => x.id !== action.gyEntryId), spellLog: [...state.spellLog, returned], commanders, history: [...state.history, entry] };
    }
    case "RETURN_FROM_EXILE": {
      const ex = state.exile.find(x => x.id === action.exileEntryId);
      if (!ex) return state;
      const commander = ex.commanderId
        ? state.commanders.find(c => c.id === ex.commanderId)
        : state.commanders.find(c => (ex.spellId && c.spellId === ex.spellId) || (ex.isCommander && c.name === ex.name));
      const returnedId = `spell-${Date.now()}-${Math.random()}`;
      const returned: CastSpell = {
        id: returnedId,
        name: ex.name,
        type: ex.type,
        supertype: ex.supertype,
        subtype: ex.subtype,
        subtype2: ex.subtype2,
        turnNumber: state.turnNumber,
        phase: PHASES[state.phaseIndex],
        zone: "active",
        isToken: ex.isToken ?? false,
        tokenCategory: ex.tokenCategory,
        playerId: ex.playerId,
        isCommander: ex.isCommander ?? !!commander,
        commanderId: ex.commanderId ?? commander?.id,
        commanderOwnerPlayerId: ex.commanderOwnerPlayerId ?? commander?.ownerPlayerId,
        power: ex.power,
        toughness: ex.toughness,
        manaValue: ex.manaValue,
        manaCost: ex.manaCost,
        abilities: ex.abilities,
      };
      const entry = logEntry(state, `↩ Returned from exile: ${ex.name}`);
      const commanders = returned.commanderId
        ? state.commanders.map(c => c.id === returned.commanderId ? { ...c, currentZone: "battlefield" as const, spellId: returnedId } : c)
        : state.commanders;
      return { ...state, exile: state.exile.filter(x => x.id !== action.exileEntryId), spellLog: [...state.spellLog, returned], commanders, history: [...state.history, entry] };
    }
    case "MOVE_GY_COMMANDER_TO_COMMAND_ZONE": {
      const gy = state.graveyard.find(x => x.id === action.gyEntryId);
      if (!gy) return state;
      const commander = gy.commanderId
        ? state.commanders.find(c => c.id === gy.commanderId)
        : state.commanders.find(c => (gy.spellId && c.spellId === gy.spellId) || (gy.isCommander && c.name === gy.name));
      if (!commander) return state;
      const commanders = state.commanders.map(c => c.id === commander.id ? { ...c, currentZone: "commandZone" as const, spellId: undefined } : c);
      const spellLog = state.spellLog.map(x => ((gy.spellId && x.id === gy.spellId) || (!gy.spellId && x.commanderId === commander.id && x.zone === "graveyard"))
        ? { ...x, zone: "commandZone" as const, attacking: false, defendingPlayerId: undefined, blockedByIds: [], blockingId: null }
        : x);
      const entry = logEntry(state, `${commander.name} moved to command zone.`, commander.ownerPlayerId);
      return { ...state, graveyard: state.graveyard.filter(x => x.id !== action.gyEntryId), spellLog, commanders, history: [...state.history, entry] };
    }
    case "MOVE_EXILE_COMMANDER_TO_COMMAND_ZONE": {
      const ex = state.exile.find(x => x.id === action.exileEntryId);
      if (!ex) return state;
      const commander = ex.commanderId
        ? state.commanders.find(c => c.id === ex.commanderId)
        : state.commanders.find(c => (ex.spellId && c.spellId === ex.spellId) || (ex.isCommander && c.name === ex.name));
      if (!commander) return state;
      const commanders = state.commanders.map(c => c.id === commander.id ? { ...c, currentZone: "commandZone" as const, spellId: undefined } : c);
      const spellLog = state.spellLog.map(x => ((ex.spellId && x.id === ex.spellId) || (!ex.spellId && x.commanderId === commander.id && x.zone === "exile"))
        ? { ...x, zone: "commandZone" as const, attacking: false, defendingPlayerId: undefined, blockedByIds: [], blockingId: null }
        : x);
      const entry = logEntry(state, `${commander.name} moved to command zone.`, commander.ownerPlayerId);
      return { ...state, exile: state.exile.filter(x => x.id !== action.exileEntryId), spellLog, commanders, history: [...state.history, entry] };
    }
    case "DELETE_FROM_GY": return { ...state, graveyard: state.graveyard.filter(x => x.id !== action.gyEntryId) };
    case "DELETE_FROM_EXILE": return { ...state, exile: state.exile.filter(x => x.id !== action.exileEntryId) };
    case "ADD_TOKEN_TO_GY": return { ...state, tokenGY: [...state.tokenGY, action.entry] };
    case "ADD_AUTO_MANA": return { ...state, manaPool: { ...state.manaPool, [action.color]: { ...state.manaPool[action.color], auto: state.manaPool[action.color].auto + action.amount } } };
    case "ADD_MANUAL_MANA": return { ...state, manaPool: { ...state.manaPool, [action.color]: { ...state.manaPool[action.color], manual: state.manaPool[action.color].manual + action.amount } } };
    case "SUBTRACT_MANUAL_MANA": return { ...state, manaPool: { ...state.manaPool, [action.color]: { ...state.manaPool[action.color], manual: Math.max(0, state.manaPool[action.color].manual - action.amount) } } };
    case "RESET_MANUAL_MANA": return { ...state, manaPool: Object.fromEntries(Object.entries(state.manaPool).map(([k, v]) => [k, { ...v, manual: 0 }])) as ManaPool };
    case "RESET_AUTO_MANA": return { ...state, manaPool: Object.fromEntries(Object.entries(state.manaPool).map(([k, v]) => [k, { ...v, auto: 0 }])) as ManaPool };
    case "UPDATE_LOYALTY": {
      return {
        ...state,
        spellLog: state.spellLog.map(x =>
          x.id === action.id
            ? { ...x, currentLoyalty: Math.max(0, (x.currentLoyalty ?? x.startingLoyalty ?? 0) + action.delta) }
            : x
        ),
      };
    }
    case "UPDATE_DEFENSE": {
      return {
        ...state,
        spellLog: state.spellLog.map(x =>
          x.id === action.id
            ? { ...x, currentDefense: Math.max(0, (x.currentDefense ?? x.startingDefense ?? 0) + action.delta) }
            : x
        ),
      };
    }
    case "ADD_REMINDER": return { ...state, reminders: [...state.reminders, action.reminder] };
    case "EDIT_REMINDER": return { ...state, reminders: state.reminders.map(r => r.id === action.id ? { ...r, ...action.updates, id: r.id } : r) };
    case "DELETE_REMINDER": return { ...state, reminders: state.reminders.filter(r => r.id !== action.id) };
    case "TOGGLE_REMINDER": return { ...state, reminders: state.reminders.map(r => r.id === action.id ? { ...r, status: r.status === "inactive" ? "active" as const : "inactive" as const } : r) };
    case "FIRE_REMINDER_EVENT": {
      const currentPhase = PHASES[state.phaseIndex];
      const firedR = getMatchingEventReminders(state.reminders, action.events, currentPhase, state.isMyTurn, action.context);
      const updatedReminders = recordEventReminderFires(state.reminders, firedR);
      const newInstances: ReminderFireInstance[] = firedR.map(r => ({ id: `fire-${r.id}-${Date.now()}-${Math.random()}`, reminderId: r.id, firedPhase: currentPhase, firedTurn: state.turnNumber, triggeredByUser: state.isMyTurn }));
      return { ...state, reminders: updatedReminders, pendingReminderFires: [...state.pendingReminderFires, ...newInstances] };
    }
    case "RESOLVE_REMINDER_FIRE": {
      const fire = state.pendingReminderFires.find(x => x.id === action.fireId);
      if (!fire) return state;
      const r = state.reminders.find(x => x.id === fire.reminderId);
      if (!r) return state;
      const myPlayerId = state.players.find(p => p.isUser)?.id;
      const entryMsg = (fire.triggeredByUser || reminderHasLifeEffect(r))
        ? `✓ ${r.name}: resolved`
        : `📋 ${r.name}: noted (opponent's action — no effect applied to your stats)`;
      const entry = logEntry(state, entryMsg, myPlayerId);
      if (!fire.triggeredByUser) {
        return { ...state, pendingReminderFires: state.pendingReminderFires.filter(x => x.id !== action.fireId), history: [...state.history, entry] };
      }
      const result = applyImmediateEffects(r);
      let players = state.players;
      let cardsDrawn = state.cardsDrawn + (result.cardsDrawnDelta ?? 0);
      let landsPlayed = state.landsPlayed + (result.landsPlayedDelta ?? 0);
      let manaPool = { ...state.manaPool };
      let spellLog = state.spellLog;
      ({ manaPool, spellLog } = applyReminderManaAndLandEffects(state, result, manaPool, spellLog));
      const histEntries = [entry];
      if (result.logMessage) histEntries.push(logEntry(state, result.logMessage, myPlayerId));
      return { ...state, players, cardsDrawn, landsPlayed, spellLog, manaPool, pendingReminderFires: state.pendingReminderFires.filter(x => x.id !== action.fireId), history: [...state.history, ...histEntries] };
    }
    case "PARK_REMINDER_FIRE": {
      const fire = state.pendingReminderFires.find(x => x.id === action.fireId);
      if (!fire) return state;
      const r = state.reminders.find(x => x.id === fire.reminderId);
      if (!r) return state;
      const parkedReminder: Reminder = {
        id: `parked-${fire.id}-${Date.now()}`,
        name: `⏸ Parked: ${r.name}`,
        description: r.description,
        fireMode: "phase",
        phases: [],
        activePhases: [],
        activeDuring: "both",
        frequency: r.frequency,
        conditions: r.conditions ?? [],
        effects: r.effects ?? [],
        status: "skipped",
        sourceLabel: r.sourceLabel ?? "Reminder",
        firedCount: 0,
        firedThisTurn: false,
      };
      const entry = logEntry(state, `⏸ Parked reminder fire: ${r.name}`);
      return {
        ...state,
        pendingReminderFires: state.pendingReminderFires.filter(x => x.id !== action.fireId),
        reminders: [...state.reminders, parkedReminder],
        history: [...state.history, entry],
      };
    }
    case "CLEAR_PENDING_REMINDER_FIRES": return { ...state, pendingReminderFires: [] };
    case "RESET_REMINDER_TURN_FLAGS": return { ...state, reminders: resetEventReminderTurnFlags(state.reminders) };
    case "SET_MONARCH":          return { ...state, isMonarch: action.value };
    case "SET_INITIATIVE":       return { ...state, hasInitiative: action.value };
    case "SET_CITY_BLESSING":    return { ...state, hasCityBlessing: action.value };
    case "CHANGE_COUNTER": {
      const players = state.players.map(p => {
        if (p.id !== action.playerId) return p;
        const current = (p.counters?.[action.counterKey] ?? 0);
        return { ...p, counters: { ...(p.counters ?? {}), [action.counterKey]: Math.max(0, current + action.delta) } };
      });
      return { ...state, players };
    }
    case "CHANGE_CARDS_IN_HAND": return { ...state, cardsInHand: Math.max(0, state.cardsInHand + action.delta) };
    case "TOGGLE_TAPPED": {
      const sp = state.spellLog.find(x => x.id === action.spellId);
      if (!sp) return state;
      const newTapped = !sp.tapped;
      const spellLog = state.spellLog.map(x => x.id === action.spellId ? { ...x, tapped: newTapped } : x);
      const entry = logEntry(state, `${sp.name} becomes ${newTapped ? "tapped" : "untapped"}`, sp.playerId);
      const { reminders, pendingReminderFires } = fireMatchingEvents(state, state.reminders, state.pendingReminderFires, [newTapped ? "Creature becomes tapped" : "Creature becomes untapped"]);
      return { ...state, spellLog, reminders, pendingReminderFires, history: [...state.history, entry] };
    }
    case "DECLARE_ATTACKER": {
      const sp = state.spellLog.find(x => x.id === action.spellId);
      if (!sp) return state;
      const wasTapped = !!sp.tapped;
      const willTap = !hasAbility(sp, "vigilance");
      const defendingPlayerId = action.defendingPlayerId ?? state.players.find(p => p.id !== sp.playerId)?.id;
      const defender = state.players.find(p => p.id === defendingPlayerId);
      const spellLog = state.spellLog.map(x => x.id === action.spellId ? { ...x, tapped: willTap ? true : x.tapped, attacking: true, defendingPlayerId, blockingId: null, blockedByIds: x.blockedByIds ?? [] } : x);
      const entry = logEntry(state, `⚔ ${sp.name} attacks${defender ? ` ${defender.name}` : ""}${willTap ? "" : " (vigilance)"}`, sp.playerId);
      const events = (willTap && !wasTapped) ? ["Creature becomes tapped"] : [];
      const { reminders, pendingReminderFires } = fireMatchingEvents(state, state.reminders, state.pendingReminderFires, events);
      return { ...state, spellLog, reminders, pendingReminderFires, history: [...state.history, entry] };
    }
    case "REMOVE_FROM_COMBAT": {
      const sp = state.spellLog.find(x => x.id === action.spellId);
      if (!sp) return state;
      const blockerIds = sp.blockedByIds ?? [];
      const attackerIds = sp.blockingId ? [sp.blockingId] : [];
      const spellLog = state.spellLog.map(x => {
        if (x.id === action.spellId) return { ...x, attacking: false, defendingPlayerId: undefined, blockedByIds: [], blockingId: null };
        if (blockerIds.includes(x.id)) return { ...x, blockingId: null };
        if (attackerIds.includes(x.id)) return { ...x, blockedByIds: (x.blockedByIds ?? []).filter(id => id !== action.spellId) };
        return x;
      });
      const entry = logEntry(state, `${sp.name} removed from combat`, sp.playerId);
      return { ...state, spellLog, history: [...state.history, entry] };
    }
    case "ASSIGN_BLOCKER": {
      const blocker = state.spellLog.find(x => x.id === action.blockerId);
      const attacker = state.spellLog.find(x => x.id === action.attackerId);
      if (!blocker || !attacker) return state;
      if (!attacker.attacking) return state;
      if (blocker.zone !== "active") return state;
      const isCreature = blocker.type === "Creature" || (blocker.isToken && blocker.tokenCategory === "creature");
      if (!isCreature) return state;
      if (attacker.defendingPlayerId && blocker.playerId && attacker.defendingPlayerId !== blocker.playerId) return state;
      const prevAttackerId = blocker.blockingId;
      const spellLog = state.spellLog.map(x => {
        if (x.id === action.blockerId) return { ...x, blockingId: action.attackerId };
        if (x.id === action.attackerId) return { ...x, blockedByIds: [...new Set([...(x.blockedByIds ?? []), action.blockerId])] };
        if (prevAttackerId && x.id === prevAttackerId) return { ...x, blockedByIds: (x.blockedByIds ?? []).filter(id => id !== action.blockerId) };
        return x;
      });
      const entry = logEntry(state, `🛡 Block declared: ${blocker.name} blocks ${attacker.name}`, blocker.playerId);
      return { ...state, spellLog, history: [...state.history, entry] };
    }
    case "REMOVE_BLOCKER": {
      const blocker = state.spellLog.find(x => x.id === action.blockerId);
      if (!blocker || !blocker.blockingId) return state;
      const attackerId = blocker.blockingId;
      const spellLog = state.spellLog.map(x => {
        if (x.id === action.blockerId) return { ...x, blockingId: null };
        if (x.id === attackerId) return { ...x, blockedByIds: (x.blockedByIds ?? []).filter(id => id !== action.blockerId) };
        return x;
      });
      const entry = logEntry(state, `Block removed: ${blocker.name}`, blocker.playerId);
      return { ...state, spellLog, history: [...state.history, entry] };
    }
    case "CLEAR_COMBAT": {
      const spellLog = state.spellLog.map(x => x.zone !== "active" ? x : { ...x, attacking: false, defendingPlayerId: undefined, blockedByIds: [], blockingId: null });
      const entry = logEntry(state, "Combat cleared");
      return { ...state, spellLog, history: [...state.history, entry] };
    }
    case "RESOLVE_COMBAT": {
      // Apply player-confirmed values. No recompute here — the panel already did the math and the player edited/approved it.
      let players = state.players;
      const histEntries: HistoryEntry[] = [];
      for (const lc of action.lifeChanges) {
        if (lc.delta === 0) continue;
        players = updatePlayerLife(players, lc.playerId, life => life + lc.delta);
        const pl = players.find(p => p.id === lc.playerId);
        const sign = lc.delta > 0 ? "+" : "";
        histEntries.push(logEntry(state, `${pl?.name ?? lc.playerId}: Life ${sign}${lc.delta} (combat)`, lc.playerId));
      }

      let spellLog = state.spellLog;
      let graveyard = state.graveyard;
      let tokenGY = state.tokenGY;
      let commanders = state.commanders;
      let reminders = state.reminders;
      let pendingReminderFires = state.pendingReminderFires;
      const currentPhase = PHASES[state.phaseIndex];

      for (const deadId of action.deadSpellIds) {
        const sp = spellLog.find(x => x.id === deadId);
        if (!sp) continue;
        const isCreatureToken = sp.isToken && sp.tokenCategory === "creature";
        if (isCreatureToken) {
          tokenGY = [...tokenGY, {
            id: `tgy-${Date.now()}-${Math.random()}`,
            name: sp.name, tokenCategory: "creature", action: "died",
            turnNumber: state.turnNumber, phase: currentPhase, timestamp: Date.now(), playerId: sp.playerId,
          }];
          spellLog = spellLog.filter(x => x.id !== deadId);
          const fired = fireMatchingEvents({ ...state, spellLog }, reminders, pendingReminderFires, ["Token dies", "Creature dies"]);
          reminders = fired.reminders; pendingReminderFires = fired.pendingReminderFires;
        } else {
          graveyard = [...graveyard, {
            id: `gy-${Date.now()}-${Math.random()}`,
            name: sp.name, type: sp.type, turnNumber: state.turnNumber, phase: currentPhase, timestamp: Date.now(),
            source: "died", playerId: sp.playerId, spellId: sp.id,
            supertype: sp.supertype, subtype: sp.subtype, subtype2: sp.subtype2,
            isToken: sp.isToken, tokenCategory: sp.tokenCategory,
            isCommander: sp.isCommander, commanderId: sp.commanderId, commanderOwnerPlayerId: sp.commanderOwnerPlayerId,
            power: sp.power, toughness: sp.toughness, manaValue: sp.manaValue, manaCost: sp.manaCost, abilities: sp.abilities,
          }];
          spellLog = spellLog.map(x => x.id === deadId ? { ...x, zone: "graveyard" as const, attacking: false, defendingPlayerId: undefined, blockedByIds: [], blockingId: null } : x);
          if (sp.commanderId) {
            commanders = commanders.map(c => c.id === sp.commanderId ? { ...c, currentZone: "graveyard" as const, spellId: sp.id } : c);
          }
          const fired = fireMatchingEvents({ ...state, spellLog }, reminders, pendingReminderFires, ["Creature dies", "Creature enters your graveyard", "Card enters your graveyard"]);
          reminders = fired.reminders; pendingReminderFires = fired.pendingReminderFires;
        }
        histEntries.push(logEntry(state, `☠ ${sp.name} died (combat)`, sp.playerId));
      }

      // Clear combat flags on everything still on the battlefield
      spellLog = spellLog.map(x => x.zone === "active" ? { ...x, attacking: false, defendingPlayerId: undefined, blockedByIds: [], blockingId: null } : x);

      return {
        ...state, players,
        spellLog, graveyard, tokenGY, commanders, reminders, pendingReminderFires,
        history: [...state.history, ...histEntries],
      };
    }
    case "CHANGE_CREATURE_COUNTER": {
      const sp = state.spellLog.find(x => x.id === action.spellId);
      if (!sp) return state;
      if (sp.zone !== "active") return state;
      const isCreature = sp.type === "Creature" || (sp.isToken && sp.tokenCategory === "creature");
      if (!isCreature) return state;
      const current = sp.counters?.[action.counterType] ?? 0;
      const next = Math.max(0, current + action.delta);
      const counters = next === 0
        ? Object.fromEntries(Object.entries(sp.counters ?? {}).filter(([k]) => k !== action.counterType)) as typeof sp.counters
        : { ...sp.counters, [action.counterType]: next };
      const spellLog = state.spellLog.map(x => x.id === action.spellId ? { ...x, counters } : x);
      const sign = action.delta > 0 ? "+" : "";
      const entry = logEntry(state, `${sp.name}: ${action.counterType} counter ${sign}${action.delta}`, sp.playerId);
      return { ...state, spellLog, history: [...state.history, entry] };
    }
    case "RESOLVE_RESOURCE_TOKEN": {
      return resolveResourceToken(state, action, { phase: PHASES[state.phaseIndex] });
    }
    case "CREATURE_TOKEN_EXIT": {
      const sp = state.spellLog.find(x => x.id === action.spellId);
      if (!sp) return state;
      if (action.reason === "delete") {
        const entry = logEntry(state, `${sp.name} deleted.`, sp.playerId);
        return { ...state, spellLog: state.spellLog.filter(x => x.id !== action.spellId), history: [...state.history, entry] };
      }
      const currentPhase = PHASES[state.phaseIndex];
      const tgyEntry: TokenGYEntry = {
        id: `tgy-${Date.now()}-${Math.random()}`,
        name: sp.name,
        tokenCategory: "creature",
        action: action.reason,
        turnNumber: state.turnNumber,
        phase: currentPhase,
        timestamp: Date.now(),
        playerId: sp.playerId,
      };
      const logMsgs: Record<string, string> = { died: `${sp.name} died.`, sacrificed: `${sp.name} sacrificed.`, destroyed: `${sp.name} destroyed.` };
      const entry = logEntry(state, logMsgs[action.reason] ?? `${sp.name} ${action.reason}.`, sp.playerId);
      const exitEventsMap: Record<string, string[]> = {
        died: ["Token dies", "Creature dies"],
        sacrificed: ["Token is sacrificed", "Creature is sacrificed"],
        destroyed: ["Token dies", "Creature dies"],
      };
      const { reminders, pendingReminderFires } = fireMatchingEvents(state, state.reminders, state.pendingReminderFires, exitEventsMap[action.reason] ?? []);
      return { ...state, spellLog: state.spellLog.filter(x => x.id !== action.spellId), tokenGY: [...state.tokenGY, tgyEntry], reminders, pendingReminderFires, history: [...state.history, entry] };
    }
    default: return state;
  }
}
