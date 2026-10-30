/**
 * carrito.js — Carrito de compras (varias variantes en una sola transacción)
 * Responsabilidad: lógica pura de las líneas del carrito (sin DOM ni localStorage).
 *
 * Una línea = una variante (código + color + talla) con cantidad y precio de venta.
 * El carrito NO descuenta inventario: eso ocurre al cobrar.
 */

const Carrito = (() => {

  const _r2  = n => Math.round((Number(n) || 0) * 100) / 100;
  const _cod = c => String(c == null ? '' : c).trim();
  // Identidad del color: sin mayúsculas ni orden ("Azul / Blanco" = "blanco / azul")
  const _col = c => String(c == null ? '' : c).split(/[\/+]/)
    .map(x => x.trim().replace(/\s+/g, ' ').toLowerCase())
    .filter((x, i, a) => x && a.indexOf(x) === i)
    .sort().join('|');
  const _tal = t => String(t == null ? '' : t).trim().replace(/\s+/g, ' ').toUpperCase();

  function mismaVariante(a, b) {
    return _cod(a.codigo) === _cod(b.codigo) && _col(a.color) === _col(b.color) && _tal(a.talla) === _tal(b.talla);
  }

  function cantidadEnCarrito(lineas, p) {
    return lineas.filter(l => mismaVariante(l, p)).reduce((a, l) => a + l.cantidad, 0);
  }

  /** Unidades que aún se pueden agregar de esa variante (stock − lo ya incluido en el carrito). */
  function disponible(producto, lineas) {
    return Math.max(0, (parseInt(producto.cantidad) || 0) - cantidadEnCarrito(lineas, producto));
  }

  /** Suma 1 unidad de la variante (crea la línea con `precioVenta` si no existía). */
  function agregar(lineas, producto, precioVenta) {
    const copia = lineas.map(l => ({ ...l }));
    const linea = copia.find(l => mismaVariante(l, producto));
    if (linea) {
      linea.cantidad += 1;
    } else {
      copia.push({
        codigo: producto.codigo,
        nombre: producto.nombre,
        color: producto.color || '',
        talla: producto.talla,
        costo: parseFloat(producto.precio) || 0,
        precioVenta: parseFloat(precioVenta),
        cantidad: 1,
      });
    }
    return copia;
  }

  /** Fija la cantidad de una línea; 0 o menos la quita. */
  function cambiarCantidad(lineas, i, cantidad) {
    if (!lineas[i]) return lineas;
    const n = parseInt(cantidad);
    if (isNaN(n) || n <= 0) return quitar(lineas, i);
    return lineas.map((l, j) => (j === i ? { ...l, cantidad: n } : { ...l }));
  }

  /** Cambia el precio de venta de una línea (ignora valores no válidos). */
  function cambiarPrecio(lineas, i, precio) {
    const p = parseFloat(precio);
    if (!lineas[i] || isNaN(p) || p < 0) return lineas;
    return lineas.map((l, j) => (j === i ? { ...l, precioVenta: _r2(p) } : { ...l }));
  }

  function quitar(lineas, i) {
    return lineas.filter((_, j) => j !== i).map(l => ({ ...l }));
  }

  function subtotal(l) { return _r2(l.precioVenta * l.cantidad); }
  function total(lineas) { return _r2(lineas.reduce((a, l) => a + subtotal(l), 0)); }
  function unidades(lineas) { return lineas.reduce((a, l) => a + l.cantidad, 0); }

  /** Mensajes de error si alguna línea excede el stock actual (o el producto ya no existe). */
  function validarStock(lineas, productos) {
    const errores = [];
    lineas.forEach(l => {
      const p = productos.find(x => mismaVariante(x, l));
      const etiqueta = `${l.nombre} (${l.color ? l.color + ' · ' : ''}${l.talla})`;
      if (!p) errores.push(`${etiqueta} ya no existe en el inventario.`);
      else if (l.cantidad > p.cantidad) {
        errores.push(`Stock insuficiente de ${etiqueta}: pides ${l.cantidad} y hay ${p.cantidad}.`);
      }
    });
    return errores;
  }

  /** Renombra la variante en las líneas del carrito (cuando se edita color o talla). */
  function actualizarVariante(lineas, codigo, colorViejo, tallaVieja, colorNuevo, tallaNueva) {
    return lineas.map(l =>
      mismaVariante(l, { codigo, color: colorViejo, talla: tallaVieja })
        ? { ...l, color: colorNuevo, talla: tallaNueva }
        : { ...l }
    );
  }

  return {
    mismaVariante, cantidadEnCarrito, disponible, agregar, cambiarCantidad, cambiarPrecio,
    quitar, subtotal, total, unidades, validarStock, actualizarVariante,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { Carrito };
