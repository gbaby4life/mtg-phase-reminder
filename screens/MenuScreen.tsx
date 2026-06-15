import React from "react";
import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C } from "../lib/types";
import type { Action } from "../lib/types";
import { s } from "../lib/styles";

type MenuScreenProps = {
  dispatch: React.Dispatch<Action>;
  hasSavedGame?: boolean;
  savedGameSummary?: string;
  onContinueGame?: () => void;
};

export default function MenuScreen({ dispatch, hasSavedGame = false, savedGameSummary, onContinueGame }: MenuScreenProps) {
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
          <TouchableOpacity
            style={[s.menuBtn, !hasSavedGame && s.menuBtnDim]}
            activeOpacity={hasSavedGame ? 0.85 : 0.6}
            disabled={!hasSavedGame}
            onPress={onContinueGame}
          >
            <Text style={s.menuBtnIcon}>🔄</Text>
            <View>
              <Text style={[s.menuBtnText, !hasSavedGame && { color: C.muted }]}>Continue Game</Text>
              <Text style={s.menuBtnSub}>{hasSavedGame ? savedGameSummary ?? "Resume saved game" : "No saved game"}</Text>
            </View>
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
