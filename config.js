// Configuración técnica de la app «Control de pan».
// ENDPOINT: Worker de Cloudflare (infra/control-pan-correo) que recibe el PDF y lo manda por correo con Resend.
// Si se deja vacío, la app no envía nada solo: el PDF se comparte o se descarga a mano.
window.CONTROL_PAN = {
  ENDPOINT: "https://control-pan-correo.delaguardaagustin.workers.dev"
};
