import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });
}

Range.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
document.elementFromPoint = () => document.body;
