import { AuthService } from '../service/AuthService';
import { CategoryController } from './CategoryController';
import { User } from '../model/User';
import { isValidEmail, isNotEmpty } from '../utils/validators';

// Interfaces para responses consistentes
export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
}

export interface BaseResponse {
  success: boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// Enum para níveis de log
enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export class AuthController {
  // Constantes de configuração
  private static readonly MIN_PASSWORD_LENGTH = 6;
  private static readonly MIN_NAME_LENGTH = 2;
  
  private static instance: AuthController;
  private authService: AuthService;
  private categoryController: CategoryController;

  private constructor() {
    this.authService = AuthService.getInstance();
    this.categoryController = CategoryController.getInstance();
  }

  public static getInstance(): AuthController {
    if (!AuthController.instance) {
      AuthController.instance = new AuthController();
    }
    return AuthController.instance;
  }

  /**
   * Valida os dados de registro de usuário
   * @param email - Email do usuário
   * @param password - Senha do usuário
   * @param nome - Nome do usuário
   * @returns Resultado da validação
   */
  private validateRegisterInput(email: string, password: string, nome: string): ValidationResult {
    if (!isNotEmpty(email) || !isNotEmpty(password) || !isNotEmpty(nome)) {
      return { isValid: false, message: 'Todos os campos são obrigatórios' };
    }

    if (!isValidEmail(email)) {
      return { isValid: false, message: 'Email inválido' };
    }

    if (password.length < AuthController.MIN_PASSWORD_LENGTH) {
      return { 
        isValid: false, 
        message: `A senha deve ter pelo menos ${AuthController.MIN_PASSWORD_LENGTH} caracteres` 
      };
    }

    if (nome.length < AuthController.MIN_NAME_LENGTH) {
      return { 
        isValid: false, 
        message: `Nome deve ter pelo menos ${AuthController.MIN_NAME_LENGTH} caracteres` 
      };
    }

    return { isValid: true };
  }

  /**
   * Valida os dados de login
   * @param email - Email do usuário
   * @param password - Senha do usuário
   * @returns Resultado da validação
   */
  private validateLoginInput(email: string, password: string): ValidationResult {
    if (!isNotEmpty(email) || !isNotEmpty(password)) {
      return { isValid: false, message: 'Email e senha são obrigatórios' };
    }

    if (!isValidEmail(email)) {
      return { isValid: false, message: 'Email inválido' };
    }

    return { isValid: true };
  }

  /**
   * Mapeia erros do Firebase para mensagens amigáveis
   * @param error - Erro do Firebase
   * @returns Mensagem de erro traduzida
   */
  private mapFirebaseError(error: any): string {
    const errorMap: Record<string, string> = {
      'auth/email-already-in-use': 'Este email já está em uso',
      'auth/weak-password': 'Senha muito fraca',
      'auth/user-not-found': 'Usuário não encontrado',
      'auth/wrong-password': 'Senha incorreta',
      'auth/invalid-email': 'Email inválido',
      'auth/user-disabled': 'Usuário desabilitado',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
      'auth/network-request-failed': 'Erro de rede. Verifique sua conexão'
    };

    return errorMap[error.code] || 'Erro inesperado. Tente novamente.';
  }

  /**
   * Sistema de logging estruturado
   * @param level - Nível do log
   * @param message - Mensagem do log
   * @param data - Dados adicionais (opcional)
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const logMessage = `[AuthController] ${message}`;
    
    switch (level) {
      case LogLevel.INFO:
        console.log(`✅ ${logMessage}`, data || '');
        break;
      case LogLevel.WARN:
        console.warn(`⚠️ ${logMessage}`, data || '');
        break;
      case LogLevel.ERROR:
        console.error(`❌ ${logMessage}`, data || '');
        break;
    }
  }

  /**
   * Cria categorias padrão para novo usuário (não crítico)
   * @param userId - ID do usuário
   */
  private async ensureDefaultCategories(userId: string): Promise<void> {
    try {
      this.log(LogLevel.INFO, 'Criando categorias padrão para novo usuário');
      
      const result = await this.categoryController.createDefaultCategories(userId);
      
      if (result.success) {
        this.log(LogLevel.INFO, 'Categorias padrão criadas com sucesso');
      } else {
        this.log(LogLevel.WARN, 'Aviso ao criar categorias padrão', result.message);
      }
    } catch (error) {
      this.log(LogLevel.WARN, 'Erro ao criar categorias padrão (não crítico)', error);
    }
  }

  /**
   * Registra um novo usuário no sistema
   * @param email - Email do usuário
   * @param password - Senha do usuário (mín. 6 caracteres)
   * @param nome - Nome do usuário (mín. 2 caracteres)
   * @returns Promise com resultado do registro
   */
  async register(email: string, password: string, nome: string): Promise<AuthResponse> {
    try {
      // Validações de entrada
      const validation = this.validateRegisterInput(email, password, nome);
      if (!validation.isValid) {
        return { success: false, message: validation.message! };
      }

      // Chamar service de autenticação
      const user = await this.authService.register(email, password, nome);

      // Criar categorias padrão (operação não crítica)
      await this.ensureDefaultCategories(user.uid);

      this.log(LogLevel.INFO, 'Usuário registrado com sucesso', { email: user.email });

      return {
        success: true,
        message: 'Usuário registrado com sucesso!',
        user
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro no registro', { email, error: error.message });

      return {
        success: false,
        message: this.mapFirebaseError(error)
      };
    }
  }

  /**
   * Realiza login do usuário
   * @param email - Email do usuário
   * @param password - Senha do usuário
   * @returns Promise com resultado do login
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      // Validações de entrada
      const validation = this.validateLoginInput(email, password);
      if (!validation.isValid) {
        return { success: false, message: validation.message! };
      }

      // Chamar service de autenticação
      const user = await this.authService.login(email, password);

      this.log(LogLevel.INFO, 'Login realizado com sucesso', { email: user.email });

      return {
        success: true,
        message: 'Login realizado com sucesso!',
        user
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro no login', { email, error: error.message });

      return {
        success: false,
        message: this.mapFirebaseError(error)
      };
    }
  }

  // Logout
  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      await this.authService.logout();

      return {
        success: true,
        message: 'Logout realizado com sucesso!'
      };

    } catch (error: any) {
      console.error('❌ Erro no logout:', error.message);

      return {
        success: false,
        message: 'Erro ao fazer logout'
      };
    }
  }

  // Obter usuário atual
  getCurrentUser(): User | null {
    return this.authService.getCurrentUser();
  }

  // Verificar se usuário está autenticado
  isAuthenticated(): boolean {
    return this.authService.getCurrentUser() !== null;
  }

  // Observar mudanças de autenticação
  onAuthStateChanged(callback: (user: User | null) => void): void {
    this.authService.onAuthStateChange(callback);
  }
}
