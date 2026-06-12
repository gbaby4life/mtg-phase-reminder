// ─── TYPES ────────────────────────────────────────────────────────────────────

export type ReminderCondition = {
  id: string;
  type: string;
  value?: string;
  connector: "AND" | "OR";
};

export type ReminderEffectType =
  // Life
  | "gain-life"
  | "lose-life"
  | "pay-life"
  // Cards
  | "draw-cards"
  | "discard"
  | "surveil"
  | "mill"
  // Mana
  | "add-mana"
  // Lands
  | "play-land"         // counts as a land play
  | "extra-land"        // passive: grants an extra land play while active
  // Counters
  | "proliferate"
  | "add-counter"       // add a specific counter type to a permanent
  // Damage
  | "deal-damage"
  | "prevent-damage"
  // Permanents
  | "tap-permanent"
  | "untap-permanent"
  | "return-from-gy"
  | "exile-card"
  // Tokens
  | "create-token"
  // Special mechanics
  | "become-monarch"
  | "take-initiative"
  | "city-blessing"
  // Passive (always-on while reminder is active)
  | "life-per-upkeep"       // gain or lose X life at start of each upkeep
  | "draw-per-upkeep"       // draw X cards at start of each upkeep
  | "extra-draw"            // draw X extra cards per turn passively
  | "opponent-tax"          // reminder only — opponent must pay a cost
  | "static-pt-boost"       // FUTURE: +N/+N to all your creatures
  | "static-keyword-grant"  // FUTURE: all your creatures gain [keyword]
  // Utility
  | "counter-spell"    // log only — mark a spell as countered
  | "log-only"
  | "custom";

export type ReminderEffect = {
  id: string;
  timing: "immediate" | "passive";
  effectType: ReminderEffectType;
  amount?: number;
  color?: "white" | "blue" | "black" | "red" | "green" | "colorless";
  counterType?: string;        // add-counter: "+1/+1", "-1/-1", "charge", "lore", etc.
  tokenName?: string;          // create-token
  keyword?: string;            // static-keyword-grant
  ptBoostPower?: number;       // static-pt-boost
  ptBoostToughness?: number;   // static-pt-boost
  customText?: string;
  requiresBattlefield?: boolean; // marks future-only effects
};

export type ReminderFireMode = "phase" | "event";

export type ReminderFrequency =
  | "each-turn"
  | "once"
  | "manual"
  | "each-time"
  | "once-per-turn"
  | "once-per-game";

export type ReminderStatus =
  | "active"
  | "pending"
  | "resolved"
  | "skipped"
  | "missed"
  | "inactive";

export type Reminder = {
  id: string;
  name: string;
  description?: string;
  fireMode: ReminderFireMode;
  phases: string[];
  triggerEvent?: string;
  conditions: ReminderCondition[];
  activePhases: string[];
  activeDuring: "mine" | "both" | "opponent";
  frequency: ReminderFrequency;
  effects: ReminderEffect[];
  status: ReminderStatus;
  sourceLabel?: string;
  isSystem?: boolean;
  attachedToSpellId?: string;
  firedCount: number;
  firedThisTurn: boolean;
};

export type ReminderFireInstance = {
  id: string;
  reminderId: string;
  firedPhase: string;
  firedTurn: number;
  triggeredByUser: boolean; // true = fired by Player 1's action, false = fired by opponent's action
};

export type ReminderContext = {
  spellType?: string;
  spellSupertype?: string;
  spellSubtype?: string;
  spellAbilities?: string[];
  spellPower?: number;
  spellToughness?: number;
  spellManaValue?: number;
  isToken?: boolean;
  tokenCategory?: "creature" | "resource";
  landsPlayedThisTurn?: number;
  cardsDrawnThisTurn?: number;
  isMyTurn?: boolean;
  currentPhase?: string;
};

export type ReminderEffectResult = {
  lifeDelta?: number;
  cardsDrawnDelta?: number;
  landsPlayedDelta?: number;
  manaAdded?: {
    color: "white" | "blue" | "black" | "red" | "green" | "colorless";
    amount: number;
  }[];
  logMessage?: string;
};

export type PassiveEffects = {
  extraLandPlays: number;
  lifePerUpkeep: number;    // net life change per upkeep (positive = gain, negative = lose)
  drawPerUpkeep: number;    // extra cards drawn at start of each upkeep
  extraDrawPerTurn: number; // extra cards drawn per turn (general)
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

export const GAME_EVENTS: readonly string[] = [
  // Turn structure
  "Untap Step begins", "Upkeep begins", "Draw Step begins", "Main Phase 1 begins",
  "Beginning of Combat begins", "Declare Attackers begins", "Declare Blockers begins",
  "Combat Damage begins", "End of Combat begins", "Main Phase 2 begins",
  "End Step begins", "Cleanup begins", "Any phase begins", "Your turn begins", "Your turn ends",
  "Your second main phase begins", "Your first upkeep begins", "Your combat begins",

  // Creatures
  "Creature enters the battlefield", "Creature dies", "Creature is sacrificed",
  "Creature deals combat damage", "Creature blocks", "Creature becomes tapped",
  "Creature becomes untapped", "Token enters the battlefield", "Token dies", "Token is sacrificed",
  "Creature token enters the battlefield", "Non-creature token enters",

  // Spells
  "Spell is cast", "Instant is cast", "Sorcery is cast", "Creature spell is cast",
  "Noncreature spell is cast", "Artifact is cast", "Enchantment is cast", "Planeswalker is cast",
  "Historic spell is cast", "Spell with mana value 3 or less is cast", "Spell with mana value 4 or more is cast",

  // Opponent actions
  "Opponent casts a spell", "Opponent casts a creature spell", "Opponent casts a noncreature spell",
  "Opponent attacks", "Opponent attacks you",

  // Cards
  "Card is drawn", "Card is discarded", "You draw your second card this turn", "Card is milled",
  "Card is put on top of library", "Card is shuffled into library", "You look at your library",

  // Lands & permanents entering
  "Land is played", "Basic land enters", "Nonbasic land enters",
  "Artifact enters the battlefield", "Enchantment enters the battlefield",
  "Planeswalker enters the battlefield", "Nonland permanent enters the battlefield",
  "Permanent with a counter enters",

  // Tokens created
  "Treasure is created", "Food is created", "Clue is created", "Blood is created", "Token is created",

  // Life
  "Life total changes", "You gain life", "You lose life",
  "Life total falls below 10", "Life total falls below 5",
  "Your life total falls below 15", "Your life total falls below 1",
  "Opponent gains life", "Opponent's life total falls below 10", "Opponent's life total falls below 5",

  // Mana
  "Mana is added", "Mana ability is activated",

  // Counters
  "Counter is added to a creature", "Counter is added to a permanent",
  "+1/+1 counter is added", "-1/-1 counter is added", "Poison counter is added", "Energy counter is added",
  "Loyalty counter is removed", "Experience counter is added",
  "Charge counter is added", "Time counter is added", "Lore counter is added",

  // Graveyard / exile
  "Card enters your graveyard", "Creature enters your graveyard", "Card is exiled",
  "Your graveyard reaches 7 cards", "Your graveyard reaches 10 cards",
  "Opponent's graveyard reaches 7 cards",

  // Damage
  "You deal combat damage to a player", "You deal noncombat damage to a player",
  "Damage is prevented",

  // Combat
  "You attack with one or more creatures", "You attack with two or more creatures",
  "Creature attacks alone", "You are attacked", "Combat damage is dealt",

  // Abilities
  "Activated ability is used", "Loyalty ability is activated", "Planeswalker ability is used",
  "Equipment becomes equipped",

  // Special game states
  "You become the Monarch", "You lose the Monarch",
  "You take the Initiative", "You gain City's Blessing",
  "You have 10 or more permanents",

  // Custom
  "Custom event",
];

export type ConditionOption = {
  id: string;
  label: string;
  requiresValue: boolean;
  valueType?: "creature-subtype" | "keyword" | "number" | "supertype";
};

export const CONDITION_OPTIONS: ConditionOption[] = [
  // ── Creature properties ──────────────────────────────────────────────────────
  { id: "creature-type-is",        label: "Creature type is...",              requiresValue: true,  valueType: "creature-subtype" },
  { id: "has-supertype-legendary", label: "Creature has supertype Legendary", requiresValue: false },
  { id: "has-supertype-basic",     label: "Creature has supertype Basic",     requiresValue: false },
  { id: "has-supertype-snow",      label: "Creature has supertype Snow",      requiresValue: false },
  { id: "has-supertype-token",     label: "Creature has supertype Token",     requiresValue: false },
  { id: "has-keyword",             label: "Creature has keyword...",          requiresValue: true,  valueType: "keyword" },
  { id: "is-token",                label: "Creature is a token",             requiresValue: false },
  { id: "is-not-token",            label: "Creature is not a token",         requiresValue: false },
  { id: "power-gte-2",             label: "Creature has power 2 or greater", requiresValue: false },
  { id: "power-gte-4",             label: "Creature has power 4 or greater", requiresValue: false },
  { id: "toughness-gte-2",         label: "Creature has toughness 2 or greater", requiresValue: false },
  { id: "toughness-gte-4",         label: "Creature has toughness 4 or greater", requiresValue: false },

  // ── Spell properties ─────────────────────────────────────────────────────────
  { id: "spell-type-is",            label: "Spell type is...",               requiresValue: true,  valueType: "creature-subtype" },
  { id: "spell-supertype-legendary",label: "Spell has supertype Legendary",  requiresValue: false },
  { id: "mana-value-lte-3",         label: "Spell has mana value 3 or less", requiresValue: false },
  { id: "mana-value-gte-4",         label: "Spell has mana value 4 or greater", requiresValue: false },
  { id: "spell-is-historic",        label: "Spell is historic (artifact, legendary, or saga)", requiresValue: false },
  { id: "spell-is-modal",           label: "Spell was kicked / has additional costs paid",     requiresValue: false },

  // ── Ownership / control ──────────────────────────────────────────────────────
  { id: "entered-under-your-control",    label: "Permanent entered under your control",      requiresValue: false },
  { id: "entered-under-opponent-control",label: "Permanent entered under opponent's control",requiresValue: false },
  { id: "spell-cast-by-opponent",        label: "Spell was cast by an opponent",             requiresValue: false },
  { id: "spell-cast-by-you",             label: "Spell was cast by you",                     requiresValue: false },

  // ── Nth spell / creature this turn ───────────────────────────────────────────
  { id: "first-spell-this-turn",   label: "It is your first spell this turn",           requiresValue: false },
  { id: "second-spell-this-turn",  label: "It is your second spell this turn",          requiresValue: false },
  { id: "third-spell-this-turn",   label: "It is your third or more spell this turn",   requiresValue: false },
  { id: "first-creature-this-turn",label: "It is the first creature entering this turn",requiresValue: false },

  // ── Game state — counters ─────────────────────────────────────────────────────────
  { id: "cards-drawn-gte-2",   label: "Cards drawn this turn is 2 or more",  requiresValue: false },
  { id: "lands-played-gte-1",  label: "Lands played this turn is 1 or more", requiresValue: false },

  // ── Board state ──────────────────────────────────────────────────────────────
  { id: "you-control-creatures-gte",    label: "You control X or more creatures",       requiresValue: true, valueType: "number" },
  { id: "opponent-controls-creatures-gte", label: "Opponent controls X or more creatures", requiresValue: true, valueType: "number" },
  { id: "you-control-no-creatures",     label: "You control no creatures",              requiresValue: false },
  { id: "cards-in-hand-gte",            label: "Cards in hand is X or more",            requiresValue: true, valueType: "number" },
  { id: "cards-in-hand-lte",            label: "Cards in hand is X or fewer",           requiresValue: true, valueType: "number" },

  // ── Life ─────────────────────────────────────────────────────────────────────
  { id: "life-lte-10",              label: "Your life total is 10 or less",   requiresValue: false },
  { id: "life-lte-5",               label: "Your life total is 5 or less",    requiresValue: false },
  { id: "opponent-life-lte-10",     label: "Opponent's life is 10 or less",   requiresValue: false },
  { id: "opponent-life-lte-5",      label: "Opponent's life is 5 or less",    requiresValue: false },
  { id: "you-gained-life-this-turn",     label: "You gained life this turn",      requiresValue: false },
  { id: "opponent-gained-life-this-turn",label: "Opponent gained life this turn", requiresValue: false },

  // ── Graveyard ────────────────────────────────────────────────────────────────
  { id: "graveyard-gte-5",  label: "Graveyard has 5 or more cards",   requiresValue: false },
  { id: "threshold",        label: "7 or more cards in your graveyard (threshold)",  requiresValue: false },
  { id: "delirium",         label: "4 or more card types in your graveyard (delirium)", requiresValue: false },

  // ── Special states ───────────────────────────────────────────────────────────
  { id: "you-are-monarch",        label: "You are the Monarch",     requiresValue: false },
  { id: "you-have-initiative",    label: "You have the Initiative", requiresValue: false },
  { id: "you-have-city-blessing", label: "You have City's Blessing",requiresValue: false },

  // ── Counter / loyalty state ──────────────────────────────────────────────────
  { id: "permanent-has-counter",  label: "Target permanent has a counter",         requiresValue: false },
  { id: "you-have-poison-gte",    label: "You have X or more poison counters",     requiresValue: true, valueType: "number" },
  { id: "you-have-energy-gte",    label: "You have X or more energy counters",     requiresValue: true, valueType: "number" },

  // ── Phase position ───────────────────────────────────────────────────────────
  { id: "it-is-my-turn",            label: "It is your turn",                requiresValue: false },
  { id: "it-is-combat",             label: "It is combat",                   requiresValue: false },
  { id: "it-is-first-main-phase",   label: "It is the first main phase",     requiresValue: false },
  { id: "it-is-second-main-phase",  label: "It is the second main phase",    requiresValue: false },
  { id: "it-is-precombat",          label: "It is before combat this turn",  requiresValue: false },
  { id: "it-is-postcombat",         label: "It is after combat this turn",   requiresValue: false },
  { id: "only-once-per-turn",       label: "Only once per turn",             requiresValue: false },
  { id: "only-once-per-game",       label: "Only once per game",             requiresValue: false },
];

export const EFFECT_TYPE_OPTIONS: {
  value: ReminderEffectType;
  label: string;
  supportsTiming: ("immediate" | "passive")[];
  requiresAmount: boolean;
  requiresColor: boolean;
}[] = [
  // Life
  { value: "gain-life",          label: "Gain life",                supportsTiming: ["immediate"],            requiresAmount: true,  requiresColor: false },
  { value: "lose-life",          label: "Lose life",                supportsTiming: ["immediate"],            requiresAmount: true,  requiresColor: false },
  { value: "pay-life",           label: "Pay life",                 supportsTiming: ["immediate"],            requiresAmount: true,  requiresColor: false },
  // Cards
  { value: "draw-cards",         label: "Draw cards",               supportsTiming: ["immediate"],            requiresAmount: true,  requiresColor: false },
  { value: "discard",            label: "Discard cards",            supportsTiming: ["immediate"],            requiresAmount: true,  requiresColor: false },
  { value: "surveil",            label: "Surveil",                  supportsTiming: ["immediate"],            requiresAmount: true,  requiresColor: false },
  { value: "mill",               label: "Mill cards",               supportsTiming: ["immediate"],            requiresAmount: true,  requiresColor: false },
  // Mana
  { value: "add-mana",           label: "Add mana",                 supportsTiming: ["immediate"],            requiresAmount: true,  requiresColor: true  },
  // Lands
  { value: "play-land",          label: "Play a land",              supportsTiming: ["immediate"],            requiresAmount: false, requiresColor: false },
  { value: "extra-land",         label: "Extra land play (passive)",supportsTiming: ["passive"],              requiresAmount: false, requiresColor: false },
  // Counters
  { value: "proliferate",        label: "Proliferate",              supportsTiming: ["immediate"],            requiresAmount: false, requiresColor: false },
  { value: "add-counter",        label: "Add counter to permanent", supportsTiming: ["immediate"],            requiresAmount: true,  requiresColor: false },
  // Damage
  { value: "deal-damage",        label: "Deal damage",              supportsTiming: ["immediate"],            requiresAmount: true,  requiresColor: false },
  { value: "prevent-damage",     label: "Prevent damage",           supportsTiming: ["immediate"],            requiresAmount: true,  requiresColor: false },
  // Permanents
  { value: "tap-permanent",      label: "Tap permanent",            supportsTiming: ["immediate"],            requiresAmount: false, requiresColor: false },
  { value: "untap-permanent",    label: "Untap permanent",          supportsTiming: ["immediate"],            requiresAmount: false, requiresColor: false },
  { value: "return-from-gy",     label: "Return from graveyard",    supportsTiming: ["immediate"],            requiresAmount: false, requiresColor: false },
  { value: "exile-card",         label: "Exile card",               supportsTiming: ["immediate"],            requiresAmount: false, requiresColor: false },
  // Tokens
  { value: "create-token",       label: "Create token",             supportsTiming: ["immediate"],            requiresAmount: false, requiresColor: false },
  // Special mechanics
  { value: "become-monarch",     label: "Become the Monarch",       supportsTiming: ["immediate"],            requiresAmount: false, requiresColor: false },
  { value: "take-initiative",    label: "Take the Initiative",      supportsTiming: ["immediate"],            requiresAmount: false, requiresColor: false },
  { value: "city-blessing",      label: "Gain City's Blessing",     supportsTiming: ["immediate"],            requiresAmount: false, requiresColor: false },
  // Passive
  { value: "life-per-upkeep",    label: "Life change per upkeep",   supportsTiming: ["passive"],              requiresAmount: true,  requiresColor: false },
  { value: "draw-per-upkeep",    label: "Draw per upkeep",          supportsTiming: ["passive"],              requiresAmount: true,  requiresColor: false },
  { value: "extra-draw",         label: "Extra draw per turn",      supportsTiming: ["passive"],              requiresAmount: true,  requiresColor: false },
  { value: "opponent-tax",       label: "Opponent tax (note)",      supportsTiming: ["passive"],              requiresAmount: false, requiresColor: false },
  { value: "static-pt-boost",    label: "+N/+N to creatures (future)",supportsTiming: ["passive"],            requiresAmount: false, requiresColor: false },
  { value: "static-keyword-grant",label: "Grant keyword (future)",  supportsTiming: ["passive"],              requiresAmount: false, requiresColor: false },
  // Utility
  { value: "counter-spell",      label: "Counter spell (log)",      supportsTiming: ["immediate"],            requiresAmount: false, requiresColor: false },
  { value: "log-only",           label: "Log message only",         supportsTiming: ["immediate"],            requiresAmount: false, requiresColor: false },
  { value: "custom",             label: "Custom effect",            supportsTiming: ["immediate", "passive"], requiresAmount: false, requiresColor: false },
];

// ─── FUNCTIONS ────────────────────────────────────────────────────────────────

const COMBAT_PHASES = new Set([
  "Beginning of Combat", "Declare Attackers", "Declare Blockers",
  "Combat Damage", "End of Combat",
]);

const PRECOMBAT_PHASES = new Set([
  "Untap", "Upkeep", "Draw", "Main Phase 1", "Beginning of Combat",
]);

function evaluateSingleCondition(condition: ReminderCondition, context: ReminderContext): boolean {
  switch (condition.type) {
    // ── Creature properties ────────────────────────────────────────────────────
    case "creature-type-is":
      return context.spellSubtype === condition.value;
    case "has-supertype-legendary":
      return context.spellSupertype === "Legendary";
    case "has-supertype-basic":
      return context.spellSupertype === "Basic";
    case "has-supertype-snow":
      return context.spellSupertype === "Snow";
    case "has-supertype-token":
      return context.spellSupertype === "Token";
    case "has-keyword":
      return context.spellAbilities?.includes(condition.value ?? "") ?? false;
    case "is-token":
      return context.isToken === true;
    case "is-not-token":
      return context.isToken !== true;
    case "power-gte-2":
      return (context.spellPower ?? 0) >= 2;
    case "power-gte-4":
      return (context.spellPower ?? 0) >= 4;
    case "toughness-gte-2":
      return (context.spellToughness ?? 0) >= 2;
    case "toughness-gte-4":
      return (context.spellToughness ?? 0) >= 4;

    // ── Spell properties ───────────────────────────────────────────────────────
    case "spell-type-is":
      return context.spellType === condition.value;
    case "spell-supertype-legendary":
      return context.spellSupertype === "Legendary";
    case "mana-value-lte-3":
      return (context.spellManaValue ?? 0) <= 3;
    case "mana-value-gte-4":
      return (context.spellManaValue ?? 0) >= 4;
    case "spell-is-historic":
      return (
        context.spellSupertype === "Legendary" ||
        context.spellType === "Artifact" ||
        (context.spellAbilities?.includes("Saga") ?? false)
      );
    case "spell-is-modal":
      return true; // TODO: requires kicked/modal cost tracking in context

    // ── Ownership / control ────────────────────────────────────────────────────
    case "entered-under-your-control":
    case "entered-under-opponent-control":
    case "spell-cast-by-opponent":
    case "spell-cast-by-you":
      return true; // TODO: requires battlefield state

    // ── Nth spell / creature this turn ─────────────────────────────────────────
    case "first-spell-this-turn":
    case "second-spell-this-turn":
    case "third-spell-this-turn":
    case "first-creature-this-turn":
      return true; // TODO: requires spell-count-this-turn in context

    // ── Card / draw counters ───────────────────────────────────────────────────
    case "cards-drawn-gte-2":
      return (context.cardsDrawnThisTurn ?? 0) >= 2;
    case "lands-played-gte-1":
      return (context.landsPlayedThisTurn ?? 0) >= 1;

    // ── Board state ────────────────────────────────────────────────────────────
    case "you-control-creatures-gte":
    case "opponent-controls-creatures-gte":
    case "you-control-no-creatures":
    case "cards-in-hand-gte":
    case "cards-in-hand-lte":
      return true; // TODO: requires battlefield state

    // ── Life ───────────────────────────────────────────────────────────────────
    case "life-lte-10":
    case "life-lte-5":
    case "opponent-life-lte-10":
    case "opponent-life-lte-5":
    case "you-gained-life-this-turn":
    case "opponent-gained-life-this-turn":
      return true; // TODO: requires life total in context

    // ── Graveyard ──────────────────────────────────────────────────────────────
    case "graveyard-gte-5":
    case "threshold":
    case "delirium":
      return true; // TODO: requires graveyard state in context

    // ── Special states ─────────────────────────────────────────────────────────
    case "you-are-monarch":
    case "you-have-initiative":
    case "you-have-city-blessing":
      return true; // TODO: requires game-state flags in context

    // ── Counter / loyalty state ────────────────────────────────────────────────
    case "permanent-has-counter":
    case "you-have-poison-gte":
    case "you-have-energy-gte":
      return true; // TODO: requires battlefield state

    // ── Phase position ─────────────────────────────────────────────────────────
    case "it-is-my-turn":
      return context.isMyTurn === true;
    case "it-is-combat":
      return COMBAT_PHASES.has(context.currentPhase ?? "");
    case "it-is-first-main-phase":
      return context.currentPhase === "Main Phase 1";
    case "it-is-second-main-phase":
      return context.currentPhase === "Main Phase 2";
    case "it-is-precombat":
      return PRECOMBAT_PHASES.has(context.currentPhase ?? "");
    case "it-is-postcombat":
      return context.currentPhase === "Main Phase 2" || context.currentPhase === "End Step" || context.currentPhase === "Cleanup";
    // Frequency-level enforcement handles these; always pass condition evaluation
    case "only-once-per-turn":
    case "only-once-per-game":
      return true;

    default:
      return true;
  }
}

export function evaluateConditions(
  conditions: ReminderCondition[],
  context: ReminderContext
): boolean {
  if (conditions.length === 0) return true;

  let result = evaluateSingleCondition(conditions[0], context);

  for (let i = 1; i < conditions.length; i++) {
    const prevConnector = conditions[i - 1].connector;
    const current = evaluateSingleCondition(conditions[i], context);
    result = prevConnector === "AND" ? result && current : result || current;
  }

  return result;
}

export function getMatchingEventReminders(
  reminders: Reminder[],
  events: string[],
  currentPhase: string,
  isMyTurn: boolean,
  context?: ReminderContext
): Reminder[] {
  const ctx: ReminderContext = context ?? { isMyTurn, currentPhase };

  return reminders.filter((r) => {
    if (r.fireMode !== "event") return false;
    if (r.status !== "active") return false;
    if (!r.triggerEvent || !events.includes(r.triggerEvent)) return false;
    if (r.frequency === "once-per-turn" && r.firedThisTurn) return false;
    if (r.frequency === "once-per-game" && r.firedCount > 0) return false;
    if (r.activePhases.length > 0 && !r.activePhases.includes(currentPhase)) return false;
    if (r.activeDuring === "mine" && !isMyTurn) return false;
    if (r.activeDuring === "opponent" && isMyTurn) return false;
    return evaluateConditions(r.conditions, ctx);
  });
}

export function recordEventReminderFires(
  reminders: Reminder[],
  firedReminders: Reminder[]
): Reminder[] {
  const firedIds = new Set(firedReminders.map((r) => r.id));
  return reminders.map((r) =>
    firedIds.has(r.id) ? { ...r, firedCount: r.firedCount + 1, firedThisTurn: true } : r
  );
}

export function applyImmediateEffects(reminder: Reminder): ReminderEffectResult {
  const result: ReminderEffectResult = {};
  const logParts: string[] = [];

  for (const effect of reminder.effects) {
    if (effect.timing !== "immediate") continue;

    switch (effect.effectType) {
      case "gain-life":
        result.lifeDelta = (result.lifeDelta ?? 0) + (effect.amount ?? 1);
        break;
      case "lose-life":
      case "pay-life":
        result.lifeDelta = (result.lifeDelta ?? 0) - (effect.amount ?? 1);
        break;
      case "draw-cards":
        result.cardsDrawnDelta = (result.cardsDrawnDelta ?? 0) + (effect.amount ?? 1);
        break;
      case "add-mana":
        if (effect.color) {
          result.manaAdded = [
            ...(result.manaAdded ?? []),
            { color: effect.color, amount: effect.amount ?? 1 },
          ];
        }
        break;
      case "discard":
        logParts.push(`Discard ${effect.amount ?? 1} card(s) (${reminder.name})`);
        break;
      case "surveil":
        logParts.push(`Surveil ${effect.amount ?? 1} (${reminder.name})`);
        break;
      case "mill":
        logParts.push(`Mill ${effect.amount ?? 1} card(s) (${reminder.name})`);
        break;
      case "play-land":
        result.landsPlayedDelta = (result.landsPlayedDelta ?? 0) + 1;
        logParts.push(`Play a land (${reminder.name})`);
        break;
      case "proliferate":
        logParts.push(`Proliferate (${reminder.name})`);
        break;
      case "add-counter":
        logParts.push(`Add ${effect.amount ?? 1} ${effect.counterType ?? "+1/+1"} counter(s) (${reminder.name})`);
        break;
      case "deal-damage":
        logParts.push(`Deal ${effect.amount ?? 1} damage (${reminder.name})`);
        break;
      case "prevent-damage":
        logParts.push(`Prevent ${effect.amount ?? 1} damage (${reminder.name})`);
        break;
      case "tap-permanent":
        logParts.push(`Tap permanent (${reminder.name})`);
        break;
      case "untap-permanent":
        logParts.push(`Untap permanent (${reminder.name})`);
        break;
      case "return-from-gy":
        logParts.push(`Return card from graveyard (${reminder.name})`);
        break;
      case "exile-card":
        logParts.push(`Exile card (${reminder.name})`);
        break;
      case "create-token":
        logParts.push(`Create ${effect.tokenName ?? "token"} (${reminder.name})`);
        break;
      case "become-monarch":
        logParts.push(`Become the Monarch (${reminder.name})`);
        break;
      case "take-initiative":
        logParts.push(`Take the Initiative (${reminder.name})`);
        break;
      case "city-blessing":
        logParts.push(`Gain City's Blessing (${reminder.name})`);
        break;
      case "counter-spell":
        logParts.push(`Counter spell (${reminder.name})`);
        break;
      case "log-only":
      case "custom":
        if (effect.customText) logParts.push(effect.customText);
        break;
      default:
        break;
    }
  }

  if (logParts.length > 0) result.logMessage = logParts.join("; ");
  return result;
}

export function getPassiveEffects(reminders: Reminder[]): PassiveEffects {
  const effects: PassiveEffects = {
    extraLandPlays: 0,
    lifePerUpkeep: 0,
    drawPerUpkeep: 0,
    extraDrawPerTurn: 0,
  };

  for (const reminder of reminders) {
    if (reminder.status !== "active") continue;
    for (const effect of reminder.effects) {
      if (effect.timing !== "passive") continue;
      switch (effect.effectType) {
        case "extra-land":
          effects.extraLandPlays += 1;
          break;
        case "life-per-upkeep":
          effects.lifePerUpkeep += effect.amount ?? 1;
          break;
        case "draw-per-upkeep":
          effects.drawPerUpkeep += effect.amount ?? 1;
          break;
        case "extra-draw":
          effects.extraDrawPerTurn += effect.amount ?? 1;
          break;
        default:
          break;
      }
    }
  }

  return effects;
}

export function resetPhaseReminders(reminders: Reminder[]): Reminder[] {
  return reminders.map((r) => {
    if (r.fireMode !== "phase") return r;
    if (r.frequency === "each-turn" && r.status !== "inactive") {
      return { ...r, status: "active" };
    }
    return r;
  });
}

export function activatePhaseReminders(
  reminders: Reminder[],
  phase: string,
  isMyTurn: boolean
): Reminder[] {
  return reminders.map((r) => {
    if (r.fireMode !== "phase") return r;
    if (r.status === "resolved" || r.status === "missed" || r.status === "inactive") return r;

    const phaseMatches = r.phases.length === 0 || r.phases.includes(phase);
    if (!phaseMatches) return r;

    const turnMatches =
      r.activeDuring === "both" ||
      (r.activeDuring === "mine" && isMyTurn) ||
      (r.activeDuring === "opponent" && !isMyTurn);
    if (!turnMatches) return r;

    return { ...r, status: "pending" };
  });
}

export function resetEventReminderTurnFlags(reminders: Reminder[]): Reminder[] {
  return reminders.map((r) =>
    r.fireMode === "event" ? { ...r, firedThisTurn: false } : r
  );
}

export function deactivateRemindersForSpell(
  reminders: Reminder[],
  spellId: string
): Reminder[] {
  return reminders.map((r) =>
    r.attachedToSpellId === spellId ? { ...r, status: "inactive" } : r
  );
}

export function makeDefaultReminders(): Reminder[] {
  return [
    {
      id: "system-untap",
      name: "Untap Your Permanents",
      description: "Untap all of your permanents before anything else happens this turn.",
      sourceLabel: "System",
      fireMode: "phase",
      phases: ["Untap"],
      conditions: [],
      activePhases: [],
      activeDuring: "mine",
      frequency: "each-turn",
      effects: [{ id: "sys-untap-fx", timing: "immediate", effectType: "log-only" }],
      status: "pending",
      isSystem: true,
      firedCount: 0,
      firedThisTurn: false,
    },
    {
      id: "system-draw",
      name: "Draw a Card",
      description: "Draw your card for the turn.",
      sourceLabel: "System",
      fireMode: "phase",
      phases: ["Draw"],
      conditions: [],
      activePhases: [],
      activeDuring: "mine",
      frequency: "each-turn",
      effects: [{ id: "sys-draw-fx", timing: "immediate", effectType: "draw-cards", amount: 1 }],
      status: "pending",
      isSystem: true,
      firedCount: 0,
      firedThisTurn: false,
    },
    {
      id: "system-discard",
      name: "Discard to Hand Size",
      description: "If you have more than 7 cards in hand, discard down to 7.",
      sourceLabel: "System",
      fireMode: "phase",
      phases: ["Cleanup"],
      conditions: [],
      activePhases: [],
      activeDuring: "mine",
      frequency: "each-turn",
      effects: [{ id: "sys-discard-fx", timing: "immediate", effectType: "log-only" }],
      status: "pending",
      isSystem: true,
      firedCount: 0,
      firedThisTurn: false,
    },
    {
      id: "system-land",
      name: "Land for the Turn",
      description: "You may play 1 land per turn (Main Phase 1 or 2).",
      sourceLabel: "System",
      fireMode: "phase",
      phases: ["Main Phase 1", "Main Phase 2"],
      conditions: [],
      activePhases: [],
      activeDuring: "mine",
      frequency: "each-turn",
      effects: [{ id: "sys-land-fx", timing: "immediate", effectType: "play-land" }],
      status: "pending",
      isSystem: true,
      firedCount: 0,
      firedThisTurn: false,
    },
  ];
}

export function isReminderExhausted(reminder: Reminder): boolean {
  if (reminder.frequency === "once") {
    return reminder.status === "resolved" || reminder.firedCount > 0;
  }
  if (reminder.frequency === "once-per-game") {
    return reminder.firedCount > 0;
  }
  return false;
}
