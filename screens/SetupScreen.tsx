import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Platform, KeyboardAvoidingView, StatusBar, Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { searchCardNames } from "../System/cardSearchSystem";
import type { CardNameRecord } from "../System/cardSearchSystem";
import { C, emptyManaCost, getManaCostValue, hasManaCost } from "../lib/types";
import type { ManaCost, Player, GameState, Action, CommanderRecord } from "../lib/types";
import { s } from "../lib/styles";
import KeywordPicker from "../components/KeywordPicker";
import ManaCostPicker from "../components/ManaCostPicker";

type CommanderSetupForm = {
  playerIndex: number;
  name: string;
  manaCost: ManaCost;
  power: string;
  toughness: string;
  abilities: string[];
};

function makeCommanderSetupForm(playerIndex: number): CommanderSetupForm {
  return { playerIndex, name: "", manaCost: emptyManaCost(), power: "", toughness: "", abilities: [] };
}

export default function SetupScreen({ dispatch }: { dispatch: React.Dispatch<Action> }) {
  const [step, setStep] = useState(1);
  const [gameType, setGameType] = useState("commander");
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>(["Player 1", "Player 2"]);
  const [playerColors, setPlayerColors] = useState<string[]>(["#7C5CFF", "#F59E0B"]);
  const [firstPlayerIdx, setFirstPlayerIdx] = useState(0);
  const [life, setLife] = useState(40);
  const [commanderForms, setCommanderForms] = useState<CommanderSetupForm[]>(() => [makeCommanderSetupForm(0), makeCommanderSetupForm(1)]);
  const [activeCommanderSearchIndex, setActiveCommanderSearchIndex] = useState<number | null>(null);
  const [commanderNameSuggestions, setCommanderNameSuggestions] = useState<CardNameRecord[]>([]);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const gameTypes = [
    { key: "commander", label: "Commander", life: 40, desc: "40 life, EDH format" },
    { key: "standard", label: "Standard", life: 20, desc: "20 life, 1v1" },
    { key: "custom", label: "Custom", life: 20, desc: "Set your own rules" },
  ];
  const activeCommanderForms = commanderForms.slice(0, playerCount);
  const missingCommanderNames = gameType === "commander"
    ? activeCommanderForms
        .filter(form => form.name.trim().length === 0)
        .map(form => playerNames[form.playerIndex]?.trim() || `Player ${form.playerIndex + 1}`)
    : [];
  const commandersComplete = missingCommanderNames.length === 0;
  const canStartGame = gameType !== "commander" || commandersComplete;
  const setupKeyboardPadding = keyboardOpen
    ? Platform.OS === "android" ? 96 : 120
    : undefined;

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const PLAYER_COLOR_PALETTE = ["#7C5CFF","#F59E0B","#EF4444","#22C55E","#3B82F6","#EC4899","#14B8A6","#EAB308"];

  function handlePlayerCountChange(count: number) {
    setPlayerCount(count);
    setPlayerNames(prev => {
      const next = [...prev];
      while (next.length < count) next.push(`Player ${next.length + 1}`);
      return next.slice(0, count);
    });
    setPlayerColors(prev => {
      const next = [...prev];
      while (next.length < count) next.push(PLAYER_COLOR_PALETTE[next.length % PLAYER_COLOR_PALETTE.length]);
      return next.slice(0, count);
    });
    setCommanderForms(prev =>
      Array.from({ length: count }, (_, i) => prev.find(form => form.playerIndex === i) ?? makeCommanderSetupForm(i))
    );
    if (activeCommanderSearchIndex !== null && activeCommanderSearchIndex >= count) {
      setActiveCommanderSearchIndex(null);
      setCommanderNameSuggestions([]);
    }
    if (firstPlayerIdx >= count) setFirstPlayerIdx(0);
  }

  function updateCommanderForm(playerIndex: number, updates: Partial<Omit<CommanderSetupForm, "playerIndex">>) {
    setCommanderForms(prev => prev.map(form => form.playerIndex === playerIndex ? { ...form, ...updates } : form));
  }

  function handleCommanderNameChange(playerIndex: number, text: string) {
    updateCommanderForm(playerIndex, { name: text });
    setActiveCommanderSearchIndex(playerIndex);
    setCommanderNameSuggestions(searchCardNames(text));
  }

  function selectCommanderSuggestion(playerIndex: number, card: CardNameRecord) {
    updateCommanderForm(playerIndex, { name: card.name });
    setActiveCommanderSearchIndex(null);
    setCommanderNameSuggestions([]);
  }

  function renderCommanderNameSuggestions(form: CommanderSetupForm) {
    if (activeCommanderSearchIndex !== form.playerIndex || commanderNameSuggestions.length === 0) return null;
    return (
      <View style={{ backgroundColor: C.cardAlt, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginTop: -8, marginBottom: 12, overflow: "hidden" }}>
        {commanderNameSuggestions.map(card => (
          <TouchableOpacity
            key={card.name}
            style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}
            onPress={() => selectCommanderSuggestion(form.playerIndex, card)}
            activeOpacity={0.75}
          >
            <Text style={{ color: C.text, fontSize: 13, fontWeight: "600" }}>{card.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  function handleStartGame() {
    if (!canStartGame) return;
    const players: Player[] = playerNames.map((name, i) => ({
      id: `p${i + 1}`, name: name.trim() || `Player ${i + 1}`,
      isUser: i === 0, life,
      color: playerColors[i] ?? PLAYER_COLOR_PALETTE[i % PLAYER_COLOR_PALETTE.length],
    }));
    const ids = players.map(p => p.id);
    const turnOrder = [...ids.slice(firstPlayerIdx), ...ids.slice(0, firstPlayerIdx)];
    const setupTime = Date.now();
    const commanders: CommanderRecord[] = gameType === "commander"
      ? commanderForms.flatMap((form, i) => {
          const owner = players[form.playerIndex];
          const name = form.name.trim();
          if (!owner || !name) return [];
          const power = parseInt(form.power, 10);
          const toughness = parseInt(form.toughness, 10);
          const manaCost = hasManaCost(form.manaCost) ? form.manaCost : undefined;
          return [{
            id: `commander-setup-${owner.id}-${i}-${setupTime}`,
            ownerPlayerId: owner.id,
            name,
            type: "Creature",
            currentZone: "commandZone" as const,
            timesCastFromCommandZone: 0,
            manaCost,
            manaValue: getManaCostValue(manaCost),
            power: !isNaN(power) ? power : undefined,
            toughness: !isNaN(toughness) ? toughness : undefined,
            abilities: form.abilities.length > 0 ? form.abilities : undefined,
          }];
        })
      : [];
    const commanderDamage: GameState["commanderDamage"] = {};
    players.forEach(player => {
      commanderDamage[player.id] = {};
      commanders.forEach(commander => {
        commanderDamage[player.id][commander.id] = 0;
      });
    });
    dispatch({ type: "START_GAME", playerName: players[0].name, life, gameType, players, turnOrder, firstPlayerIndex: firstPlayerIdx, commanders, commanderDamage });
  }

  const canAdvance1 = true;
  const canAdvance2 = playerNames.every(n => n.trim().length > 0);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
      >
      <ScrollView
        contentContainerStyle={[s.setupContainer, setupKeyboardPadding !== undefined && { paddingBottom: setupKeyboardPadding }]}
        keyboardShouldPersistTaps="handled"
      >
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
              <TouchableOpacity key={gt.key} style={[s.gameTypeCard, gameType === gt.key && s.gameTypeCardActive]} onPress={() => { setGameType(gt.key); setLife(gt.life); setActiveCommanderSearchIndex(null); setCommanderNameSuggestions([]); }}>
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
            <Text style={s.sectionLabel}>Player Names &amp; Colors</Text>
            {playerNames.map((name, i) => (
              <View key={i} style={{ marginBottom: 16 }}>
                <Text style={[s.gameTypeDesc, { marginBottom: 6 }]}>{i === 0 ? "You (Player 1)" : `Player ${i + 1}`}</Text>
                <TextInput
                  style={[s.input, { borderColor: playerColors[i] ?? C.border, marginBottom: 8 }]}
                  value={name}
                  onChangeText={text => setPlayerNames(prev => { const n = [...prev]; n[i] = text; return n; })}
                  placeholder={i === 0 ? "Your name" : `Player ${i + 1}`}
                  placeholderTextColor={C.dim}
                  maxLength={24}
                />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {PLAYER_COLOR_PALETTE.map(color => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setPlayerColors(prev => { const n = [...prev]; n[i] = color; return n; })}
                      style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: color,
                        borderWidth: playerColors[i] === color ? 3 : 1,
                        borderColor: playerColors[i] === color ? C.text : "transparent",
                      }}
                    />
                  ))}
                </View>
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
            {playerNames.map((name, i) => {
              const pColor = playerColors[i] ?? C.accent;
              const isSelected = firstPlayerIdx === i;
              return (
                <TouchableOpacity
                  key={i}
                  style={[s.gameTypeCard, isSelected && { borderColor: pColor, backgroundColor: pColor + "22" }]}
                  onPress={() => setFirstPlayerIdx(i)}
                >
                  <Text style={[s.gameTypeLabel, isSelected && { color: C.text }]}>{name.trim() || `Player ${i + 1}`}{i === 0 ? " (You)" : ""}</Text>
                </TouchableOpacity>
              );
            })}
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
            {gameType === "commander" && (
              <View style={{ marginTop: 12, marginBottom: 8 }}>
                <Text style={s.sectionLabel}>Commander Required</Text>
                <Text style={[s.reminderDesc, { marginBottom: 12 }]}>Enter a commander for each player before starting a Commander game. Each player's commander starts in the command zone.</Text>
                {activeCommanderForms.map(form => (
                  <View key={form.playerIndex} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                    <Text style={[s.gameTypeLabel, { marginBottom: 4 }]}>{playerNames[form.playerIndex]?.trim() || `Player ${form.playerIndex + 1}`}</Text>
                    <Text style={[s.gameTypeDesc, { marginBottom: 6 }]}>Commander Name</Text>
                    <TextInput
                      style={s.input}
                      value={form.name}
                      onFocus={() => {
                        setActiveCommanderSearchIndex(form.playerIndex);
                        setCommanderNameSuggestions(searchCardNames(form.name));
                      }}
                      onChangeText={text => handleCommanderNameChange(form.playerIndex, text)}
                      placeholder="Commander name"
                      placeholderTextColor={C.dim}
                      maxLength={40}
                    />
                    {renderCommanderNameSuggestions(form)}
                    <Text style={[s.gameTypeDesc, { marginBottom: 6 }]}>Mana Cost</Text>
                    <ManaCostPicker value={form.manaCost} onChange={next => updateCommanderForm(form.playerIndex, { manaCost: next })} />
                    <Text style={[s.gameTypeDesc, { marginBottom: 6 }]}>Power / Toughness optional</Text>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TextInput
                        style={[s.input, { flex: 1, marginBottom: 0 }]}
                        value={form.power}
                        onChangeText={text => updateCommanderForm(form.playerIndex, { power: text })}
                        placeholder="Power"
                        placeholderTextColor={C.dim}
                        keyboardType="numeric"
                      />
                      <Text style={{ color: C.muted, fontSize: 24, alignSelf: "center" }}>/</Text>
                      <TextInput
                        style={[s.input, { flex: 1, marginBottom: 0 }]}
                        value={form.toughness}
                        onChangeText={text => updateCommanderForm(form.playerIndex, { toughness: text })}
                        placeholder="Toughness"
                        placeholderTextColor={C.dim}
                        keyboardType="numeric"
                      />
                    </View>
                    <KeywordPicker
                      label="Keyword Abilities (optional)"
                      selected={form.abilities}
                      onChange={next => updateCommanderForm(form.playerIndex, { abilities: next })}
                    />
                  </View>
                ))}
                {!commandersComplete && (
                  <Text style={[s.reminderDesc, { color: C.warning, marginTop: 2 }]}>
                    Missing commander: {missingCommanderNames.join(", ")}
                  </Text>
                )}
              </View>
            )}
            <TouchableOpacity style={[s.startBtn, !canStartGame && { opacity: 0.45 }]} onPress={handleStartGame} disabled={!canStartGame}>
              <Text style={s.startBtnText}>⚔️  Start Game</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
