import {
  Reminder, ReminderFireInstance,
  getMatchingEventReminders, recordEventReminderFires,
} from "./reminderSystem";
import type {
  GameState, Action, CastSpell, HistoryEntry, TokenGYEntry,
  ResourceTokenKind, ManaPool,
} from "../lib/types";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeLogEntry(state: GameState, phase: string, message: string, playerId?: string): HistoryEntry {
  const pid = playerId ?? state.eventOwnerPlayerId ?? state.turnOrder[state.currentPlayerIndex] ?? "system";
  return {
    id: `h${Date.now()}${Math.random()}`,
    turnNumber: state.turnNumber,
    phase,
    message,
    timestamp: Date.now(),
    playerId: pid,
  };
}

function applyEvents(
  reminders: Reminder[],
  pendingReminderFires: ReminderFireInstance[],
  state: GameState,
  phase: string,
  events: string[],
): { reminders: Reminder[]; pendingReminderFires: ReminderFireInstance[] } {
  if (events.length === 0) return { reminders, pendingReminderFires };
  const firedR = getMatchingEventReminders(reminders, events, phase, state.isMyTurn);
  const updatedReminders = recordEventReminderFires(reminders, firedR);
  const newInstances: ReminderFireInstance[] = firedR.map(fr => ({
    id: `fire-${fr.id}-${Date.now()}-${Math.random()}`,
    reminderId: fr.id,
    firedPhase: phase,
    firedTurn: state.turnNumber,
    triggeredByUser: state.isMyTurn,
  }));
  return { reminders: updatedReminders, pendingReminderFires: [...pendingReminderFires, ...newInstances] };
}

// ─── public helpers ────────────────────────────────────────────────────────────

export function getResourceTokenCompactText(kind: ResourceTokenKind): string {
  switch (kind) {
    case "Treasure":   return "Add mana";
    case "Food":       return "Gain 3 life";
    case "Clue":       return "Draw 1";
    case "Blood":      return "Draw 1, discard 1";
    case "Map":        return "Explore";
    case "Powerstone": return "Add colorless";
    default:           return "Use";
  }
}

export function getResourceTokenKind(name: string): ResourceTokenKind {
  const n = name.replace(/^\d+x\s*/, "").toLowerCase().trim();
  if (n.includes("treasure")) return "Treasure";
  if (n.includes("food"))     return "Food";
  if (n.includes("clue"))     return "Clue";
  if (n.includes("blood"))    return "Blood";
  if (n.includes("map"))      return "Map";
  if (n.includes("powerstone")) return "Powerstone";
  return "generic";
}

export function isResourceTokenSpell(spell: CastSpell): boolean {
  return !!spell.isToken && spell.tokenCategory === "resource";
}

// ─── main resolver ─────────────────────────────────────────────────────────────

type ResolveAction = Extract<Action, { type: "RESOLVE_RESOURCE_TOKEN" }>;

export function resolveResourceToken(
  state: GameState,
  action: ResolveAction,
  deps: { phase: string },
): GameState {
  const { phase } = deps;
  const spell = state.spellLog.find(x => x.id === action.spellId);
  if (!spell) return state;

  const playerId = spell.playerId;
  const kind = getResourceTokenKind(spell.name);

  // ── shared chain helpers ──────────────────────────────────────────────────

  const removeToken = (s: GameState): GameState => ({
    ...s,
    spellLog: s.spellLog.filter(x => x.id !== action.spellId),
  });

  const addTGY = (s: GameState, tgyAction: TokenGYEntry["action"]): GameState => ({
    ...s,
    tokenGY: [...s.tokenGY, {
      id: `tgy-${Date.now()}-${Math.random()}`,
      name: spell.name,
      tokenCategory: "resource" as const,
      action: tgyAction,
      turnNumber: state.turnNumber,
      phase,
      timestamp: Date.now(),
      playerId,
    }],
  });

  const addLog = (s: GameState, message: string): GameState => ({
    ...s,
    history: [...s.history, makeLogEntry(state, phase, message, playerId)],
  });

  const fireEvents = (s: GameState, events: string[]): GameState => {
    if (events.length === 0) return s;
    const result = applyEvents(s.reminders, s.pendingReminderFires, s, phase, events);
    return { ...s, reminders: result.reminders, pendingReminderFires: result.pendingReminderFires };
  };

  const updateLife = (s: GameState, pid: string, delta: number): GameState => {
    const player = s.players.find(p => p.id === pid);
    const newLife = (player?.life ?? 0) + delta;
    const players = s.players.map(p => p.id === pid ? { ...p, life: newLife } : p);
    return { ...s, players };
  };

  // ── shared intents ────────────────────────────────────────────────────────

  if (action.intent === "sacrifice") {
    let s = state;
    s = removeToken(s);
    s = addTGY(s, "sacrificed");
    s = addLog(s, `${spell.name} sacrificed.`);
    s = fireEvents(s, ["Token is sacrificed"]);
    return s;
  }

  if (action.intent === "destroy") {
    let s = state;
    s = removeToken(s);
    s = addTGY(s, "destroyed");
    s = addLog(s, `${spell.name} destroyed.`);
    return s;
  }

  if (action.intent === "delete") {
    let s = state;
    s = removeToken(s);
    s = addLog(s, `${spell.name} deleted.`);
    return s;
  }

  // ── intent === "use" ──────────────────────────────────────────────────────

  if (kind === "Treasure") {
    if (!action.manaColor) return state;
    const colorKey = action.manaColor as keyof ManaPool;
    const colorLabel = colorKey.charAt(0).toUpperCase() + colorKey.slice(1);
    const manaPool = {
      ...state.manaPool,
      [colorKey]: { ...state.manaPool[colorKey], manual: state.manaPool[colorKey].manual + 1 },
    };
    let s: GameState = { ...state, manaPool };
    s = removeToken(s);
    s = addTGY(s, "cracked");
    s = addLog(s, `Cracked Treasure for 1 ${colorLabel} mana.`);
    s = fireEvents(s, ["Mana is added", "Mana ability is activated", "Token is sacrificed"]);
    return s;
  }

  if (kind === "Food") {
    const pid = playerId ?? state.eventOwnerPlayerId ?? state.turnOrder[state.currentPlayerIndex] ?? state.players[0]?.id ?? "p1";
    const isUserPlayer = state.players.find(p => p.id === pid)?.isUser ?? true;
    let s = state;
    s = updateLife(s, pid, 3);
    s = removeToken(s);
    s = addTGY(s, "sacrificed");
    s = addLog(s, "Food used: gained 3 life.");
    s = fireEvents(s, [
      "Life total changes",
      isUserPlayer ? "You gain life" : "Opponent gains life",
      "Token is sacrificed",
    ]);
    return s;
  }

  if (kind === "Clue") {
    let s: GameState = { ...state, cardsDrawn: state.cardsDrawn + 1 };
    s = removeToken(s);
    s = addTGY(s, "sacrificed");
    s = addLog(s, "Clue used: drew 1 card.");
    s = fireEvents(s, ["Card is drawn", "Token is sacrificed"]);
    return s;
  }

  if (kind === "Blood") {
    let s: GameState = { ...state, cardsDrawn: state.cardsDrawn + 1 };
    s = removeToken(s);
    s = addTGY(s, "sacrificed");
    s = addLog(s, "Blood used: drew 1 card, discard 1.");
    s = fireEvents(s, ["Card is drawn", "Card is discarded", "Token is sacrificed"]);
    return s;
  }

  if (kind === "Map") {
    const mapResult = action.mapResult ?? "unknown";
    let logMsg = "Map used: target creature explores.";
    if (mapResult === "land") logMsg = "Map used: explored and revealed a land.";
    if (mapResult === "nonland") logMsg = "Map used: explored and revealed a nonland card.";

    let s = state;
    const extraEvents: string[] = [];

    if (mapResult === "nonland" && action.mapTargetSpellId) {
      const target = s.spellLog.find(x => x.id === action.mapTargetSpellId);
      if (target && target.zone === "active" &&
          (target.type === "Creature" || (target.isToken && target.tokenCategory === "creature"))) {
        const newCount = (target.counters?.["+1/+1"] ?? 0) + 1;
        s = {
          ...s,
          spellLog: s.spellLog.map(x =>
            x.id === action.mapTargetSpellId
              ? { ...x, counters: { ...x.counters, "+1/+1": newCount } }
              : x
          ),
        };
        extraEvents.push("Counter is added to a creature", "+1/+1 counter is added");
        logMsg = `Map used: explored and revealed a nonland. ${target.name} gets +1/+1.`;
      }
    }

    s = removeToken(s);
    s = addTGY(s, "sacrificed");
    s = addLog(s, logMsg);
    s = fireEvents(s, ["Activated ability is used", "Token is sacrificed", ...extraEvents]);
    return s;
  }

  if (kind === "Powerstone") {
    if (spell.tapped) return state;
    const spellLog = state.spellLog.map(x => x.id === action.spellId ? { ...x, tapped: true } : x);
    const manaPool = {
      ...state.manaPool,
      colorless: { ...state.manaPool.colorless, manual: state.manaPool.colorless.manual + 1 },
    };
    let s: GameState = { ...state, spellLog, manaPool };
    s = addLog(s, "Tapped Powerstone for 1 colorless mana. Powerstone mana cannot be spent to cast nonartifact spells.");
    s = fireEvents(s, ["Mana is added", "Mana ability is activated"]);
    return s;
  }

  // generic resource token
  let s = state;
  s = removeToken(s);
  s = addTGY(s, "sacrificed");
  s = addLog(s, `${spell.name} used.`);
  s = fireEvents(s, ["Token is sacrificed"]);
  return s;
}
