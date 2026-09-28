/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { printReceiptHtml, buildReceiptHtml, buildQuoteReceiptHtml, type ReceiptHtmlData } from "./print-iframe";

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

/* ------------------------------------------------------------------ */
/*  Línea de ítem: "En Línea con la Cantidad" (INLINE_QTY)            */
/* ------------------------------------------------------------------ */

const SALE: ReceiptHtmlData = {
  pharmacyName: "FARMACIA SAN JUAN",
  address: "Managua",
  phone: "2555-1234",
  ticketId: "F-002847",
  date: new Date("2026-09-26T10:00:00"),
  cashierName: "Maria",
  items: [
    { quantity: 2, description: "Amoxicilina 500mg", price: 150, total: 300, unit: "Cajas" },
    { quantity: 4, description: "Acetaminofen", price: 10, total: 40, unit: "ud" },
  ],
  subtotal: 340,
  tax: 0,
  total: 340,
  paymentMethod: "Efectivo",
  amountPaid: 340,
  change: 0,
};

const row = (html: string, index: number) => html.split("<tbody>")[1].split("</tbody>")[0].split("</tr>")[index];

describe("buildReceiptHtml: INLINE_QTY (En Línea con la Cantidad)", () => {
  it("ordena la línea como [Cantidad] [Presentación] [Nombre] [P.U.] [Total]", () => {
    const html = row(buildReceiptHtml(SALE, { presentationLayout: "INLINE_QTY" }), 0);
    expect(html).toMatch(/<td class="col-cant"[^>]*>2<\/td>/);
    expect(html).toMatch(/item-presentation[^>]*>Cajas<\/span><span class="item-name">Amoxicilina 500mg<\/span>/);
    expect(html.indexOf(">2<")).toBeLessThan(html.indexOf("Cajas"));
    expect(html.indexOf("Cajas")).toBeLessThan(html.indexOf("Amoxicilina 500mg"));
    expect(html.indexOf("Amoxicilina 500mg")).toBeLessThan(html.indexOf(">150.00<"));
    expect(html.indexOf(">150.00<")).toBeLessThan(html.indexOf(">300.00<"));
  });

  it("omite símbolos de moneda en las columnas de precio y total", () => {
    const html = buildReceiptHtml(SALE, { presentationLayout: "INLINE_QTY" });
    const detail = html.split("<tbody>")[1].split("</tbody>")[0];
    expect(detail).not.toMatch(/C\$|\$|USD/);
  });

  it("respeta fontSizeBody y fontSizePresentation configurados", () => {
    const html = buildReceiptHtml(SALE, { presentationLayout: "INLINE_QTY", fontSizeBody: 13, fontSizePresentation: 7 });
    expect(html).toContain('class="item-presentation" style="font-size:7px;margin:0 3px;"');
    expect(html).toContain('class="col-cant" style="vertical-align:top;text-align:left;padding:4px 1px;font-weight:bold;white-space:nowrap;font-size:13px;"');
  });

  it("omite la presentación cuando es genérica (ud) y no entre paréntesis", () => {
    const html = buildReceiptHtml(SALE, { presentationLayout: "INLINE_QTY" });
    expect(row(html, 1)).not.toContain("item-presentation");
  });

  it("elimina los paréntesis que ya venían en el dato de presentación", () => {
    const html = buildReceiptHtml(
      { ...SALE, items: [{ ...SALE.items[0], unit: "(Caja x 30 cáp.)" }] },
      { presentationLayout: "INLINE_QTY" },
    );
    expect(row(html, 0)).toContain(">Caja x 30 cáp.</span>");
    expect(row(html, 0)).not.toContain("(Caja x 30 cáp.)");
  });

  it("mantiene la presentación en 2.ª línea cuando el diseño es BELOW_NAME", () => {
    const html = buildReceiptHtml(SALE, { presentationLayout: "BELOW_NAME" });
    const first = row(html, 0);
    expect(first).toMatch(/<div[^>]*>Amoxicilina 500mg<\/div>\s*<div[^>]*>\(Cajas\)<\/div>/);
    expect(first).not.toContain("item-presentation");
  });
});

describe("buildQuoteReceiptHtml: propaga el diseño del ticket", () => {
  it("aplica INLINE_QTY también a las cotizaciones", () => {
    const html = buildQuoteReceiptHtml(
      {
        businessName: "FARMACIA SAN JUAN",
        address: "Managua",
        phone: "2555-1234",
        quoteNumber: "COT-0000001",
        date: new Date("2026-09-26T10:00:00"),
        expirationDays: 15,
        customerName: "Cliente General",
        cashierName: "Maria",
        items: [{ quantity: 2, description: "Amoxicilina 500mg", price: 150, total: 300, unit: "Cajas" }],
        subtotal: 300,
        total: 300,
      },
      { presentationLayout: "INLINE_QTY" },
    );
    expect(row(html, 0)).toMatch(/item-presentation[^>]*>Cajas<\/span><span class="item-name">Amoxicilina 500mg<\/span>/);
  });
});
