import { AuthController } from './AuthController';
import { TransactionController } from './TransactionController';
import { CategoryController } from './CategoryController';
import { User } from '../model/User';
import { Transaction } from '../model/Transaction';
import { Category } from '../model/Category';

export interface DashboardData {
  user: User;
  summary: {
    saldo: number;
    totalReceitas: number;
    totalDespesas: number;
    transacoesCount: number;
  };
  recentTransactions: Transaction[];
  categories: Category[];
}

export class DashboardController {
  private static instance: DashboardController;
  private authController: AuthController;
  private transactionController: TransactionController;
  private categoryController: CategoryController;

  private constructor() {
    this.authController = AuthController.getInstance();
    this.transactionController = TransactionController.getInstance();
    this.categoryController = CategoryController.getInstance();
  }

  public static getInstance(): DashboardController {
    if (!DashboardController.instance) {
      DashboardController.instance = new DashboardController();
    }
    return DashboardController.instance;
  }

  // Carregar todos os dados do dashboard
  async loadDashboardData(): Promise<{ success: boolean; message: string; data?: DashboardData }> {
    try {
      // Verificar autenticação
      const user = this.authController.getCurrentUser();
      if (!user) {
        return { success: false, message: 'Usuário não autenticado' };
      }

      // Carregar dados em paralelo para melhor performance
      const [
        summaryResult,
        transactionsResult,
        categoriesResult
      ] = await Promise.all([
        this.transactionController.getFinancialSummary(user.uid),
        this.transactionController.getUserTransactions(user.uid),
        this.categoryController.getUserCategories(user.uid)
      ]);

      // Verificar se alguma operação falhou
      if (!summaryResult.success) {
        return { success: false, message: summaryResult.message };
      }
      if (!transactionsResult.success) {
        return { success: false, message: transactionsResult.message };
      }
      if (!categoriesResult.success) {
        return { success: false, message: categoriesResult.message };
      }

      // Ordenar transações por data (mais recentes primeiro) e pegar apenas as 10 últimas
      const recentTransactions = (transactionsResult.transactions || [])
        .sort((a: Transaction, b: Transaction) => new Date(b.data).getTime() - new Date(a.data).getTime())
        .slice(0, 10);

      // Montar dados do dashboard
      const dashboardData: DashboardData = {
        user,
        summary: summaryResult.summary!,
        recentTransactions,
        categories: categoriesResult.categories || []
      };

      return {
        success: true,
        message: 'Dados do dashboard carregados com sucesso!',
        data: dashboardData
      };

    } catch (error: any) {
      console.error('❌ Erro ao carregar dashboard:', error.message);
      return {
        success: false,
        message: 'Erro ao carregar dados do dashboard'
      };
    }
  }

  // Obter resumo rápido para atualizações
  async getQuickSummary(): Promise<{
    success: boolean;
    message: string;
    summary?: {
      saldo: number;
      totalReceitas: number;
      totalDespesas: number;
      transactionsCount: number;
      categoriesCount: number;
    }
  }> {
    try {
      const user = this.authController.getCurrentUser();
      if (!user) {
        return { success: false, message: 'Usuário não autenticado' };
      }

      const [summaryResult, categoriesResult] = await Promise.all([
        this.transactionController.getFinancialSummary(user.uid),
        this.categoryController.getUserCategories(user.uid)
      ]);

      if (!summaryResult.success || !categoriesResult.success) {
        return { success: false, message: 'Erro ao carregar resumo' };
      }

      return {
        success: true,
        message: 'Resumo carregado!',
        summary: {
          saldo: summaryResult.summary!.saldo,
          totalReceitas: summaryResult.summary!.totalReceitas,
          totalDespesas: summaryResult.summary!.totalDespesas,
          transactionsCount: summaryResult.summary!.transacoesCount,
          categoriesCount: categoriesResult.categories!.length
        }
      };

    } catch (error: any) {
      console.error('❌ Erro ao carregar resumo:', error.message);
      return {
        success: false,
        message: 'Erro ao carregar resumo'
      };
    }
  }

  // Obter dados para gráficos
  async getChartsData(filters?: {
    period?: number;
    type?: 'both' | 'income' | 'expense';
  }): Promise<{
    success: boolean;
    message: string;
    data?: {
      transactions: Transaction[];
      categories: Category[];
    }
  }> {
    try {
      const user = this.authController.getCurrentUser();
      if (!user) {
        return { success: false, message: 'Usuário não autenticado' };
      }

      // Aplicar filtros se fornecidos
      let transactionsResult;
      if (filters?.period || filters?.type) {
        const filterOptions: any = {};

        if (filters.period && filters.period !== -1) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - filters.period);
          filterOptions.startDate = cutoffDate.toISOString().split('T')[0];
        }

        if (filters.type && filters.type !== 'both') {
          filterOptions.tipo = filters.type === 'income' ? 'receita' : 'despesa';
        }

        transactionsResult = await this.transactionController.getFilteredTransactions(user.uid, filterOptions);
      } else {
        transactionsResult = await this.transactionController.getUserTransactions(user.uid);
      }

      const categoriesResult = await this.categoryController.getUserCategories(user.uid);

      if (!transactionsResult.success || !categoriesResult.success) {
        return { success: false, message: 'Erro ao carregar dados para gráficos' };
      }

      return {
        success: true,
        message: 'Dados para gráficos carregados!',
        data: {
          transactions: transactionsResult.transactions || [],
          categories: categoriesResult.categories || []
        }
      };

    } catch (error: any) {
      console.error('❌ Erro ao carregar dados dos gráficos:', error.message);
      return {
        success: false,
        message: 'Erro ao carregar dados para gráficos'
      };
    }
  }

  // Verificar se usuário tem dados suficientes
  async checkDataCompleteness(): Promise<{
    success: boolean;
    message: string;
    completeness?: {
      hasTransactions: boolean;
      hasCategories: boolean;
      suggestedActions: string[];
    }
  }> {
    try {
      const user = this.authController.getCurrentUser();
      if (!user) {
        return { success: false, message: 'Usuário não autenticado' };
      }

      const [transactionsResult, categoriesResult] = await Promise.all([
        this.transactionController.getUserTransactions(user.uid),
        this.categoryController.getUserCategories(user.uid)
      ]);

      const hasTransactions = (transactionsResult.transactions?.length || 0) > 0;
      const hasCategories = (categoriesResult.categories?.length || 0) > 0;

      const suggestedActions: string[] = [];

      if (!hasCategories) {
        suggestedActions.push('Crie suas primeiras categorias para organizar suas finanças');
      }

      if (!hasTransactions) {
        suggestedActions.push('Adicione suas primeiras transações para começar o controle');
      }

      if (hasCategories && hasTransactions && suggestedActions.length === 0) {
        suggestedActions.push('Explore os gráficos para analisar seus gastos');
      }

      return {
        success: true,
        message: 'Completude dos dados verificada!',
        completeness: {
          hasTransactions,
          hasCategories,
          suggestedActions
        }
      };

    } catch (error: any) {
      console.error('❌ Erro ao verificar completude:', error.message);
      return {
        success: false,
        message: 'Erro ao verificar dados'
      };
    }
  }

  // Método para obter o usuário atual
  getCurrentUser(): User | null {
    return this.authController.getCurrentUser();
  }

  // Método para carregar todas as transações para o histórico
  async getAllTransactionsForHistory(userId: string): Promise<{
    success: boolean;
    message: string;
    data?: { transactions: Transaction[]; categories: Category[] }
  }> {
    try {
      const [transactionsResult, categoriesResult] = await Promise.all([
        this.transactionController.getUserTransactions(userId),
        this.categoryController.getUserCategories(userId)
      ]);

      if (!transactionsResult.success) {
        return { success: false, message: transactionsResult.message };
      }
      if (!categoriesResult.success) {
        return { success: false, message: categoriesResult.message };
      }

      return {
        success: true,
        message: 'Dados carregados com sucesso',
        data: {
          transactions: transactionsResult.transactions || [],
          categories: categoriesResult.categories || []
        }
      };
    } catch (error) {
      console.error('❌ Erro ao carregar dados do histórico:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }
}
