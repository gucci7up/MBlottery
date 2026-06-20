/**
 * Valida las variables de entorno críticas al arranque.
 * Si falta alguna requerida, el proceso termina con error claro.
 */

interface EnvRule {
  key: string;
  required: boolean;
  minLength?: number;
  description: string;
}

const REQUIRED_VARS: EnvRule[] = [
  { key: 'DATABASE_URL', required: true, description: 'URL de conexión a PostgreSQL' },
  { key: 'JWT_SECRET', required: true, minLength: 32, description: 'Secreto JWT (mín. 32 caracteres)' },
  { key: 'TICKET_SIGNING_KEY', required: true, minLength: 32, description: 'Clave HMAC para tickets (mín. 32 caracteres)' },
  { key: 'REDIS_HOST', required: true, description: 'Host de Redis' },
  { key: 'REDIS_PASSWORD', required: process.env.NODE_ENV === 'production', description: 'Password de Redis (requerido en producción)' },
  { key: 'FRONTEND_URL', required: false, description: 'URL del frontend para CORS' },
];

export function validateEnv(): void {
  const errors: string[] = [];

  for (const rule of REQUIRED_VARS) {
    const value = process.env[rule.key];

    if (rule.required && !value) {
      errors.push(`❌ ${rule.key}: FALTANTE — ${rule.description}`);
      continue;
    }

    if (value && rule.minLength && value.length < rule.minLength) {
      errors.push(
        `❌ ${rule.key}: demasiado corto (${value.length} chars, mín. ${rule.minLength}) — ${rule.description}`,
      );
    }
  }

  if (errors.length > 0) {
    console.error('\n⛔ Variables de entorno inválidas:\n');
    errors.forEach((e) => console.error(e));
    console.error('\nCopia .env.example a .env y configura todas las variables requeridas.\n');
    process.exit(1);
  }

  // Advertencias en producción
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET === 'change-this-to-a-very-long-random-secret-in-production') {
      console.error('⛔ JWT_SECRET usa el valor por defecto. Cambia el secreto antes de operar en producción.');
      process.exit(1);
    }
    if (process.env.TICKET_SIGNING_KEY === 'change-this-to-a-very-long-random-key-for-ticket-hmac-signing') {
      console.error('⛔ TICKET_SIGNING_KEY usa el valor por defecto. Cambia la clave antes de operar en producción.');
      process.exit(1);
    }
  }
}
