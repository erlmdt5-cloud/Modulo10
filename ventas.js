/**
 * ventas.js — Módulo de Lógica de Ventas
 * Responsabilidad: SOLO reglas de negocio sobre ventas.
 * Sin tablas. Sin localStorage.
 */

const Ventas = (() => {

  // ── Creación ───────────────────────────────────────────────
  /** Construye un objeto de venta a partir de un producto y precio de venta. */
  function crear(producto, precioVenta, extra = {}) {
    const ahora = new Date();
    const pv    = parseFloat(precioVenta);
    return {
      id      : extra.id !== undefined ? extra.id : Date.now(),
      ...(extra.folio ? { folio: extra.folio } : {}),
      ts      : ahora.toISOString(),
      cod     : producto.codigo,
      nombre  : producto.nombre,
      color   : producto.color || '',
      talla   : producto.talla,
      costo   : producto.precio,
      venta   : pv,
      ganancia: parseFloat((pv - producto.precio).toFixed(2)),
      fecha   : ahora.toLocaleDateString('es-GT'),
      hora    : ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  /** Siguiente folio de transacción ("V-0001", "V-0002"…) según los ya usados. */
  function siguienteFolio(lista) {
    const max = lista.reduce((m, v) => {
      const n = /^V-(\d+)$/.exec(v.folio || '');
      return n ? Math.max(m, parseInt(n[1], 10)) : m;
    }, 0);
    return 'V-' + String(max + 1).padStart(4, '0');
  }

  /** Corrige color/talla en las ventas de una variante (cuando se edita en el inventario). */
  function actualizarVariante(lista, codigo, colorViejo, tallaVieja, colorNuevo, tallaNueva) {
    const c = String(codigo || '').trim();
    return lista.map(v =>
      String(v.cod).trim() === c &&
      _color(v.color) === _color(colorViejo) &&
      _talla(v.talla) === _talla(tallaVieja)
        ? { ...v, color: colorNuevo, talla: tallaNueva }
        : { ...v }
    );
  }

  // ── Búsqueda ───────────────────────────────────────────────
  function buscarPorId(lista, id) {
    return lista.find(v => v.id === id) || null;
  }

  function eliminarPorId(lista, id) {
    return lista.filter(v => v.id !== id);
  }

  // ── Contador de unidades vendidas ──────────────────────────
  /** Identidad del color: sin mayúsculas ni orden ("Azul / Blanco" = "blanco / azul"). */
  function _color(c) {
    return String(c == null ? '' : c).split(/[\/+]/)
      .map(x => x.trim().replace(/\s+/g, ' ').toLowerCase())
      .filter((x, i, a) => x && a.indexOf(x) === i)
      .sort().join('|');
  }
  function _talla(t) { return String(t == null ? '' : t).trim().replace(/\s+/g, ' ').toUpperCase(); }

  /**
   * Unidades vendidas de un producto. Con color y talla: solo esa variante;
   * un color o talla `undefined` actúa como comodín. Las ventas anuladas ya
   * no están en la lista, así que no cuentan (ventas viejas sin color = "").
   */
  function contarVendidos(lista, codigo, color, talla) {
    const c = String(codigo || '').trim();
    const col = color === undefined ? null : _color(color);
    const t = talla === undefined ? null : _talla(talla);
    return lista.filter(v =>
      String(v.cod).trim() === c &&
      (col === null || _color(v.color) === col) &&
      (t === null || _talla(v.talla) === t)
    ).length;
  }

  // ── Cálculo de totales ─────────────────────────────────────
  function calcularTotales(lista) {
    return lista.reduce(
      (acc, v) => ({
        totalVentas  : acc.totalVentas   + v.venta,
        totalCosto   : acc.totalCosto    + v.costo,
        totalGanancia: acc.totalGanancia + v.ganancia
      }),
      { totalVentas: 0, totalCosto: 0, totalGanancia: 0 }
    );
  }

  // ── Ticket de texto ────────────────────────────────────────
  function generarTicketTexto(venta) {
    return [
      '╔══════════════════════════════╗',
      '║       TICKET DE VENTA        ║',
      '╚══════════════════════════════╝',
      `  Fecha   : ${venta.fecha}`,
      `  Hora    : ${venta.hora}`,
      '  ──────────────────────────────',
      `  Producto : ${venta.nombre}`,
      ...(venta.color ? [`  Color    : ${venta.color}`] : []),
      `  Talla    : ${venta.talla}`,
      `  Precio   : $${venta.venta.toFixed(2)}`,
      '  ──────────────────────────────',
      '       ¡Gracias por su compra!  ',
      ''
    ].join('\n');
  }

  /**
   * Ticket de una transacción (varias ventas con el mismo folio): agrupa por
   * variante y precio, y muestra el total.
   */
  function generarTicketTransaccion(ventas) {
    const f = n => `$${Number(n).toFixed(2)}`;
    const grupos = new Map();
    ventas.forEach(v => {
      const k = [String(v.cod).trim(), _color(v.color), _talla(v.talla), v.venta].join('|');
      const g = grupos.get(k) || { v, n: 0 };
      g.n += 1;
      grupos.set(k, g);
    });
    const total = ventas.reduce((a, v) => a + (parseFloat(v.venta) || 0), 0);
    const primera = ventas[0] || {};
    const lineas = [];
    grupos.forEach(({ v, n }) => {
      lineas.push(`  ${n} x ${v.nombre}`);
      lineas.push(`      ${v.color ? v.color + ' · ' : ''}Talla ${v.talla}`);
      lineas.push(`      ${f(v.venta)} c/u  →  ${f(v.venta * n)}`);
    });
    return [
      '╔══════════════════════════════╗',
      '║       TICKET DE VENTA        ║',
      '╚══════════════════════════════╝',
      ...(primera.folio ? [`  Folio    : ${primera.folio}`] : []),
      `  Fecha    : ${primera.fecha || ''}`,
      `  Hora     : ${primera.hora || ''}`,
      '  ──────────────────────────────',
      ...lineas,
      '  ──────────────────────────────',
      `  Artículos: ${ventas.length}`,
      `  TOTAL    : ${f(total)}`,
      '  ──────────────────────────────',
      '       ¡Gracias por su compra!  ',
      '',
    ].join('\n');
  }

  return { crear, siguienteFolio, actualizarVariante, buscarPorId, eliminarPorId, contarVendidos, calcularTotales, generarTicketTexto, generarTicketTransaccion };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { Ventas };
