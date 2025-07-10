import { TransactionService } from '../service/TransactionService';
import { CategoryService } from '../service/CategoryService';
import { Transaction } from '../model/Transaction';
import { Category } from '../model/Category';
import { isNotEmpty, isValidDate } from '../utils/validators';

// Interfaces para dados de entrada
export interface CreateTransactionData {
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  categoriaId: string;
  data: string;
  formaPagamento: string;
  recorrente?: boolean;
  mesesRecorrencia?: number;
}

export interface UpdateTransactionData extends Partial<CreateTransactionData> {
  id: string;
}

// Interfaces para responses consistentes
export interface TransactionResponse {
  success: boolean;
  message: string;
  transaction?: Transaction;
  transactionId?: string;
}

export interface TransactionsResponse {
  success: boolean;
  message: string;
  transactions?: Transaction[];
}

export interface TransactionSummaryResponse {
  success: boolean;
  message: string;
  summary?: TransactionSummary;
}

export interface BaseResponse {
  success: boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// Interface para resumo financeiro
export interface TransactionSummary {
  saldo: number;
  totalReceitas: number;
  totalDespesas: number;
  transacoesCount: number;
}

// Enum para níveis de log
enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export class TransactionController {
  // Constantes de configuração
  private static readonly MIN_DESCRIPTION_LENGTH = 3;
  private static readonly MAX_DESCRIPTION_LENGTH = 100;
  private static readonly MAX_VALUE = 1000000;
  private static readonly MAX_YEARS_AGO = 10;
  
  private static instance: TransactionController;
  private transactionService: TransactionService;
  private categoryService: CategoryService;

  private constructor() {
    this.transactionService = TransactionService.getInstance();
    this.categoryService = CategoryService.getInstance();
  }

  public static getInstance(): TransactionController {
    if (!TransactionController.instance) {
      TransactionController.instance = new TransactionController();
    }
    return TransactionController.instance;
  }

  /**
   * Sistema de logging estruturado
   * @param level - Nível do log
   * @param message - Mensagem do log
   * @param data - Dados adicionais (opcional)
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const logMessage = `[TransactionController] ${message}`;
    
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
   * Valida os dados de criação de transação
   * @param data - Dados da transação
   * @param isUpdate - Se é uma operação de atualização
   * @returns Resultado da validação
   */
  private validateTransactionData(data: CreateTransactionData, isUpdate: boolean = false): ValidationResult {
    // Validação de descrição
    if (!isUpdate || data.descricao !== undefined) {
      if (!isNotEmpty(data.descricao)) {
        return { isValid: false, message: 'Descrição é obrigatória' };
      }
      if (data.descricao.length < TransactionController.MIN_DESCRIPTION_LENGTH) {
        return { 
          isValid: false, 
          message: `Descrição deve ter pelo menos ${TransactionController.MIN_DESCRIPTION_LENGTH} caracteres` 
        };
      }
      if (data.descricao.length > TransactionController.MAX_DESCRIPTION_LENGTH) {
        return { 
          isValid: false, 
          message: `Descrição deve ter no máximo ${TransactionController.MAX_DESCRIPTION_LENGTH} caracteres` 
        };
      }
    }

    // Validação de valor
    if (!isUpdate || data.valor !== undefined) {
      if (!data.valor || data.valor <= 0) {
        return { isValid: false, message: 'Valor deve ser maior que zero' };
      }
      if (data.valor > TransactionController.MAX_VALUE) {
        return { 
          isValid: false, 
          message: `Valor deve ser menor que R$ ${TransactionController.MAX_VALUE.toLocaleString('pt-BR')},00` 
        };
      }
    }

    // Validação de tipo
    if (!isUpdate || data.tipo !== undefined) {
      if (!data.tipo || !['receita', 'despesa'].includes(data.tipo)) {
        return { isValid: false, message: 'Tipo deve ser "receita" ou "despesa"' };
      }
    }

    // Validação de categoria
    if (!isUpdate || data.categoriaId !== undefined) {
      if (!isNotEmpty(data.categoriaId)) {
        return { isValid: false, message: 'Categoria é obrigatória' };
      }
    }

    // Validação de data
    if (!isUpdate || data.data !== undefined) {
      if (!isValidDate(data.data)) {
        return { isValid: false, message: 'Data inválida' };
      }

      const transactionDate = new Date(data.data);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (transactionDate > today) {
        return { isValid: false, message: 'Data não pode ser futura' };
      }

      const yearsAgo = new Date();
      yearsAgo.setFullYear(yearsAgo.getFullYear() - TransactionController.MAX_YEARS_AGO);

      if (transactionDate < yearsAgo) {
        return { 
          isValid: false, 
          message: `Data não pode ser anterior a ${TransactionController.MAX_YEARS_AGO} anos` 
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Verificar se categoria existe para o usuário
   * @param userId - ID do usuário
   * @param categoryId - ID da categoria
   * @returns True se categoria existir
   */
  private async validateCategoryExists(userId: string, categoryId: string): Promise<boolean> {
    try {
      const categories = await this.categoryService.getCategoriesByUser(userId);
      return categories.some(cat => cat.id === categoryId);
    } catch (error) {
      this.log(LogLevel.ERROR, 'Erro ao validar categoria', { userId, categoryId, error });
      return false;
    }
  }

  /**
   * Cria uma nova transação
   * @param userId - ID do usuário
   * @param data - Dados da transação
   * @returns Promise com resultado da criação
   */
  async createTransaction(userId: string, data: CreateTransactionData): Promise<TransactionResponse> {
    try {
      // Validações de entrada
      const validation = this.validateTransactionData(data);
      if (!validation.isValid) {
        return { success: false, message: validation.message! };
      }

      // Verificar se categoria existe
      const categoryExists = await this.validateCategoryExists(userId, data.categoriaId);
      if (!categoryExists) {
        return { success: false, message: 'Categoria não encontrada' };
      }

      // Criar transação
      const transactionId = await this.transactionService.createTransaction({
        userId,
        ...data,
        recorrente: data.recorrente || false
      });

      this.log(LogLevel.INFO, 'Transação criada com sucesso', { 
        userId, 
        transactionId, 
        tipo: data.tipo,
        valor: data.valor 
      });

      return {
        success: true,
        message: 'Transação criada com sucesso!',
        transactionId
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao criar transação', { userId, error: error.message });

      return {
        success: false,
        message: 'Erro ao criar transação. Tente novamente.'
      };
    }
  }

  /**
   * Busca transações do usuário
   * @param userId - ID do usuário
   * @returns Promise com lista de transações
   */
  async getUserTransactions(userId: string): Promise<TransactionsResponse> {
    try {
      const transactions = await this.transactionService.getTransactionsByUser(userId);

      this.log(LogLevel.INFO, 'Transações carregadas com sucesso', { 
        userId, 
        count: transactions.length 
      });

      return {
        success: true,
        message: 'Transações carregadas com sucesso!',
        transactions
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao carregar transações', { userId, error: error.message });

      return {
        success: false,
        message: 'Erro ao carregar transações'
      };
    }
  }

  /**
   * Atualiza uma transação existente
   * @param userId - ID do usuário
   * @param data - Dados da transação para atualizar
   * @returns Promise com resultado da atualização
   */
  async updateTransaction(userId: string, data: UpdateTransactionData): Promise<BaseResponse> {
    try {
      // Validação básica
      if (!data.id) {
        return { success: false, message: 'ID da transação é obrigatório' };
      }

      // Validar dados se fornecidos
      if (data.descricao !== undefined || data.valor !== undefined || data.tipo !== undefined || 
          data.categoriaId !== undefined || data.data !== undefined) {
        const validation = this.validateTransactionData(data as CreateTransactionData, true);
        if (!validation.isValid) {
          return { success: false, message: validation.message! };
        }
      }

      // Verificar se categoria existe (se fornecida)
      if (data.categoriaId) {
        const categoryExists = await this.validateCategoryExists(userId, data.categoriaId);
        if (!categoryExists) {
          return { success: false, message: 'Categoria não encontrada' };
        }
      }

      // Atualizar transação
      await this.transactionService.updateTransaction(userId, data.id, data);

      this.log(LogLevel.INFO, 'Transação atualizada com sucesso', { 
        userId, 
        transactionId: data.id 
      });

      return {
        success: true,
        message: 'Transação atualizada com sucesso!'
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao atualizar transação', { 
        userId, 
        transactionId: data.id, 
        error: error.message 
      });

      return {
        success: false,
        message: 'Erro ao atualizar transação. Tente novamente.'
      };
    }
  }

  /**
   * Remove uma transação
   * @param userId - ID do usuário
   * @param transactionId - ID da transação
   * @returns Promise com resultado da remoção
   */
  async deleteTransaction(userId: string, transactionId: string): Promise<BaseResponse> {
    try {
      if (!transactionId) {
        return { success: false, message: 'ID da transação é obrigatório' };
      }

      await this.transactionService.deleteTransaction(userId, transactionId);

      this.log(LogLevel.INFO, 'Transação deletada com sucesso', { 
        userId, 
        transactionId 
      });

      return {
        success: true,
        message: 'Transação deletada com sucesso!'
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao deletar transação', { 
        userId, 
        transactionId, 
        error: error.message 
      });

      return {
        success: false,
        message: 'Erro ao deletar transação. Tente novamente.'
      };
    }
  }

  /**
   * Calcula resumo financeiro do usuário
   * @param userId - ID do usuário
   * @returns Promise com resumo financeiro
   */
  async getFinancialSummary(userId: string): Promise<TransactionSummaryResponse> {
    try {
      const balanceData = await this.transactionService.calculateBalance(userId);

      const summary: TransactionSummary = {
        saldo: balanceData.saldo,
        totalReceitas: balanceData.receitas,
        totalDespesas: balanceData.despesas,
        transacoesCount: balanceData.receitas > 0 || balanceData.despesas > 0 ? 1 : 0 // Simplified
      };

      this.log(LogLevel.INFO, 'Resumo financeiro calculado', { 
        userId, 
        saldo: summary.saldo 
      });

      return {
        success: true,
        message: 'Resumo calculado com sucesso!',
        summary
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao calcular resumo', { 
        userId, 
        error: error.message 
      });

      return {
        success: false,
        message: 'Erro ao calcular resumo financeiro'
      };
    }
  }

  /**
   * Busca transações com filtros aplicados
   * @param userId - ID do usuário
   * @param filters - Filtros a serem aplicados
   * @returns Promise com transações filtradas
   */
  async getFilteredTransactions(userId: string, filters: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    tipo?: 'receita' | 'despesa';
  }): Promise<TransactionsResponse> {
    try {
      let transactions = await this.transactionService.getTransactionsByUser(userId);

      // Aplicar filtros
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        transactions = transactions.filter(t => new Date(t.data) >= startDate);
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        transactions = transactions.filter(t => new Date(t.data) <= endDate);
      }

      if (filters.categoryId) {
        transactions = transactions.filter(t => t.categoriaId === filters.categoryId);
      }

      if (filters.tipo) {
        transactions = transactions.filter(t => t.tipo === filters.tipo);
      }

      this.log(LogLevel.INFO, 'Transações filtradas com sucesso', { 
        userId, 
        filters,
        resultCount: transactions.length 
      });

      return {
        success: true,
        message: 'Transações filtradas com sucesso!',
        transactions
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao filtrar transações', { 
        userId, 
        filters, 
        error: error.message 
      });

      return {
        success: false,
        message: 'Erro ao filtrar transações'
      };
    }
  }
}
