import { User } from '../model/User';
import { AuthController } from '../controller/AuthController';
import { DashboardController } from '../controller/DashboardController';
import { CategoryController } from '../controller/CategoryController';
import { TransactionView } from './TransactionView';
import { ChartView } from './ChartView';
import { HistoryView } from './HistoryView';
import { formatCurrency } from '../utils/validators';

export class DashboardView {
  private authController: AuthController;
  private dashboardController: DashboardController;
  private categoryController: CategoryController;
  private transactionView: TransactionView;
  private chartView: ChartView;
  private historyView: HistoryView;
  private currentUser: User | null = null;

  constructor() {
    this.authController = AuthController.getInstance();
    this.dashboardController = DashboardController.getInstance();
    this.categoryController = CategoryController.getInstance();
    this.transactionView = new TransactionView();
    this.chartView = new ChartView();
    this.historyView = new HistoryView();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Event listeners para os botões de logout
    const logoutBtn = document.querySelector('#logout-btn') as HTMLButtonElement;

    // Event listeners para os quick actions
    const addTransactionBtn = document.querySelector('#add-transaction-btn') as HTMLButtonElement;
    const viewChartsBtn = document.querySelector('#view-charts-btn') as HTMLButtonElement;

    // Event listeners para navegação da sidebar
    const navHome = document.querySelector('#nav-home') as HTMLButtonElement;
    const navHistory = document.querySelector('#nav-history') as HTMLButtonElement;

    logoutBtn?.addEventListener('click', async () => {
      await this.handleLogout();
    });

    addTransactionBtn?.addEventListener('click', () => {
      console.log('🔄 Abrindo modal de transações');
      this.transactionView.show();
    });

    viewChartsBtn?.addEventListener('click', () => {
      console.log('🔄 Abrindo análise de gráficos');
      this.chartView.show();
    });

    // Navegação da sidebar
    navHome?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showSection('dashboard-home');
      this.setActiveNavItem('nav-home');
    });

    navHistory?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showSection('dashboard-history');
      this.setActiveNavItem('nav-history');
      // Disparar evento para ativar a HistoryView
      window.dispatchEvent(new CustomEvent('historyActivated'));
    });

    // Ouvir eventos para atualizar dashboard
    window.addEventListener('transactionCreated', () => {
      this.loadDashboardData();
    });

    window.addEventListener('categoryCreated', () => {
      this.loadDashboardData();
    });

    window.addEventListener('categoryDeleted', () => {
      this.loadDashboardData();
    });

    window.addEventListener('goalCreated', () => {
      this.loadDashboardData();
    });

    window.addEventListener('goalDeleted', () => {
      this.loadDashboardData();
    });
  }

  private showSection(sectionId: string): void {
    // Esconder todas as seções
    const sections = document.querySelectorAll('.dashboard-section');
    sections.forEach(section => {
      section.classList.remove('active');
    });

    // Mostrar a seção selecionada
    const targetSection = document.querySelector(`#${sectionId}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }
  }

  private setActiveNavItem(activeId: string): void {
    // Remover active de todos os itens
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
    });

    // Adicionar active ao item selecionado
    const activeLink = document.querySelector(`#${activeId}`);
    if (activeLink) {
      const parentItem = activeLink.closest('.nav-item');
      if (parentItem) {
        parentItem.classList.add('active');
      }
    }
  }

  private async handleLogout(): Promise<void> {
    console.log('🔄 Fazendo logout...');

    const result = await this.authController.logout();

    if (result.success) {
      console.log('✅ Logout realizado com sucesso');
    } else {
      console.error('❌ Erro no logout:', result.message);
    }
  }

  show(user: User): void {
    this.currentUser = user;

    // Mostrar a view do dashboard
    const dashboardView = document.querySelector('#dashboard-view');
    if (dashboardView) {
      (dashboardView as HTMLElement).style.display = 'flex';
    }

    // Esconder as views de login/registro
    const loginView = document.querySelector('#login-view');
    const registerView = document.querySelector('#register-view');

    if (loginView) (loginView as HTMLElement).style.display = 'none';
    if (registerView) (registerView as HTMLElement).style.display = 'none';

    this.updateUserInfo();
    this.loadDashboardData();

    // Garantir que estamos na seção home e com navegação ativa
    this.showSection('dashboard-home');
    this.setActiveNavItem('nav-home');
  }

  hide(): void {
    const dashboardView = document.querySelector('#dashboard-view');
    if (dashboardView) {
      (dashboardView as HTMLElement).style.display = 'none';
    }
  }

  private updateUserInfo(): void {
    if (!this.currentUser) return;

    const userNameDisplay = document.querySelector('#user-name-display') as HTMLSpanElement;
    if (userNameDisplay) {
      // Não exibir nada se o nome estiver vazio
      userNameDisplay.textContent = this.currentUser.nome.trim() || '';
    }
  }

  private async loadDashboardData(): Promise<void> {
    if (!this.currentUser) return;

    console.log('🔄 Carregando dados do dashboard para:', this.currentUser.email);

    // Verificar se o usuário tem categorias, senão criar padrão
    try {
      const categoriesResult = await this.categoryController.getUserCategories(this.currentUser.uid);
      if (categoriesResult.success && categoriesResult.categories && categoriesResult.categories.length === 0) {
        console.log('🔄 Usuário sem categorias, criando categorias padrão...');
        const defaultCategoriesResult = await this.categoryController.createDefaultCategories(this.currentUser.uid);
        if (defaultCategoriesResult.success) {
          console.log('✅ Categorias padrão criadas:', defaultCategoriesResult.message);
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao verificar/criar categorias padrão:', error);
    }

    const result = await this.dashboardController.loadDashboardData();

    if (result.success && result.data) {
      console.log('✅ Dados do dashboard carregados:', result.data);

      // Atualizar cards financeiros
      const summary = result.data.summary;
      this.updateFinancialCards(summary.saldo, summary.totalReceitas, summary.totalDespesas);

      // Inicializar gráfico com os dados carregados
      this.initializeChart(result.data);

    } else {
      console.error('❌ Erro ao carregar dados do dashboard:', result.message);
    }
  }

  private updateFinancialCards(saldo: number, receitas: number, despesas: number): void {
    const currentBalance = document.querySelector('#current-balance') as HTMLElement;
    const totalIncome = document.querySelector('#total-income') as HTMLElement;
    const totalExpenses = document.querySelector('#total-expenses') as HTMLElement;

    if (currentBalance) currentBalance.textContent = formatCurrency(saldo);
    if (totalIncome) totalIncome.textContent = formatCurrency(receitas);
    if (totalExpenses) totalExpenses.textContent = formatCurrency(despesas);
  }

  private initializeChart(data: any): void {
    // Usar a ChartView para inicializar o gráfico na nova estrutura
    const chartCanvas = document.querySelector('#main-chart') as HTMLCanvasElement;
    if (chartCanvas && data.recentTransactions) {
      this.chartView.renderDashboardChart(chartCanvas, data.recentTransactions);
    }
  }
}