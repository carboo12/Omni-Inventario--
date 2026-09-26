/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { printReceiptHtml } from "./print-iframe";

const TICKET = '<div class="ticket-container"><p class="pharmacy-name">ABARROTERIA EL JICARITO</p></div>';

let printedHtml: string[] = [];
let printed = 0;
let focusCalls = 0;
let nullReads = 0;
let cwNative: PropertyDescriptor | undefined;

beforeEach(() => {
  printedHtml = []; printed = 0; focusCalls = 0; nullReads = 0;
  vi.useFakeTimers();
  cwNative = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "contentWindow")!;
  const native = cwNative.get!;
  const tag = new WeakSet<object>();
  Object.defineProperty(HTMLIFrameElement.prototype, "contentWindow", {
    configurable: true,
    get(this: HTMLIFrameElement) {
      if (nullReads > 0) { nullReads--; return null; }        // simula ventana no inicializada
      const w = native.call(this);
      if (w && !tag.has(w)) {                                 // espias sobre la instancia del iframe
        tag.add(w);
        (w as any).print = () => { printed++; printedHtml.push(w.document.documentElement.outerHTML); };
        (w as any).focus = () => { focusCalls++; };
      }
      return w;
    },
  });
});

afterEach(() => {
  if (cwNative) Object.defineProperty(HTMLIFrameElement.prototype, "contentWindow", cwNative);
  vi.useRealTimers();
});

describe("printReceiptHtml: iframe no inicializado", () => {
  it("no lanza y reimprime cuando contentWindow es null tras insertar", () => {
    nullReads = 6;
    expect(() => printReceiptHtml(TICKET)).not.toThrow();
    vi.advanceTimersByTime(3000);
    expect(printed).toBe(1);
    expect(focusCalls).toBeGreaterThan(0);
  });

  it("abandona sin lanzar, avisa por consola y limpia el iframe si nunca se inicializa", () => {
    nullReads = Number.MAX_SAFE_INTEGER;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => printReceiptHtml(TICKET)).not.toThrow();
    vi.advanceTimersByTime(5000);
    expect(printed).toBe(0);
    expect(document.querySelectorAll("iframe")).toHaveLength(0);
    expect(spy).toHaveBeenCalled();
  });
});

describe("printReceiptHtml: ticket e higiene del DOM", () => {
  it("escribe el documento COMPLETO: CSS de 80 mm + contenido del ticket", () => {
    printReceiptHtml(TICKET);
    vi.advanceTimersByTime(3000);
    const doc = printedHtml[0] ?? "";
    expect(doc).toContain("width: 80mm !important");
    expect(doc).toContain("@page");
    expect(doc).toContain(".detalle-factura-header");
    expect(doc).toContain(".col-cant");
    expect(doc).toContain(".col-prod");
    expect(doc).toContain("ABARROTERIA EL JICARITO");
  });

  it("imprime una sola vez aunque load y reintento coincidan", () => {
    printReceiptHtml(TICKET);
    vi.advanceTimersByTime(3000);
    expect(printed).toBe(1);
  });

  it("elimina el iframe del DOM tras imprimir", () => {
    printReceiptHtml(TICKET);
    vi.advanceTimersByTime(3000);
    expect(document.getElementById("print-receipt-iframe")).toBeNull();
    expect(document.querySelectorAll("iframe")).toHaveLength(0);
  });

  it("no acumula iframes en impresiones consecutivas", () => {
    printReceiptHtml(TICKET);
    printReceiptHtml(TICKET);
    printReceiptHtml(TICKET);
    vi.advanceTimersByTime(3000);
    expect(document.querySelectorAll("iframe").length).toBeLessThanOrEqual(1);
  });

  it("es inocuo si se llama sin ticket", () => {
    expect(() => printReceiptHtml("")).not.toThrow();
    vi.advanceTimersByTime(3000);
    expect(document.querySelectorAll("iframe")).toHaveLength(0);
  });
});
