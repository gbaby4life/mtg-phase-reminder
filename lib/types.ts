import {
  Reminder, ReminderFireInstance, ReminderContext,
} from "../System/reminderSystem";

// ─── COLORS ───────────────────────────────────────────────────────────────────
export const C = {
  bg: "#0B1020", card: "#151A2A", cardAlt: "#1D2438",
  border: "#252D45", text: "#FFFFFF", muted: "#AAB2C8",
  dim: "#5A6480", accent: "#7C5CFF", accentDim: "#3D2E80",
  danger: "#FF5C7A", dangerDim: "#7A1F30", success: "#4ADE80",
  successDim: "#1A5C35", warning: "#FACC15", warningDim: "#6B5000",
  overlay: "rgba(0,0,0,0.8)",
};

export type HistoryEntry = {
  id: string; turnNumber: number; phase: string; message: string; timestamp: number;
  playerId: string;
};

export type CreatureCounterType = "+1/+0" | "+0/+1" | "+1/+1" | "-1/-0" | "-0/-1" | "-1/-1";

export type ResourceTokenKind = "Treasure" | "Food" | "Clue" | "Blood" | "Map" | "Powerstone" | "generic";
export type ResourceTokenIntent = "use" | "sacrifice" | "destroy" | "delete";
export type ResourceTokenMapResult = "land" | "nonland" | "unknown";

export type ManaCost = {
  generic: number;
  white: number;
  blue: number;
  black: number;
  red: number;
  green: number;
};

export const MANA_COLOR_ICONS = {
  white: "☀️",
  blue: "💧",
  black: "💀",
  red: "🔥",
  green: "🌲",
  colorless: "⚪",
} as const;

const manaCostKeys: (keyof ManaCost)[] = ["generic", "white", "blue", "black", "red", "green"];
type IconManaCost = Partial<ManaCost> & { colorless?: number };

function cleanManaAmount(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value ?? 0)) : 0;
}

export function emptyManaCost(): ManaCost {
  return { generic: 0, white: 0, blue: 0, black: 0, red: 0, green: 0 };
}

export function hasManaCost(cost?: Partial<ManaCost> | null): boolean {
  if (!cost) return false;
  return manaCostKeys.some(key => cleanManaAmount(cost[key]) > 0);
}

export function getManaCostValue(cost?: Partial<ManaCost> | null, fallbackManaValue?: number): number | undefined {
  if (!hasManaCost(cost)) return fallbackManaValue;
  return manaCostKeys.reduce((total, key) => total + cleanManaAmount(cost?.[key]), 0);
}

export function formatManaCostLabel(cost?: Partial<ManaCost> | null, fallbackManaValue?: number): string {
  if (!hasManaCost(cost)) return fallbackManaValue !== undefined ? String(fallbackManaValue) : "Unknown";

  const parts: string[] = [];
  const generic = cleanManaAmount(cost?.generic);
  if (generic > 0) parts.push(`${generic} Generic`);

  ([
    ["white", "White"],
    ["blue", "Blue"],
    ["black", "Black"],
    ["red", "Red"],
    ["green", "Green"],
  ] as const).forEach(([key, label]) => {
    const amount = cleanManaAmount(cost?.[key]);
    if (amount > 0) parts.push(`${amount} ${label}`);
  });

  return parts.join(" + ");
}

function hasIconManaCost(cost?: IconManaCost | null): boolean {
  return hasManaCost(cost) || cleanManaAmount(cost?.colorless) > 0;
}

function repeatManaIcon(icon: string, amount: number): string {
  return Array.from({ length: amount }, () => icon).join("");
}

export function formatManaCostSymbols(cost?: IconManaCost | null, fallbackManaValue?: number): string {
  if (!hasIconManaCost(cost)) {
    return fallbackManaValue !== undefined ? String(cleanManaAmount(fallbackManaValue)) : "None";
  }

  const generic = cleanManaAmount(cost?.generic);
  const symbols = [
    repeatManaIcon(MANA_COLOR_ICONS.white, cleanManaAmount(cost?.white)),
    repeatManaIcon(MANA_COLOR_ICONS.blue, cleanManaAmount(cost?.blue)),
    repeatManaIcon(MANA_COLOR_ICONS.black, cleanManaAmount(cost?.black)),
    repeatManaIcon(MANA_COLOR_ICONS.red, cleanManaAmount(cost?.red)),
    repeatManaIcon(MANA_COLOR_ICONS.green, cleanManaAmount(cost?.green)),
    repeatManaIcon(MANA_COLOR_ICONS.colorless, cleanManaAmount(cost?.colorless)),
  ].join("");

  if (generic > 0 && symbols) return `${generic}+${symbols}`;
  if (generic > 0) return String(generic);
  return symbols || "None";
}

export function formatManaCostSymbolsWithTax(cost?: IconManaCost | null, commanderTax = 0, fallbackManaValue?: number): string {
  const tax = cleanManaAmount(commanderTax);
  if (!hasIconManaCost(cost)) {
    if (fallbackManaValue !== undefined) return String(cleanManaAmount(fallbackManaValue) + tax);
    return "None";
  }

  return formatManaCostSymbols({
    ...cost,
    generic: cleanManaAmount(cost?.generic) + tax,
  });
}

export type CastSpell = {
  id: string;
  name: string;
  type: string;
  playerId?: string;
  supertype?: string;
  subtype?: string;
  subtype2?: string;
  turnNumber: number;
  phase: string;
  zone: "active" | "graveyard" | "exile" | "commandZone";
  isToken: boolean;
  tokenCategory?: "creature" | "resource" | "status";
  isCommander?: boolean;
  commanderId?: string;
  commanderOwnerPlayerId?: string;
  // Creature
  power?: number;
  toughness?: number;
  manaValue?: number;
  manaCost?: ManaCost;
  abilities?: string[];
  // Planeswalker
  startingLoyalty?: number;
  currentLoyalty?: number;
  // Battle
  startingDefense?: number;
  currentDefense?: number;
  // Land
  produces?: string;
  tapped?: boolean;
  // Creature combat state (also used by Battlefield)
  attacking?: boolean;
  counters?: Partial<Record<CreatureCounterType, number>>;
  blockedByIds?: string[];
  blockingId?: string | null;
  // Enchantment Aura / Artifact Equipment
  attachedTo?: string;
  // All non-creature spells
  effectNote?: string;
};

export type GraveyardEntry = {
  id: string; name: string; type: string;
  turnNumber: number; phase: string; timestamp: number;
  source: "died" | "sacrificed" | "resolved" | "destroyed";
  playerId?: string;
  spellId?: string;
  supertype?: string;
  subtype?: string;
  subtype2?: string;
  isToken?: boolean;
  tokenCategory?: "creature" | "resource" | "status";
  isCommander?: boolean;
  commanderId?: string;
  commanderOwnerPlayerId?: string;
  power?: number;
  toughness?: number;
  manaValue?: number;
  manaCost?: ManaCost;
  abilities?: string[];
};

export type ExileEntry = {
  id: string; name: string; type: string;
  turnNumber: number; phase: string; timestamp: number;
  playerId?: string;
  spellId?: string;
  supertype?: string;
  subtype?: string;
  subtype2?: string;
  isToken?: boolean;
  tokenCategory?: "creature" | "resource" | "status";
  isCommander?: boolean;
  commanderId?: string;
  commanderOwnerPlayerId?: string;
  power?: number;
  toughness?: number;
  manaValue?: number;
  manaCost?: ManaCost;
  abilities?: string[];
};

export type TokenGYEntry = {
  id: string; name: string;
  tokenCategory: "creature" | "resource";
  action: "died" | "sacrificed" | "cracked" | "destroyed";
  turnNumber: number; phase: string; timestamp: number;
  playerId?: string;
};

export type ManaPool = {
  white:     { auto: number; manual: number };
  blue:      { auto: number; manual: number };
  black:     { auto: number; manual: number };
  red:       { auto: number; manual: number };
  green:     { auto: number; manual: number };
  colorless: { auto: number; manual: number };
};

export type Player = { id: string; name: string; isUser: boolean; life: number; color?: string };

export type CommanderRecord = {
  id: string;
  ownerPlayerId: string;
  name: string;
  manaValue?: number;
  manaCost?: ManaCost;
  type?: string;
  power?: number;
  toughness?: number;
  abilities?: string[];
  supertype?: string;
  subtype?: string;
  subtype2?: string;
  currentZone: "commandZone" | "battlefield" | "graveyard" | "exile";
  spellId?: string;
  timesCastFromCommandZone: number;
};

export type GameState = {
  screen: "menu" | "setup" | "game" | "opponent-turn";
  isMyTurn: boolean;
  activePhaseView: string | null;
  playerName: string; life: number; startingLife: number;
  gameType: string; turnNumber: number; phaseIndex: number;
  phaseLocked: boolean; cardsDrawn: number; landsPlayed: number;
  reminders: Reminder[];
  pendingReminderFires: ReminderFireInstance[];
  history: HistoryEntry[]; spellLog: CastSpell[];
  graveyard: GraveyardEntry[]; exile: ExileEntry[]; tokenGY: TokenGYEntry[];
  manaPool: ManaPool;
  players: Player[];
  currentPlayerIndex: number;
  turnOrder: string[];
  firstPlayerIndex: number;
  opponentPhaseIndex: number;
  eventOwnerPlayerId: string | null;
  commanders: CommanderRecord[];
  commanderDamage: {
    [defendingPlayerId: string]: {
      [commanderId: string]: number;
    };
  };
};

export type Action =
  | { type: "GO_SETUP" } | { type: "GO_MENU" }
  | { type: "START_GAME"; playerName: string; life: number; gameType: string; players: Player[]; turnOrder: string[]; firstPlayerIndex: number; commanders?: CommanderRecord[]; commanderDamage?: GameState["commanderDamage"] }
  | { type: "END_OPPONENT_TURN" }
  | { type: "END_MY_TURN" }
  | { type: "NEXT_PHASE" } | { type: "PREV_PHASE" }
  | { type: "SET_ACTIVE_PHASE"; phase: string }
  | { type: "CLEAR_ACTIVE_PHASE" }
  | { type: "LOCK_PHASE" } | { type: "UNLOCK_PHASE" }
  | { type: "CHANGE_LIFE"; delta: number; playerId?: string } | { type: "CHANGE_LIFE_SILENT"; delta: number; playerId?: string } | { type: "SET_LIFE"; value: number; playerId?: string }
  // Reminder actions
  | { type: "RESOLVE_REMINDER"; id: string; skipEffect?: boolean }
  | { type: "SKIP_REMINDER"; id: string }
  | { type: "UNSKIP_REMINDER"; id: string }
  | { type: "MISS_REMINDER"; id: string }
  | { type: "TOGGLE_REMINDER"; id: string }
  | { type: "ADD_REMINDER"; reminder: Reminder }
  | { type: "EDIT_REMINDER"; id: string; updates: Partial<Omit<Reminder, "id">> }
  | { type: "DELETE_REMINDER"; id: string }
  // Reminder fire actions (event-based reminders that fired and need player attention)
  | { type: "FIRE_REMINDER_EVENT"; events: string[]; context?: ReminderContext }
  | { type: "RESOLVE_REMINDER_FIRE"; fireId: string }
  | { type: "PARK_REMINDER_FIRE"; fireId: string }
  | { type: "CLEAR_PENDING_REMINDER_FIRES" }
  | { type: "RESET_REMINDER_TURN_FLAGS" }
  // Other actions
  | { type: "LOG"; message: string; playerId?: string }
  | { type: "LOG_EVENT"; eventType: string; detail: string; playerId?: string }
  | { type: "CAST_SPELL"; spellData: Omit<CastSpell, "id" | "turnNumber" | "phase" | "zone"> }
  | { type: "DELETE_SPELL"; id: string }
  | { type: "EDIT_SPELL"; id: string; updates: Partial<Omit<CastSpell, "id" | "turnNumber" | "phase" | "zone">> }
  | { type: "UPDATE_LOYALTY"; id: string; delta: number }
  | { type: "UPDATE_DEFENSE"; id: string; delta: number }
  | { type: "ADD_CARDS_DRAWN"; amount: number }
  | { type: "ADD_LAND" }
  | { type: "MOVE_TO_GY"; spellId: string; source: "died" | "sacrificed" | "resolved" | "destroyed" }
  | { type: "MOVE_TO_EXILE"; spellId: string }
  | { type: "RETURN_FROM_GY"; gyEntryId: string }
  | { type: "RETURN_FROM_EXILE"; exileEntryId: string }
  | { type: "DELETE_FROM_GY"; gyEntryId: string }
  | { type: "DELETE_FROM_EXILE"; exileEntryId: string }
  | { type: "MOVE_GY_COMMANDER_TO_COMMAND_ZONE"; gyEntryId: string }
  | { type: "MOVE_EXILE_COMMANDER_TO_COMMAND_ZONE"; exileEntryId: string }
  | { type: "ADD_TOKEN_TO_GY"; entry: TokenGYEntry }
  | { type: "ADD_AUTO_MANA"; color: keyof ManaPool; amount: number }
  | { type: "ADD_MANUAL_MANA"; color: keyof ManaPool; amount: number }
  | { type: "SUBTRACT_MANUAL_MANA"; color: keyof ManaPool; amount: number }
  | { type: "RESET_MANUAL_MANA" }
  | { type: "RESET_AUTO_MANA" }
  | { type: "SET_EVENT_OWNER"; playerId: string }
  | { type: "RESET_EVENT_OWNER" }
  // Commander actions
  | { type: "MARK_AS_COMMANDER"; spellId: string }
  | { type: "UNMARK_AS_COMMANDER"; spellId: string }
  | { type: "APPLY_COMMANDER_DAMAGE"; commanderId: string; defendingPlayerId: string; amount: number }
  | { type: "SET_COMMANDER_DAMAGE"; commanderId: string; defendingPlayerId: string; amount: number }
  | { type: "MOVE_COMMANDER_TO_COMMAND_ZONE"; spellId: string }
  | { type: "CAST_COMMANDER_FROM_COMMAND_ZONE"; commanderId: string; spellId?: string }
  // Battlefield actions
  | { type: "TOGGLE_TAPPED"; spellId: string }
  | { type: "DECLARE_ATTACKER"; spellId: string }
  | { type: "REMOVE_FROM_COMBAT"; spellId: string }
  | { type: "ASSIGN_BLOCKER"; blockerId: string; attackerId: string }
  | { type: "REMOVE_BLOCKER"; blockerId: string }
  | { type: "CLEAR_COMBAT" }
  | { type: "CHANGE_CREATURE_COUNTER"; spellId: string; counterType: CreatureCounterType; delta: number }
  | { type: "RESOLVE_RESOURCE_TOKEN"; spellId: string; intent: ResourceTokenIntent; manaColor?: keyof ManaPool; mapTargetSpellId?: string; mapResult?: ResourceTokenMapResult }
  | { type: "CREATURE_TOKEN_EXIT"; spellId: string; reason: "died" | "sacrificed" | "destroyed" | "delete" }
  | { type: "RESOLVE_COMBAT"; deadSpellIds: string[]; lifeChanges: { playerId: string; delta: number }[] };
