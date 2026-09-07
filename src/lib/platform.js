import { Capacitor } from "@capacitor/core";

/**
 * Platform helper utility for Web and Native App (Android/iOS)
 */
export const platform = {
  isNative: () => Capacitor.isNativePlatform(),
  isWeb: () => !Capacitor.isNativePlatform(),
  isAndroid: () => Capacitor.getPlatform() === "android",
  isIos: () => Capacitor.getPlatform() === "ios",
  getName: () => Capacitor.getPlatform(),
};

export const isNativePlatform = platform.isNative;
export const isAndroid = platform.isAndroid;
export const isIos = platform.isIos;
export const isWeb = platform.isWeb;

