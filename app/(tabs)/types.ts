import {
  Reminder, ReminderFireInstance, ReminderContext,
} from "../../System/reminderSystem";

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
  zone: "active" | "graveyard" | "exile";
  isToken: boolean;
  tokenCategory?: "creature" | "resource" | "status";
  // Creature
  power?: number;
  toughness?: number;
  manaValue?: number;
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
};

export type ExileEntry = {
  id: string; name: string; type: string;
  turnNumber: number; phase: string; timestamp: number;
  playerId?: string;
};

export type TokenGYEntry = {
  id: string; name: string;
  tokenCategory: "creature" | "resource";
  action: "died" | "sacrificed" | "cracked";
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

export type Player = { id: string; name: string; isUser: boolean; life: number };

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
};

export type Action =
  | { type: "GO_SETUP" } | { type: "GO_MENU" }
  | { type: "START_GAME"; playerName: string; life: number; gameType: string; players: Player[]; turnOrder: string[]; firstPlayerIndex: number }
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
  | { type: "ADD_TOKEN_TO_GY"; entry: TokenGYEntry }
  | { type: "ADD_AUTO_MANA"; color: keyof ManaPool; amount: number }
  | { type: "ADD_MANUAL_MANA"; color: keyof ManaPool; amount: number }
  | { type: "SUBTRACT_MANUAL_MANA"; color: keyof ManaPool; amount: number }
  | { type: "RESET_MANUAL_MANA" }
  | { type: "RESET_AUTO_MANA" }
  | { type: "SET_EVENT_OWNER"; playerId: string }
  | { type: "RESET_EVENT_OWNER" }
  // Battlefield actions
  | { type: "TOGGLE_TAPPED"; spellId: string }
  | { type: "DECLARE_ATTACKER"; spellId: string }
  | { type: "REMOVE_FROM_COMBAT"; spellId: string };
