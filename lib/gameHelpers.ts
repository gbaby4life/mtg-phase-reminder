import type { GameState, HistoryEntry, CastSpell, Player } from "./types";
import { ReminderContext } from "../System/reminderSystem";
import type { Reminder, ReminderFireInstance } from "../System/reminderSystem";
import { getMatchingEventReminders, recordEventReminderFires } from "../System/reminderSystem";
import { PHASES } from "./constants";

export function logEntry(state: GameState, message: string, playerId?: string): HistoryEntry {
  const pid = playerId ?? state.eventOwnerPlayerId ?? state.turnOrder[state.currentPlayerIndex] ?? "system";
  return { id: `h${Date.now()}${Math.random()}`, turnNumber: state.turnNumber, phase: PHASES[state.phaseIndex], message, timestamp: Date.now(), playerId: pid };
}

export function updatePlayerLife(players: Player[], playerId: string, updater: (life: number) => number): Player[] {
  return players.map(p => p.id === playerId ? { ...p, life: updater(p.life) } : p);
}

export function getActivePlayerId(state: GameState, fallbackPlayerId?: string): string {
  return fallbackPlayerId ?? state.eventOwnerPlayerId ?? state.turnOrder[state.currentPlayerIndex] ?? state.players[0]?.id ?? "p1";
}

export function fireMatchingEvents(state: GameState, reminders: Reminder[], pendingReminderFires: ReminderFireInstance[], events: string[]): { reminders: Reminder[]; pendingReminderFires: ReminderFireInstance[] } {
  if (events.length === 0) return { reminders, pendingReminderFires };
  const currentPhase = PHASES[state.phaseIndex];
  const firedR = getMatchingEventReminders(reminders, events, currentPhase, state.isMyTurn);
  const updatedReminders = recordEventReminderFires(reminders, firedR);
  const newInstances: ReminderFireInstance[] = firedR.map(fr => ({ id: `fire-${fr.id}-${Date.now()}-${Math.random()}`, reminderId: fr.id, firedPhase: currentPhase, firedTurn: state.turnNumber, triggeredByUser: state.isMyTurn }));
  return { reminders: updatedReminders, pendingReminderFires: [...pendingReminderFires, ...newInstances] };
}

export function reminderHasLifeEffect(r: Reminder): boolean {
  return r.effects.some(e => e.timing === "immediate" && (e.effectType === "gain-life" || e.effectType === "lose-life" || e.effectType === "pay-life"));
}

export function hasAbility(c: CastSpell, kw: string): boolean {
  return (c.abilities ?? []).some(a => a.toLowerCase().includes(kw.toLowerCase()));
}
export function combatPT(c: CastSpell): { power?: number; toughness?: number } {
  if (c.power === undefined || c.toughness === undefined) return {};
  const p = c.power, t = c.toughness, cx = c.counters ?? {};
  return {
    power: p + (cx["+1/+1"] ?? 0) + (cx["+1/+0"] ?? 0) - (cx["-1/-1"] ?? 0) - (cx["-1/-0"] ?? 0),
    toughness: t + (cx["+1/+1"] ?? 0) + (cx["+0/+1"] ?? 0) - (cx["-1/-1"] ?? 0) - (cx["-0/-1"] ?? 0),
  };
}

export function buildBaseContext(state: GameState, focusPlayerId?: string): Partial<ReminderContext> {
  const userPlayer = state.players.find(p => p.isUser);
  const userPlayerId = userPlayer?.id;
  const opponentPlayers = state.players.filter(p => !p.isUser);
  const currentTurnPlayerId = state.turnOrder[state.currentPlayerIndex];
  const focusedOpponentId = focusPlayerId && focusPlayerId !== userPlayerId
    ? focusPlayerId
    : currentTurnPlayerId !== userPlayerId
    ? currentTurnPlayerId
    : undefined;
  const focusedOpponent = opponentPlayers.find(p => p.id === focusedOpponentId);
  const userGY = state.graveyard.filter(g => g.playerId === userPlayerId && !g.isToken);
  const gyTypes = [...new Set(userGY.map(g => g.type))];
  const myCreatures = state.spellLog.filter(
    s => s.zone === "active" && s.playerId === userPlayerId &&
    (s.type === "Creature" || (s.isToken && s.tokenCategory === "creature"))
  );
  const oppCreatures = state.spellLog.filter(
    s => s.zone === "active" && s.playerId !== userPlayerId &&
    (s.type === "Creature" || (s.isToken && s.tokenCategory === "creature"))
  );
  const focusedOpponentCreatures = focusedOpponent
    ? oppCreatures.filter(s => s.playerId === focusedOpponent.id)
    : [];
  const maxOpponentCreatureCount = opponentPlayers.reduce((max, player) => {
    const count = oppCreatures.filter(s => s.playerId === player.id).length;
    return Math.max(max, count);
  }, 0);
  const lowestOpponentLife = opponentPlayers.length > 0
    ? Math.min(...opponentPlayers.map(p => p.life))
    : undefined;
  const hasPermanentCounter = state.spellLog.some(
    s => s.zone === "active" && s.counters &&
    Object.values(s.counters).some(v => (v ?? 0) > 0)
  );
  return {
    myLife: userPlayer?.life,
    opponentLife: focusedOpponent?.life ?? lowestOpponentLife,
    lifeGainedThisTurn: state.lifeGainedThisTurn,
    opponentLifeGainedThisTurn: state.opponentLifeGainedThisTurn,
    graveyardSize: userGY.length,
    graveyardCardTypes: gyTypes,
    isMonarch: state.isMonarch,
    hasInitiative: state.hasInitiative,
    hasCityBlessing: state.hasCityBlessing,
    poisonCounters: state.players.find(p => p.isUser)?.counters?.poison ?? 0,
    energyCounters: state.players.find(p => p.isUser)?.counters?.energy ?? 0,
    cardsInHand: state.cardsInHand,
    myCreatureCount: myCreatures.length,
    opponentCreatureCount: focusedOpponent ? focusedOpponentCreatures.length : maxOpponentCreatureCount,
    spellsCastThisTurn: state.spellsCastThisTurn,
    creaturesCastThisTurn: state.creaturesCastThisTurn,
    hasPermanentCounter,
  };
}
