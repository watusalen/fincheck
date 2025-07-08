import {
  ref,
  push,
  get,
  set,
  remove
} from 'firebase/database';
import { database } from '../firebase/firebase-config';
import { Category } from '../model';

export class CategoryService {
  private static instance: CategoryService;

  private constructor() { }

  public static getInstance(): CategoryService {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService();
    }
    return CategoryService.instance;
  }

  // Criar nova categoria
  async createCategory(category: Omit<Category, 'id'>): Promise<string> {
    try {
      const categoriesRef = ref(database, `categories/${category.userId}`);
      const newCategoryRef = push(categoriesRef);

      const categoryData = {
        ...category,
        id: newCategoryRef.key!
      };

      await set(newCategoryRef, categoryData);
      return newCategoryRef.key!;
    } catch (error: any) {
      throw new Error(`Erro ao criar categoria: ${error.message}`);
    }
  }

  // Buscar todas as categorias do usuário
  async getCategoriesByUser(userId: string): Promise<Category[]> {
    try {
      const categoriesRef = ref(database, `categories/${userId}`);
      const snapshot = await get(categoriesRef);

      if (!snapshot.exists()) {
        return [];
      }

      const categoriesData = snapshot.val();
      return Object.values(categoriesData) as Category[];
    } catch (error: any) {
      throw new Error(`Erro ao buscar categorias: ${error.message}`);
    }
  }

  // Buscar categoria por ID
  async getCategoryById(userId: string, categoryId: string): Promise<Category | null> {
    try {
      const categoryRef = ref(database, `categories/${userId}/${categoryId}`);
      const snapshot = await get(categoryRef);

      if (!snapshot.exists()) {
        return null;
      }

      return snapshot.val() as Category;
    } catch (error: any) {
      throw new Error(`Erro ao buscar categoria: ${error.message}`);
    }
  }

  // Atualizar categoria
  async updateCategory(userId: string, categoryId: string, updates: Partial<Category>): Promise<void> {
    try {
      const categoryRef = ref(database, `categories/${userId}/${categoryId}`);
      await set(categoryRef, updates);
    } catch (error: any) {
      throw new Error(`Erro ao atualizar categoria: ${error.message}`);
    }
  }

  // Deletar categoria
  async deleteCategory(userId: string, categoryId: string): Promise<void> {
    try {
      const categoryRef = ref(database, `categories/${userId}/${categoryId}`);
      await remove(categoryRef);
    } catch (error: any) {
      throw new Error(`Erro ao deletar categoria: ${error.message}`);
    }
  }
}
