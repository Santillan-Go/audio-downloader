import { useState } from "react";

/**
 * Represents the user configuration file of Splicedd (Web version).
 */
export interface SpliceddConfig {
  sampleDir: string;
  placeholders: boolean;
  darkMode: boolean;
  configured: boolean;
}

let globalCfg: SpliceddConfig;

function defaultCfg(): SpliceddConfig {
  return {
    sampleDir: "Downloads", // Web version uses browser downloads
    darkMode: true,
    placeholders: false,
    configured: true, // Auto-configure for web
  };
}

/**
 * Returns the global configuration object. The returned object should be treated as immutable.
 */
export function cfg(): SpliceddConfig {
  return globalCfg;
}

/**
 * Changes select values of the user configuration and saves it to localStorage.
 */
export async function mutateCfg(values: Partial<SpliceddConfig>) {
  globalCfg = { ...globalCfg, ...values };
  await saveConfig();
}

/**
 * Loads user configuration from localStorage.
 */
export async function loadConfig() {
  try {
    const stored = localStorage.getItem("splicedd-config");
    if (stored) {
      globalCfg = { ...defaultCfg(), ...JSON.parse(stored) };
    } else {
      globalCfg = defaultCfg();
    }
  } catch (error) {
    console.error("Failed to load config:", error);
    globalCfg = defaultCfg();
  }
}

/**
 * Synchronizes the in-memory configuration object with localStorage.
 */
export async function saveConfig() {
  try {
    localStorage.setItem("splicedd-config", JSON.stringify(globalCfg));
  } catch (error) {
    console.error("Failed to save config:", error);
  }
}

/**
 * Represents the synchronized state between a React component and the configuration object.
 */
interface ConfigSyncedState<T> {
  key: keyof SpliceddConfig;
  state: T;
  setState: React.Dispatch<React.SetStateAction<T>>;
}

/**
 * Allows for synchronization between React components and a single key-value pair of the configuration object.
 */
export function useCfgSyncedState<T>(key: keyof SpliceddConfig) {
  const [state, setState] = useState<T>(globalCfg[key] as T);
  return { key, state, setState };
}

/**
 * Changes the value of the key specified by the target `state` to the given `value`,
 * synchronizing it with the configuration object and localStorage.
 */
export function mutateCfgSync<T>(value: T, state: ConfigSyncedState<T>) {
  (globalCfg as any)[state.key] = value;
  state.setState(value);
  saveConfig();
}
