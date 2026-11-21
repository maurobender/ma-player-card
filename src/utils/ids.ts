// Identificador único por instancia (para el historial del botón "atrás").
let counter = 0;
export const nextInstanceId = (): number => ++counter;
