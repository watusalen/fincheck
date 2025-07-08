// Validações para email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validações para senha
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

// Validação para valores monetários
export function isValidAmount(amount: number): boolean {
  return amount > 0 && Number.isFinite(amount);
}

// Validação para datas
export function isValidDate(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
}

// Validação para cores hexadecimais
export function isValidHexColor(color: string): boolean {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
}

// Formatação de valores monetários
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
}

// Formatação de datas
export function formatDate(date: string): string {
  const parsedDate = new Date(date);
  return new Intl.DateTimeFormat('pt-BR').format(parsedDate);
}

// Geração de IDs únicos (fallback se Firebase não gerar)
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Validação de strings não vazias
export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}

// Capitalizar primeira letra
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}
