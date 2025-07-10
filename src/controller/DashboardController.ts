import { AuthController } from './AuthController';
import { TransactionController } from './TransactionController';
import { CategoryController } from './CategoryController';
import { User } from '../model/User';
import { Transaction } from '../model/Transaction';
import { Category } from '../model/Category';

// Interfaces para dados de entrada e filtros
export interface DashboardFilters {
  period?: number;
  type?: 'both' | 'income' | 'expense';
}

// Interfaces para responses consistentes
export interface DashboardDataResponse {
  success: boolean;
  message: string;
  data?: DashboardData;
}

export interface QuickSummaryResponse {
  success: boolean;
  message: string;
  summary?: QuickSummary;
}

export interface ChartsDataResponse {
  success: boolean;
  message: string;
  data?: ChartsData;
}

export interface CompletenessResponse {
  success: boolean;
  message: string;
  completeness?: DataCompleteness;
}

export interface HistoryDataResponse {
  success: boolean;
  message: string;
  data?: HistoryData;
}

export interface BaseResponse {
  success: boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// Interfaces para dados do dashboard
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

export interface QuickSummary {
  saldo: number;
  totalReceitas: number;
  totalDespesas: number;
  transactionsCount: number;
  categoriesCount: number;
}

export interface ChartsData {
  transactions: Transaction[];
  categories: Category[];
}

export interface DataCompleteness {
  hasTransactions: boolean;
  hasCategories: boolean;
  suggestedActions: string[];
}

export interface HistoryData {
  transactions: Transaction[];
  categories: Category[];
}

// Enum para níveis de log
enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export class DashboardController {
  // Constantes de configuração
  private static readonly MAX_RECENT_TRANSACTIONS = 10;
  
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

  /**
   * Sistema de logging estruturado
   * @param level - Nível do log
   * @param message - Mensagem do log
   * @param data - Dados adicionais (opcional)
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const logMessage = `[DashboardController] ${message}`;
    
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
   * Valida se o usuário está autenticado
   * @returns Usuário autenticado ou null
   */
  private validateAuthentication(): User | null {
    const user = this.authController.getCurrentUser();
    if (!user) {
      this.log(LogLevel.WARN, 'Tentativa de acesso sem autenticação');
    }
    return user;
  }

  /**
   * Ordena transações por data (mais recentes primeiro)
   * @param transactions - Lista de transações
   * @returns Transações ordenadas
   */
  private sortTransactionsByDate(transactions: Transaction[]): Transaction[] {
    return transactions.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }

  /**
   * Calcula data de corte baseada no período
   * @param period - Número de dias
   * @returns Data de corte em formato ISO
   */
  private calculateCutoffDate(period: number): string {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - period);
    return cutoffDate.toISOString().split('T')[0];
  }

  /**
   * Carrega todos os dados do dashboard
   * @returns Promise com dados completos do dashboard
   */
  async loadDashboardData(): Promise<DashboardDataResponse> {
    try {
      // Verificar autenticação
      const user = this.validateAuthentication();
      if (!user) {
        return { success: false, message: 'Usuário não autenticado' };
      }

      this.log(LogLevel.INFO, 'Carregando dados do dashboard', { userId: user.uid });

      // Carregar dados em paralelo para melhor performance
      const [summaryResult, transactionsResult, categoriesResult] = await Promise.all([
        this.transactionController.getFinancialSummary(user.uid),
        this.transactionController.getUserTransactions(user.uid),
        this.categoryController.getUserCategories(user.uid)
      ]);

      // Verificar se alguma operação falhou
      if (!summaryResult.success) {
        this.log(LogLevel.ERROR, 'Erro ao carregar resumo financeiro', { error: summaryResult.message });
        return { success: false, message: summaryResult.message };
      }
      if (!transactionsResult.success) {
        this.log(LogLevel.ERROR, 'Erro ao carregar transações', { error: transactionsResult.message });
        return { success: false, message: transactionsResult.message };
      }
      if (!categoriesResult.success) {
        this.log(LogLevel.ERROR, 'Erro ao carregar categorias', { error: categoriesResult.message });
        return { success: false, message: categoriesResult.message };
      }

      // Processar transações recentes
      const allTransactions = transactionsResult.transactions || [];
      const sortedTransactions = this.sortTransactionsByDate(allTransactions);
      const recentTransactions = sortedTransactions.slice(0, DashboardController.MAX_RECENT_TRANSACTIONS);

      // Montar dados do dashboard
      const dashboardData: DashboardData = {
        user,
        summary: summaryResult.summary!,
        recentTransactions,
        categories: categoriesResult.categories || []
      };

      this.log(LogLevel.INFO, 'Dashboard carregado com sucesso', {
        userId: user.uid,
        transactionsCount: allTransactions.length,
        categoriesCount: dashboardData.categories.length,
        recentTransactionsCount: recentTransactions.length
      });

      return {
        success: true,
        message: 'Dados do dashboard carregados com sucesso!',
        data: dashboardData
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao carregar dashboard', { error: error.message });

      return {
        success: false,
        message: 'Erro ao carregar dados do dashboard'
      };
    }
  }

  /**
   * Obtém resumo rápido para atualizações
   * @returns Promise com resumo financeiro básico
   */
  async getQuickSummary(): Promise<QuickSummaryResponse> {
    try {
      const user = this.validateAuthentication();
      if (!user) {
        return { success: false, message: 'Usuário não autenticado' };
      }

      this.log(LogLevel.INFO, 'Carregando resumo rápido', { userId: user.uid });

      const [summaryResult, categoriesResult] = await Promise.all([
        this.transactionController.getFinancialSummary(user.uid),
        this.categoryController.getUserCategories(user.uid)
      ]);

      if (!summaryResult.success || !categoriesResult.success) {
        const errorMsg = !summaryResult.success ? summaryResult.message : categoriesResult.message;
        this.log(LogLevel.ERROR, 'Erro ao carregar resumo rápido', { error: errorMsg });
        return { success: false, message: 'Erro ao carregar resumo' };
      }

      const quickSummary: QuickSummary = {
        saldo: summaryResult.summary!.saldo,
        totalReceitas: summaryResult.summary!.totalReceitas,
        totalDespesas: summaryResult.summary!.totalDespesas,
        transactionsCount: summaryResult.summary!.transacoesCount,
        categoriesCount: categoriesResult.categories!.length
      };

      this.log(LogLevel.INFO, 'Resumo rápido carregado', {
        userId: user.uid,
        saldo: quickSummary.saldo,
        categoriesCount: quickSummary.categoriesCount
      });

      return {
        success: true,
        message: 'Resumo carregado!',
        summary: quickSummary
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao carregar resumo rápido', { error: error.message });

      return {
        success: false,
        message: 'Erro ao carregar resumo'
      };
    }
  }

  /**
   * Obtém dados para gráficos com filtros opcionais
   * @param filters - Filtros para os dados
   * @returns Promise com dados para gráficos
   */
  async getChartsData(filters?: DashboardFilters): Promise<ChartsDataResponse> {
    try {
      const user = this.validateAuthentication();
      if (!user) {
        return { success: false, message: 'Usuário não autenticado' };
      }

      this.log(LogLevel.INFO, 'Carregando dados para gráficos', { userId: user.uid, filters });

      // Aplicar filtros se fornecidos
      let transactionsResult;
      if (filters?.period || filters?.type) {
        const filterOptions: any = {};

        if (filters.period && filters.period !== -1) {
          filterOptions.startDate = this.calculateCutoffDate(filters.period);
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
        const errorMsg = !transactionsResult.success ? transactionsResult.message : categoriesResult.message;
        this.log(LogLevel.ERROR, 'Erro ao carregar dados para gráficos', { error: errorMsg });
        return { success: false, message: 'Erro ao carregar dados para gráficos' };
      }

      const chartsData: ChartsData = {
        transactions: transactionsResult.transactions || [],
        categories: categoriesResult.categories || []
      };

      this.log(LogLevel.INFO, 'Dados para gráficos carregados', {
        userId: user.uid,
        transactionsCount: chartsData.transactions.length,
        categoriesCount: chartsData.categories.length,
        filters
      });

      return {
        success: true,
        message: 'Dados para gráficos carregados!',
        data: chartsData
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao carregar dados dos gráficos', { error: error.message });

      return {
        success: false,
        message: 'Erro ao carregar dados para gráficos'
      };
    }
  }

  /**
   * Verifica completude dos dados do usuário
   * @returns Promise com análise de completude
   */
  async checkDataCompleteness(): Promise<CompletenessResponse> {
    try {
      const user = this.validateAuthentication();
      if (!user) {
        return { success: false, message: 'Usuário não autenticado' };
      }

      this.log(LogLevel.INFO, 'Verificando completude dos dados', { userId: user.uid });

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

      const completeness: DataCompleteness = {
        hasTransactions,
        hasCategories,
        suggestedActions
      };

      this.log(LogLevel.INFO, 'Completude verificada', {
        userId: user.uid,
        hasTransactions,
        hasCategories,
        suggestionsCount: suggestedActions.length
      });

      return {
        success: true,
        message: 'Completude dos dados verificada!',
        completeness
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao verificar completude', { error: error.message });

      return {
        success: false,
        message: 'Erro ao verificar dados'
      };
    }
  }

  /**
   * Obtém o usuário atual
   * @returns Usuário autenticado ou null
   */
  getCurrentUser(): User | null {
    return this.authController.getCurrentUser();
  }

  /**
   * Carrega todas as transações para o histórico
   * @param userId - ID do usuário
   * @returns Promise com dados completos para histórico
   */
  async getAllTransactionsForHistory(userId: string): Promise<HistoryDataResponse> {
    try {
      if (!userId) {
        return { success: false, message: 'ID do usuário é obrigatório' };
      }

      this.log(LogLevel.INFO, 'Carregando dados do histórico', { userId });

      const [transactionsResult, categoriesResult] = await Promise.all([
        this.transactionController.getUserTransactions(userId),
        this.categoryController.getUserCategories(userId)
      ]);

      if (!transactionsResult.success) {
        this.log(LogLevel.ERROR, 'Erro ao carregar transações do histórico', { 
          userId, 
          error: transactionsResult.message 
        });
        return { success: false, message: transactionsResult.message };
      }

      if (!categoriesResult.success) {
        this.log(LogLevel.ERROR, 'Erro ao carregar categorias do histórico', { 
          userId, 
          error: categoriesResult.message 
        });
        return { success: false, message: categoriesResult.message };
      }

      const historyData: HistoryData = {
        transactions: transactionsResult.transactions || [],
        categories: categoriesResult.categories || []
      };

      this.log(LogLevel.INFO, 'Dados do histórico carregados', {
        userId,
        transactionsCount: historyData.transactions.length,
        categoriesCount: historyData.categories.length
      });

      return {
        success: true,
        message: 'Dados carregados com sucesso',
        data: historyData
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao carregar dados do histórico', { userId, error: error.message });

      return { 
        success: false, 
        message: 'Erro interno do servidor' 
      };
    }
  }
}
