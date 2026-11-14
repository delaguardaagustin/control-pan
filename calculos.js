// Cálculos y formatos compartidos por la app y el PDF.
(function () {
  "use strict";

  var DIAS = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO", "DOMINGO"];
  var DIAS_HOJA = ["LUNES", "MARTES", "MIERC.", "JUEVES", "VIERNES", "SÁBADO", "DOMINGO"];
  var DIAS_CORTOS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

  // Convierte lo que escribe el trabajador en número. Acepta coma o punto decimal.
  // Devuelve null si la casilla está vacía o no es un número.
  function num(texto) {
    if (texto === null || texto === undefined) return null;
    var t = String(texto).trim().replace(/\s/g, "");
    if (t === "") return null;
    if (t.indexOf(",") >= 0) t = t.replace(/\./g, "").replace(",", ".");
    var n = Number(t);
    return isFinite(n) ? n : null;
  }

  function miles(entero) {
    var s = String(Math.abs(entero));
    var out = "";
    while (s.length > 3) { out = "." + s.slice(-3) + out; s = s.slice(0, -3); }
    return (entero < 0 ? "-" : "") + s + out;
  }

  // $12.345 (pesos chilenos, sin decimales)
  function pesos(n) {
    if (n === null || n === undefined) return "";
    var r = Math.round(n);
    return (r < 0 ? "-$" : "$") + miles(Math.abs(r));
  }

  // 12,5 (kilos con hasta 2 decimales, coma decimal)
  function kilos(n) {
    if (n === null || n === undefined) return "";
    var r = Math.round(n * 100) / 100;
    var ent = Math.trunc(r);
    var dec = Math.round(Math.abs(r - ent) * 100);
    var signo = r < 0 && ent === 0 ? "-" : "";
    var txt = signo + miles(ent);
    if (dec > 0) txt += "," + (dec % 10 === 0 ? String(dec / 10) : String(dec).padStart(2, "0"));
    return txt;
  }

  // Calcula una fila (un proveedor en un día).
  // fila = { fecha, m: [3 textos], t: [3 textos], dev, precio }
  function calcularFila(fila) {
    var entregas = (fila.m || []).concat(fila.t || []).map(num);
    var hayEntregas = entregas.some(function (v) { return v !== null; });
    var dev = num(fila.dev);
    var precio = num(fila.precio);
    var conDatos = hayEntregas || dev !== null;
    if (!conDatos) {
      return { conDatos: false, recibidos: null, devolucion: null, aPagarKg: null, precio: null, aPagar: null };
    }
    var recibidos = entregas.reduce(function (a, v) { return a + (v || 0); }, 0);
    recibidos = Math.round(recibidos * 1000) / 1000;
    var aPagarKg = Math.round((recibidos - (dev || 0)) * 1000) / 1000;
    var aPagar = precio === null ? null : Math.round(aPagarKg * precio);
    return { conDatos: true, recibidos: recibidos, devolucion: dev, aPagarKg: aPagarKg, precio: precio, aPagar: aPagar };
  }

  function calcularDia(filas) {
    var calc = filas.map(calcularFila);
    var con = calc.filter(function (c) { return c.conDatos; });
    var total = con.length ? con.reduce(function (a, c) { return a + (c.aPagar || 0); }, 0) : null;
    return { filas: calc, conDatos: con.length > 0, total: total };
  }

  function calcularSemana(semana) {
    var dias = semana.dias.map(calcularDia);
    var con = dias.filter(function (d) { return d.conDatos; });
    var total = con.length ? con.reduce(function (a, d) { return a + (d.total || 0); }, 0) : null;
    return { dias: dias, conDatos: con.length > 0, total: total };
  }

  // "2026-11-10" -> "10-11-2026"
  function fechaCorta(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    return p.length === 3 ? p[2] + "-" + p[1] + "-" + p[0] : iso;
  }

  function isoLocal(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // Índice 0 = lunes ... 6 = domingo
  function indiceDia(d) { return (d.getDay() + 6) % 7; }

  // Fecha (ISO) del día "indice" de la semana en curso, sin pasar de hoy.
  function fechaDelDia(indice, hoy) {
    hoy = hoy || new Date();
    var atras = (indiceDia(hoy) - indice + 7) % 7;
    var d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - atras);
    return isoLocal(d);
  }

  // Rango de fechas con datos: "10-11-2026 al 16-11-2026"
  function rangoFechas(semana) {
    var fechas = [];
    semana.dias.forEach(function (filas) {
      filas.forEach(function (f) {
        if (f.fecha && calcularFila(f).conDatos) fechas.push(f.fecha);
      });
    });
    if (!fechas.length) return "";
    fechas.sort();
    var a = fechaCorta(fechas[0]);
    var b = fechaCorta(fechas[fechas.length - 1]);
    return a === b ? a : a + " al " + b;
  }

  window.CP = {
    DIAS: DIAS, DIAS_HOJA: DIAS_HOJA, DIAS_CORTOS: DIAS_CORTOS,
    num: num, pesos: pesos, kilos: kilos,
    calcularFila: calcularFila, calcularDia: calcularDia, calcularSemana: calcularSemana,
    fechaCorta: fechaCorta, isoLocal: isoLocal, indiceDia: indiceDia, fechaDelDia: fechaDelDia,
    rangoFechas: rangoFechas
  };
})();
