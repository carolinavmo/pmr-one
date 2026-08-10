"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement: {
          new (
            options: {
              pageLanguage: string;
              includedLanguages?: string;
              layout?: number;
              autoDisplay?: boolean;
            },
            elementId: string
          ): unknown;
          InlineLayout: { SIMPLE: number };
        };
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

const SCRIPT_ID = "google-translate-script";
let domPatched = false;
let widgetInitialized = false;

// Google's widget rewrites translated text nodes directly in the live
// DOM. When React later reconciles that same subtree (e.g. a parent
// re-render), it can try to remove/reorder a node Google already
// detached, throwing "Failed to execute 'removeChild'/'insertBefore'
// on 'Node'" and crashing the whole tree — a well-known Google
// Translate + React conflict with no first-party fix. Patch the two
// DOM methods to no-op on that specific failure instead of throwing.
function patchDomMethod(method: "removeChild" | "insertBefore") {
  const proto = Node.prototype as unknown as Record<
    "removeChild" | "insertBefore",
    (...args: unknown[]) => unknown
  >;
  const original = proto[method];
  proto[method] = function (this: Node, ...args: unknown[]) {
    try {
      return original.apply(this, args);
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") {
        return args[0];
      }
      throw error;
    }
  };
}

// Temporary, in-the-browser "translate right now" widget — a stopgap
// while the reviewed DeepL/Claude pipeline (schema built, not yet
// wired to the read/save path) is the real, permanent solution.
// Deliberate, accepted limitations for a "for now" tool: Google only
// exposes generic "pt" (no Portugal/Brazil variant split), nothing is
// stored or reviewed, and it live-rewrites the DOM per visitor rather
// than serving pre-translated, human-checked pages — not appropriate
// for the reviewed medical-content pipeline this project is actually
// building toward.
export function GoogleTranslateWidget() {
  useEffect(() => {
    if (!domPatched) {
      patchDomMethod("removeChild");
      patchDomMethod("insertBefore");
      domPatched = true;
    }

    if (widgetInitialized || document.getElementById(SCRIPT_ID)) return;

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate || widgetInitialized) return;
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "en,pt,es",
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        "google_translate_element"
      );
      widgetInitialized = true;
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return <div id="google_translate_element" className="google-translate-widget" translate="no" />;
}
