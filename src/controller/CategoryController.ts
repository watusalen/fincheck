import { CategoryService } from '../service/CategoryService';
import { TransactionService } from '../service/TransactionService';
import { Category } from '../model/Category';
import { isNotEmpty } from '../utils/validators';

export interface CreateCategoryData {
  nome: string;
  cor: string;
  descricao: string;
  limiteGasto?: number;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {
  id: string;
}

export class CategoryController {
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

  // Criar nova categoria
  async createCategory(userId: string, data: CreateCategoryData): Promise<{ success: boolean; message: string; categoryId?: string }> {
    try {
      // Validações
      const validation = this.validateCategoryData(data);
      if (!validation.isValid) {
        return { success: false, message: validation.message };
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

      return {
        success: true,
        message: 'Categoria criada com sucesso!',
        categoryId
      };

    } catch (error: any) {
      console.error('❌ Erro ao criar categoria:', error.message);
      return {
        success: false,
        message: 'Erro ao criar categoria. Tente novamente.'
      };
    }
  }

  // Buscar categorias do usuário
  async getUserCategories(userId: string): Promise<{ success: boolean; message: string; categories?: Category[] }> {
    try {
      const categories = await this.categoryService.getCategoriesByUser(userId);

      return {
        success: true,
        message: 'Categorias carregadas com sucesso!',
        categories
      };

    } catch (error: any) {
      console.error('❌ Erro ao carregar categorias:', error.message);
      return {
        success: false,
        message: 'Erro ao carregar categorias'
      };
    }
  }

  // Atualizar categoria
  async updateCategory(userId: string, data: UpdateCategoryData): Promise<{ success: boolean; message: string }> {
    try {
      // Validações básicas
      if (!data.id) {
        return { success: false, message: 'ID da categoria é obrigatório' };
      }

      // Validar dados se fornecidos
      if (data.nome !== undefined || data.cor !== undefined || data.descricao !== undefined) {
        const validation = this.validateCategoryData(data as CreateCategoryData, true);
        if (!validation.isValid) {
          return { success: false, message: validation.message };
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

      return {
        success: true,
        message: 'Categoria atualizada com sucesso!'
      };

    } catch (error: any) {
      console.error('❌ Erro ao atualizar categoria:', error.message);
      return {
        success: false,
        message: 'Erro ao atualizar categoria. Tente novamente.'
      };
    }
  }

  // Deletar categoria
  async deleteCategory(userId: string, categoryId: string): Promise<{ success: boolean; message: string }> {
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

      return {
        success: true,
        message: 'Categoria deletada com sucesso!'
      };

    } catch (error: any) {
      console.error('❌ Erro ao deletar categoria:', error.message);
      return {
        success: false,
        message: 'Erro ao deletar categoria. Tente novamente.'
      };
    }
  }

  // Obter categoria por ID
  async getCategoryById(userId: string, categoryId: string): Promise<{ success: boolean; message: string; category?: Category }> {
    try {
      if (!categoryId) {
        return { success: false, message: 'ID da categoria é obrigatório' };
      }

      const categories = await this.categoryService.getCategoriesByUser(userId);
      const category = categories.find(cat => cat.id === categoryId);

      if (!category) {
        return { success: false, message: 'Categoria não encontrada' };
      }

      return {
        success: true,
        message: 'Categoria encontrada!',
        category
      };

    } catch (error: any) {
      console.error('❌ Erro ao buscar categoria:', error.message);
      return {
        success: false,
        message: 'Erro ao buscar categoria'
      };
    }
  }

  // Obter estatísticas da categoria
  async getCategoryStats(userId: string, categoryId: string): Promise<{
    success: boolean;
    message: string;
    stats?: {
      transactionCount: number;
      totalAmount: number;
      lastTransaction?: string;
    }
  }> {
    try {
      const transactions = await this.transactionService.getTransactionsByUser(userId);
      const categoryTransactions = transactions.filter(t => t.categoriaId === categoryId);

      const totalAmount = categoryTransactions.reduce((sum, t) => {
        return t.tipo === 'receita' ? sum + t.valor : sum - t.valor;
      }, 0);

      const lastTransaction = categoryTransactions.length > 0
        ? categoryTransactions.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0].data
        : undefined;

      return {
        success: true,
        message: 'Estatísticas calculadas!',
        stats: {
          transactionCount: categoryTransactions.length,
          totalAmount,
          lastTransaction
        }
      };

    } catch (error: any) {
      console.error('❌ Erro ao calcular estatísticas:', error.message);
      return {
        success: false,
        message: 'Erro ao calcular estatísticas da categoria'
      };
    }
  }

  // Validar dados da categoria
  private validateCategoryData(data: CreateCategoryData, isUpdate: boolean = false): { isValid: boolean; message: string } {
    if (!isUpdate || data.nome !== undefined) {
      if (!isNotEmpty(data.nome)) {
        return { isValid: false, message: 'Nome da categoria é obrigatório' };
      }
      if (data.nome.length < 2) {
        return { isValid: false, message: 'Nome deve ter pelo menos 2 caracteres' };
      }
      if (data.nome.length > 30) {
        return { isValid: false, message: 'Nome deve ter no máximo 30 caracteres' };
      }
    }

    if (!isUpdate || data.cor !== undefined) {
      if (!isNotEmpty(data.cor)) {
        return { isValid: false, message: 'Cor da categoria é obrigatória' };
      }
      // Validar formato de cor hex
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexColorRegex.test(data.cor)) {
        return { isValid: false, message: 'Cor deve estar no formato hexadecimal (#RRGGBB)' };
      }
    }

    if (!isUpdate || data.descricao !== undefined) {
      if (!isNotEmpty(data.descricao)) {
        return { isValid: false, message: 'Descrição da categoria é obrigatória' };
      }
      if (data.descricao.length < 3) {
        return { isValid: false, message: 'Descrição deve ter pelo menos 3 caracteres' };
      }
      if (data.descricao.length > 100) {
        return { isValid: false, message: 'Descrição deve ter no máximo 100 caracteres' };
      }
    }

    if (!isUpdate || data.limiteGasto !== undefined) {
      if (data.limiteGasto !== undefined && data.limiteGasto < 0) {
        return { isValid: false, message: 'Limite de gasto não pode ser negativo' };
      }
      if (data.limiteGasto !== undefined && data.limiteGasto > 1000000) {
        return { isValid: false, message: 'Limite de gasto deve ser menor que R$ 1.000.000,00' };
      }
    }

    return { isValid: true, message: 'Dados válidos' };
  }

  // Verificar se nome da categoria já existe
  private async checkCategoryNameExists(userId: string, nome: string, excludeId?: string): Promise<boolean> {
    try {
      const categories = await this.categoryService.getCategoriesByUser(userId);
      return categories.some(cat =>
        cat.nome.toLowerCase() === nome.toLowerCase() &&
        cat.id !== excludeId
      );
    } catch (error) {
      return false;
    }
  }

  // Verificar se categoria tem transações
  private async checkCategoryHasTransactions(userId: string, categoryId: string): Promise<boolean> {
    try {
      const transactions = await this.transactionService.getTransactionsByUser(userId);
      return transactions.some(t => t.categoriaId === categoryId);
    } catch (error) {
      return false;
    }
  }

  // Criar categorias padrão para novos usuários
  async createDefaultCategories(userId: string): Promise<{ success: boolean; message: string }> {
    try {
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

      // Verificar se já existem categorias
      const existingCategories = await this.categoryService.getCategoriesByUser(userId);
      if (existingCategories.length > 0) {
        return { success: true, message: 'Usuário já possui categorias' };
      }

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
          console.error(`❌ Erro ao criar categoria ${category.nome}:`, error);
        }
      }

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
      console.error('❌ Erro ao criar categorias padrão:', error.message);
      return {
        success: false,
        message: 'Erro ao criar categorias padrão. Tente novamente.'
      };
    }
  }
}
