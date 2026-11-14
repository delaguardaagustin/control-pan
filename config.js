// Configuración técnica de la app «Control de pan».
// ENDPOINT: URL del Webhook de n8n (método POST) que recibe el PDF y lo manda por correo.
// Si se deja vacío, la app no envía nada solo: el PDF se comparte o se descarga a mano.
window.CONTROL_PAN = {
  ENDPOINT: "https://n8n-production-003b9.up.railway.app/webhook/control-pan"
};
