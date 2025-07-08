import { AuthService } from '../service/AuthService';
import { CategoryController } from './CategoryController';
import { User } from '../model/User';
import { isValidEmail, isNotEmpty } from '../utils/validators';

export class AuthController {
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

  // Registrar novo usuário
  async register(email: string, password: string, nome: string): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      // Validações
      if (!isNotEmpty(email) || !isNotEmpty(password) || !isNotEmpty(nome)) {
        return { success: false, message: 'Todos os campos são obrigatórios' };
      }

      if (!isValidEmail(email)) {
        return { success: false, message: 'Email inválido' };
      }

      if (password.length < 6) {
        return { success: false, message: 'A senha deve ter pelo menos 6 caracteres' };
      }

      if (nome.length < 2) {
        return { success: false, message: 'Nome deve ter pelo menos 2 caracteres' };
      }

      // Chamar service
      const user = await this.authService.register(email, password, nome);

      // Criar categorias padrão para o novo usuário
      try {
        console.log('🔄 Criando categorias padrão para novo usuário...');
        const categoriesResult = await this.categoryController.createDefaultCategories(user.uid);
        if (categoriesResult.success) {
          console.log('✅ Categorias padrão criadas:', categoriesResult.message);
        } else {
          console.warn('⚠️ Aviso ao criar categorias padrão:', categoriesResult.message);
        }
      } catch (categoryError) {
        console.warn('⚠️ Erro ao criar categorias padrão (não crítico):', categoryError);
      }

      return {
        success: true,
        message: 'Usuário registrado com sucesso!',
        user
      };

    } catch (error: any) {
      console.error('❌ Erro no registro:', error.message);

      // Tratar erros específicos do Firebase
      if (error.code === 'auth/email-already-in-use') {
        return { success: false, message: 'Este email já está em uso' };
      }

      if (error.code === 'auth/weak-password') {
        return { success: false, message: 'Senha muito fraca' };
      }

      return {
        success: false,
        message: 'Erro ao registrar usuário. Tente novamente.'
      };
    }
  }

  // Login de usuário
  async login(email: string, password: string): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      // Validações
      if (!isNotEmpty(email) || !isNotEmpty(password)) {
        return { success: false, message: 'Email e senha são obrigatórios' };
      }

      if (!isValidEmail(email)) {
        return { success: false, message: 'Email inválido' };
      }

      // Chamar service
      const user = await this.authService.login(email, password);

      return {
        success: true,
        message: 'Login realizado com sucesso!',
        user
      };

    } catch (error: any) {
      console.error('❌ Erro no login:', error.message);

      // Tratar erros específicos do Firebase
      if (error.code === 'auth/user-not-found') {
        return { success: false, message: 'Usuário não encontrado' };
      }

      if (error.code === 'auth/wrong-password') {
        return { success: false, message: 'Senha incorreta' };
      }

      if (error.code === 'auth/invalid-email') {
        return { success: false, message: 'Email inválido' };
      }

      if (error.code === 'auth/user-disabled') {
        return { success: false, message: 'Usuário desabilitado' };
      }

      return {
        success: false,
        message: 'Erro ao fazer login. Verifique suas credenciais.'
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
