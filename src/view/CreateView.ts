import { TransactionView } from './TransactionView';
import { TransactionController } from '../controller/TransactionController';
import { AuthController } from '../controller/AuthController';
import { Transaction } from '../model/Transaction';

export class CreateView {
  private transactionView: TransactionView;
  private transactionController: TransactionController;
  private authController: AuthController;

  constructor() {
    this.transactionView = new TransactionView();
    this.transactionController = TransactionController.getInstance();
    this.authController = AuthController.getInstance();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Botão do card de transação
    const transactionCard = document.querySelector('#register-transaction-card .card-action-btn');

    // Event listener para abrir modal de transação
    transactionCard?.addEventListener('click', () => {
      console.log('🔄 Abrindo modal de nova transação');
      this.transactionView.show();
    });

    // Escutar evento de criação para atualizar estatísticas
    window.addEventListener('transactionCreated', () => {
      this.updateStats();
    });

    // Escutar evento personalizado para ativar a página
    window.addEventListener('createPageActivated', () => {
      this.updateStats();
    });
  }

  private async updateStats(): Promise<void> {
    try {
      // Buscar usuário atual
      const currentUser = this.authController.getCurrentUser();
      if (!currentUser) return;

      // Buscar estatísticas atualizadas
      const transactionsResult = await this.transactionController.getUserTransactions(currentUser.uid);

      // Contar transações do mês atual
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      let monthlyTransactions = 0;
      if (transactionsResult.success && transactionsResult.transactions) {
        monthlyTransactions = transactionsResult.transactions.filter((transaction: Transaction) => {
          const transactionDate = new Date(transaction.data);
          return transactionDate.getMonth() === currentMonth &&
            transactionDate.getFullYear() === currentYear;
        }).length;
      }

      // Atualizar elemento na interface
      const totalTransactionsEl = document.querySelector('#total-transactions');
      if (totalTransactionsEl) totalTransactionsEl.textContent = monthlyTransactions.toString();

    } catch (error) {
      console.error('❌ Erro ao atualizar estatísticas:', error);
    }
  }

  // Método chamado quando a página de cadastro é ativada
  activate(): void {
    this.updateStats();
  }
}
