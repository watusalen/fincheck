import {
  ref,
  push,
  get,
  set,
  remove,
  query,
  orderByChild,
  equalTo
} from 'firebase/database';
import { database } from '../firebase/firebase-config';
import { Transaction } from '../model';

export class TransactionService {
  private static instance: TransactionService;

  private constructor() { }

  public static getInstance(): TransactionService {
    if (!TransactionService.instance) {
      TransactionService.instance = new TransactionService();
    }
    return TransactionService.instance;
  }

  // Criar nova transação
  async createTransaction(transaction: Omit<Transaction, 'id'>): Promise<string> {
    try {
      const transactionsRef = ref(database, `transactions/${transaction.userId}`);
      const newTransactionRef = push(transactionsRef);

      const transactionData = {
        ...transaction,
        id: newTransactionRef.key!
      };

      await set(newTransactionRef, transactionData);
      return newTransactionRef.key!;
    } catch (error: any) {
      throw new Error(`Erro ao criar transação: ${error.message}`);
    }
  }

  // Buscar todas as transações do usuário
  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    try {
      const transactionsRef = ref(database, `transactions/${userId}`);
      const snapshot = await get(transactionsRef);

      if (!snapshot.exists()) {
        return [];
      }

      const transactionsData = snapshot.val();
      return Object.values(transactionsData) as Transaction[];
    } catch (error: any) {
      throw new Error(`Erro ao buscar transações: ${error.message}`);
    }
  }

  // Buscar transações por categoria
  async getTransactionsByCategory(userId: string, categoriaId: string): Promise<Transaction[]> {
    try {
      const transactionsRef = ref(database, `transactions/${userId}`);
      const categoryQuery = query(transactionsRef, orderByChild('categoriaId'), equalTo(categoriaId));
      const snapshot = await get(categoryQuery);

      if (!snapshot.exists()) {
        return [];
      }

      const transactionsData = snapshot.val();
      return Object.values(transactionsData) as Transaction[];
    } catch (error: any) {
      throw new Error(`Erro ao buscar transações por categoria: ${error.message}`);
    }
  }

  // Buscar transações por tipo (receita/despesa)
  async getTransactionsByType(userId: string, tipo: 'receita' | 'despesa'): Promise<Transaction[]> {
    try {
      const transactionsRef = ref(database, `transactions/${userId}`);
      const typeQuery = query(transactionsRef, orderByChild('tipo'), equalTo(tipo));
      const snapshot = await get(typeQuery);

      if (!snapshot.exists()) {
        return [];
      }

      const transactionsData = snapshot.val();
      return Object.values(transactionsData) as Transaction[];
    } catch (error: any) {
      throw new Error(`Erro ao buscar transações por tipo: ${error.message}`);
    }
  }

  // Atualizar transação
  async updateTransaction(userId: string, transactionId: string, updates: Partial<Transaction>): Promise<void> {
    try {
      const transactionRef = ref(database, `transactions/${userId}/${transactionId}`);
      await set(transactionRef, updates);
    } catch (error: any) {
      throw new Error(`Erro ao atualizar transação: ${error.message}`);
    }
  }

  // Deletar transação
  async deleteTransaction(userId: string, transactionId: string): Promise<void> {
    try {
      const transactionRef = ref(database, `transactions/${userId}/${transactionId}`);
      await remove(transactionRef);
    } catch (error: any) {
      throw new Error(`Erro ao deletar transação: ${error.message}`);
    }
  }

  // Calcular saldo total do usuário
  async calculateBalance(userId: string): Promise<{ receitas: number; despesas: number; saldo: number }> {
    try {
      const transactions = await this.getTransactionsByUser(userId);

      let receitas = 0;
      let despesas = 0;

      transactions.forEach(transaction => {
        if (transaction.tipo === 'receita') {
          receitas += transaction.valor;
        } else {
          despesas += transaction.valor;
        }
      });

      const saldo = receitas - despesas;

      return { receitas, despesas, saldo };
    } catch (error: any) {
      throw new Error(`Erro ao calcular saldo: ${error.message}`);
    }
  }
}
