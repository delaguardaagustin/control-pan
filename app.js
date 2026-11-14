// App «Control de pan»: llenado diario, resumen semanal y envío del PDF.
(function () {
  "use strict";

  var CP = window.CP;
  var CLAVE_CONFIG = "controlPan.config";
  var CLAVE_SEMANA = "controlPan.semana";
  var MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
  var ENDPOINT = (window.CONTROL_PAN && window.CONTROL_PAN.ENDPOINT || "").trim();

  // ---------- Datos ----------
  function configInicial() {
    return {
      local: "",
      mes: MESES[new Date().getMonth()],
      correo: "",
      proveedores: [
        { nombre: "Camila", precio: "" },
        { nombre: "", precio: "" },
        { nombre: "Pasteles", precio: "" }
      ]
    };
  }

  function filaVacia() { return { fecha: null, m: ["", "", ""], t: ["", "", ""], dev: "", precio: null }; }

  function semanaVacia() {
    var dias = [];
    for (var i = 0; i < 7; i++) dias.push([filaVacia(), filaVacia(), filaVacia()]);
    return { dias: dias };
  }

  function leer(clave) {
    try {
      var t = window.localStorage.getItem(clave);
      return t ? JSON.parse(t) : null;
    } catch (e) { return null; }
  }

  function guardar(clave, valor) {
    try { window.localStorage.setItem(clave, JSON.stringify(valor)); return true; }
    catch (e) { return false; }
  }

  function cargarConfig() {
    var base = configInicial();
    var c = leer(CLAVE_CONFIG);
    if (!c || typeof c !== "object") return base;
    base.local = c.local || "";
    base.mes = c.mes || base.mes;
    base.correo = c.correo || "";
    if (Array.isArray(c.proveedores)) {
      for (var i = 0; i < 3; i++) {
        var p = c.proveedores[i];
        if (p) base.proveedores[i] = { nombre: p.nombre || "", precio: p.precio || "" };
      }
    }
    return base;
  }

  function cargarSemana() {
    var s = leer(CLAVE_SEMANA);
    var base = semanaVacia();
    if (!s || !Array.isArray(s.dias)) return base;
    for (var i = 0; i < 7; i++) {
      for (var f = 0; f < 3; f++) {
        var o = s.dias[i] && s.dias[i][f];
        if (!o) continue;
        var d = base.dias[i][f];
        d.fecha = o.fecha || null;
        for (var j = 0; j < 3; j++) {
          d.m[j] = (o.m && o.m[j]) || "";
          d.t[j] = (o.t && o.t[j]) || "";
        }
        d.dev = o.dev || "";
        d.precio = (o.precio === undefined) ? null : o.precio;
      }
    }
    return base;
  }

  var config = cargarConfig();
  var semana = cargarSemana();
  var diaActual = CP.indiceDia(new Date());

  function precioEfectivo(fila, f) {
    return fila.precio !== null ? fila.precio : config.proveedores[f].precio;
  }

  // Semana con precios de configuración aplicados (lo que se calcula y se imprime)
  function semanaEfectiva() {
    return {
      dias: semana.dias.map(function (filas) {
        return filas.map(function (fila, f) {
          return { fecha: fila.fecha, m: fila.m, t: fila.t, dev: fila.dev, precio: precioEfectivo(fila, f) };
        });
      })
    };
  }

  function guardarSemana() { guardar(CLAVE_SEMANA, semana); }
  function guardarConfig() { guardar(CLAVE_CONFIG, config); }

  // ---------- Utilidades de interfaz ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, hijos) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "texto") e.textContent = attrs[k];
      else if (k === "clase") e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (hijos || []).forEach(function (h) { if (h) e.appendChild(h); });
    return e;
  }

  function limpiarNumero(v) { return v.replace(/[^0-9.,]/g, ""); }

  function nombreProveedor(f) {
    var n = config.proveedores[f].nombre.trim();
    return n || "";
  }

  // ---------- Pestañas ----------
  var pestanas = document.querySelectorAll("nav.pestanas button");
  function mostrar(nombre) {
    pestanas.forEach(function (b) { b.setAttribute("aria-selected", b.dataset.pestana === nombre ? "true" : "false"); });
    $("vista-llenar").hidden = nombre !== "llenar";
    $("vista-resumen").hidden = nombre !== "resumen";
    $("vista-config").hidden = nombre !== "config";
    $("barra-total").hidden = nombre !== "llenar";
    if (nombre === "llenar") pintarLlenar();
    if (nombre === "resumen") pintarResumen();
    if (nombre === "config") pintarConfig();
    window.scrollTo(0, 0);
  }
  pestanas.forEach(function (b) { b.addEventListener("click", function () { mostrar(b.dataset.pestana); }); });

  function pintarCabecera() {
    var partes = [];
    if (config.local) partes.push(config.local);
    if (config.mes) partes.push(config.mes.charAt(0) + config.mes.slice(1).toLowerCase());
    $("cabecera-local").textContent = partes.join(" · ");
  }

  // ---------- Llenar ----------
  function pintarDias() {
    var cont = $("dias");
    cont.innerHTML = "";
    var calc = CP.calcularSemana(semanaEfectiva());
    CP.DIAS_CORTOS.forEach(function (d, i) {
      var b = el("button", { type: "button", "aria-pressed": i === diaActual ? "true" : "false", "aria-label": CP.DIAS[i] }, [
        document.createTextNode(d), el("span", { clase: "punto" })
      ]);
      if (calc.dias[i].conDatos) b.classList.add("con-datos");
      b.addEventListener("click", function () { diaActual = i; pintarLlenar(); });
      cont.appendChild(b);
    });
  }

  function campoNumero(valor, etiqueta, alCambiar) {
    var inp = el("input", { type: "text", inputmode: "decimal", autocomplete: "off", enterkeyhint: "next", "aria-label": etiqueta, placeholder: "kg" });
    inp.value = valor || "";
    inp.addEventListener("input", function () {
      var limpio = limpiarNumero(inp.value);
      if (limpio !== inp.value) inp.value = limpio;
      alCambiar(limpio);
    });
    return inp;
  }

  function actualizarCalculos() {
    var calcDia = CP.calcularDia(semanaEfectiva().dias[diaActual]);
    for (var f = 0; f < 3; f++) {
      var c = calcDia.filas[f];
      var caja = document.querySelector('[data-fila="' + f + '"]');
      if (!caja) continue;
      caja.querySelector(".v-rec").textContent = c.conDatos ? CP.kilos(c.recibidos) + " kg" : "—";
      caja.querySelector(".v-kpag").textContent = c.conDatos ? CP.kilos(c.aPagarKg) + " kg" : "—";
      caja.querySelector(".v-apagar").textContent = c.conDatos && c.aPagar !== null ? CP.pesos(c.aPagar) : "—";
      var aviso = caja.querySelector(".aviso");
      var msj = "";
      if (c.conDatos && c.aPagarKg < 0) msj = "La devolución es mayor que lo recibido.";
      else if (c.conDatos && c.precio === null) msj = "Falta el precio por kilo.";
      aviso.textContent = msj;
      aviso.hidden = !msj;
    }
    $("barra-total-etq").textContent = "Total del " + CP.DIAS[diaActual].toLowerCase();
    $("barra-total-valor").textContent = CP.pesos(calcDia.total || 0);
    // punto del día con datos
    var botones = $("dias").children;
    if (botones[diaActual]) botones[diaActual].classList.toggle("con-datos", calcDia.conDatos);
  }

  function alEscribir(fila, f) {
    // Al anotar el primer dato de una fila, se fija su fecha (la que se ve en pantalla)
    if (!fila.fecha) fila.fecha = CP.fechaDelDia(diaActual);
    if (fila.precio === null && config.proveedores[f].precio) fila.precio = config.proveedores[f].precio;
    guardarSemana();
    actualizarCalculos();
  }

  function pintarLlenar() {
    pintarCabecera();
    pintarDias();
    $("dia-nombre").textContent = CP.DIAS[diaActual].charAt(0) + CP.DIAS[diaActual].slice(1).toLowerCase();
    $("dia-fecha").textContent = "";
    var cont = $("filas");
    cont.innerHTML = "";
    semana.dias[diaActual].forEach(function (fila, f) {
      var nombre = nombreProveedor(f);
      var titulo = el("h3", null, [
        nombre ? el("span", { texto: nombre }) : el("span", { clase: "sin-nombre", texto: "Otro proveedor (sin nombre)" })
      ]);

      var fecha = el("input", { type: "date", "aria-label": "Fecha" });
      fecha.value = fila.fecha || CP.fechaDelDia(diaActual);
      fecha.addEventListener("change", function () { fila.fecha = fecha.value || null; guardarSemana(); });

      var man = el("div", { clase: "tres" });
      var tar = el("div", { clase: "tres" });
      [0, 1, 2].forEach(function (j) {
        man.appendChild(campoNumero(fila.m[j], "Mañana, entrega " + (j + 1), function (v) { fila.m[j] = v; alEscribir(fila, f); }));
        tar.appendChild(campoNumero(fila.t[j], "Tarde, entrega " + (j + 1), function (v) { fila.t[j] = v; alEscribir(fila, f); }));
      });

      var dev = campoNumero(fila.dev, "Kilos de devolución", function (v) { fila.dev = v; alEscribir(fila, f); });
      var precio = campoNumero(precioEfectivo(fila, f), "Precio por kilo", function (v) {
        fila.precio = v;
        guardarSemana();
        actualizarCalculos();
      });
      precio.placeholder = "$";

      var tarjeta = el("div", { clase: "tarjeta", "data-fila": String(f) }, [
        titulo,
        el("label", { clase: "campo" }, [document.createTextNode("Fecha"), fecha]),
        el("div", { clase: "grupo" }, [el("div", { clase: "etq", texto: "Kilos recibidos en la mañana" }), man]),
        el("div", { clase: "grupo" }, [el("div", { clase: "etq", texto: "Kilos recibidos en la tarde" }), tar]),
        el("div", { clase: "dos grupo" }, [
          el("label", { clase: "campo" }, [document.createTextNode("Devolución (kg)"), dev]),
          el("label", { clase: "campo" }, [document.createTextNode("Precio por kilo"), precio])
        ]),
        el("div", { clase: "calculo" }, [
          el("div", null, [document.createTextNode("Recibido"), el("b", { clase: "v-rec" })]),
          el("div", null, [document.createTextNode("Kilos a pagar"), el("b", { clase: "v-kpag" })]),
          el("div", { clase: "apagar" }, [document.createTextNode("A pagar"), el("b", { clase: "v-apagar" })])
        ]),
        el("div", { clase: "aviso", hidden: "" })
      ]);
      cont.appendChild(tarjeta);
    });
    actualizarCalculos();
  }

  // ---------- Resumen ----------
  function pintarResumen() {
    pintarCabecera();
    var calc = CP.calcularSemana(semanaEfectiva());
    var cuerpo = $("resumen-dias");
    cuerpo.innerHTML = "";
    calc.dias.forEach(function (d, i) {
      var tr = el("tr", { clase: "fila-dia" }, [
        el("td", { texto: CP.DIAS[i].charAt(0) + CP.DIAS[i].slice(1).toLowerCase() }),
        el("td", { clase: d.conDatos ? "" : "vacio", texto: d.conDatos ? CP.pesos(d.total) : "—" })
      ]);
      tr.addEventListener("click", function () { diaActual = i; mostrar("llenar"); });
      cuerpo.appendChild(tr);
    });
    $("total-semana").textContent = CP.pesos(calc.total || 0);
    var rango = CP.rangoFechas(semanaEfectiva());
    $("rango").textContent = rango ? "Fechas anotadas: " + rango : "Todavía no hay kilos anotados esta semana.";
  }

  // ---------- Configuración ----------
  function pintarConfig() {
    $("cfg-local").value = config.local;
    $("cfg-mes").value = config.mes;
    $("cfg-correo").value = config.correo;
    var cont = $("cfg-proveedores");
    cont.innerHTML = "";
    config.proveedores.forEach(function (p, f) {
      var nom = el("input", { autocomplete: "off", placeholder: f === 1 ? "Ej.: Panadería Sur" : "" });
      nom.value = p.nombre;
      nom.addEventListener("input", function () { p.nombre = nom.value; guardarConfig(); });
      var pre = el("input", { type: "text", inputmode: "decimal", autocomplete: "off", placeholder: "$" });
      pre.value = p.precio;
      pre.addEventListener("input", function () {
        var l = limpiarNumero(pre.value); if (l !== pre.value) pre.value = l;
        p.precio = l; guardarConfig();
      });
      cont.appendChild(el("div", { clase: "prov-config" }, [
        el("label", { clase: "campo" }, [document.createTextNode("Proveedor " + (f + 1)), nom]),
        el("label", { clase: "campo" }, [document.createTextNode("Precio por kilo"), pre])
      ]));
    });
  }

  [["cfg-local", "local"], ["cfg-mes", "mes"], ["cfg-correo", "correo"]].forEach(function (par) {
    $(par[0]).addEventListener("input", function () {
      var v = $(par[0]).value;
      config[par[1]] = par[1] === "mes" ? v.toUpperCase() : v.trim();
      guardarConfig();
      pintarCabecera();
    });
  });

  function vaciarSemana() {
    semana = semanaVacia();
    guardarSemana();
    diaActual = CP.indiceDia(new Date());
  }

  $("btn-vaciar").addEventListener("click", function () {
    if (window.confirm("¿Vaciar todos los kilos anotados esta semana? La configuración se mantiene.")) {
      vaciarSemana();
      mostrar("llenar");
    }
  });

  // ---------- Terminar y enviar ----------
  var ultimoPDF = null;

  function estado(clase, texto) { return el("div", { clase: "estado " + clase, role: "status", texto: texto }); }

  function descargar(pdf) {
    var url = URL.createObjectURL(pdf.blob);
    var a = el("a", { href: url, download: pdf.nombre });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function puedeCompartir(archivo) {
    try { return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [archivo] })); }
    catch (e) { return false; }
  }

  async function enviar(pdf) {
    var fd = new FormData();
    fd.append("pdf", pdf.blob, pdf.nombre);
    fd.append("correo", config.correo);
    fd.append("local", config.local);
    fd.append("mes", config.mes);
    fd.append("fechas", pdf.rango);
    fd.append("total", CP.pesos(pdf.total || 0));
    var r = await fetch(ENDPOINT, { method: "POST", body: fd });
    if (!r.ok) throw new Error("El servidor respondió " + r.status);
  }

  $("btn-terminar").addEventListener("click", async function () {
    var boton = this;
    var res = $("resultado");
    res.innerHTML = "";
    var efectiva = semanaEfectiva();
    if (!CP.calcularSemana(efectiva).conDatos) {
      res.appendChild(estado("error", "No hay kilos anotados esta semana."));
      return;
    }
    try {
      ultimoPDF = window.generarPDF(config, efectiva);
    } catch (e) {
      res.appendChild(estado("error", e.message || "No se pudo generar el PDF."));
      return;
    }

    if (ENDPOINT) {
      if (!config.correo) {
        res.appendChild(estado("error", "Falta el correo del dueño en Configuración. Igual puedes compartir o descargar el PDF."));
      } else {
        var enviando = estado("info", "Enviando al correo " + config.correo + "…");
        res.appendChild(enviando);
        boton.disabled = true;
        try {
          await enviar(ultimoPDF);
          enviando.replaceWith(estado("ok", "Listo: el PDF se envió a " + config.correo + "."));
        } catch (e) {
          enviando.replaceWith(estado("error", "No se pudo enviar (" + (e.message || "sin conexión") + "). Compártelo o descárgalo y mándalo a mano."));
        }
        boton.disabled = false;
      }
    } else {
      res.appendChild(estado("info", "El envío automático aún no está conectado. Comparte o descarga el PDF y mándalo al dueño por correo o WhatsApp."));
    }

    var archivo = new File([ultimoPDF.blob], ultimoPDF.nombre, { type: "application/pdf" });
    if (puedeCompartir(archivo)) {
      var bc = el("button", { type: "button", clase: "btn secundario", id: "btn-compartir", texto: "Compartir PDF" });
      bc.addEventListener("click", function () {
        navigator.share({ files: [archivo], title: "Control de pan", text: "Control de pan " + (config.local || "") + " " + (ultimoPDF.rango || "") })
          .catch(function () { /* el usuario canceló */ });
      });
      res.appendChild(bc);
    }
    var bd = el("button", { type: "button", clase: "btn secundario", id: "btn-descargar", texto: "Descargar PDF" });
    bd.addEventListener("click", function () { descargar(ultimoPDF); });
    res.appendChild(bd);

    var si = el("button", { type: "button", clase: "btn peligro", id: "btn-nueva", texto: "Sí, empezar semana nueva" });
    var no = el("button", { type: "button", clase: "btn secundario", texto: "Todavía no" });
    var pregunta = el("div", { clase: "pregunta" }, [
      el("p", { texto: "¿Empezar una semana nueva?" }),
      el("div", { clase: "nota", texto: "Se borran los kilos de esta semana. La configuración se mantiene. Hazlo después de compartir o descargar el PDF." }),
      si, no
    ]);
    si.addEventListener("click", function () {
      vaciarSemana();
      res.innerHTML = "";
      res.appendChild(estado("ok", "Semana nueva lista."));
      pintarResumen();
    });
    no.addEventListener("click", function () { pregunta.remove(); });
    res.appendChild(pregunta);
  });

  // ---------- Inicio ----------
  if (!leer(CLAVE_CONFIG)) mostrar("config"); else mostrar("llenar");
})();
