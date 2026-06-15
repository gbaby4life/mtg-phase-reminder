import React, { useEffect, useReducer, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { INIT, reducer } from "../../lib/reducer";
import MenuScreen from "../../screens/MenuScreen";
import SetupScreen from "../../screens/SetupScreen";
import GameScreen from "../../screens/GameScreen";
import type { GameState } from "../../lib/types";

const SAVE_KEY = "mtg-game-state";

function isResumableGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const screen = (value as { screen?: unknown }).screen;
  return screen === "game" || screen === "opponent-turn";
}

function getSavedGameSummary(state: GameState | null): string | undefined {
  if (!state) return undefined;
  const playerId = state.turnOrder[state.currentPlayerIndex];
  const player = state.players.find(p => p.id === playerId);
  const playerName = player?.name ?? state.playerName;
  return `${playerName} · Turn ${state.turnNumber}`;
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, INIT);
  const [hydrated, setHydrated] = useState(false);
  const [savedGameState, setSavedGameState] = useState<GameState | null>(null);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(SAVE_KEY)
      .then(raw => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (isResumableGameState(parsed)) setSavedGameState(parsed);
        } catch {
          // Ignore malformed saves and continue with INIT.
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setHydrated(true);
      });

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (savedGameState && state.screen === "menu") return;
    void AsyncStorage.setItem(SAVE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated, savedGameState]);

  function continueSavedGame() {
    if (!savedGameState) return;
    const nextState = savedGameState;
    setSavedGameState(null);
    dispatch({ type: "HYDRATE", state: nextState });
  }

  if (!hydrated) return null;

  if (state.screen === "menu") {
    return (
      <MenuScreen
        dispatch={dispatch}
        hasSavedGame={savedGameState !== null}
        savedGameSummary={getSavedGameSummary(savedGameState)}
        onContinueGame={continueSavedGame}
      />
    );
  }
  if (state.screen === "setup") return <SetupScreen dispatch={dispatch} />;
  return <GameScreen state={state} dispatch={dispatch} />;
}
