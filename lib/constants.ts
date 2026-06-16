export type CounterDef = {
  key: string;
  label: string;
  icon: string;
  lossThreshold?: number;
};

export const COUNTER_DEFS: CounterDef[] = [
  { key: "poison", label: "Poison", icon: "☠️", lossThreshold: 10 },
  { key: "energy", label: "Energy", icon: "⚡", lossThreshold: undefined },
];

export const PHASES = [
  "Untap", "Upkeep", "Draw", "Main Phase 1",
  "Beginning of Combat", "Declare Attackers", "Declare Blockers",
  "Combat Damage", "End of Combat", "Main Phase 2", "End Step", "Cleanup",
];


export const PINNED_TOKENS = ["Treasure", "1/1 Soldier", "1/1 Goblin"];
export const COMMON_TOKENS = [
  "Zombie", "Knight", "Beast", "Dragon", "Angel", "Elemental", "Spirit",
  "Warrior", "Vampire", "Wolf", "Bird", "Cat", "Human", "Insect", "Merfolk",
  "Saproling", "Servo", "Thopter", "Food", "Clue", "Blood", "Map", "Powerstone",
];

export const CREATURE_COUNTER_TYPES = ["+1/+0", "+0/+1", "+1/+1", "-1/-0", "-0/-1", "-1/-1"] as const;

export const MANA_COST_TYPES = [
  { key: "generic", label: "Generic" },
  { key: "white", label: "White" },
  { key: "blue", label: "Blue" },
  { key: "black", label: "Black" },
  { key: "red", label: "Red" },
  { key: "green", label: "Green" },
] as const;

export const SPELL_TYPES = [
  { key: "Creature", icon: "🐉" },
  { key: "Instant", icon: "⚡" },
  { key: "Sorcery", icon: "🌀" },
  { key: "Enchantment", icon: "✨" },
  { key: "Artifact", icon: "⚙️" },
  { key: "Planeswalker", icon: "👁️" },
  { key: "Battle", icon: "⚔️" },
  { key: "Other", icon: "★" },
];

export const MANA_COLORS = [
  { key: "white", label: "White", emoji: "\u2600\uFE0F" },
  { key: "blue", label: "Blue", emoji: "\uD83D\uDCA7" },
  { key: "black", label: "Black", emoji: "\uD83D\uDC80" },
  { key: "red", label: "Red", emoji: "\uD83D\uDD25" },
  { key: "green", label: "Green", emoji: "\uD83C\uDF32" },
  { key: "colorless", label: "Colorless", emoji: "\u26AA" },
] as const;

export const RESOURCE_TOKENS = ["Treasure", "Food", "Clue", "Blood", "Map", "Powerstone"];

export const RAINBOW_COLORS = [
  '#FF0000', '#FF7700', '#FFFF00', '#00FF00',
  '#0088FF', '#8800FF', '#FF00FF', '#FF0000',
];

// ─── MTG TYPE CATALOGS (source: Scryfall API) ─────────────────────────────────

export const MTG_SUPERTYPES = [
  "Legendary", "Basic", "Snow", "World", "Ongoing",
] as const;

export const MTG_ARTIFACT_SUBTYPES = [
  "Blood", "Bobblehead", "Clue", "Contraption", "Equipment", "Food",
  "Fortification", "Gold", "Map", "Powerstone", "Treasure", "Vehicle",
] as const;

export const MTG_BATTLE_SUBTYPES = [
  "Siege",
] as const;

export const MTG_CREATURE_SUBTYPES = [
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

export const MTG_ENCHANTMENT_SUBTYPES = [
  "Aura", "Background", "Cartouche", "Case", "Class", "Curse",
  "Rune", "Saga", "Shard", "Shrine",
] as const;

export const MTG_LAND_SUBTYPES = [
  "Cave", "Desert", "Forest", "Gate", "Island", "Lair", "Locus",
  "Mine", "Mountain", "Plains", "Power-Plant", "Sphere", "Swamp",
  "Tower", "Urzas",
] as const;

export const MTG_PLANESWALKER_SUBTYPES = [
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

export const MTG_SPELL_SUBTYPES = [
  "Adventure", "Arcane", "Lesson", "Trap",
] as const;

export const MTG_KEYWORD_ABILITIES = [
  "Deathtouch", "Defender", "Double Strike", "Equip", "First Strike",
  "Flash", "Flying", "Haste", "Hexproof", "Indestructible", "Intimidate",
  "Landwalk", "Lifelink", "Menace", "Protection", "Prowess", "Reach",
  "Shroud", "Trample", "Vigilance", "Ward",
] as const;

export const MTG_SUBTYPES_BY_TYPE: Record<string, readonly string[]> = {
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
