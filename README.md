# Control de pan

App web estática (sin backend) que reemplaza la hoja impresa «CONTROL DE PAN». El trabajador anota desde el celular los kilos que deja cada proveedor; al cierre de la semana la app arma un PDF horizontal igual a la hoja y lo manda al dueño.

## Archivos

- `index.html`: interfaz (pestañas Llenar, Semana y Configuración).
- `calculos.js`: sumas, kilos a pagar, montos en pesos y fechas.
- `pdf.js`: dibuja la hoja en PDF con jsPDF 2.5.1 (cdnjs).
- `app.js`: llenado, guardado en el celular (localStorage), resumen y envío.
- `config.js`: `ENDPOINT` del webhook de n8n (vacío = sin envío automático).
- `n8n-flujo-control-pan.json`: flujo de n8n para importar (Webhook → Gmail → respuesta).
- `muestra.pdf` y `muestra-pdf.png`: PDF de prueba generado con datos ficticios.

## Cómo probarla

```
cd productos/control-pan
py -3.11 -m http.server 8790 --bind 127.0.0.1
```

Abrir http://127.0.0.1:8790/ (en el navegador, modo celular). La primera vez abre Configuración: local, mes, correo del dueño, nombres de los 3 proveedores y precio por kilo. Luego, en Llenar, elegir el día y anotar los kilos; los totales se calculan solos y todo queda guardado en ese navegador. En Semana está el resumen y el botón «Terminar semana y enviar al dueño».

Necesita internet para cargar jsPDF desde cdnjs.

## Cómo conectar el envío por correo

1. En n8n: *Import from file* → `n8n-flujo-control-pan.json`.
2. Abrir el nodo «Gmail - enviar PDF» y conectar una credencial de Gmail (OAuth de la cuenta que enviará los correos). El flujo viene sin credenciales.
3. Activar el flujo y copiar la **Production URL** del nodo Webhook (termina en `/webhook/control-pan`).
4. Pegar esa URL en `config.js`: `ENDPOINT: "https://.../webhook/control-pan"`.

La app manda un POST multipart con los campos `pdf` (archivo), `correo`, `local`, `mes`, `fechas` y `total`. El asunto queda «Control de pan – {local} – {fechas}». El webhook tiene `allowedOrigins: *` para que el navegador pueda leer la respuesta; si se publica la app en un dominio fijo, conviene poner ese dominio en vez de `*`.

Si el envío falla o no hay `ENDPOINT`, la app igual ofrece «Compartir PDF» (WhatsApp, correo, etc., en celulares que lo permiten) y «Descargar PDF».

## Qué falta

- Importar el flujo en n8n, conectar Gmail y probar un envío real (lo probado fue con un webhook simulado).
- Publicar la app en una URL con HTTPS (GitHub Pages u otro) para usarla desde el celular del local.
- Los datos viven solo en el navegador de ese celular: si se borran los datos del navegador, se pierde la semana en curso.
