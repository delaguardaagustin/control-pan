// Genera el PDF horizontal que reproduce la hoja impresa «CONTROL DE PAN».
(function () {
  "use strict";

  var M = 8;                 // margen izquierdo (mm)
  var ANCHO_DIA = 9;         // columna con el nombre del día en vertical
  // Columnas de la tabla, en orden, con su ancho en mm
  var COLS = [
    { k: "prov", w: 30 },
    { k: "fecha", w: 20 },
    { k: "m0", w: 19 }, { k: "m1", w: 19 }, { k: "m2", w: 19 },
    { k: "t0", w: 19 }, { k: "t1", w: 19 }, { k: "t2", w: 19 },
    { k: "rec", w: 20 }, { k: "dev", w: 20 },
    { k: "kpag", w: 19 }, { k: "precio", w: 19 }, { k: "apagar", w: 30 }
  ];
  var X = {};
  (function () {
    var x = M + ANCHO_DIA;
    COLS.forEach(function (c) { X[c.k] = { x: x, w: c.w }; x += c.w; });
    X.fin = x;
  })();

  var Y_TABLA = 17, ALTO_SUP = 6, ALTO_INF = 8;
  var Y_BLOQUES = Y_TABLA + ALTO_SUP + ALTO_INF + 2;
  var ALTO_FILA = 5.4, ALTO_TOTAL = 5, ESPACIO = 2.6;
  var PASO = ALTO_FILA * 3 + ALTO_TOTAL + ESPACIO;

  function caja(doc, x, y, w, h) { doc.rect(x, y, w, h, "S"); }

  function centrado(doc, txt, x, y, w, h, opciones) {
    var lineas = String(txt).split("\n");
    var tam = doc.getFontSize() * 0.3528; // pt -> mm
    var altoTotal = lineas.length * tam * 1.15;
    var y0 = y + (h - altoTotal) / 2 + tam * 0.93;
    lineas.forEach(function (l, i) {
      doc.text(l, x + w / 2, y0 + i * tam * 1.15, Object.assign({ align: "center" }, opciones || {}));
    });
  }

  function aLaDerecha(doc, txt, x, y, w, h) {
    var tam = doc.getFontSize() * 0.3528;
    doc.text(String(txt), x + w - 1.5, y + h / 2 + tam * 0.35, { align: "right" });
  }

  function aLaIzquierda(doc, txt, x, y, w, h) {
    var tam = doc.getFontSize() * 0.3528;
    doc.text(String(txt), x + 1.5, y + h / 2 + tam * 0.35);
  }

  function encabezado(doc, config) {
    doc.setLineWidth(0.3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    // LOCAL: [ recuadro ]
    var xl = X.prov.x, yl = 8.5, hl = 5.5;
    caja(doc, xl, yl, 20, hl);
    aLaIzquierda(doc, "LOCAL:", xl, yl, 20, hl);
    caja(doc, xl + 20, yl, 70, hl);
    doc.setFont("helvetica", "bold");
    aLaIzquierda(doc, (config.local || "").toUpperCase(), xl + 20, yl, 70, hl);
    // CONTROL DE PAN al centro
    doc.setFontSize(11);
    centrado(doc, "CONTROL DE PAN", X.m2.x, yl, X.t2.x + X.t2.w - X.m2.x, hl);
    // Mes a la derecha
    doc.setFontSize(10);
    centrado(doc, (config.mes || "").toUpperCase(), X.rec.x, yl, X.dev.x + X.dev.w - X.rec.x, hl);
  }

  function cabeceraTabla(doc) {
    var y = Y_TABLA, hs = ALTO_SUP, hi = ALTO_INF, alto = hs + hi;
    doc.setLineWidth(0.3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    caja(doc, X.prov.x, y, X.prov.w, alto); centrado(doc, "PROVEEDOR", X.prov.x, y, X.prov.w, alto);
    caja(doc, X.fecha.x, y, X.fecha.w, alto); centrado(doc, "FECHA", X.fecha.x, y, X.fecha.w, alto);
    var kgW = X.t2.x + X.t2.w - X.m0.x;
    caja(doc, X.m0.x, y, kgW, hs); centrado(doc, "KGS. RECIBIDOS", X.m0.x, y, kgW, hs);
    ["m0", "m1", "m2", "t0", "t1", "t2"].forEach(function (k, i) {
      caja(doc, X[k].x, y + hs, X[k].w, hi);
      centrado(doc, i < 3 ? "MAÑANA" : "TARDE", X[k].x, y + hs, X[k].w, hi);
    });
    var tkW = X.dev.x + X.dev.w - X.rec.x;
    caja(doc, X.rec.x, y, tkW, hs); centrado(doc, "TOTAL KILOS", X.rec.x, y, tkW, hs);
    doc.setFontSize(6.8);
    caja(doc, X.rec.x, y + hs, X.rec.w, hi); centrado(doc, "TOTAL KG.\nRECIBIDOS", X.rec.x, y + hs, X.rec.w, hi);
    caja(doc, X.dev.x, y + hs, X.dev.w, hi); centrado(doc, "TOTAL KG. A\nDEVOLUCIÓN", X.dev.x, y + hs, X.dev.w, hi);
    caja(doc, X.kpag.x, y + hs, X.kpag.w, hi); centrado(doc, "KILOS A\nPAGAR", X.kpag.x, y + hs, X.kpag.w, hi);
    caja(doc, X.precio.x, y + hs, X.precio.w, hi); centrado(doc, "PRECIO POR\nKILO", X.precio.x, y + hs, X.precio.w, hi);
    caja(doc, X.apagar.x, y + hs, X.apagar.w, hi); centrado(doc, "A PAGAR", X.apagar.x, y + hs, X.apagar.w, hi);
  }

  function bloqueDia(doc, i, filas, calcDia, config) {
    var CP = window.CP;
    var y0 = Y_BLOQUES + i * PASO;
    var altoFilas = ALTO_FILA * 3;

    // Día en vertical
    doc.setLineWidth(0.3);
    caja(doc, M, y0, ANCHO_DIA, altoFilas);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    var nombre = CP.DIAS_HOJA[i];
    var anchoTxt = doc.getTextWidth(nombre);
    doc.text(nombre, M + ANCHO_DIA / 2 + 1.0, y0 + altoFilas / 2 + anchoTxt / 2, { angle: 90 });

    // Filas
    for (var f = 0; f < 3; f++) {
      var y = y0 + f * ALTO_FILA;
      var fila = filas[f];
      var c = calcDia.filas[f];
      doc.setLineWidth(0.2);
      COLS.forEach(function (col) { caja(doc, X[col.k].x, y, X[col.k].w, ALTO_FILA); });

      var prov = (config.proveedores[f] && config.proveedores[f].nombre) || "";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      if (prov) aLaIzquierda(doc, prov.toUpperCase(), X.prov.x, y, X.prov.w, ALTO_FILA);

      if (!c.conDatos) continue;
      doc.setFontSize(8);
      if (fila.fecha) centrado(doc, CP.fechaCorta(fila.fecha), X.fecha.x, y, X.fecha.w, ALTO_FILA);
      ["m0", "m1", "m2"].forEach(function (k, j) {
        var v = CP.num(fila.m[j]); if (v !== null) centrado(doc, CP.kilos(v), X[k].x, y, X[k].w, ALTO_FILA);
      });
      ["t0", "t1", "t2"].forEach(function (k, j) {
        var v = CP.num(fila.t[j]); if (v !== null) centrado(doc, CP.kilos(v), X[k].x, y, X[k].w, ALTO_FILA);
      });
      centrado(doc, CP.kilos(c.recibidos), X.rec.x, y, X.rec.w, ALTO_FILA);
      if (c.devolucion !== null) centrado(doc, CP.kilos(c.devolucion), X.dev.x, y, X.dev.w, ALTO_FILA);
      centrado(doc, CP.kilos(c.aPagarKg), X.kpag.x, y, X.kpag.w, ALTO_FILA);
      if (c.precio !== null) aLaDerecha(doc, CP.pesos(c.precio), X.precio.x, y, X.precio.w, ALTO_FILA);
      if (c.aPagar !== null) aLaDerecha(doc, CP.pesos(c.aPagar), X.apagar.x, y, X.apagar.w, ALTO_FILA);
    }

    // Contorno del bloque, un poco más marcado
    doc.setLineWidth(0.35);
    caja(doc, X.prov.x, y0, X.fin - X.prov.x, altoFilas);

    // TOTAL DEL DÍA bajo las últimas columnas
    var yt = y0 + altoFilas;
    var etqW = X.kpag.w + X.precio.w;
    doc.setLineWidth(0.3);
    caja(doc, X.kpag.x, yt, etqW, ALTO_TOTAL);
    caja(doc, X.apagar.x, yt, X.apagar.w, ALTO_TOTAL);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    centrado(doc, "TOTAL DEL DÍA", X.kpag.x, yt, etqW, ALTO_TOTAL);
    if (calcDia.conDatos) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      aLaDerecha(doc, CP.pesos(calcDia.total), X.apagar.x, yt, X.apagar.w, ALTO_TOTAL);
    }
  }

  function totalSemana(doc, calcSemana, config, rango) {
    var CP = window.CP;
    var y = Y_BLOQUES + 6 * PASO + ALTO_FILA * 3 + ALTO_TOTAL + 1.8;
    var etqW = X.kpag.w + X.precio.w;
    var h = 6.5;
    doc.setLineWidth(0.5);
    caja(doc, X.kpag.x, y, etqW, h);
    caja(doc, X.apagar.x, y, X.apagar.w, h);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    centrado(doc, "TOTAL SEMANA", X.kpag.x, y, etqW, h);
    doc.setFontSize(10);
    if (calcSemana.conDatos) aLaDerecha(doc, CP.pesos(calcSemana.total), X.apagar.x, y, X.apagar.w, h);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(90);
    var ahora = new Date();
    var pie = (rango ? "Semana: " + rango + "   ·   " : "") +
      "Generado el " + CP.fechaCorta(CP.isoLocal(ahora)) + " a las " +
      String(ahora.getHours()).padStart(2, "0") + ":" + String(ahora.getMinutes()).padStart(2, "0");
    doc.text(pie, X.prov.x, y + h / 2 + 1);
    doc.setTextColor(0);
  }

  function generarPDF(config, semana) {
    var CP = window.CP;
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error("No se pudo cargar el generador de PDF. Revisa la conexión a internet.");
    var doc = new window.jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    var calc = CP.calcularSemana(semana);
    var rango = CP.rangoFechas(semana);
    doc.setProperties({ title: "Control de pan" + (config.local ? " – " + config.local : "") + (rango ? " – " + rango : "") });
    doc.setDrawColor(0);
    doc.setTextColor(0);
    encabezado(doc, config);
    cabeceraTabla(doc);
    for (var i = 0; i < 7; i++) bloqueDia(doc, i, semana.dias[i], calc.dias[i], config);
    totalSemana(doc, calc, config, rango);

    var base = "control-pan" + (config.local ? "-" + config.local : "") + (rango ? "-" + rango.replace(/ al /, "_al_") : "");
    var nombre = base.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-") + ".pdf";
    return { blob: doc.output("blob"), nombre: nombre, rango: rango, total: calc.total };
  }

  window.generarPDF = generarPDF;
})();
