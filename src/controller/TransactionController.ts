import { TransactionService } from '../service/TransactionService';
import { CategoryService } from '../service/CategoryService';
import { Transaction } from '../model/Transaction';
import { Category } from '../model/Category';
import { isNotEmpty, isValidDate } from '../utils/validators';

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

export interface TransactionSummary {
  saldo: number;
  totalReceitas: number;
  totalDespesas: number;
  transacoesCount: number;
}

export class TransactionController {
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

  // Criar nova transação
  async createTransaction(userId: string, data: CreateTransactionData): Promise<{ success: boolean; message: string; transactionId?: string }> {
    try {
      // Validações
      const validation = this.validateTransactionData(data);
      if (!validation.isValid) {
        return { success: false, message: validation.message };
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

      return {
        success: true,
        message: 'Transação criada com sucesso!',
        transactionId
      };

    } catch (error: any) {
      console.error('❌ Erro ao criar transação:', error.message);
      return {
        success: false,
        message: 'Erro ao criar transação. Tente novamente.'
      };
    }
  }

  // Buscar transações do usuário
  async getUserTransactions(userId: string): Promise<{ success: boolean; message: string; transactions?: Transaction[] }> {
    try {
      const transactions = await this.transactionService.getTransactionsByUser(userId);

      return {
        success: true,
        message: 'Transações carregadas com sucesso!',
        transactions
      };

    } catch (error: any) {
      console.error('❌ Erro ao carregar transações:', error.message);
      return {
        success: false,
        message: 'Erro ao carregar transações'
      };
    }
  }

  // Atualizar transação
  async updateTransaction(userId: string, data: UpdateTransactionData): Promise<{ success: boolean; message: string }> {
    try {
      // Validações básicas
      if (!data.id) {
        return { success: false, message: 'ID da transação é obrigatório' };
      }

      // Validar dados se fornecidos
      if (data.descricao !== undefined || data.valor !== undefined || data.tipo !== undefined || data.categoriaId !== undefined || data.data !== undefined) {
        const validation = this.validateTransactionData(data as CreateTransactionData, true);
        if (!validation.isValid) {
          return { success: false, message: validation.message };
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

      return {
        success: true,
        message: 'Transação atualizada com sucesso!'
      };

    } catch (error: any) {
      console.error('❌ Erro ao atualizar transação:', error.message);
      return {
        success: false,
        message: 'Erro ao atualizar transação. Tente novamente.'
      };
    }
  }

  // Deletar transação
  async deleteTransaction(userId: string, transactionId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!transactionId) {
        return { success: false, message: 'ID da transação é obrigatório' };
      }

      await this.transactionService.deleteTransaction(userId, transactionId);

      return {
        success: true,
        message: 'Transação deletada com sucesso!'
      };

    } catch (error: any) {
      console.error('❌ Erro ao deletar transação:', error.message);
      return {
        success: false,
        message: 'Erro ao deletar transação. Tente novamente.'
      };
    }
  }

  // Calcular resumo financeiro
  async getFinancialSummary(userId: string): Promise<{ success: boolean; message: string; summary?: TransactionSummary }> {
    try {
      const balanceData = await this.transactionService.calculateBalance(userId);

      const summary: TransactionSummary = {
        saldo: balanceData.saldo,
        totalReceitas: balanceData.receitas,
        totalDespesas: balanceData.despesas,
        transacoesCount: balanceData.receitas > 0 || balanceData.despesas > 0 ? 1 : 0 // Simplified
      };

      return {
        success: true,
        message: 'Resumo calculado com sucesso!',
        summary
      };

    } catch (error: any) {
      console.error('❌ Erro ao calcular resumo:', error.message);
      return {
        success: false,
        message: 'Erro ao calcular resumo financeiro'
      };
    }
  }

  // Buscar transações com filtros
  async getFilteredTransactions(userId: string, filters: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    tipo?: 'receita' | 'despesa';
  }): Promise<{ success: boolean; message: string; transactions?: Transaction[] }> {
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

      return {
        success: true,
        message: 'Transações filtradas com sucesso!',
        transactions
      };

    } catch (error: any) {
      console.error('❌ Erro ao filtrar transações:', error.message);
      return {
        success: false,
        message: 'Erro ao filtrar transações'
      };
    }
  }

  // Validar dados da transação
  private validateTransactionData(data: CreateTransactionData, isUpdate: boolean = false): { isValid: boolean; message: string } {
    if (!isUpdate || data.descricao !== undefined) {
      if (!isNotEmpty(data.descricao)) {
        return { isValid: false, message: 'Descrição é obrigatória' };
      }
      if (data.descricao.length < 3) {
        return { isValid: false, message: 'Descrição deve ter pelo menos 3 caracteres' };
      }
      if (data.descricao.length > 100) {
        return { isValid: false, message: 'Descrição deve ter no máximo 100 caracteres' };
      }
    }

    if (!isUpdate || data.valor !== undefined) {
      if (!data.valor || data.valor <= 0) {
        return { isValid: false, message: 'Valor deve ser maior que zero' };
      }
      if (data.valor > 1000000) {
        return { isValid: false, message: 'Valor deve ser menor que R$ 1.000.000,00' };
      }
    }

    if (!isUpdate || data.tipo !== undefined) {
      if (!data.tipo || !['receita', 'despesa'].includes(data.tipo)) {
        return { isValid: false, message: 'Tipo deve ser "receita" ou "despesa"' };
      }
    }

    if (!isUpdate || data.categoriaId !== undefined) {
      if (!isNotEmpty(data.categoriaId)) {
        return { isValid: false, message: 'Categoria é obrigatória' };
      }
    }

    if (!isUpdate || data.data !== undefined) {
      if (!isValidDate(data.data)) {
        return { isValid: false, message: 'Data inválida' };
      }

      const transactionDate = new Date(data.data);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Final do dia

      if (transactionDate > today) {
        return { isValid: false, message: 'Data não pode ser futura' };
      }

      // Verificar se não é muito antiga (ex: 10 anos)
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

      if (transactionDate < tenYearsAgo) {
        return { isValid: false, message: 'Data não pode ser anterior a 10 anos' };
      }
    }

    return { isValid: true, message: 'Dados válidos' };
  }

  // Verificar se categoria existe
  private async validateCategoryExists(userId: string, categoryId: string): Promise<boolean> {
    try {
      const categories = await this.categoryService.getCategoriesByUser(userId);
      return categories.some(cat => cat.id === categoryId);
    } catch (error) {
      return false;
    }
  }
}
