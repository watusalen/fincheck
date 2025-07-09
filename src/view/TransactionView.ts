import { Transaction, Category } from '../model';
import { TransactionController } from '../controller/TransactionController';
import { CategoryController } from '../controller/CategoryController';
import { AuthController } from '../controller/AuthController';
import { formatCurrency, formatDate } from '../utils/validators';

export class TransactionView {
  private transactionController: TransactionController;
  private categoryController: CategoryController;
  private authController: AuthController;
  private container: HTMLElement | null = null;
  private categories: Category[] = [];

  constructor() {
    this.transactionController = TransactionController.getInstance();
    this.categoryController = CategoryController.getInstance();
    this.authController = AuthController.getInstance();
    this.createView();
  }

  private createView(): void {
    // Remover qualquer instância existente
    const existingView = document.querySelector('#transaction-view');
    if (existingView) {
      existingView.remove();
    }

    this.container = document.createElement('div');
    this.container.id = 'transaction-view';
    this.container.className = 'modal';
    this.container.style.display = 'none';

    this.container.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">💰 Gerenciar Transações</h2>
          <button id="close-transaction-modal" class="modal-close">✕</button>
        </div>
        
        <div class="modal-body">
          <!-- Formulário de Nova Transação -->
          <div class="transaction-form-section">
            <h3>➕ Nova Transação</h3>
            <form id="trans-form">
              <div class="radio-group">
                <div class="radio-option">
                  <input type="radio" id="trans-tipo-receita" name="trans-tipo" value="receita" required>
                  <label for="trans-tipo-receita">📈 Receita</label>
                </div>
                <div class="radio-option">
                  <input type="radio" id="trans-tipo-despesa" name="trans-tipo" value="despesa" required>
                  <label for="trans-tipo-despesa">📉 Despesa</label>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="trans-valor">Valor (R$):</label>
                  <input type="number" id="trans-valor" step="0.01" min="0.01" required placeholder="0,00">
                </div>
                <div class="form-group">
                  <label for="trans-data">Data:</label>
                  <input type="date" id="trans-data" required>
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="trans-categoria">Categoria:</label>
                  <select id="trans-categoria" required>
                    <option value="">Selecione uma categoria</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="trans-forma-pagamento">Forma de Pagamento:</label>
                  <select id="trans-forma-pagamento" required>
                    <option value="">Selecione a forma</option>
                    <option value="dinheiro">💵 Dinheiro</option>
                    <option value="cartao-credito">💳 Cartão de Crédito</option>
                    <option value="cartao-debito">💳 Cartão de Débito</option>
                    <option value="pix">📱 PIX</option>
                    <option value="transferencia">🏦 Transferência</option>
                    <option value="outro">❓ Outro</option>
                  </select>
                </div>
              </div>
              
              <div class="form-group">
                <label for="trans-descricao">Descrição:</label>
                <input type="text" id="trans-descricao" required placeholder="Ex: Compras no supermercado">
              </div>
              
              <div class="modal-footer">
                <button type="submit" id="trans-submit">💾 Salvar Transação</button>
              </div>
            </form>
            <div id="trans-form-error" class="error-message"></div>
            <div id="trans-form-success" class="success-message"></div>
          </div>
          
          <!-- Lista de Transações -->
          <div class="transaction-list-section">
            <h3>📋 Transações Recentes</h3>
            <div id="transactions-list">
              <p>Carregando transações...</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this.setupEventListeners();
    this.setDefaultDate();
  }

  private setupEventListeners(): void {
    const form = this.container?.querySelector('#trans-form') as HTMLFormElement;
    const closeBtn = this.container?.querySelector('#close-transaction-modal') as HTMLButtonElement;

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleCreateTransaction();
    });

    closeBtn?.addEventListener('click', () => {
      this.hide();
    });

    // Fechar modal clicando fora
    this.container?.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.hide();
      }
    });
  }

  private setDefaultDate(): void {
    const dateInput = this.container?.querySelector('#trans-data') as HTMLInputElement;
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.value = today;
    }
  }

  private async loadCategories(): Promise<void> {
    try {
      const user = this.authController.getCurrentUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      console.log('🔄 Carregando categorias...');

      const result = await this.categoryController.getUserCategories(user.uid);

      if (result.success && result.categories) {
        this.categories = result.categories;

        const categorySelect = this.container?.querySelector('#trans-categoria') as HTMLSelectElement;
        if (categorySelect) {
          categorySelect.innerHTML = '<option value="">Selecionar categoria</option>';

          this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = `${category.nome}`;
            categorySelect.appendChild(option);
          });
        }

        console.log('✅ Categorias carregadas:', this.categories.length);
      } else {
        console.error('❌ Erro ao carregar categorias:', result.message);
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar categorias:', error.message);
    }
  }

  private async handleCreateTransaction(): Promise<void> {
    const user = this.authController.getCurrentUser();
    if (!user) {
      this.showError('Usuário não autenticado');
      return;
    }

    // Obter valores do formulário
    const tipoElement = this.container?.querySelector('input[name="trans-tipo"]:checked') as HTMLInputElement;
    const tipo = tipoElement?.value as 'receita' | 'despesa';
    const valor = parseFloat((this.container?.querySelector('#trans-valor') as HTMLInputElement)?.value);
    const data = (this.container?.querySelector('#trans-data') as HTMLInputElement)?.value;
    const categoriaId = (this.container?.querySelector('#trans-categoria') as HTMLSelectElement)?.value;
    const descricao = (this.container?.querySelector('#trans-descricao') as HTMLInputElement)?.value;
    const formaPagamento = (this.container?.querySelector('#trans-forma-pagamento') as HTMLSelectElement)?.value;

    try {
      console.log('🔄 Criando transação:', tipo, valor);

      const result = await this.transactionController.createTransaction(user.uid, {
        valor,
        data,
        categoriaId,
        descricao,
        tipo,
        formaPagamento,
        recorrente: false
      });

      if (result.success) {
        console.log('✅ Transação criada com sucesso!');
        this.showSuccess(result.message);
        this.clearForm();
        await this.loadTransactions();

        // Disparar evento para atualizar dashboard
        window.dispatchEvent(new CustomEvent('transactionCreated'));
      } else {
        this.showError(result.message);
      }

    } catch (error: any) {
      console.error('❌ Erro ao criar transação:', error.message);
      this.showError('Erro inesperado ao criar transação');
    }
  }

  private async loadTransactions(): Promise<void> {
    try {
      const user = this.authController.getCurrentUser();
      if (!user) return;

      console.log('🔄 Carregando transações...');

      const result = await this.transactionController.getUserTransactions(user.uid);

      const listContainer = this.container?.querySelector('#transactions-list') as HTMLElement;
      if (!listContainer) return;

      if (result.success && result.transactions) {
        const transactions = result.transactions;

        if (transactions.length === 0) {
          listContainer.innerHTML = '<p>Nenhuma transação encontrada.</p>';
          return;
        }

        // Ordenar por data (mais recente primeiro)
        transactions.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());

        listContainer.innerHTML = transactions.map((transaction: any) => {
          const category = this.categories.find(cat => cat.id === transaction.categoriaId);
          const tipoIcon = transaction.tipo === 'receita' ? '📈' : '📉';
          const valorClass = transaction.tipo === 'receita' ? 'receita' : 'despesa';

          return `
            <div class="transaction-item" data-id="${transaction.id}">
              <div class="transaction-info">
                <span class="transaction-type">${tipoIcon}</span>
                <div class="transaction-details">
                  <strong>${transaction.descricao}</strong>
                  <small>${category?.nome || 'Sem categoria'} • ${formatDate(transaction.data)}</small>
                </div>
              </div>
              <div class="transaction-value ${valorClass}">
                ${formatCurrency(transaction.valor)}
              </div>
              <div class="transaction-actions">
                <button onclick="this.closest('.transaction-item').remove()" class="delete-btn">🗑️</button>
              </div>
            </div>
          `;
        }).join('');

        console.log('✅ Transações carregadas:', transactions.length);
      } else {
        listContainer.innerHTML = '<p>Erro ao carregar transações.</p>';
        console.error('❌ Erro ao carregar transações:', result.message);
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar transações:', error.message);
    }
  }

  private clearForm(): void {
    const form = this.container?.querySelector('#transaction-form') as HTMLFormElement;
    form?.reset();
    this.setDefaultDate();
  }

  private showError(message: string): void {
    const errorDiv = this.container?.querySelector('#trans-form-error') as HTMLElement;
    const successDiv = this.container?.querySelector('#transaction-form-success') as HTMLElement;

    if (errorDiv) errorDiv.textContent = message;
    if (successDiv) successDiv.textContent = '';
  }

  private showSuccess(message: string): void {
    const errorDiv = this.container?.querySelector('#trans-form-error') as HTMLElement;
    const successDiv = this.container?.querySelector('#trans-form-success') as HTMLElement;

    if (errorDiv) errorDiv.textContent = '';
    if (successDiv) successDiv.textContent = message;
  }

  async show(): Promise<void> {
    if (this.container) {
      this.container.style.display = 'flex';
      await this.loadCategories();
      await this.loadTransactions();
    }
  }

  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
}
