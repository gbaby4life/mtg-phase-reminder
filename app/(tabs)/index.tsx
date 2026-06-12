import React, { useReducer, useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  TextInput, StyleSheet, Platform,
  KeyboardAvoidingView, StatusBar, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Reminder, ReminderFireInstance, ReminderContext,
  ReminderEffect, ReminderEffectType, ReminderCondition,
  ReminderFrequency,
  GAME_EVENTS, CONDITION_OPTIONS, EFFECT_TYPE_OPTIONS,
  makeDefaultReminders, getMatchingEventReminders,
  recordEventReminderFires, applyImmediateEffects,
  getPassiveEffects, resetPhaseReminders, activatePhaseReminders,
  resetEventReminderTurnFlags, deactivateRemindersForSpell,
} from "../../System/reminderSystem";
import { searchCardNames, CardNameRecord } from "../../System/cardSearchSystem";

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#0B1020", card: "#151A2A", cardAlt: "#1D2438",
  border: "#252D45", text: "#FFFFFF", muted: "#AAB2C8",
  dim: "#5A6480", accent: "#7C5CFF", accentDim: "#3D2E80",
  danger: "#FF5C7A", dangerDim: "#7A1F30", success: "#4ADE80",
  successDim: "#1A5C35", warning: "#FACC15", warningDim: "#6B5000",
  overlay: "rgba(0,0,0,0.8)",
};

const PHASES = [
  "Untap", "Upkeep", "Draw", "Main Phase 1",
  "Beginning of Combat", "Declare Attackers", "Declare Blockers",
  "Combat Damage", "End of Combat", "Main Phase 2", "End Step", "Cleanup",
];


const PINNED_TOKENS = ["Treasure", "1/1 Soldier", "1/1 Goblin"];
const COMMON_TOKENS = [
  "Zombie", "Knight", "Beast", "Dragon", "Angel", "Elemental", "Spirit",
  "Warrior", "Vampire", "Wolf", "Bird", "Cat", "Human", "Insect", "Merfolk",
  "Saproling", "Servo", "Thopter", "Food", "Clue", "Blood", "Map",
];

const SPELL_TYPES = [
  { key: "Creature", icon: "🐉" },
  { key: "Instant", icon: "⚡" },
  { key: "Sorcery", icon: "🌀" },
  { key: "Enchantment", icon: "✨" },
  { key: "Artifact", icon: "⚙️" },
  { key: "Planeswalker", icon: "👁️" },
  { key: "Battle", icon: "⚔️" },
  { key: "Other", icon: "★" },
];

const MANA_COLORS = [
  { key: "white", label: "White", emoji: "☀️" },
  { key: "blue", label: "Blue", emoji: "💧" },
  { key: "black", label: "Black", emoji: "💀" },
  { key: "red", label: "Red", emoji: "🔥" },
  { key: "green", label: "Green", emoji: "🌲" },
  { key: "colorless", label: "Colorless", emoji: "⚪" },
] as const;

const RESOURCE_TOKENS = ["Treasure", "Food", "Clue", "Blood", "Map"];

const RAINBOW_COLORS = [
  '#FF0000', '#FF7700', '#FFFF00', '#00FF00',
  '#0088FF', '#8800FF', '#FF00FF', '#FF0000',
];

// ─── MTG TYPE CATALOGS (source: Scryfall API) ─────────────────────────────────

const MTG_SUPERTYPES = [
  "Legendary", "Basic", "Snow", "World", "Ongoing",
] as const;

const MTG_ARTIFACT_SUBTYPES = [
  "Blood", "Bobblehead", "Clue", "Contraption", "Equipment", "Food",
  "Fortification", "Gold", "Map", "Powerstone", "Treasure", "Vehicle",
] as const;

const MTG_BATTLE_SUBTYPES = [
  "Siege",
] as const;

const MTG_CREATURE_SUBTYPES = [
  "Advisor", "Aetherborn", "Ally", "Angel", "Antelope", "Ape", "Archer",
  "Archon", "Army", "Artificer", "Assassin", "Assembly-Worker", "Atog",
  "Aurochs", "Avatar", "Azra", "Badger", "Balloon", "Barbarian", "Bard",
  "Basilisk", "Bat", "Bear", "Beast", "Beeble", "Beholder", "Berserker",
  "Bird", "Blinkmoth", "Boar", "Bringer", "Brushwagg", "Camarid", "Camel",
  "Caribou", "Carrier", "Cat", "Centaur", "Cephalid", "Child", "Chimera",
  "Citizen", "Cleric", "Cockatrice", "Construct", "Coward", "Crab",
  "Crocodile", "C'tan", "Custodes", "Cyberman", "Cyclops", "Dalek",
  "Dauthi", "Demigod", "Demon", "Deserter", "Detective", "Devil", "Dinosaur",
  "Djinn", "Dog", "Dragon", "Drake", "Dreadnought", "Drone", "Druid",
  "Dryad", "Dwarf", "Efreet", "Egg", "Elder", "Eldrazi", "Elemental",
  "Elephant", "Elf", "Elk", "Employee", "Eye", "Faerie", "Ferret", "Fish",
  "Flagbearer", "Fox", "Fractal", "Frog", "Fungus", "Gamer", "Gargoyle",
  "Germ", "Giant", "Gith", "Gnoll", "Gnome", "Goat", "Goblin", "God",
  "Golem", "Gorgon", "Graveborn", "Gremlin", "Griffin", "Guest", "Hag",
  "Halfling", "Hamster", "Harpy", "Hellion", "Hippo", "Hippogriff",
  "Homarid", "Homunculus", "Horror", "Horse", "Human", "Hydra", "Hyena",
  "Illusion", "Imp", "Incarnation", "Inkling", "Inquisitor", "Insect",
  "Jackal", "Jellyfish", "Juggernaut", "Kavu", "Kirin", "Kithkin", "Knight",
  "Kobold", "Kor", "Kraken", "Lamia", "Lammasu", "Leech", "Leviathan",
  "Lhurgoyf", "Licid", "Lizard", "Manticore", "Masticore", "Mercenary",
  "Merfolk", "Metathran", "Minion", "Minotaur", "Mite", "Mole", "Monger",
  "Mongoose", "Monk", "Monkey", "Moonfolk", "Mouse", "Mutant", "Myr",
  "Mystic", "Naga", "Nautilus", "Nephilim", "Nightmare", "Nightstalker",
  "Ninja", "Noble", "Noggle", "Nomad", "Nymph", "Octopus", "Ogre", "Ooze",
  "Orb", "Orc", "Orgg", "Otter", "Ouphe", "Ox", "Oyster", "Pangolin",
  "Peasant", "Pegasus", "Pentavite", "Performer", "Pest", "Phelddagrif",
  "Phoenix", "Phyrexian", "Pilot", "Pincher", "Pirate", "Plant", "Praetor",
  "Primarch", "Prism", "Processor", "Rabbit", "Raccoon", "Ranger", "Rat",
  "Rebel", "Reflection", "Rhino", "Rigger", "Robot", "Rogue", "Sable",
  "Salamander", "Samurai", "Sand", "Saproling", "Satyr", "Scarecrow",
  "Scion", "Scorpion", "Scout", "Sculpture", "Serf", "Serpent", "Servo",
  "Shade", "Shaman", "Shapeshifter", "Shark", "Sheep", "Siren", "Skeleton",
  "Slith", "Sliver", "Slug", "Snail", "Snake", "Soldier", "Soltari",
  "Spawn", "Specter", "Spellshaper", "Sphinx", "Spider", "Spike", "Spirit",
  "Splinter", "Sponge", "Squid", "Squirrel", "Starfish", "Surrakar",
  "Survivor", "Tentacle", "Tetravite", "Thalakos", "Thopter", "Thrull",
  "Tiefling", "Time Lord", "Treefolk", "Trilobite", "Triskelavite", "Troll",
  "Turtle", "Tyranid", "Unicorn", "Vampire", "Vedalken", "Viashino",
  "Volver", "Wall", "Warlock", "Warrior", "Weird", "Werewolf", "Whale",
  "Wizard", "Wolf", "Wolverine", "Wombat", "Worm", "Wraith", "Wurm",
  "Yeti", "Zombie", "Zubera",
] as const;

const MTG_ENCHANTMENT_SUBTYPES = [
  "Aura", "Background", "Cartouche", "Case", "Class", "Curse",
  "Rune", "Saga", "Shard", "Shrine",
] as const;

const MTG_LAND_SUBTYPES = [
  "Cave", "Desert", "Forest", "Gate", "Island", "Lair", "Locus",
  "Mine", "Mountain", "Plains", "Power-Plant", "Sphere", "Swamp",
  "Tower", "Urzas",
] as const;

const MTG_PLANESWALKER_SUBTYPES = [
  "Ajani", "Aminatou", "Angrath", "Arlinn", "Ashiok", "Bahamut", "Basri",
  "Bolas", "Calix", "Chandra", "Comet", "Dack", "Dakkon", "Daretti",
  "Davriel", "Dihada", "Domri", "Dovin", "Ellywick", "Elminster", "Elspeth",
  "Estrid", "Freyalise", "Garruk", "Gideon", "Grist", "Huatli", "Jace",
  "Jared", "Jaya", "Jeska", "Kaito", "Karn", "Kasmina", "Kaya", "Kiora",
  "Koth", "Liliana", "Lolth", "Lukka", "Minsc", "Mordenkainen", "Nahiri",
  "Narset", "Niko", "Nissa", "Nixilis", "Oko", "Ral", "Rowan", "Saheeli",
  "Samut", "Sarkhan", "Serra", "Sivitri", "Sorin", "Szat", "Tamiyo",
  "Tasha", "Teferi", "Teyo", "Tezzeret", "Tibalt", "Tyvar", "Ugin",
  "Urza", "Venser", "Vivien", "Vraska", "Will", "Windgrace", "Wrenn",
  "Xenagos", "Yanggu", "Yanling", "Zariel",
] as const;

const MTG_SPELL_SUBTYPES = [
  "Adventure", "Arcane", "Lesson", "Trap",
] as const;

const MTG_KEYWORD_ABILITIES = [
  "Deathtouch", "Defender", "Double Strike", "Equip", "First Strike",
  "Flash", "Flying", "Haste", "Hexproof", "Indestructible", "Intimidate",
  "Landwalk", "Lifelink", "Menace", "Protection", "Prowess", "Reach",
  "Shroud", "Trample", "Vigilance", "Ward",
] as const;

const MTG_SUBTYPES_BY_TYPE: Record<string, readonly string[]> = {
  Creature:     MTG_CREATURE_SUBTYPES,
  Artifact:     MTG_ARTIFACT_SUBTYPES,
  Enchantment:  MTG_ENCHANTMENT_SUBTYPES,
  Land:         MTG_LAND_SUBTYPES,
  Planeswalker: MTG_PLANESWALKER_SUBTYPES,
  Instant:      MTG_SPELL_SUBTYPES,
  Sorcery:      MTG_SPELL_SUBTYPES,
  Battle:       MTG_BATTLE_SUBTYPES,
  Other:        [],
};

type HistoryEntry = {
  id: string; turnNumber: number; phase: string; message: string; timestamp: number;
  playerId: string;
};

type CastSpell = {
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
  // Enchantment Aura / Artifact Equipment
  attachedTo?: string;
  // All non-creature spells
  effectNote?: string;
};

type GraveyardEntry = {
  id: string; name: string; type: string;
  turnNumber: number; phase: string; timestamp: number;
  source: "died" | "sacrificed" | "resolved" | "destroyed";
  playerId?: string;
};

type ExileEntry = {
  id: string; name: string; type: string;
  turnNumber: number; phase: string; timestamp: number;
  playerId?: string;
};

type TokenGYEntry = {
  id: string; name: string;
  tokenCategory: "creature" | "resource";
  action: "died" | "sacrificed" | "cracked";
  turnNumber: number; phase: string; timestamp: number;
  playerId?: string;
};

type ManaPool = {
  white:     { auto: number; manual: number };
  blue:      { auto: number; manual: number };
  black:     { auto: number; manual: number };
  red:       { auto: number; manual: number };
  green:     { auto: number; manual: number };
  colorless: { auto: number; manual: number };
};

type Player = { id: string; name: string; isUser: boolean; life: number };

type GameState = {
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

const INIT: GameState = {
  screen: "menu", isMyTurn: true, activePhaseView: null,
  playerName: "Player 1", life: 20, startingLife: 20,
  gameType: "standard", turnNumber: 1, phaseIndex: 0,
  phaseLocked: false, cardsDrawn: 0, landsPlayed: 0,
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
};

type Action =
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
  | { type: "RESET_EVENT_OWNER" };

function logEntry(state: GameState, message: string, playerId?: string): HistoryEntry {
  const pid = playerId ?? state.eventOwnerPlayerId ?? state.turnOrder[state.currentPlayerIndex] ?? "system";
  return { id: `h${Date.now()}${Math.random()}`, turnNumber: state.turnNumber, phase: PHASES[state.phaseIndex], message, timestamp: Date.now(), playerId: pid };
}

function updatePlayerLife(players: Player[], playerId: string, updater: (life: number) => number): Player[] {
  return players.map(p => p.id === playerId ? { ...p, life: updater(p.life) } : p);
}

function getActivePlayerId(state: GameState, fallbackPlayerId?: string): string {
  return fallbackPlayerId ?? state.eventOwnerPlayerId ?? state.turnOrder[state.currentPlayerIndex] ?? state.players[0]?.id ?? "p1";
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
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
        playerName: action.playerName, life: action.life, startingLife: action.life,
        gameType: action.gameType, turnNumber: 1, phaseIndex: 0,
        phaseLocked: false, cardsDrawn: 0, landsPlayed: 0,
        reminders: activatePhaseReminders(makeDefaultReminders(), PHASES[0], !startsAsOpponent), pendingReminderFires: [],
        history: [], spellLog: [],
        players: action.players, turnOrder: action.turnOrder,
        firstPlayerIndex: action.firstPlayerIndex,
        currentPlayerIndex: 0, opponentPhaseIndex: 0,
      };
    }
    case "NEXT_PHASE": {
      const next = state.phaseIndex + 1;
      const newTurn = next >= PHASES.length;
      if (newTurn && state.turnOrder.length > 1) {
        const nextIdx = (state.currentPlayerIndex + 1) % state.turnOrder.length;
        const nextPlayer = state.players.find(p => p.id === state.turnOrder[nextIdx]);
        const entry = logEntry(state, `→ ${nextPlayer?.name ?? "Next Player"}'s turn`);
        if (nextPlayer?.isUser) {
          const newTurnNum = state.turnNumber + 1;
          const resetR = resetPhaseReminders(state.reminders);
          const activatedR = activatePhaseReminders(resetR, PHASES[0], true);
          const reminders = resetEventReminderTurnFlags(activatedR);
          return { ...state, screen: "game", isMyTurn: true, activePhaseView: null, phaseIndex: 0, turnNumber: newTurnNum, phaseLocked: false, currentPlayerIndex: nextIdx, reminders, pendingReminderFires: [], cardsDrawn: 0, landsPlayed: 0, history: [...state.history, entry], eventOwnerPlayerId: null };
        }
        return { ...state, screen: "opponent-turn", isMyTurn: false, activePhaseView: null, currentPlayerIndex: nextIdx, opponentPhaseIndex: 0, history: [...state.history, entry], eventOwnerPlayerId: null };
      }
      const newIdx = newTurn ? 0 : next;
      const newTurnNum = newTurn ? state.turnNumber + 1 : state.turnNumber;
      let reminders = newTurn ? resetPhaseReminders(state.reminders) : state.reminders;
      reminders = activatePhaseReminders(reminders, PHASES[newIdx], state.isMyTurn);
      if (newTurn) reminders = resetEventReminderTurnFlags(reminders);
      const entry = logEntry(state, `→ ${PHASES[newIdx]}${newTurn ? ` (Turn ${newTurnNum})` : ""}`);
      return { ...state, phaseIndex: newIdx, turnNumber: newTurnNum, phaseLocked: false, reminders, pendingReminderFires: [], cardsDrawn: newTurn ? 0 : state.cardsDrawn, landsPlayed: newTurn ? 0 : state.landsPlayed, history: [...state.history, entry] };
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
      const oldLife = player?.life ?? state.life;
      const newLife = oldLife + action.delta;
      const sign = action.delta > 0 ? "+" : "";
      const entry = logEntry(state, `${player?.name ?? state.playerName}: Life ${sign}${action.delta} → ${newLife}`, playerId);
      const players = updatePlayerLife(state.players, playerId, () => newLife);
      return { ...state, players, life: players.find(p => p.isUser)?.life ?? newLife, history: [...state.history, entry] };
    }
    case "CHANGE_LIFE_SILENT": {
      const playerId = getActivePlayerId(state, action.playerId);
      const player = state.players.find(p => p.id === playerId);
      const newLife = (player?.life ?? state.life) + action.delta;
      const players = updatePlayerLife(state.players, playerId, () => newLife);
      return { ...state, players, life: players.find(p => p.isUser)?.life ?? newLife };
    }
    case "SET_LIFE": {
      const playerId = getActivePlayerId(state, action.playerId);
      const player = state.players.find(p => p.id === playerId);
      const entry = logEntry(state, `${player?.name ?? state.playerName}: Life set to ${action.value}`, playerId);
      const players = updatePlayerLife(state.players, playerId, () => action.value);
      return { ...state, players, life: players.find(p => p.isUser)?.life ?? action.value, history: [...state.history, entry] };
    }
    case "RESOLVE_REMINDER": {
      const r = state.reminders.find(x => x.id === action.id);
      if (!r) return state;
      const reminders = state.reminders.map(x => x.id === action.id ? { ...x, status: "resolved" as const } : x);
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
      const lifePlayerId = getActivePlayerId(state);
      let players = state.players;
      if (result.lifeDelta) {
        players = updatePlayerLife(players, lifePlayerId, l => l + (result.lifeDelta ?? 0));
      }
      let life = players.find(p => p.isUser)?.life ?? state.life;
      let cardsDrawn = state.cardsDrawn + (result.cardsDrawnDelta ?? 0);
      let landsPlayed = state.landsPlayed + (result.landsPlayedDelta ?? 0);
      let manaPool = { ...state.manaPool };
      let spellLog = state.spellLog;
      if (result.manaAdded) {
        for (const m of result.manaAdded) {
          const ck = m.color as keyof ManaPool;
          manaPool = { ...manaPool, [ck]: { ...manaPool[ck], manual: manaPool[ck].manual + m.amount } };
        }
      }
      if ((result.landsPlayedDelta ?? 0) > 0) {
        const landSpell: CastSpell = {
          id: `spell-${Date.now()}-${Math.random()}`,
          name: "Land", type: "Land", isToken: false,
          turnNumber: state.turnNumber, phase: PHASES[state.phaseIndex],
          zone: "active", playerId: state.turnOrder[state.currentPlayerIndex],
        };
        spellLog = [...state.spellLog, landSpell];
      }
      const histEntries = [entry];
      if (result.logMessage) histEntries.push(logEntry(state, result.logMessage));
      return { ...state, reminders, players, life, cardsDrawn, landsPlayed, spellLog, manaPool, history: [...state.history, ...histEntries] };
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
      const isToken = spell.isToken ?? spell.type === "Token";
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
      const castCtx: ReminderContext = {
        spellType: spell.type, spellSupertype: spell.supertype,
        spellSubtype: spell.subtype, spellAbilities: spell.abilities,
        spellPower: spell.power, spellToughness: spell.toughness,
        spellManaValue: spell.manaValue, isToken,
        isMyTurn: state.isMyTurn, currentPhase,
      };
      const firedR = getMatchingEventReminders(state.reminders, trigEvents, currentPhase, state.isMyTurn, castCtx);
      const updatedReminders = recordEventReminderFires(state.reminders, firedR);
      const newInstances: ReminderFireInstance[] = firedR.map(r => ({ id: `fire-${r.id}-${Date.now()}-${Math.random()}`, reminderId: r.id, firedPhase: currentPhase, firedTurn: state.turnNumber, triggeredByUser: state.isMyTurn }));
      const updatedHistory = spell.type === "Land" ? state.history : [...state.history, entry];
      return { ...state, spellLog: [...state.spellLog, spell], reminders: updatedReminders, pendingReminderFires: [...state.pendingReminderFires, ...newInstances], history: updatedHistory, eventOwnerPlayerId: null };
    }
    case "LOG": { const entry = logEntry(state, action.message, action.playerId); return { ...state, history: [...state.history, entry], eventOwnerPlayerId: null }; }
    case "LOG_EVENT": { const entry = logEntry(state, `[${action.eventType}] ${action.detail}`, action.playerId); return { ...state, history: [...state.history, entry], eventOwnerPlayerId: null }; }
    case "SET_EVENT_OWNER": return { ...state, eventOwnerPlayerId: action.playerId };
    case "RESET_EVENT_OWNER": return { ...state, eventOwnerPlayerId: null };
    case "DELETE_SPELL": return { ...state, spellLog: state.spellLog.filter(x => x.id !== action.id) };
    case "EDIT_SPELL": {
      const sp = state.spellLog.find(x => x.id === action.id);
      if (!sp) return state;
      const updated = { ...sp, ...action.updates } as CastSpell;
      const entry = logEntry(state, `✎ Edited: ${updated.name} (${updated.type})`);
      return {
        ...state,
        spellLog: state.spellLog.map(x => x.id === action.id ? updated : x),
        history: [...state.history, entry],
      };
    }
    case "END_OPPONENT_TURN": {
      const nextIdx = (state.currentPlayerIndex + 1) % state.turnOrder.length;
      const nextPlayer = state.players.find(p => p.id === state.turnOrder[nextIdx]);
      const entry = logEntry(state, `→ ${nextPlayer?.name ?? "Next Player"}'s turn`);
      if (nextPlayer?.isUser) {
        const newTurnNum = state.turnNumber + 1;
        const resetR = resetPhaseReminders(state.reminders);
        const activatedR = activatePhaseReminders(resetR, PHASES[0], true);
        const reminders = resetEventReminderTurnFlags(activatedR);
        return { ...state, screen: "game", isMyTurn: true, activePhaseView: null, phaseIndex: 0, turnNumber: newTurnNum, phaseLocked: false, currentPlayerIndex: nextIdx, reminders, pendingReminderFires: [], cardsDrawn: 0, landsPlayed: 0, history: [...state.history, entry], eventOwnerPlayerId: null };
      }
      return { ...state, screen: "opponent-turn", isMyTurn: false, activePhaseView: null, currentPlayerIndex: nextIdx, opponentPhaseIndex: 0, history: [...state.history, entry], eventOwnerPlayerId: null };
    }
    case "END_MY_TURN": {
      const nextIdx = (state.currentPlayerIndex + 1) % state.turnOrder.length;
      const nextPlayer = state.players.find(p => p.id === state.turnOrder[nextIdx]);
      const entry = logEntry(state, `→ ${nextPlayer?.name ?? "Next Player"}'s turn`);
      if (nextPlayer?.isUser) {
        const newTurnNum = state.turnNumber + 1;
        const resetR = resetPhaseReminders(state.reminders);
        const activatedR = activatePhaseReminders(resetR, PHASES[0], true);
        const reminders = resetEventReminderTurnFlags(activatedR);
        return { ...state, screen: "game", isMyTurn: true, activePhaseView: null, phaseIndex: 0, turnNumber: newTurnNum, phaseLocked: false, currentPlayerIndex: nextIdx, reminders, pendingReminderFires: [], cardsDrawn: 0, landsPlayed: 0, history: [...state.history, entry], eventOwnerPlayerId: null };
      }
      return { ...state, screen: "opponent-turn", isMyTurn: false, activePhaseView: null, currentPlayerIndex: nextIdx, opponentPhaseIndex: 0, history: [...state.history, entry], eventOwnerPlayerId: null };
    }
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
      const gyEntry: GraveyardEntry = { id: `gy-${Date.now()}`, name: sp.name, type: sp.type, turnNumber: state.turnNumber, phase: PHASES[state.phaseIndex], timestamp: Date.now(), source: action.source, playerId: sp.playerId };
      const entry = logEntry(state, `☠ ${sp.name} → graveyard (${action.source})`);
      const gyEvents = action.source === "died"
        ? (sp.type === "Creature" ? ["Creature dies", "Creature enters your graveyard", "Card enters your graveyard"] : ["Card enters your graveyard"])
        : action.source === "sacrificed"
        ? ["Creature is sacrificed", "Card enters your graveyard"]
        : ["Card enters your graveyard"];
      const currentPhase = PHASES[state.phaseIndex];
      const firedR = getMatchingEventReminders(state.reminders, gyEvents, currentPhase, state.isMyTurn);
      const firedUpdated = recordEventReminderFires(state.reminders, firedR);
      const finalReminders = deactivateRemindersForSpell(firedUpdated, action.spellId);
      const newInstances: ReminderFireInstance[] = firedR.map(r => ({ id: `fire-${r.id}-${Date.now()}-${Math.random()}`, reminderId: r.id, firedPhase: currentPhase, firedTurn: state.turnNumber, triggeredByUser: state.isMyTurn }));
      return {
        ...state,
        spellLog: state.spellLog.map(x => x.id === action.spellId ? { ...x, zone: "graveyard" as const } : x),
        graveyard: [...state.graveyard, gyEntry],
        reminders: finalReminders,
        pendingReminderFires: [...state.pendingReminderFires, ...newInstances],
        history: [...state.history, entry],
      };
    }
    case "MOVE_TO_EXILE": {
      const sp = state.spellLog.find(x => x.id === action.spellId);
      if (!sp) return state;
      const exEntry: ExileEntry = { id: `ex-${Date.now()}`, name: sp.name, type: sp.type, turnNumber: state.turnNumber, phase: PHASES[state.phaseIndex], timestamp: Date.now(), playerId: sp.playerId };
      const entry = logEntry(state, `↗ ${sp.name} → exile`);
      const finalReminders = deactivateRemindersForSpell(state.reminders, action.spellId);
      return {
        ...state,
        spellLog: state.spellLog.map(x => x.id === action.spellId ? { ...x, zone: "exile" as const } : x),
        exile: [...state.exile, exEntry],
        reminders: finalReminders,
        history: [...state.history, entry],
      };
    }
    case "RETURN_FROM_GY": {
      const gy = state.graveyard.find(x => x.id === action.gyEntryId);
      if (!gy) return state;
      const returned: CastSpell = { id: `spell-${Date.now()}`, name: gy.name, type: gy.type, turnNumber: state.turnNumber, phase: PHASES[state.phaseIndex], zone: "active", isToken: false };
      const entry = logEntry(state, `↩ Returned to battlefield: ${gy.name}`);
      return { ...state, graveyard: state.graveyard.filter(x => x.id !== action.gyEntryId), spellLog: [...state.spellLog, returned], history: [...state.history, entry] };
    }
    case "RETURN_FROM_EXILE": {
      const ex = state.exile.find(x => x.id === action.exileEntryId);
      if (!ex) return state;
      const returned: CastSpell = { id: `spell-${Date.now()}`, name: ex.name, type: ex.type, turnNumber: state.turnNumber, phase: PHASES[state.phaseIndex], zone: "active", isToken: false };
      const entry = logEntry(state, `↩ Returned from exile: ${ex.name}`);
      return { ...state, exile: state.exile.filter(x => x.id !== action.exileEntryId), spellLog: [...state.spellLog, returned], history: [...state.history, entry] };
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
      const entryMsg = fire.triggeredByUser
        ? `✓ ${r.name}: resolved`
        : `📋 ${r.name}: noted (opponent's action — no effect applied to your stats)`;
      const entry = logEntry(state, entryMsg, myPlayerId);
      if (!fire.triggeredByUser) {
        return { ...state, pendingReminderFires: state.pendingReminderFires.filter(x => x.id !== action.fireId), history: [...state.history, entry] };
      }
      const result = applyImmediateEffects(r);
      const lifePlayerId = getActivePlayerId(state, myPlayerId);
      let players = state.players;
      if (result.lifeDelta) {
        players = updatePlayerLife(players, lifePlayerId, l => l + (result.lifeDelta ?? 0));
      }
      let life = players.find(p => p.isUser)?.life ?? state.life;
      let cardsDrawn = state.cardsDrawn + (result.cardsDrawnDelta ?? 0);
      let landsPlayed = state.landsPlayed + (result.landsPlayedDelta ?? 0);
      let manaPool = { ...state.manaPool };
      let spellLog = state.spellLog;
      if (result.manaAdded) {
        for (const m of result.manaAdded) {
          const ck = m.color as keyof ManaPool;
          manaPool = { ...manaPool, [ck]: { ...manaPool[ck], manual: manaPool[ck].manual + m.amount } };
        }
      }
      if ((result.landsPlayedDelta ?? 0) > 0) {
        const landSpell: CastSpell = {
          id: `spell-${Date.now()}-${Math.random()}`,
          name: "Land", type: "Land", isToken: false,
          turnNumber: state.turnNumber, phase: PHASES[state.phaseIndex],
          zone: "active", playerId: state.turnOrder[state.currentPlayerIndex],
        };
        spellLog = [...state.spellLog, landSpell];
      }
      const histEntries = [entry];
      if (result.logMessage) histEntries.push(logEntry(state, result.logMessage, myPlayerId));
      return { ...state, players, life, cardsDrawn, landsPlayed, spellLog, manaPool, pendingReminderFires: state.pendingReminderFires.filter(x => x.id !== action.fireId), history: [...state.history, ...histEntries] };
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
    default: return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, INIT);
  if (state.screen === "menu") return <MenuScreen dispatch={dispatch} />;
  if (state.screen === "setup") return <SetupScreen dispatch={dispatch} />;
  return <GameScreen state={state} dispatch={dispatch} />;
}

function MenuScreen({ dispatch }: { dispatch: React.Dispatch<Action> }) {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.menuContainer}>
        <View style={s.menuHeader}>
          <Text style={s.menuTitle}>MTG</Text>
          <Text style={s.menuSubtitle}>PHASE REMINDER</Text>
          <View style={s.menuDivider} />
          <Text style={s.menuTagline}>Track phases. Remember everything.</Text>
        </View>
        <View style={s.menuButtons}>
          <TouchableOpacity style={s.menuBtn} onPress={() => dispatch({ type: "GO_SETUP" })} activeOpacity={0.85}>
            <Text style={s.menuBtnIcon}>⚔️</Text>
            <View><Text style={s.menuBtnText}>Play Game</Text><Text style={s.menuBtnSub}>Start a new game</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={[s.menuBtn, s.menuBtnDim]} activeOpacity={0.6}>
            <Text style={s.menuBtnIcon}>🔄</Text>
            <View><Text style={[s.menuBtnText, { color: C.muted }]}>Continue Game</Text><Text style={s.menuBtnSub}>Coming soon</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={[s.menuBtn, s.menuBtnDim]} activeOpacity={0.6}>
            <Text style={s.menuBtnIcon}>⚙️</Text>
            <View><Text style={[s.menuBtnText, { color: C.muted }]}>Settings</Text><Text style={s.menuBtnSub}>Coming soon</Text></View>
          </TouchableOpacity>
        </View>
        <Text style={s.version}>MTG Phase Reminder • MVP v1.0</Text>
      </View>
    </SafeAreaView>
  );
}

function SetupScreen({ dispatch }: { dispatch: React.Dispatch<Action> }) {
  const [step, setStep] = useState(1);
  const [gameType, setGameType] = useState("commander");
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>(["Player 1", "Player 2"]);
  const [firstPlayerIdx, setFirstPlayerIdx] = useState(0);
  const [life, setLife] = useState(40);

  const gameTypes = [
    { key: "commander", label: "Commander", life: 40, desc: "40 life, EDH format" },
    { key: "standard", label: "Standard", life: 20, desc: "20 life, 1v1" },
    { key: "custom", label: "Custom", life: 20, desc: "Set your own rules" },
  ];

  function handlePlayerCountChange(count: number) {
    setPlayerCount(count);
    setPlayerNames(prev => {
      const next = [...prev];
      while (next.length < count) next.push(`Player ${next.length + 1}`);
      return next.slice(0, count);
    });
    if (firstPlayerIdx >= count) setFirstPlayerIdx(0);
  }

  function handleStartGame() {
    const players: Player[] = playerNames.map((name, i) => ({
      id: `p${i + 1}`, name: name.trim() || `Player ${i + 1}`,
      isUser: i === 0, life,
    }));
    const ids = players.map(p => p.id);
    const turnOrder = [...ids.slice(firstPlayerIdx), ...ids.slice(0, firstPlayerIdx)];
    dispatch({ type: "START_GAME", playerName: players[0].name, life, gameType, players, turnOrder, firstPlayerIndex: firstPlayerIdx });
  }

  const canAdvance1 = true;
  const canAdvance2 = playerNames.every(n => n.trim().length > 0);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.setupContainer} keyboardShouldPersistTaps="handled">
        <View style={s.setupTopRow}>
          <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : dispatch({ type: "GO_MENU" })}>
            <Text style={s.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.setupTitle}>Game Setup</Text>
          <Text style={[s.gameTypeDesc, { width: 60, textAlign: "right" }]}>{step} / 4</Text>
        </View>

        {step === 1 && (
          <>
            <Text style={s.sectionLabel}>Game Type</Text>
            {gameTypes.map(gt => (
              <TouchableOpacity key={gt.key} style={[s.gameTypeCard, gameType === gt.key && s.gameTypeCardActive]} onPress={() => { setGameType(gt.key); setLife(gt.life); }}>
                <Text style={[s.gameTypeLabel, gameType === gt.key && { color: C.text }]}>{gt.label}</Text>
                <Text style={s.gameTypeDesc}>{gt.desc}</Text>
              </TouchableOpacity>
            ))}
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>Number of Players</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <TouchableOpacity key={n} style={[s.preset, playerCount === n && s.presetActive]} onPress={() => handlePlayerCountChange(n)}>
                  <Text style={[s.presetText, playerCount === n && { color: C.text }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[s.startBtn, !canAdvance1 && { opacity: 0.4 }]} onPress={() => setStep(2)}>
              <Text style={s.startBtnText}>Next →</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={s.sectionLabel}>Player Names</Text>
            {playerNames.map((name, i) => (
              <View key={i} style={{ marginBottom: 12 }}>
                <Text style={[s.gameTypeDesc, { marginBottom: 6 }]}>{i === 0 ? "You (Player 1)" : `Player ${i + 1}`}</Text>
                <TextInput
                  style={s.input}
                  value={name}
                  onChangeText={text => setPlayerNames(prev => { const n = [...prev]; n[i] = text; return n; })}
                  placeholder={i === 0 ? "Your name" : `Player ${i + 1}`}
                  placeholderTextColor={C.dim}
                  maxLength={24}
                />
              </View>
            ))}
            <TouchableOpacity style={[s.startBtn, !canAdvance2 && { opacity: 0.4 }]} onPress={() => setStep(3)} disabled={!canAdvance2}>
              <Text style={s.startBtnText}>Next →</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={s.sectionLabel}>Who Goes First?</Text>
            {playerNames.map((name, i) => (
              <TouchableOpacity key={i} style={[s.gameTypeCard, firstPlayerIdx === i && s.gameTypeCardActive]} onPress={() => setFirstPlayerIdx(i)}>
                <Text style={[s.gameTypeLabel, firstPlayerIdx === i && { color: C.text }]}>{name.trim() || `Player ${i + 1}`}{i === 0 ? " (You)" : ""}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.startBtn} onPress={() => setStep(4)}>
              <Text style={s.startBtnText}>Next →</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 4 && (
          <>
            <Text style={s.sectionLabel}>Starting Life</Text>
            <View style={s.lifePickRow}>
              <TouchableOpacity style={s.lifePickBtn} onPress={() => setLife(l => Math.max(1, l - 1))}><Text style={s.lifePickBtnText}>−</Text></TouchableOpacity>
              <Text style={s.lifePickVal}>{life}</Text>
              <TouchableOpacity style={s.lifePickBtn} onPress={() => setLife(l => l + 1)}><Text style={s.lifePickBtnText}>+</Text></TouchableOpacity>
            </View>
            <View style={s.presetRow}>
              {[20, 30, 40].map(v => (
                <TouchableOpacity key={v} style={[s.preset, life === v && s.presetActive]} onPress={() => setLife(v)}>
                  <Text style={[s.presetText, life === v && { color: C.text }]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.startBtn} onPress={handleStartGame}>
              <Text style={s.startBtnText}>⚔️  Start Game</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function GameScreen({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const [confirmModal, setConfirmModal] = useState(false);
  const [hubModal, setHubModal] = useState(false);
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
  const [editSpellName, setEditSpellName] = useState("");
  const [editSpellType, setEditSpellType] = useState<string | null>(null);
  const [manaModal, setManaModal] = useState(false);
  const [treasureColorModal, setTreasureColorModal] = useState(false);
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
  const [gainLoseLifeModal, setGainLoseLifeModal] = useState(false);
  const [millModal, setMillModal] = useState(false);
  const [tutorModal, setTutorModal] = useState(false);
  const [dealDamageModal, setDealDamageModal] = useState(false);
  const [copyModal, setCopyModal] = useState(false);
  const [manaEventAmounts, setManaEventAmounts] = useState<Record<string, number>>({ white: 0, blue: 0, black: 0, red: 0, green: 0, colorless: 0 });
  const [gainLoseMode, setGainLoseMode] = useState<"gain" | "lose">("gain");
  const [gainLoseQty, setGainLoseQty] = useState(1);
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
  const [spellManaValue, setSpellManaValue] = useState<string>("");
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
  // Unified reminder builder state
  const [ubName, setUbName] = useState("");
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

  const phase = PHASES[state.phaseIndex];
  const { extraLandPlays } = getPassiveEffects(state.reminders);
  const canPlayExtraLands = extraLandPlays > 0;
  const isOppTurn = !state.isMyTurn;
  const currentTurnPlayerId = state.turnOrder[state.currentPlayerIndex];
  const displayLands = isOppTurn
    ? state.spellLog.filter(sp =>
        sp.type === "Land" &&
        sp.playerId === currentTurnPlayerId &&
        sp.turnNumber === state.turnNumber
      ).length
    : state.landsPlayed;
  const accentColor = isOppTurn ? "#F59E0B" : C.accent;
  const accentDimColor = isOppTurn ? "#1A1200" : C.accentDim;
  const [confirmedOppPhases, setConfirmedOppPhases] = useState<string[]>([]);
  const [confirmedMyPhases, setConfirmedMyPhases] = useState<string[]>([]);
  const [cleanupModal, setCleanupModal] = useState(false);
  const activePhase = state.activePhaseView ?? phase;
  const activeReminders = state.reminders.filter(r => {
    if (r.fireMode !== "phase") return false;
    if (r.status === "resolved") return false;
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

    return r.status === "active" || r.status === "pending" || r.status === "skipped";
  });
  const unresolved = activeReminders.filter(r => r.status === "active" || r.status === "pending");
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [rainbowIndex, setRainbowIndex] = useState(0);

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
    const anyOpen =
      spellModal || spellDetailModal || drawModal || creatureModal ||
      landModal || tokenModal || addManaModal || othersModal ||
      gainLoseLifeModal || genericEvent !== null;
    if (!anyOpen) {
      hubOwnerRef.current = null;
      dispatch({ type: "RESET_EVENT_OWNER" });
    }
  }, [spellModal, spellDetailModal, drawModal, creatureModal, landModal,
      tokenModal, addManaModal, othersModal, gainLoseLifeModal, genericEvent]);

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

  function resetSpellDetailForm() {
    setSpellSupertype(null);
    setSpellSubtype(null);
    setSpellSubtype2(null);
    setSpellPower("");
    setSpellToughness("");
    setSpellManaValue("");
    setSpellAbilities([]);
    setSpellLoyalty("");
    setSpellDefense("");
    setSpellProduces(null);
    setSpellAttachedTo("");
    setSpellEffectNote("");
    setSubtypeSearch("");
  }

  function resetReminderBuilder() {
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

  function openReminderBuilderForEvent(event: string) {
    resetReminderBuilder();
    setUbFireMode("event");
    setUbTriggerEvent(event);
    setUbFrequency("each-time");
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
    if (id === "spell-cast") { setSelectedSpell(null); setSpellName(""); setSpellNameSuggestions([]); setSpellModal(true); }
    else if (id === "land-played") { setLandQty(1); setLandModal(true); }
    else if (id === "cards-drawn-discarded") { setDrawQty(0); setDiscardQty(0); setDrawModal(true); }
    else if (id === "creature-died") { setCreatureName(""); setCreatureModal(true); }
    else if (id === "token-created") { setTokenSearch(""); setSelectedToken(null); setTokenQty(1); setTokenModal(true); }
    else if (id === "add-mana") { setManaEventAmounts({ white: 0, blue: 0, black: 0, red: 0, green: 0, colorless: 0 }); setAddManaModal(true); }
    else if (id === "others") { setOthersModal(true); }
    else { setGenericNote(""); setGenericEvent(id); }
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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-start", marginBottom: 6 }}>
            <View>
              <Text style={[s.topPlayerName, { fontSize: 18 }]}>{currentPlayer?.name ?? state.playerName}</Text>
              <Text style={[s.statLabel, { marginTop: 2 }]}>
                {isOppTurn ? "Opponent's Turn" : "Your Turn"} · Turn {state.turnNumber}
              </Text>
            </View>
          </View>
          {isOppTurn && (
            <View style={{ backgroundColor: "#1A1200", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#F59E0B", alignSelf: "flex-start" }}>
              <Text style={{ color: "#F59E0B", fontSize: 11, fontWeight: "700" }}>⚡ Opponent's Turn — tap any phase</Text>
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
                  isActive && !isOppTurn && { borderColor: accentColor, backgroundColor: accentDimColor },
                  isActive && isOppTurn && s.phaseListCardOpp,
                  isDone && { borderColor: C.success },
                ]}
                onPress={() => dispatch({ type: "SET_ACTIVE_PHASE", phase: ph })}
                activeOpacity={0.75}
              >
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {isActive && !isOppTurn && <Text style={{ fontSize: 12, color: accentColor }}>▶</Text>}
                    {isActive && isOppTurn && <Text style={{ fontSize: 12, color: "#F59E0B" }}>▶</Text>}
                    <Text style={{
                      fontSize: 16, fontWeight: "700",
                      color: isDone ? C.success : isActive ? (isOppTurn ? "#F59E0B" : accentColor) : C.text
                    }}>{ph}</Text>
                  </View>
                  <Text style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>
                    Phase {i + 1} of {PHASES.length}{ph === "Cleanup" ? (isOppTurn ? " — ends opponent's turn" : " — ends your turn") : ""}
                  </Text>
                </View>
                {isDone
                  ? <Text style={{ color: C.success, fontSize: 18, fontWeight: "700" }}>✓</Text>
                  : <Text style={{ color: isOppTurn ? "#F59E0B" : accentColor, fontSize: 22 }}>›</Text>
                }
              </TouchableOpacity>
            );
          })}

        </ScrollView>

        {/* HUB BUTTON */}
        <View style={{ position: "absolute", bottom: 40, right: 16 }}>
          <TouchableOpacity style={[s.bottomBarHub, isOppTurn && { backgroundColor: "#F59E0B" }]} onPress={() => setHubModal(true)} activeOpacity={0.85}>
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
          <View style={[s.turnBadge, isOppTurn && { backgroundColor: "#1A1200", borderColor: "#F59E0B" }]}>
            <Text style={[s.turnBadgeText, isOppTurn && { color: "#F59E0B" }]}>
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
        <View style={[s.card, isOppTurn && { borderColor: "#F59E0B" }]}>
          <View style={{ alignItems: "center", paddingHorizontal: 14, paddingTop: 14, marginBottom: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {state.phaseLocked && !isOppTurn && <Text style={{ fontSize: 16 }}>🔒</Text>}
              {isOppTurn && <Text style={{ fontSize: 16, color: "#F59E0B" }}>⚡</Text>}
              <Text style={[s.phaseName, isOppTurn && { color: "#F59E0B" }]}>{activePhase}</Text>
            </View>
            <Text style={[s.phaseProgress, { marginTop: 8 }]}>
              {isOppTurn ? "Opponent's Turn" : `Phase ${state.phaseIndex + 1} of ${PHASES.length}`}
            </Text>
          </View>
          <View style={s.dotRowContainer}>
            {PHASES.map((ph, i) => {
              const isThis = ph === activePhase;
              const isPast = isOppTurn ? confirmedOppPhases.includes(ph) : i < state.phaseIndex;
              return <View key={i} style={[s.dot, isThis && { ...s.dotActive, backgroundColor: isOppTurn ? "#F59E0B" : C.accent }, isPast && s.dotPast]} />;
            })}
          </View>
        </View>

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
                <Text style={{ color: C.accent, fontSize: 12, fontWeight: "700" }}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 6 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {activeReminders.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 28 }}><Text style={{ color: C.dim, fontSize: 13 }}>No reminders for this phase.</Text></View>
            ) : activeReminders.map(r => (
              <View key={r.id} style={[s.reminderItem, r.status !== "pending" && { opacity: 0.55 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.reminderTitle}>{r.name}</Text>
                  {r.description ? <Text style={s.reminderDesc}>{r.description}</Text> : null}
                </View>
                {(r.status === "active" || r.status === "pending") && (
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TouchableOpacity style={s.resolveBtn} onPress={() => dispatch({ type: "RESOLVE_REMINDER", id: r.id })}><Text style={s.resolveBtnText}>Resolve</Text></TouchableOpacity>
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

        {/* SPELL LOG PREVIEW */}
        {state.spellLog.length > 0 && (
          <>
            <View style={s.card}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>Spells Cast</Text>
                <TouchableOpacity onPress={() => setSpellLogModal(true)}><Text style={{ color: C.accent, fontSize: 12, fontWeight: "700" }}>View All</Text></TouchableOpacity>
              </View>
              {state.spellLog.filter(sp => sp.zone === "active").slice(-3).reverse().map(sp => {
                const spellOwnerColor = sp.playerId
                  ? (state.players.find(p => p.id === sp.playerId)?.isUser ? C.accent : "#F59E0B")
                  : C.border;
                return (
                  <View key={sp.id} style={[s.reminderItem, { borderLeftWidth: 3, borderLeftColor: spellOwnerColor }]}>
                    <Text style={{ fontSize: 18 }}>{typeIcons[sp.type] ?? "★"}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.reminderTitle}>{sp.name}</Text>
                      <Text style={s.reminderDesc}>{[sp.supertype, sp.type, (sp.subtype || sp.subtype2) ? `— ${[sp.subtype, sp.subtype2].filter(Boolean).join("/")}` : null, (sp.power !== undefined && sp.toughness !== undefined) ? `${sp.power}/${sp.toughness}` : null, sp.currentLoyalty !== undefined ? `👁 ${sp.currentLoyalty}` : null, sp.currentDefense !== undefined ? `⚔ ${sp.currentDefense}` : null, `· T${sp.turnNumber}`, sp.zone !== "active" ? `· ${sp.zone === "graveyard" ? "GY" : "Exile"}` : null, sp.playerId ? `· ${state.players.find(p => p.id === sp.playerId)?.name ?? sp.playerId}` : null].filter(Boolean).join(" ")}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={{ height: 10 }} />
          </>
        )}

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
          style={[s.bottomBarConfirm, isOppTurn
            ? { backgroundColor: "#1A1200", borderColor: "#F59E0B" }
            : s.confirmBtnOk
          ]}
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
          <Text style={[s.bottomBarConfirmText, isOppTurn && { color: "#F59E0B" }]}>
            {isOppTurn
              ? (confirmedOppPhases.includes(state.activePhaseView ?? "") ? "✕ Unconfirm Phase" : "✓ Phase Done")
              : (confirmedMyPhases.includes(state.activePhaseView ?? "") ? "✕ Unconfirm Phase" : "✓ Phase Done")
            }
          </Text>
        </TouchableOpacity>

        {/* END MY TURN — only shown on Cleanup on your turn */}
        {!isOppTurn && state.activePhaseView === "Cleanup" && (
          <TouchableOpacity
            style={[s.bottomBarConfirm, { backgroundColor: C.accentDim, borderColor: C.accent, marginLeft: 8 }]}
            onPress={() => setCleanupModal(true)}
            activeOpacity={0.85}
          >
            <Text style={s.bottomBarConfirmText}>✓ End My Turn</Text>
          </TouchableOpacity>
        )}

        {/* END OPPONENT TURN — only shown on Cleanup on opponent's turn */}
        {isOppTurn && state.activePhaseView === "Cleanup" && (
          <TouchableOpacity
            style={[s.bottomBarConfirm, { backgroundColor: "#1A1200", borderColor: "#F59E0B", marginLeft: 8 }]}
            onPress={() => dispatch({ type: "END_OPPONENT_TURN" })}
            activeOpacity={0.85}
          >
            <Text style={[s.bottomBarConfirmText, { color: "#F59E0B" }]}>✓ End Opp Turn</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[s.bottomBarHub, isOppTurn && { backgroundColor: "#F59E0B" }]} onPress={() => setHubModal(true)} activeOpacity={0.85}>
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
                    style={[s.actionBtn, s.closeBtnStyle]}
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
                    style={[s.actionBtn, s.closeBtnStyle]}
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
            <TouchableOpacity style={[s.actionBtn, s.closeBtnStyle, { marginTop: 8 }]} onPress={() => setConfirmModal(false)}><Text style={s.closeBtnText}>Go Back & Resolve</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* HUB MODAL */}
      <Modal visible={hubModal} transparent animationType="slide" onRequestClose={() => setHubModal(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={() => setHubModal(false)} />
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
                !isOppTurn ? { icon: "⚔️", label: "Battlefield", sub: "Coming soon", action: () => {} } : null,
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
            <TouchableOpacity style={s.closeBtn} onPress={() => setHubModal(false)}><Text style={s.closeBtnText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* HUB GAME EVENTS MODAL */}
      <Modal visible={hubEventsModal} transparent animationType="slide" onRequestClose={() => setHubEventsModal(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={() => setHubEventsModal(false)} />
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
              const selectorAccent = isOwnerUser ? C.accent : "#F59E0B";
              const selectorDim = isOwnerUser ? C.accentDim : "#1A1200";
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

            <TouchableOpacity style={[s.closeBtn, { marginTop: 8 }]} onPress={() => setHubEventsModal(false)}>
              <Text style={s.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
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
              style={[s.closeBtn, { marginBottom: 8, backgroundColor: C.dangerDim, borderColor: C.danger }]}
              onPress={() => dispatch({ type: "RESET_AUTO_MANA" })}
            >
              <Text style={[s.closeBtnText, { color: C.danger }]}>Reset Auto Mana</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.closeBtn, { marginBottom: 8, backgroundColor: C.warningDim, borderColor: C.warning }]}
              onPress={() => dispatch({ type: "RESET_MANUAL_MANA" })}
            >
              <Text style={[s.closeBtnText, { color: C.warning }]}>Reset Manual Mana</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.closeBtn} onPress={() => setManaModal(false)}>
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
                      const tgyEntry: TokenGYEntry = {
                        id: `tgy-${Date.now()}-${Math.random()}`,
                        name: activeSpell.name,
                        tokenCategory: "resource",
                        action: "cracked",
                        turnNumber: state.turnNumber,
                        phase: PHASES[state.phaseIndex],
                        timestamp: Date.now(),
                        playerId: activeSpell.playerId,
                      };
                      dispatch({ type: "ADD_TOKEN_TO_GY", entry: tgyEntry });
                      dispatch({ type: "DELETE_SPELL", id: activeSpell.id });
                      dispatch({ type: "ADD_MANUAL_MANA", color: c.key, amount: 1 });
                      dispatch({ type: "LOG", message: `Cracked Treasure for 1 ${c.label} mana` });
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
            <TouchableOpacity style={s.closeBtn} onPress={() => setTreasureColorModal(false)}>
              <Text style={s.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
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
            <TouchableOpacity style={[s.actionBtn, s.closeBtnStyle]} onPress={() => setEndGameModal(false)}>
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
              const tabs = [{ id: "all", label: "All" }, ...playerIds.map(id => {
                const p = state.players.find(pl => pl.id === id);
                return { id, label: p?.name ?? id };
              })];
              const filtered = historyTab === "all"
                ? state.history
                : state.history.filter(e => e.playerId === historyTab);
              return (
                <>
                  {tabs.length > 1 && (
                    <View style={[s.gyTabRow, { flexWrap: "wrap" }]}>
                      {tabs.map(tab => (
                        <TouchableOpacity
                          key={tab.id}
                          onPress={() => setHistoryTab(tab.id)}
                          style={[s.gyTab, historyTab === tab.id ? s.gyTabActive : s.gyTabInactive]}
                        >
                          <Text style={s.gyTabText}>{tab.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {filtered.length === 0 ? (
                    <Text style={{ color: C.dim, textAlign: "center", paddingVertical: 24 }}>No events logged yet.</Text>
                  ) : (
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
                      {[...filtered].reverse().map(entry => (
                        <View key={entry.id} style={[s.reminderItem, { flexDirection: "column", gap: 2 }]}>
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: C.accent }}>T{entry.turnNumber}</Text>
                            <Text style={{ fontSize: 11, color: C.muted }}>{entry.phase}</Text>
                          </View>
                          <Text style={{ fontSize: 13, color: C.text }}>{entry.message}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </>
              );
            })()}
            <TouchableOpacity style={[s.closeBtn, { marginTop: 8 }]} onPress={() => setHistoryModal(false)}><Text style={s.closeBtnText}>Close</Text></TouchableOpacity>
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
            {state.spellLog.length === 0 ? (
              <Text style={{ color: C.dim, textAlign: "center", paddingVertical: 24 }}>No spells cast yet.</Text>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
                {/* Active spells */}
                {state.spellLog.filter(sp => sp.zone === "active").length > 0 && (
                  <>
                    <Text style={[s.sectionLabel, { paddingHorizontal: 14, paddingTop: 8 }]}>On Battlefield</Text>
                    {state.spellLog.filter(sp => sp.zone === "active").map(sp => {
                      const spellOwnerColor = sp.playerId
                        ? (state.players.find(p => p.id === sp.playerId)?.isUser ? C.accent : "#F59E0B")
                        : C.border;
                      return (
                        <TouchableOpacity key={sp.id} style={[s.reminderItem, { borderLeftWidth: 3, borderLeftColor: spellOwnerColor }]} onPress={() => { setActiveSpell(sp); setSpellLogModal(false); setSpellActionModal(true); }} activeOpacity={0.7}>
                          <Text style={{ fontSize: 18 }}>{typeIcons[sp.type] ?? "★"}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={s.reminderTitle}>{sp.name}</Text>
                            <Text style={s.reminderDesc}>{[sp.supertype, sp.type, (sp.subtype || sp.subtype2) ? `— ${[sp.subtype, sp.subtype2].filter(Boolean).join("/")}` : null, (sp.power !== undefined && sp.toughness !== undefined) ? `${sp.power}/${sp.toughness}` : null, sp.currentLoyalty !== undefined ? `👁 ${sp.currentLoyalty}` : null, `· T${sp.turnNumber}`, sp.playerId ? `· ${state.players.find(p => p.id === sp.playerId)?.name ?? sp.playerId}` : null].filter(Boolean).join(" ")}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}
                {/* Historical spells — GY and Exile */}
                {state.spellLog.filter(sp => sp.zone !== "active").length > 0 && (
                  <>
                    <Text style={[s.sectionLabel, { paddingHorizontal: 14, paddingTop: 12 }]}>Left Battlefield</Text>
                    {state.spellLog.filter(sp => sp.zone !== "active").map(sp => {
                      const spellOwnerColor = sp.playerId
                        ? (state.players.find(p => p.id === sp.playerId)?.isUser ? C.accent : "#F59E0B")
                        : C.border;
                      return (
                        <View key={sp.id} style={[s.reminderItem, { opacity: 0.5, borderLeftWidth: 3, borderLeftColor: spellOwnerColor }]}>
                          <Text style={{ fontSize: 18 }}>{typeIcons[sp.type] ?? "★"}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={s.reminderTitle}>{sp.name}</Text>
                            <Text style={s.reminderDesc}>{[sp.supertype, sp.type, `· T${sp.turnNumber}`, sp.zone === "graveyard" ? "· GY" : "· Exile", sp.playerId ? `· ${state.players.find(p => p.id === sp.playerId)?.name ?? sp.playerId}` : null].filter(Boolean).join(" ")}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </>
                )}
              </ScrollView>
            )}
            <TouchableOpacity style={[s.closeBtn, { marginTop: 8 }]} onPress={() => setSpellLogModal(false)}><Text style={s.closeBtnText}>Close</Text></TouchableOpacity>
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
              const baseName = spell.name.replace(/^\d+x /, "");
              const makeTGY = (a: "cracked" | "sacrificed"): TokenGYEntry => ({
                id: `tgy-${Date.now()}`, name: spell.name, tokenCategory: "resource",
                action: a, turnNumber: state.turnNumber, phase: PHASES[state.phaseIndex], timestamp: Date.now(),
                playerId: spell.playerId,
              });
              const sacrificeToken = (logMsg: string) => {
                dispatch({ type: "ADD_TOKEN_TO_GY", entry: makeTGY("sacrificed") });
                dispatch({ type: "DELETE_SPELL", id: spell.id });
                dispatch({ type: "LOG", message: logMsg });
                setSpellActionModal(false);
              };
              const deleteToken = (logMsg: string) => {
                dispatch({ type: "DELETE_SPELL", id: spell.id });
                dispatch({ type: "LOG", message: logMsg });
                setSpellActionModal(false);
              };
              const cancelBtn = (
                <TouchableOpacity style={[s.actionBtn, s.closeBtnStyle]} onPress={() => setSpellActionModal(false)}>
                  <Text style={s.closeBtnText}>Cancel</Text>
                </TouchableOpacity>
              );

              if (baseName.includes("Treasure")) return (<>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 8 }]}
                  onPress={() => { setSpellActionModal(false); setTreasureColorModal(true); }}>
                  <Text style={s.confirmBtnText}>◈ Crack</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]}
                  onPress={() => sacrificeToken("Treasure sacrificed")}>
                  <Text style={s.confirmBtnText}>⚔ Sacrifice</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]}
                  onPress={() => deleteToken("Treasure deleted")}>
                  <Text style={s.confirmBtnText}>✕ Delete</Text>
                </TouchableOpacity>
                {cancelBtn}
              </>);

              if (baseName.includes("Food")) return (<>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 8 }]}
                  onPress={() => { dispatch({ type: "CHANGE_LIFE_SILENT", delta: 3, playerId: activeSpell?.playerId ?? currentTurnPlayerId }); sacrificeToken("Food used: gained 3 life"); }}>
                  <Text style={s.confirmBtnText}>Use — Gain 3 Life</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]}
                  onPress={() => sacrificeToken("Food sacrificed")}>
                  <Text style={s.confirmBtnText}>⚔ Sacrifice</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]}
                  onPress={() => deleteToken("Food deleted")}>
                  <Text style={s.confirmBtnText}>✕ Delete</Text>
                </TouchableOpacity>
                {cancelBtn}
              </>);

              if (baseName.includes("Clue")) return (<>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 8 }]}
                  onPress={() => { dispatch({ type: "ADD_CARDS_DRAWN", amount: 1 }); sacrificeToken("Clue used: drew 1 card"); }}>
                  <Text style={s.confirmBtnText}>Use — Draw 1 Card</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]}
                  onPress={() => sacrificeToken("Clue sacrificed")}>
                  <Text style={s.confirmBtnText}>⚔ Sacrifice</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]}
                  onPress={() => deleteToken("Clue deleted")}>
                  <Text style={s.confirmBtnText}>✕ Delete</Text>
                </TouchableOpacity>
                {cancelBtn}
              </>);

              if (baseName.includes("Blood")) return (<>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 8 }]}
                  onPress={() => { dispatch({ type: "ADD_CARDS_DRAWN", amount: 1 }); sacrificeToken("Blood used: drew 1 card, discard 1"); }}>
                  <Text style={s.confirmBtnText}>Use — Draw 1, Discard 1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]}
                  onPress={() => sacrificeToken("Blood sacrificed")}>
                  <Text style={s.confirmBtnText}>⚔ Sacrifice</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]}
                  onPress={() => deleteToken("Blood deleted")}>
                  <Text style={s.confirmBtnText}>✕ Delete</Text>
                </TouchableOpacity>
                {cancelBtn}
              </>);

              if (baseName.includes("Map")) return (<>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 8 }]}
                  onPress={() => sacrificeToken("Map used: Scry 1")}>
                  <Text style={s.confirmBtnText}>Use — Scry 1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]}
                  onPress={() => sacrificeToken("Map sacrificed")}>
                  <Text style={s.confirmBtnText}>⚔ Sacrifice</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]}
                  onPress={() => deleteToken("Map deleted")}>
                  <Text style={s.confirmBtnText}>✕ Delete</Text>
                </TouchableOpacity>
                {cancelBtn}
              </>);

              return (<>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 8 }]}
                  onPress={() => sacrificeToken(`${spell.name} used`)}>
                  <Text style={s.confirmBtnText}>Use</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]}
                  onPress={() => sacrificeToken(`${spell.name} sacrificed`)}>
                  <Text style={s.confirmBtnText}>⚔ Sacrifice</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]}
                  onPress={() => deleteToken(`${spell.name} deleted`)}>
                  <Text style={s.confirmBtnText}>✕ Delete</Text>
                </TouchableOpacity>
                {cancelBtn}
              </>);
            })()}

            {/* Token — creature */}
            {activeSpell?.type === "Token" && activeSpell?.tokenCategory === "creature" && (<>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.dangerDim, borderColor: C.danger, marginBottom: 8 }]} onPress={() => {
                if (!activeSpell) return;
                dispatch({ type: "ADD_TOKEN_TO_GY", entry: { id: `tgy-${Date.now()}`, name: activeSpell.name, tokenCategory: "creature", action: "died", turnNumber: state.turnNumber, phase: PHASES[state.phaseIndex], timestamp: Date.now(), playerId: activeSpell.playerId } });
                dispatch({ type: "DELETE_SPELL", id: activeSpell.id });
                setSpellActionModal(false);
              }}>
                <Text style={s.confirmBtnText}>☠ Die</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.warningDim, borderColor: C.warning, marginBottom: 8 }]} onPress={() => {
                if (!activeSpell) return;
                dispatch({ type: "ADD_TOKEN_TO_GY", entry: { id: `tgy-${Date.now()}`, name: activeSpell.name, tokenCategory: "creature", action: "sacrificed", turnNumber: state.turnNumber, phase: PHASES[state.phaseIndex], timestamp: Date.now(), playerId: activeSpell.playerId } });
                dispatch({ type: "DELETE_SPELL", id: activeSpell.id });
                setSpellActionModal(false);
              }}>
                <Text style={s.confirmBtnText}>⚔ Sacrifice</Text>
              </TouchableOpacity>
            </>)}

            {/* Delete + Cancel — non-resource-token types only */}
            {!(activeSpell?.type === "Token" && activeSpell?.tokenCategory === "resource") && (<>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 8 }]} onPress={() => {
                if (activeSpell) {
                  setEditSpellName(activeSpell.name);
                  setEditSpellType(activeSpell.type);
                  setSpellSupertype(activeSpell.supertype ?? null);
                  setSpellSubtype(activeSpell.subtype ?? null);
                  setSpellSubtype2(activeSpell.subtype2 ?? null);
                  setSpellPower(activeSpell.power?.toString() ?? "");
                  setSpellToughness(activeSpell.toughness?.toString() ?? "");
                  setSpellManaValue(activeSpell.manaValue?.toString() ?? "");
                  setSpellAbilities(activeSpell.abilities ?? []);
                  setSpellLoyalty(activeSpell.currentLoyalty?.toString() ?? "");
                  setSpellDefense(activeSpell.currentDefense?.toString() ?? "");
                  setSpellProduces(activeSpell.produces ?? null);
                  setSpellAttachedTo(activeSpell.attachedTo ?? "");
                  setSpellEffectNote(activeSpell.effectNote ?? "");
                  setSubtypeSearch("");
                  setSpellActionModal(false);
                  setEditSpellModal(true);
                }
              }}>
                <Text style={s.confirmBtnText}>✎ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.confirmBtnWarn, { marginBottom: 8 }]} onPress={() => { if (activeSpell) dispatch({ type: "DELETE_SPELL", id: activeSpell.id }); setSpellActionModal(false); }}>
                <Text style={s.confirmBtnText}>✕ Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.closeBtnStyle]} onPress={() => setSpellActionModal(false)}>
                <Text style={s.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </>)}
          </View>
        </View>
      </Modal>

      {/* GY ENTRY ACTION MODAL */}
      <Modal visible={gyEntryActionModal} transparent animationType="fade" onRequestClose={() => setGyEntryActionModal(false)}>
        <View style={s.centeredOverlay}>
          <View style={s.centeredModal}>
            <Text style={{ fontSize: 22, marginBottom: 4 }}>{typeIcons[activeGYEntry?.type ?? ""] ?? "★"}</Text>
            <Text style={s.sheetTitle}>{activeGYEntry?.name}</Text>
            <Text style={[s.reminderDesc, { textAlign: "center", marginBottom: 16 }]}>{activeGYEntry?.type}</Text>
            <TouchableOpacity style={[s.actionBtn, s.confirmBtnOk, { marginBottom: 8 }]} onPress={() => { if (activeGYEntry) dispatch({ type: "RETURN_FROM_GY", gyEntryId: activeGYEntry.id }); setGyEntryActionModal(false); }}>
              <Text style={s.confirmBtnText}>↩ Return to Battlefield</Text>
            </TouchableOpacity>
            {activeGYEntry?.type === "Instant" && (
              <TouchableOpacity style={[s.actionBtn, s.confirmBtnOk, { marginBottom: 8 }]} onPress={() => { if (activeGYEntry) dispatch({ type: "RETURN_FROM_GY", gyEntryId: activeGYEntry.id }); setGyEntryActionModal(false); }}>
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
              setGyEntryActionModal(false);
            }}>
              <Text style={[s.confirmBtnText, { color: C.warning }]}>↗ Exile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.confirmBtnWarn, { marginBottom: 8 }]} onPress={() => { if (activeGYEntry) dispatch({ type: "DELETE_FROM_GY", gyEntryId: activeGYEntry.id }); setGyEntryActionModal(false); }}>
              <Text style={s.confirmBtnText}>✕ Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.closeBtnStyle]} onPress={() => setGyEntryActionModal(false)}>
              <Text style={s.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EXILE ENTRY ACTION MODAL */}
      <Modal visible={exileEntryActionModal} transparent animationType="fade" onRequestClose={() => setExileEntryActionModal(false)}>
        <View style={s.centeredOverlay}>
          <View style={s.centeredModal}>
            <Text style={{ fontSize: 22, marginBottom: 4 }}>{typeIcons[activeExileEntry?.type ?? ""] ?? "★"}</Text>
            <Text style={s.sheetTitle}>{activeExileEntry?.name}</Text>
            <Text style={[s.reminderDesc, { textAlign: "center", marginBottom: 16 }]}>{activeExileEntry?.type}</Text>
            <TouchableOpacity style={[s.actionBtn, s.confirmBtnOk, { marginBottom: 8 }]} onPress={() => { if (activeExileEntry) dispatch({ type: "RETURN_FROM_EXILE", exileEntryId: activeExileEntry.id }); setExileEntryActionModal(false); }}>
              <Text style={s.confirmBtnText}>↩ Return to Battlefield</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.confirmBtnWarn, { marginBottom: 8 }]} onPress={() => { if (activeExileEntry) dispatch({ type: "DELETE_FROM_EXILE", exileEntryId: activeExileEntry.id }); setExileEntryActionModal(false); }}>
              <Text style={s.confirmBtnText}>✕ Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.closeBtnStyle]} onPress={() => setExileEntryActionModal(false)}>
              <Text style={s.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* GY / EXILE MODAL */}
      <Modal visible={gyModal} transparent animationType="slide" onRequestClose={() => setGyModal(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={() => setGyModal(false)} />
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
                  const activeBg = p.isUser ? C.accentDim : "#1A1200";
                  const activeBorder = p.isUser ? C.accent : "#F59E0B";
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
                        <Text style={s.reminderDesc}>{[entry.type, `T${entry.turnNumber}`, entry.source, entry.playerId ? state.players.find(p => p.id === entry.playerId)?.name : null].filter(Boolean).join(" · ")}</Text>
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
                        <Text style={s.reminderDesc}>{[entry.type, `T${entry.turnNumber}`, entry.playerId ? state.players.find(p => p.id === entry.playerId)?.name : null].filter(Boolean).join(" · ")}</Text>
                      </View>
                      <Text style={{ fontSize: 18, color: C.dim }}>›</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              );
            })()}
            <TouchableOpacity style={[s.closeBtn, { marginTop: 8 }]} onPress={() => setGyModal(false)}>
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
            <TouchableOpacity style={[s.closeBtn, { marginTop: 8 }]} onPress={() => setTokenGyModal(false)}>
              <Text style={s.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EDIT SPELL MODAL */}
      <Modal visible={editSpellModal} transparent animationType="slide" onRequestClose={() => setEditSpellModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableOpacity style={s.backdrop} onPress={() => setEditSpellModal(false)} />
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
            </ScrollView>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setEditSpellModal(false)}><Text style={s.closeBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.modalConfirmBtn, (!editSpellType || !editSpellName.trim()) && { opacity: 0.4 }]} disabled={!editSpellType || !editSpellName.trim()}
                onPress={() => {
                  if (activeSpell && editSpellType && editSpellName.trim()) {
                    const loyalty = parseInt(spellLoyalty, 10);
                    const defense = parseInt(spellDefense, 10);
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
                        abilities: spellAbilities.length > 0 ? spellAbilities : undefined,
                        currentLoyalty: !isNaN(loyalty) ? loyalty : undefined,
                        currentDefense: !isNaN(defense) ? defense : undefined,
                        effectNote: spellEffectNote.trim() || undefined,
                      },
                    });
                    setEditSpellModal(false);
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
                <Text style={s.sectionLabel}>Mana Value (optional)</Text>
                <TextInput style={[s.input, { marginBottom: 16 }]} value={spellManaValue} onChangeText={setSpellManaValue} placeholder="e.g. 3" placeholderTextColor={C.dim} keyboardType="numeric" />
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
                      manaValue: spellManaValue !== "" ? parseInt(spellManaValue, 10) : undefined,
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
                  setSelectedSpell(null);
                  setSpellName("");
                  resetSpellDetailForm();
                  if (eventReminderToggle) openReminderBuilderForEvent(spellReminderEvent);
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
                  if (eventReminderToggle) openReminderBuilderForEvent("Creature dies");
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
              <TouchableOpacity style={[s.actionBtn, s.closeBtnStyle]} onPress={() => setLandWarningModal(false)}>
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
                    if (eventReminderToggle) openReminderBuilderForEvent("Token is created");
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
                  <TouchableOpacity style={s.closeBtn} onPress={() => { setManaEventAmounts({ white: 0, blue: 0, black: 0, red: 0, green: 0, colorless: 0 }); setAddManaModal(false); }}>
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
              { icon: "❤️", label: "Gain / Lose Life", onPress: () => { setOthersModal(false); setGainLoseLifeModal(true); } },
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
              <TouchableOpacity style={s.closeBtn} onPress={() => setOthersModal(false)}>
                <Text style={s.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* GAIN / LOSE LIFE MODAL */}
      <Modal visible={gainLoseLifeModal} transparent animationType="slide" onRequestClose={() => setGainLoseLifeModal(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={s.backdrop} onPress={() => setGainLoseLifeModal(false)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Gain / Lose Life</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              <TouchableOpacity
                style={[{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", borderWidth: 1 }, gainLoseMode === "gain" ? { backgroundColor: C.successDim, borderColor: C.success } : { backgroundColor: C.cardAlt, borderColor: C.border }]}
                onPress={() => setGainLoseMode("gain")}
              >
                <Text style={{ color: gainLoseMode === "gain" ? C.success : C.muted, fontWeight: "700" }}>Gain</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", borderWidth: 1 }, gainLoseMode === "lose" ? { backgroundColor: C.dangerDim, borderColor: C.danger } : { backgroundColor: C.cardAlt, borderColor: C.border }]}
                onPress={() => setGainLoseMode("lose")}
              >
                <Text style={{ color: gainLoseMode === "lose" ? C.danger : C.muted, fontWeight: "700" }}>Lose</Text>
              </TouchableOpacity>
            </View>
            <View style={s.qtyRow}>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setGainLoseQty(q => Math.max(1, q - 1))}><Text style={s.lifeBtnText}>−</Text></TouchableOpacity>
              <Text style={[s.lifeVal, { fontSize: 36 }]}>{gainLoseQty}</Text>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setGainLoseQty(q => q + 1)}><Text style={s.lifeBtnText}>+</Text></TouchableOpacity>
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
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setGainLoseLifeModal(false)}><Text style={s.closeBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalConfirmBtn} onPress={() => {
                dispatch({ type: "CHANGE_LIFE", delta: gainLoseMode === "gain" ? gainLoseQty : -gainLoseQty, playerId: currentTurnPlayerId });
                setGainLoseLifeModal(false);
                if (eventReminderToggle) openReminderBuilderForEvent("Life total changes");
              }}>
                <Text style={s.startBtnText}>Confirm</Text>
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
              style={[s.closeBtn, { backgroundColor: C.accentDim, borderColor: C.accent, marginBottom: 12 }]}
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
                          <Text style={{ fontSize: 10, color: r.activeDuring === "mine" ? C.accent : r.activeDuring === "opponent" ? "#F59E0B" : C.muted }}>
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

            <TouchableOpacity style={[s.closeBtn, { marginTop: 8 }]} onPress={() => setRemindersListModal(false)}>
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
                return (
                  <View key={instance.id} style={{ backgroundColor: C.cardAlt, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12 }}>
                    <Text style={{ color: C.accent, fontWeight: "700", fontSize: 14, marginBottom: 2 }}>🔔 {r.name}</Text>
                    {r.triggerEvent ? <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Event: {r.triggerEvent}</Text> : null}
                    {r.description ? <Text style={{ color: C.dim, fontSize: 11, marginBottom: 6 }}>{r.description}</Text> : null}
                    {instance.triggeredByUser
                      ? <Text style={{ color: C.text, fontSize: 12, marginBottom: 4 }}>Effect: {effectSummary}</Text>
                      : <Text style={{ color: C.warning, fontSize: 12, marginBottom: 4 }}>⚠️ Opponent's action — effect logged only, no stat change</Text>
                    }
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity style={[s.actionBtn, { flex: 1, backgroundColor: instance.triggeredByUser ? C.successDim : C.cardAlt, borderColor: instance.triggeredByUser ? C.success : C.border, paddingVertical: 8 }]} onPress={() => dispatch({ type: "RESOLVE_REMINDER_FIRE", fireId: instance.id })}>
                        <Text style={[s.confirmBtnText, { fontSize: 13 }]}>{instance.triggeredByUser ? "✓ Resolve" : "📋 Log & Dismiss"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.actionBtn, { flex: 1, backgroundColor: C.warningDim, borderColor: C.warning, paddingVertical: 8 }]} onPress={() => dispatch({ type: "PARK_REMINDER_FIRE", fireId: instance.id })}>
                        <Text style={[s.confirmBtnText, { fontSize: 13 }]}>⏸ Park</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[s.actionBtn, s.closeBtnStyle, { marginTop: 12 }]} onPress={() => dispatch({ type: "CLEAR_PENDING_REMINDER_FIRES" })}>
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
              <TextInput style={[s.input, { marginBottom: 16 }]} value={ubName} onChangeText={setUbName} placeholder="e.g. Soul Warden, Propaganda, Rhystic Study" placeholderTextColor={C.dim} />

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
                    <TouchableOpacity style={[s.actionBtn, s.closeBtnStyle, { flex: 1 }]} onPress={() => setUbEffectBuilderOpen(false)}>
                      <Text style={s.closeBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={[s.closeBtn, { borderColor: C.border, marginBottom: 16 }]} onPress={() => setUbEffectBuilderOpen(true)}>
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
                style={[s.actionBtn, s.closeBtnStyle]}
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
                      onPress={() => dispatch({ type: "RESOLVE_REMINDER", id: r.id })}
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

    </> ); }

}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  menuContainer: { flex: 1, paddingHorizontal: 24, justifyContent: "space-between", paddingBottom: 24 },
  menuHeader: { alignItems: "center", paddingTop: 60 },
  menuTitle: { fontSize: 56, fontWeight: "900", color: C.text, letterSpacing: 8 },
  menuSubtitle: { fontSize: 14, fontWeight: "700", color: C.accent, letterSpacing: 4, marginTop: -4 },
  menuDivider: { width: 60, height: 2, backgroundColor: C.accent, borderRadius: 1, marginVertical: 16 },
  menuTagline: { fontSize: 14, color: C.muted },
  menuButtons: { gap: 12 },
  menuBtn: { backgroundColor: C.accent, borderRadius: 14, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: C.accent },
  menuBtnDim: { backgroundColor: C.card, borderColor: C.border },
  menuBtnIcon: { fontSize: 22 },
  menuBtnText: { fontSize: 17, fontWeight: "700", color: C.text },
  menuBtnSub: { fontSize: 12, color: C.dim },
  version: { textAlign: "center", color: C.dim, fontSize: 12 },
  setupContainer: { padding: 20, paddingBottom: 48 },
  setupTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  backBtn: { color: C.accent, fontSize: 15 },
  setupTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 },
  gameTypeCard: { backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 2, borderColor: C.border, marginBottom: 10 },
  gameTypeCardActive: { borderColor: C.accent, backgroundColor: C.accentDim },
  gameTypeLabel: { fontSize: 15, fontWeight: "700", color: C.muted, marginBottom: 2 },
  gameTypeDesc: { fontSize: 12, color: C.dim },
  input: { backgroundColor: C.cardAlt, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  lifePickRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24, marginBottom: 12 },
  lifePickBtn: { backgroundColor: C.card, borderRadius: 12, width: 48, height: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  lifePickBtnText: { fontSize: 24, color: C.text, lineHeight: 28 },
  lifePickVal: { fontSize: 48, fontWeight: "900", color: C.text, minWidth: 80, textAlign: "center" },
  presetRow: { flexDirection: "row", gap: 10, justifyContent: "center", marginBottom: 4 },
  preset: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  presetActive: { backgroundColor: C.accentDim, borderColor: C.accent },
  presetText: { color: C.muted, fontWeight: "600" },
  startBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 18, alignItems: "center", marginTop: 20 },
  startBtnText: { fontSize: 17, fontWeight: "800", color: C.text },
  topBar: { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 20, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 14 : 30, paddingBottom: 14 },
  topBarRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  topPlayerName: { fontSize: 16, fontWeight: "700", color: C.text },
  turnBadge: { backgroundColor: C.accentDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.accent },
  turnBadgeText: { fontSize: 12, fontWeight: "700", color: C.accent },
  lifeBtnText: { fontSize: 22, color: C.text, lineHeight: 26, fontWeight: "300" },
  lifeVal: { fontSize: 48, fontWeight: "900", color: C.text, lineHeight: 54 },
  statsRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 16 },
  stat: { alignItems: "center" },
  statVal: { fontSize: 18, fontWeight: "800", color: C.text },
  statLabel: { fontSize: 10, color: C.muted, letterSpacing: 0.5, marginTop: 2 },
  statDiv: { width: 1, height: 28, backgroundColor: C.border },
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.cardAlt },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: 1.2 },
  badge: { backgroundColor: C.accentDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: "600", color: C.accent },
  dotRowContainer: { flexDirection: "row", gap: 4, flexWrap: "wrap", justifyContent: "center", paddingHorizontal: 14, paddingVertical: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  dotActive: { backgroundColor: C.accent, width: 14, borderRadius: 3 },
  dotPast: { backgroundColor: C.dim },
  phaseName: { fontSize: 24, fontWeight: "900", color: C.text },
  phaseDesc: { fontSize: 13, color: C.muted, lineHeight: 18, paddingHorizontal: 14, marginTop: 4, marginBottom: 8 },
  phaseProgress: { fontSize: 11, color: C.dim, paddingHorizontal: 14, marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.8 },
  bottomBar: { position: "absolute", bottom: 40, left: 0, right: 0, backgroundColor: "transparent", borderTopWidth: 1, borderTopColor: C.border, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === "ios" ? 28 : 12, gap: 8 },
  bottomBarConfirm: { flex: 1, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  bottomBarConfirmText: { fontSize: 15, fontWeight: "700", color: C.text },
  bottomBarHub: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", elevation: 4 },
  bottomBarHubIcon: { fontSize: 22, color: C.text, fontWeight: "700" },
  confirmBtnOk: { backgroundColor: C.accentDim, borderColor: C.accent },
  confirmBtnUnlock: { backgroundColor: C.warningDim, borderColor: C.warning },
  confirmBtnWarn: { backgroundColor: C.dangerDim, borderColor: C.danger },
  confirmBtnText: { fontSize: 15, fontWeight: "700", color: C.text },
  reminderItem: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  reminderTitle: { fontSize: 14, fontWeight: "600", color: C.text, lineHeight: 18 },
  reminderDesc: { fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 16 },
  resolveBtn: { borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.successDim, borderWidth: 1, borderColor: C.success },
  resolveBtnText: { fontSize: 12, fontWeight: "700", color: C.success },
  skipBtn: { borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border },
  skipBtnText: { fontSize: 12, fontWeight: "600", color: C.muted },
  eventGrid: { flexDirection: "row", flexWrap: "wrap", padding: 10, gap: 8 },
  eventBtn: { backgroundColor: C.cardAlt, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border, width: "23%", minWidth: 72, gap: 4 },
  eventIcon: { fontSize: 18, fontWeight: "700" },
  eventLabel: { fontSize: 10, fontWeight: "600", color: C.muted, textAlign: "center", lineHeight: 13 },
  spellGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  spellTypeBtn: { backgroundColor: C.cardAlt, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.border, alignItems: "center", width: "22%", minWidth: 70, gap: 4 },
  spellTypeBtnActive: { backgroundColor: C.accentDim, borderColor: C.accent },
  spellTypeIcon: { fontSize: 20 },
  spellTypeLabel: { fontSize: 11, fontWeight: "600", color: C.muted, textAlign: "center" },
  backdrop: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: C.overlay },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: C.border },
  handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: C.text, marginBottom: 16 },
  centeredOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: "center", alignItems: "center", padding: 20 },
  centeredModal: { backgroundColor: C.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 400, borderWidth: 1, borderColor: C.border, alignItems: "center" },
  closeBtn: { backgroundColor: C.cardAlt, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, borderWidth: 1, borderColor: C.border, alignItems: "center", width: "100%" },
  closeBtnStyle: { backgroundColor: C.cardAlt, borderRadius: 10, paddingVertical: 12, borderWidth: 1, borderColor: C.border, alignItems: "center", width: "100%" },
  closeBtnText: { fontSize: 14, fontWeight: "600", color: C.muted },
  actionBtn: { borderRadius: 10, paddingVertical: 13, alignItems: "center", borderWidth: 1, width: "100%" },
  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24, marginBottom: 20 },
  qtyBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.cardAlt, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalCancelBtn: { backgroundColor: C.cardAlt, borderRadius: 10, paddingVertical: 13, paddingHorizontal: 20, borderWidth: 1, borderColor: C.border, alignItems: "center" },
  modalConfirmBtn: { flex: 1, backgroundColor: C.accent, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  hubGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  hubItem: { backgroundColor: C.cardAlt, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, width: "48%", gap: 2 },
  manaRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  manaEmoji: { fontSize: 22, width: 32 },
  manaLabel: { fontSize: 15, fontWeight: "700", color: C.text, flex: 1 },
  manaTotal: { fontSize: 28, fontWeight: "900", color: C.text, minWidth: 44, textAlign: "center" },
  manaAutoLabel: { fontSize: 10, color: C.dim, textAlign: "center" },
  manaBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginHorizontal: 4 },
  manaBtnText: { fontSize: 20, color: C.text, lineHeight: 24 },
  gyTabRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  gyTab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  gyTabActive: { backgroundColor: C.accentDim, borderColor: C.accent },
  gyTabInactive: { backgroundColor: C.cardAlt, borderColor: C.border },
  gyTabText: { fontSize: 13, fontWeight: "700", color: C.text },
  gyRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  tokenGySmallBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border },
  tokenGySmallBtnText: { fontSize: 11, fontWeight: "700", color: C.muted },
  phaseListCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  phaseListCardOpp: { borderColor: "#F59E0B" },
});