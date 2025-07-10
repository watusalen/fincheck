import { CategoryService } from '../service/CategoryService';
import { TransactionService } from '../service/TransactionService';
import { Category } from '../model/Category';
import { isNotEmpty } from '../utils/validators';

// Interfaces para dados de entrada
export interface CreateCategoryData {
  nome: string;
  cor: string;
  descricao: string;
  limiteGasto?: number;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {
  id: string;
}

// Interfaces para responses consistentes
export interface CategoryResponse {
  success: boolean;
  message: string;
  category?: Category;
  categoryId?: string;
}

export interface CategoriesResponse {
  success: boolean;
  message: string;
  categories?: Category[];
}

export interface CategoryStatsResponse {
  success: boolean;
  message: string;
  stats?: CategoryStats;
}

export interface BaseResponse {
  success: boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// Interface para estatísticas da categoria
export interface CategoryStats {
  transactionCount: number;
  totalAmount: number;
  lastTransaction?: string;
}

// Enum para níveis de log
enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export class CategoryController {
  // Constantes de configuração
  private static readonly MIN_NAME_LENGTH = 2;
  private static readonly MAX_NAME_LENGTH = 30;
  private static readonly MIN_DESCRIPTION_LENGTH = 3;
  private static readonly MAX_DESCRIPTION_LENGTH = 100;
  private static readonly MAX_SPENDING_LIMIT = 1000000;
  
  private static instance: CategoryController;
  private categoryService: CategoryService;
  private transactionService: TransactionService;

  private constructor() {
    this.categoryService = CategoryService.getInstance();
    this.transactionService = TransactionService.getInstance();
  }

  public static getInstance(): CategoryController {
    if (!CategoryController.instance) {
      CategoryController.instance = new CategoryController();
    }
    return CategoryController.instance;
  }

  /**
   * Sistema de logging estruturado
   * @param level - Nível do log
   * @param message - Mensagem do log
   * @param data - Dados adicionais (opcional)
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const logMessage = `[CategoryController] ${message}`;
    
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
   * Valida os dados de criação de categoria
   * @param data - Dados da categoria
   * @param isUpdate - Se é uma operação de atualização
   * @returns Resultado da validação
   */
  private validateCategoryData(data: CreateCategoryData, isUpdate: boolean = false): ValidationResult {
    // Validação de nome
    if (!isUpdate || data.nome !== undefined) {
      if (!isNotEmpty(data.nome)) {
        return { isValid: false, message: 'Nome da categoria é obrigatório' };
      }
      if (data.nome.length < CategoryController.MIN_NAME_LENGTH) {
        return { 
          isValid: false, 
          message: `Nome deve ter pelo menos ${CategoryController.MIN_NAME_LENGTH} caracteres` 
        };
      }
      if (data.nome.length > CategoryController.MAX_NAME_LENGTH) {
        return { 
          isValid: false, 
          message: `Nome deve ter no máximo ${CategoryController.MAX_NAME_LENGTH} caracteres` 
        };
      }
    }

    // Validação de cor
    if (!isUpdate || data.cor !== undefined) {
      if (!isNotEmpty(data.cor)) {
        return { isValid: false, message: 'Cor da categoria é obrigatória' };
      }
      
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexColorRegex.test(data.cor)) {
        return { isValid: false, message: 'Cor deve estar no formato hexadecimal (#RRGGBB)' };
      }
    }

    // Validação de descrição
    if (!isUpdate || data.descricao !== undefined) {
      if (!isNotEmpty(data.descricao)) {
        return { isValid: false, message: 'Descrição da categoria é obrigatória' };
      }
      if (data.descricao.length < CategoryController.MIN_DESCRIPTION_LENGTH) {
        return { 
          isValid: false, 
          message: `Descrição deve ter pelo menos ${CategoryController.MIN_DESCRIPTION_LENGTH} caracteres` 
        };
      }
      if (data.descricao.length > CategoryController.MAX_DESCRIPTION_LENGTH) {
        return { 
          isValid: false, 
          message: `Descrição deve ter no máximo ${CategoryController.MAX_DESCRIPTION_LENGTH} caracteres` 
        };
      }
    }

    // Validação de limite de gasto
    if (!isUpdate || data.limiteGasto !== undefined) {
      if (data.limiteGasto !== undefined && data.limiteGasto < 0) {
        return { isValid: false, message: 'Limite de gasto não pode ser negativo' };
      }
      if (data.limiteGasto !== undefined && data.limiteGasto > CategoryController.MAX_SPENDING_LIMIT) {
        return { 
          isValid: false, 
          message: `Limite de gasto deve ser menor que R$ ${CategoryController.MAX_SPENDING_LIMIT.toLocaleString('pt-BR')},00` 
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Verificar se nome da categoria já existe para o usuário
   * @param userId - ID do usuário
   * @param nome - Nome da categoria
   * @param excludeId - ID da categoria a ser excluída da verificação (para updates)
   * @returns True se nome já existir
   */
  private async checkCategoryNameExists(userId: string, nome: string, excludeId?: string): Promise<boolean> {
    try {
      const categories = await this.categoryService.getCategoriesByUser(userId);
      return categories.some(cat =>
        cat.nome.toLowerCase() === nome.toLowerCase() &&
        cat.id !== excludeId
      );
    } catch (error) {
      this.log(LogLevel.ERROR, 'Erro ao verificar nome da categoria', { userId, nome, error });
      return false;
    }
  }

  /**
   * Verificar se categoria tem transações associadas
   * @param userId - ID do usuário
   * @param categoryId - ID da categoria
   * @returns True se categoria tiver transações
   */
  private async checkCategoryHasTransactions(userId: string, categoryId: string): Promise<boolean> {
    try {
      const transactions = await this.transactionService.getTransactionsByUser(userId);
      return transactions.some(t => t.categoriaId === categoryId);
    } catch (error) {
      this.log(LogLevel.ERROR, 'Erro ao verificar transações da categoria', { userId, categoryId, error });
      return false;
    }
  }

  /**
   * Cria uma nova categoria
   * @param userId - ID do usuário
   * @param data - Dados da categoria
   * @returns Promise com resultado da criação
   */
  async createCategory(userId: string, data: CreateCategoryData): Promise<CategoryResponse> {
    try {
      // Validações de entrada
      const validation = this.validateCategoryData(data);
      if (!validation.isValid) {
        return { success: false, message: validation.message! };
      }

      // Verificar se categoria já existe
      const exists = await this.checkCategoryNameExists(userId, data.nome);
      if (exists) {
        return { success: false, message: 'Já existe uma categoria com este nome' };
      }

      // Criar categoria
      const categoryId = await this.categoryService.createCategory({
        userId,
        ...data
      });

      this.log(LogLevel.INFO, 'Categoria criada com sucesso', { 
        userId, 
        categoryId, 
        nome: data.nome 
      });

      return {
        success: true,
        message: 'Categoria criada com sucesso!',
        categoryId
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao criar categoria', { userId, error: error.message });

      return {
        success: false,
        message: 'Erro ao criar categoria. Tente novamente.'
      };
    }
  }

  /**
   * Busca categorias do usuário
   * @param userId - ID do usuário
   * @returns Promise com lista de categorias
   */
  async getUserCategories(userId: string): Promise<CategoriesResponse> {
    try {
      const categories = await this.categoryService.getCategoriesByUser(userId);

      this.log(LogLevel.INFO, 'Categorias carregadas com sucesso', { 
        userId, 
        count: categories.length 
      });

      return {
        success: true,
        message: 'Categorias carregadas com sucesso!',
        categories
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao carregar categorias', { userId, error: error.message });

      return {
        success: false,
        message: 'Erro ao carregar categorias'
      };
    }
  }

  /**
   * Atualiza uma categoria existente
   * @param userId - ID do usuário
   * @param data - Dados da categoria para atualizar
   * @returns Promise com resultado da atualização
   */
  async updateCategory(userId: string, data: UpdateCategoryData): Promise<BaseResponse> {
    try {
      // Validação básica
      if (!data.id) {
        return { success: false, message: 'ID da categoria é obrigatório' };
      }

      // Validar dados se fornecidos
      if (data.nome !== undefined || data.cor !== undefined || data.descricao !== undefined) {
        const validation = this.validateCategoryData(data as CreateCategoryData, true);
        if (!validation.isValid) {
          return { success: false, message: validation.message! };
        }
      }

      // Verificar se novo nome já existe (se fornecido)
      if (data.nome) {
        const exists = await this.checkCategoryNameExists(userId, data.nome, data.id);
        if (exists) {
          return { success: false, message: 'Já existe uma categoria com este nome' };
        }
      }

      // Atualizar categoria
      await this.categoryService.updateCategory(userId, data.id, data);

      this.log(LogLevel.INFO, 'Categoria atualizada com sucesso', { 
        userId, 
        categoryId: data.id 
      });

      return {
        success: true,
        message: 'Categoria atualizada com sucesso!'
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao atualizar categoria', { 
        userId, 
        categoryId: data.id, 
        error: error.message 
      });

      return {
        success: false,
        message: 'Erro ao atualizar categoria. Tente novamente.'
      };
    }
  }

  /**
   * Remove uma categoria
   * @param userId - ID do usuário
   * @param categoryId - ID da categoria
   * @returns Promise com resultado da remoção
   */
  async deleteCategory(userId: string, categoryId: string): Promise<BaseResponse> {
    try {
      if (!categoryId) {
        return { success: false, message: 'ID da categoria é obrigatório' };
      }

      // Verificar se categoria tem transações associadas
      const hasTransactions = await this.checkCategoryHasTransactions(userId, categoryId);
      if (hasTransactions) {
        return {
          success: false,
          message: 'Não é possível deletar categoria com transações associadas. Delete as transações primeiro.'
        };
      }

      await this.categoryService.deleteCategory(userId, categoryId);

      this.log(LogLevel.INFO, 'Categoria deletada com sucesso', { 
        userId, 
        categoryId 
      });

      return {
        success: true,
        message: 'Categoria deletada com sucesso!'
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao deletar categoria', { 
        userId, 
        categoryId, 
        error: error.message 
      });

      return {
        success: false,
        message: 'Erro ao deletar categoria. Tente novamente.'
      };
    }
  }

  /**
   * Busca uma categoria por ID
   * @param userId - ID do usuário
   * @param categoryId - ID da categoria
   * @returns Promise com categoria encontrada
   */
  async getCategoryById(userId: string, categoryId: string): Promise<CategoryResponse> {
    try {
      if (!categoryId) {
        return { success: false, message: 'ID da categoria é obrigatório' };
      }

      const categories = await this.categoryService.getCategoriesByUser(userId);
      const category = categories.find(cat => cat.id === categoryId);

      if (!category) {
        return { success: false, message: 'Categoria não encontrada' };
      }

      this.log(LogLevel.INFO, 'Categoria encontrada', { 
        userId, 
        categoryId,
        nome: category.nome 
      });

      return {
        success: true,
        message: 'Categoria encontrada!',
        category
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao buscar categoria', { 
        userId, 
        categoryId, 
        error: error.message 
      });

      return {
        success: false,
        message: 'Erro ao buscar categoria'
      };
    }
  }

  /**
   * Calcula estatísticas de uma categoria
   * @param userId - ID do usuário
   * @param categoryId - ID da categoria
   * @returns Promise com estatísticas da categoria
   */
  async getCategoryStats(userId: string, categoryId: string): Promise<CategoryStatsResponse> {
    try {
      if (!categoryId) {
        return { success: false, message: 'ID da categoria é obrigatório' };
      }

      const transactions = await this.transactionService.getTransactionsByUser(userId);
      const categoryTransactions = transactions.filter(t => t.categoriaId === categoryId);

      const totalAmount = categoryTransactions.reduce((sum, t) => {
        return t.tipo === 'receita' ? sum + t.valor : sum - t.valor;
      }, 0);

      const lastTransaction = categoryTransactions.length > 0
        ? categoryTransactions.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0].data
        : undefined;

      const stats: CategoryStats = {
        transactionCount: categoryTransactions.length,
        totalAmount,
        lastTransaction
      };

      this.log(LogLevel.INFO, 'Estatísticas da categoria calculadas', { 
        userId, 
        categoryId,
        transactionCount: stats.transactionCount,
        totalAmount: stats.totalAmount
      });

      return {
        success: true,
        message: 'Estatísticas calculadas!',
        stats
      };

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao calcular estatísticas', { 
        userId, 
        categoryId, 
        error: error.message 
      });

      return {
        success: false,
        message: 'Erro ao calcular estatísticas da categoria'
      };
    }
  }

  /**
   * Cria categorias padrão para novos usuários
   * @param userId - ID do usuário
   * @returns Promise com resultado da criação das categorias padrão
   */
  async createDefaultCategories(userId: string): Promise<BaseResponse> {
    try {
      // Verificar se já existem categorias
      const existingCategories = await this.categoryService.getCategoriesByUser(userId);
      if (existingCategories.length > 0) {
        this.log(LogLevel.INFO, 'Usuário já possui categorias', { userId, count: existingCategories.length });
        return { success: true, message: 'Usuário já possui categorias' };
      }

      const defaultCategories = [
        // Receitas
        { nome: 'Salário', cor: '#22c55e', descricao: 'Salário e rendimentos do trabalho' },
        { nome: 'Freelance', cor: '#3b82f6', descricao: 'Trabalhos freelance e projetos extras' },
        { nome: 'Investimentos', cor: '#10b981', descricao: 'Rendimentos de investimentos' },
        { nome: 'Vendas', cor: '#06b6d4', descricao: 'Vendas de produtos ou serviços' },
        { nome: 'Outros Rendimentos', cor: '#8b5cf6', descricao: 'Outras fontes de renda' },

        // Despesas
        { nome: 'Alimentação', cor: '#f59e0b', descricao: 'Supermercado, restaurantes e delivery' },
        { nome: 'Transporte', cor: '#ef4444', descricao: 'Gasolina, transporte público e Uber' },
        { nome: 'Moradia', cor: '#6b7280', descricao: 'Aluguel, financiamento e contas da casa' },
        { nome: 'Saúde', cor: '#ec4899', descricao: 'Medicamentos, consultas e planos de saúde' },
        { nome: 'Educação', cor: '#8b5cf6', descricao: 'Cursos, livros e material escolar' },
        { nome: 'Lazer', cor: '#f97316', descricao: 'Cinema, viagens e entretenimento' },
        { nome: 'Roupas', cor: '#84cc16', descricao: 'Vestuário e acessórios' },
        { nome: 'Tecnologia', cor: '#0ea5e9', descricao: 'Eletrônicos, apps e serviços digitais' },
        { nome: 'Outros Gastos', cor: '#64748b', descricao: 'Despesas diversas' }
      ];

      // Criar categorias padrão
      let createdCount = 0;
      for (const category of defaultCategories) {
        try {
          await this.categoryService.createCategory({
            userId,
            ...category
          });
          createdCount++;
        } catch (error) {
          this.log(LogLevel.WARN, `Erro ao criar categoria padrão: ${category.nome}`, error);
        }
      }

      this.log(LogLevel.INFO, 'Categorias padrão criadas', { 
        userId, 
        createdCount, 
        totalAttempts: defaultCategories.length 
      });

      if (createdCount > 0) {
        return {
          success: true,
          message: `${createdCount} categorias padrão criadas com sucesso!`
        };
      } else {
        return {
          success: false,
          message: 'Erro ao criar categorias padrão'
        };
      }

    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Erro ao criar categorias padrão', { userId, error: error.message });

      return {
        success: false,
        message: 'Erro ao criar categorias padrão. Tente novamente.'
      };
    }
  }
}
