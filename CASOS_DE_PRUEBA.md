# Casos para probar Escudo

Abre la pestaña «Texto o URL» y copia uno de estos ejemplos **inventados**:

| Caso | Texto de ejemplo | Resultado esperado |
|---|---|---|
| Phishing con NIP | `URGENTE: tu cuenta será bloqueada en 10 minutos. Ingresa a http://banco-seguridad-validacion.xyz y proporciona tu NIP.` | Riesgo elevado: urgencia, datos, dominio con anomalías |
| Fraude por transferencia | `Realiza una transferencia inmediatamente para liberar tus fondos.` | Señales de precaución |
| Enlace acortado | `Revisa el pago pendiente en https://bit.ly/comprobante2026` | Precaución; enlace acortado |
| Mensaje neutro | `Hola, mañana paso por el paquete a las seis.` | No concluyente (no lo certifica como seguro) |
| HTTPS normal | `Consulta https://www.wikipedia.org` | No concluyente; HTTPS no demuestra legitimidad |
| Supuesta oferta | `Ganaste un premio, reclama tu regalo gratis ahora mismo.` | Precaución ante presión e incentivo inesperado |

El motor aplica patrones heurísticos, no aprendizaje automático ni análisis remoto del sitio. La clasificación de cualquier caso concreto puede requerir información adicional, investigación y verificación institucional.
