import React from "react";
import type { Decorator } from "@storybook/nextjs-vite";
import { I18nProvider } from "@/lib/i18n-provider";
import enMessages from "@/messages/en.json";

/**
 * Wraps a story in the I18nProvider with English messages.
 * Use this for any component that calls useI18n().
 */
export const withI18n: Decorator = (Story) => (
  <I18nProvider initialLocale="en" initialMessages={enMessages}>
    <Story />
  </I18nProvider>
);
