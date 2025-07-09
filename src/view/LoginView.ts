import { AuthController } from '../controller/AuthController';

export class LoginView {
  private authController: AuthController;

  constructor() {
    this.authController = AuthController.getInstance();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const form = document.querySelector('#login-form') as HTMLFormElement;
    const showRegisterBtn = document.querySelector('#show-register') as HTMLButtonElement;

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin();
    });

    showRegisterBtn?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('showRegister'));
    });
  }

  private async handleLogin(): Promise<void> {
    const emailInput = document.querySelector('#login-email') as HTMLInputElement;
    const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
    const errorElement = document.querySelector('#login-error') as HTMLElement;

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      this.showError('Por favor, preencha todos os campos.');
      return;
    }

    console.log('🔄 Tentando fazer login para:', email);

    try {
      const result = await this.authController.login(email, password);

      if (result.success) {
        console.log('✅ Login realizado com sucesso!');
        this.clearError();
        // Limpar form
        emailInput.value = '';
        passwordInput.value = '';
      } else {
        console.error('❌ Erro no login:', result.message);
        this.showError(result.message || 'Erro ao fazer login. Tente novamente.');
      }
    } catch (error) {
      console.error('❌ Erro inesperado no login:', error);
      this.showError('Erro inesperado. Tente novamente.');
    }
  }

  private showError(message: string): void {
    const errorElement = document.querySelector('#login-error') as HTMLElement;
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
  }

  private clearError(): void {
    const errorElement = document.querySelector('#login-error') as HTMLElement;
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }
  }

  show(): void {
    const loginView = document.querySelector('#login-view') as HTMLElement;
    const registerView = document.querySelector('#register-view') as HTMLElement;
    const dashboardView = document.querySelector('#dashboard-view') as HTMLElement;

    if (loginView) loginView.style.display = 'flex';
    if (registerView) registerView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'none';

    this.clearError();
    console.log('🔐 LoginView exibida');
  }

  hide(): void {
    const loginView = document.querySelector('#login-view') as HTMLElement;
    if (loginView) {
      loginView.style.display = 'none';
    }
  }
}