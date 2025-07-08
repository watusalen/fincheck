// FinCheck MVP - Bootstrap da Aplicação
import { AuthService } from './service/AuthService';
import { MainView } from './view/MainView';

console.log('🚀 FinCheck MVP - Inicializando Bootstrap...');

class FinCheckApp {
  private authService: AuthService;
  private mainView: MainView;

  constructor() {
    this.authService = AuthService.getInstance();
    this.mainView = new MainView();
    this.init();
  }

  private init(): void {
    console.log('🏗️ Inicializando aplicação...');

    // Observer de autenticação
    this.authService.onAuthStateChange((user) => {
      if (user) {
        console.log('✅ Usuário autenticado:', user.email);
        this.mainView.showDashboard(user);
      } else {
        console.log('❌ Usuário não autenticado');
        this.mainView.showLoginScreen();
      }
    });
  }
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM carregado - Inicializando FinCheck...');
  new FinCheckApp();
});

console.log('✅ Bootstrap configurado!');