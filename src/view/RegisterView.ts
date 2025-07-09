import { AuthController } from '../controller/AuthController';

export class RegisterView {
  private authController: AuthController;

  constructor() {
    this.authController = AuthController.getInstance();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const form = document.querySelector('#register-form') as HTMLFormElement;
    const showLoginBtn = document.querySelector('#show-login') as HTMLButtonElement;

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleRegister();
    });

    showLoginBtn?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('showLogin'));
    });
  }

  private async handleRegister(): Promise<void> {
    const nameInput = document.querySelector('#register-name') as HTMLInputElement;
    const emailInput = document.querySelector('#register-email') as HTMLInputElement;
    const passwordInput = document.querySelector('#register-password') as HTMLInputElement;
    const errorElement = document.querySelector('#register-error') as HTMLElement;

    if (!nameInput || !emailInput || !passwordInput) return;

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!name || !email || !password) {
      this.showError('Por favor, preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      this.showError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    console.log('🔄 Tentando criar conta para:', email);

    try {
      const result = await this.authController.register(email, password, name);

      if (result.success) {
        console.log('✅ Conta criada com sucesso!');
        this.clearError();
        // Limpar form
        nameInput.value = '';
        emailInput.value = '';
        passwordInput.value = '';

        // Automaticamente fazer login após o registro
        const loginResult = await this.authController.login(email, password);
        if (!loginResult.success) {
          this.showError('Conta criada! Por favor, faça login.');
          window.dispatchEvent(new CustomEvent('showLogin'));
        }
      } else {
        console.error('❌ Erro no registro:', result.message);
        this.showError(result.message || 'Erro ao criar conta. Tente novamente.');
      }
    } catch (error) {
      console.error('❌ Erro inesperado no registro:', error);
      this.showError('Erro inesperado. Tente novamente.');
    }
  }

  private showError(message: string): void {
    const errorElement = document.querySelector('#register-error') as HTMLElement;
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
  }

  private clearError(): void {
    const errorElement = document.querySelector('#register-error') as HTMLElement;
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }
  }

  show(): void {
    const loginView = document.querySelector('#login-view') as HTMLElement;
    const registerView = document.querySelector('#register-view') as HTMLElement;
    const dashboardView = document.querySelector('#dashboard-view') as HTMLElement;

    if (loginView) loginView.style.display = 'none';
    if (registerView) registerView.style.display = 'flex';
    if (dashboardView) dashboardView.style.display = 'none';

    this.clearError();
    console.log('📝 RegisterView exibida');
  }

  hide(): void {
    const registerView = document.querySelector('#register-view') as HTMLElement;
    if (registerView) {
      registerView.style.display = 'none';
    }
  }
}