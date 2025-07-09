import { User } from '../model/User';
import { LoginView } from './LoginView';
import { RegisterView } from './RegisterView';
import { DashboardView } from './DashboardView';

export class MainView {
  private loginView: LoginView;
  private registerView: RegisterView;
  private dashboardView: DashboardView;
  private currentView: string = 'none';

  constructor() {
    this.loginView = new LoginView();
    this.registerView = new RegisterView();
    this.dashboardView = new DashboardView();

    this.setupNavigationListeners();
    console.log('🖼️ MainView inicializada');
  }

  private setupNavigationListeners(): void {
    // Ouvir eventos de navegação entre views
    window.addEventListener('showLogin', () => {
      this.showLoginScreen();
    });

    window.addEventListener('showRegister', () => {
      this.showRegisterScreen();
    });
  }

  showLoginScreen(): void {
    console.log('🔐 Exibindo tela de login');
    this.hideAllViews();
    this.loginView.show();
    this.currentView = 'login';
  }

  showRegisterScreen(): void {
    console.log('📝 Exibindo tela de cadastro');
    this.hideAllViews();
    this.registerView.show();
    this.currentView = 'register';
  }

  showDashboard(user: User): void {
    console.log('📊 Exibindo dashboard para:', user.email);
    this.hideAllViews();
    this.dashboardView.show(user);
    this.currentView = 'dashboard';
  }

  private hideAllViews(): void {
    this.loginView.hide();
    this.registerView.hide();
    this.dashboardView.hide();
  }

  getCurrentView(): string {
    return this.currentView;
  }
}
