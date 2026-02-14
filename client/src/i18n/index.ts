import { en } from "./en";
import { ko } from "./ko";

export type Language = "en" | "ko";

export const translations: Record<Language, Record<string, string>> = {
  en,
  ko,
};
