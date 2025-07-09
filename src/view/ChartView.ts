import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { DashboardController } from '../controller/DashboardController';
import { AuthController } from '../controller/AuthController';
import { Transaction, Category } from '../model';
import { formatCurrency } from '../utils/validators';

// Registrar todos os componentes do Chart.js
Chart.register(...registerables);

export class ChartView {
  private dashboardController: DashboardController;
  private authController: AuthController;
  private container: HTMLElement | null = null;
  private pieChart: Chart | null = null;
  private barChart: Chart | null = null;
  private lineChart: Chart | null = null;

  constructor() {
    this.dashboardController = DashboardController.getInstance();
    this.authController = AuthController.getInstance();
    this.createView();
  }

  private createView(): void {
    // Remover qualquer instância existente
    const existingView = document.querySelector('#chart-view');
    if (existingView) {
      existingView.remove();
    }

    this.container = document.createElement('div');
    this.container.id = 'chart-view';
    this.container.className = 'modal-overlay';
    this.container.style.display = 'none';

    this.container.innerHTML = `
      <div class="modal-content chart-modal">
        <div class="modal-header">
          <h2>📊 Análise Financeira</h2>
          <button id="close-chart-modal" class="close-btn">✕</button>
        </div>
        
        <div class="chart-content">
          <!-- Filtros -->
          <div class="chart-filters">
            <div class="filter-group">
              <label for="chart-period">Período:</label>
              <select id="chart-period">
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 3 meses</option>
                <option value="180">Últimos 6 meses</option>
                <option value="365">Último ano</option>
                <option value="all">Todo período</option>
              </select>
            </div>
            <div class="filter-group">
              <label for="chart-type-filter">Tipo:</label>
              <select id="chart-type-filter">
                <option value="both">Receitas e Despesas</option>
                <option value="income">Apenas Receitas</option>
                <option value="expense">Apenas Despesas</option>
              </select>
            </div>
            <button id="update-charts">🔄 Atualizar</button>
          </div>

          <!-- Resumo Estatístico -->
          <div class="stats-summary">
            <div class="stat-card">
              <h4>💰 Total de Receitas</h4>
              <span id="total-income">R$ 0,00</span>
            </div>
            <div class="stat-card">
              <h4>💸 Total de Despesas</h4>
              <span id="total-expenses">R$ 0,00</span>
            </div>
            <div class="stat-card">
              <h4>📊 Saldo Líquido</h4>
              <span id="net-balance">R$ 0,00</span>
            </div>
            <div class="stat-card">
              <h4>📈 Maior Categoria</h4>
              <span id="top-category">-</span>
            </div>
          </div>

          <!-- Gráficos -->
          <div class="charts-container">
            <div class="chart-section">
              <h3>🥧 Gastos por Categoria</h3>
              <div class="chart-wrapper">
                <canvas id="pieChart" width="400" height="300"></canvas>
              </div>
              <div id="pie-chart-legend" class="chart-legend"></div>
            </div>
            
            <div class="chart-section">
              <h3>📊 Receitas vs Despesas (Mensal)</h3>
              <div class="chart-wrapper">
                <canvas id="barChart" width="400" height="300"></canvas>
              </div>
            </div>
            
            <div class="chart-section chart-section-wide">
              <h3>📈 Evolução do Saldo</h3>
              <div class="chart-wrapper">
                <canvas id="lineChart" width="800" height="400"></canvas>
              </div>
            </div>
          </div>

          <!-- Detalhes por Categoria -->
          <div class="category-details">
            <h3>📋 Detalhes por Categoria</h3>
            <div id="category-breakdown">
              <p>Carregando dados...</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const closeBtn = this.container?.querySelector('#close-chart-modal') as HTMLButtonElement;
    const updateBtn = this.container?.querySelector('#update-charts') as HTMLButtonElement;

    closeBtn?.addEventListener('click', () => {
      this.hide();
    });

    updateBtn?.addEventListener('click', async () => {
      await this.updateCharts();
    });

    // Fechar modal clicando fora
    this.container?.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.hide();
      }
    });
  }

  private async loadData(): Promise<{ transactions: Transaction[], categories: Category[] }> {
    const user = this.authController.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Usar o dashboardController para obter dados completos
    const result = await this.dashboardController.loadDashboardData();

    if (result.success && result.data) {
      return {
        transactions: result.data.recentTransactions || [],
        categories: result.data.categories || []
      };
    } else {
      throw new Error('Erro ao carregar dados');
    }
  }

  private filterTransactionsByPeriod(transactions: Transaction[], days: number): Transaction[] {
    if (days === -1) return transactions; // "all" period

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return transactions.filter(transaction =>
      new Date(transaction.data) >= cutoffDate
    );
  }

  private filterTransactionsByType(transactions: Transaction[], type: string): Transaction[] {
    if (type === 'both') return transactions;
    if (type === 'income') return transactions.filter(transaction => transaction.tipo === 'receita');
    if (type === 'expense') return transactions.filter(transaction => transaction.tipo === 'despesa');
    return transactions;
  }

  private async updateCharts(): Promise<void> {
    try {
      const { transactions, categories } = await this.loadData();

      // Obter filtros
      const periodSelect = this.container?.querySelector('#chart-period') as HTMLSelectElement;
      const typeSelect = this.container?.querySelector('#chart-type-filter') as HTMLSelectElement;

      const period = parseInt(periodSelect.value);
      const type = typeSelect.value;

      // Filtrar transações
      let filteredTransactions = this.filterTransactionsByPeriod(
        transactions,
        period === -1 ? -1 : period
      );
      filteredTransactions = this.filterTransactionsByType(filteredTransactions, type);

      // Atualizar estatísticas
      this.updateStatistics(filteredTransactions, categories);

      // Atualizar gráficos
      await this.updatePieChart(filteredTransactions, categories);
      await this.updateBarChart(filteredTransactions);
      await this.updateLineChart(transactions); // Usar todas as transações para evolução

      // Atualizar detalhes por categoria
      this.updateCategoryBreakdown(filteredTransactions, categories);

    } catch (error: any) {
      console.error('❌ Erro ao atualizar gráficos:', error.message);
    }
  }

  private updateStatistics(transactions: Transaction[], categories: Category[]): void {
    const totalIncome = transactions
      .filter(t => t.tipo === 'receita')
      .reduce((sum, t) => sum + t.valor, 0);

    const totalExpenses = transactions
      .filter(t => t.tipo === 'despesa')
      .reduce((sum, t) => sum + t.valor, 0);

    const netBalance = totalIncome - totalExpenses;

    // Encontrar categoria com maior gasto
    const categoryTotals = new Map<string, number>();
    transactions
      .filter(t => t.tipo === 'despesa')
      .forEach(transaction => {
        const current = categoryTotals.get(transaction.categoriaId) || 0;
        categoryTotals.set(transaction.categoriaId, current + transaction.valor);
      });

    let topCategory = '-';
    let maxAmount = 0;
    for (const [categoryId, amount] of categoryTotals) {
      if (amount > maxAmount) {
        maxAmount = amount;
        const category = categories.find(c => c.id === categoryId);
        topCategory = category ? `${category.nome} (${formatCurrency(amount)})` : '-';
      }
    }

    // Atualizar elementos
    const totalIncomeEl = this.container?.querySelector('#total-income') as HTMLElement;
    const totalExpensesEl = this.container?.querySelector('#total-expenses') as HTMLElement;
    const netBalanceEl = this.container?.querySelector('#net-balance') as HTMLElement;
    const topCategoryEl = this.container?.querySelector('#top-category') as HTMLElement;

    if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(totalIncome);
    if (totalExpensesEl) totalExpensesEl.textContent = formatCurrency(totalExpenses);
    if (netBalanceEl) {
      netBalanceEl.textContent = formatCurrency(netBalance);
      netBalanceEl.className = netBalance >= 0 ? 'positive' : 'negative';
    }
    if (topCategoryEl) topCategoryEl.textContent = topCategory;
  }

  private async updatePieChart(transactions: Transaction[], categories: Category[]): Promise<void> {
    const expenseTransactions = transactions.filter(t => t.tipo === 'despesa');

    if (expenseTransactions.length === 0) {
      if (this.pieChart) {
        this.pieChart.destroy();
        this.pieChart = null;
      }
      const canvas = this.container?.querySelector('#pieChart') as HTMLCanvasElement;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Nenhuma despesa encontrada', canvas.width / 2, canvas.height / 2);
      }
      return;
    }

    // Agrupar por categoria
    const categoryTotals = new Map<string, number>();
    expenseTransactions.forEach(transaction => {
      const current = categoryTotals.get(transaction.categoriaId) || 0;
      categoryTotals.set(transaction.categoriaId, current + transaction.valor);
    });

    // Preparar dados para o gráfico
    const labels: string[] = [];
    const data: number[] = [];
    const backgroundColor: string[] = [];

    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
    ];

    let colorIndex = 0;
    for (const [categoryId, amount] of categoryTotals) {
      const category = categories.find(c => c.id === categoryId);
      labels.push(category?.nome || 'Categoria Desconhecida');
      data.push(amount);
      backgroundColor.push(colors[colorIndex % colors.length]);
      colorIndex++;
    }

    // Destruir gráfico anterior se existir
    if (this.pieChart) {
      this.pieChart.destroy();
    }

    // Criar novo gráfico
    const canvas = this.container?.querySelector('#pieChart') as HTMLCanvasElement;
    const ctx = canvas?.getContext('2d');

    if (ctx) {
      const config: ChartConfiguration = {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor,
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false // Vamos criar nossa própria legenda
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = data.reduce((sum, val) => sum + val, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                }
              }
            }
          }
        }
      };

      this.pieChart = new Chart(ctx, config);

      // Criar legenda customizada
      this.createPieChartLegend(labels, data, backgroundColor);
    }
  }

  private createPieChartLegend(labels: string[], data: number[], colors: string[]): void {
    const legendContainer = this.container?.querySelector('#pie-chart-legend') as HTMLElement;
    if (!legendContainer) return;

    const total = data.reduce((sum, val) => sum + val, 0);

    legendContainer.innerHTML = labels.map((label, index) => {
      const value = data[index];
      const percentage = ((value / total) * 100).toFixed(1);
      const color = colors[index];

      return `
        <div class="legend-item">
          <span class="legend-color" style="background-color: ${color}"></span>
          <span class="legend-label">${label}</span>
          <span class="legend-value">${formatCurrency(value)} (${percentage}%)</span>
        </div>
      `;
    }).join('');
  }

  private async updateBarChart(transactions: Transaction[]): Promise<void> {
    // Agrupar transações por mês
    const monthlyData = new Map<string, { income: number, expense: number }>();

    transactions.forEach(transaction => {
      const date = new Date(transaction.data);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { income: 0, expense: 0 });
      }

      const monthData = monthlyData.get(monthKey)!;
      if (transaction.tipo === 'receita') {
        monthData.income += transaction.valor;
      } else {
        monthData.expense += transaction.valor;
      }
    });

    // Ordenar por data e preparar dados
    const sortedMonths = Array.from(monthlyData.keys()).sort();
    const labels = sortedMonths.map(month => {
      const [year, monthNum] = month.split('-');
      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
      return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    });

    const incomeData = sortedMonths.map(month => monthlyData.get(month)?.income || 0);
    const expenseData = sortedMonths.map(month => monthlyData.get(month)?.expense || 0);

    // Destruir gráfico anterior se existir
    if (this.barChart) {
      this.barChart.destroy();
    }

    // Criar novo gráfico
    const canvas = this.container?.querySelector('#barChart') as HTMLCanvasElement;
    const ctx = canvas?.getContext('2d');

    if (ctx) {
      const config: ChartConfiguration = {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Receitas',
              data: incomeData,
              backgroundColor: '#4CAF50',
              borderColor: '#388E3C',
              borderWidth: 1
            },
            {
              label: 'Despesas',
              data: expenseData,
              backgroundColor: '#F44336',
              borderColor: '#D32F2F',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => formatCurrency(Number(value))
              }
            }
          }
        }
      };

      this.barChart = new Chart(ctx, config);
    }
  }

  private async updateLineChart(transactions: Transaction[]): Promise<void> {
    // Ordenar transações por data
    const sortedTransactions = [...transactions].sort((a, b) =>
      new Date(a.data).getTime() - new Date(b.data).getTime()
    );

    if (sortedTransactions.length === 0) {
      if (this.lineChart) {
        this.lineChart.destroy();
        this.lineChart = null;
      }
      const canvas = this.container?.querySelector('#lineChart') as HTMLCanvasElement;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Nenhuma transação encontrada', canvas.width / 2, canvas.height / 2);
      }
      return;
    }

    // Calcular evolução do saldo dia a dia
    const dailyBalance = new Map<string, number>();
    let runningBalance = 0;

    // Obter a primeira data das transações
    const firstDate = new Date(sortedTransactions[0].data);
    const today = new Date();

    // Inicializar com saldo zero na primeira data
    const currentDate = new Date(firstDate);
    currentDate.setDate(currentDate.getDate() - 1); // Começar um dia antes

    // Processar cada transação e calcular saldo acumulado
    for (const transaction of sortedTransactions) {
      const transactionDate = new Date(transaction.data);
      const dateKey = transactionDate.toISOString().split('T')[0];

      // Preencher dias sem transações com o saldo anterior
      while (currentDate < transactionDate) {
        const dayKey = currentDate.toISOString().split('T')[0];
        if (!dailyBalance.has(dayKey)) {
          dailyBalance.set(dayKey, runningBalance);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Aplicar transação ao saldo
      if (transaction.tipo === 'receita') {
        runningBalance += transaction.valor;
      } else {
        runningBalance -= transaction.valor;
      }

      dailyBalance.set(dateKey, runningBalance);
    }

    // Preencher até hoje se necessário
    while (currentDate <= today) {
      const dayKey = currentDate.toISOString().split('T')[0];
      if (!dailyBalance.has(dayKey)) {
        dailyBalance.set(dayKey, runningBalance);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Preparar dados para o gráfico (mostrar apenas pontos-chave para melhor visualização)
    const sortedDates = Array.from(dailyBalance.keys()).sort();
    const labels: string[] = [];
    const data: number[] = [];

    // Mostrar dados com intervalos para não sobrecarregar o gráfico
    const totalDays = sortedDates.length;
    const maxPoints = 30; // Máximo de pontos no gráfico

    let step = Math.max(1, Math.floor(totalDays / maxPoints));

    for (let i = 0; i < sortedDates.length; i += step) {
      const dateKey = sortedDates[i];
      const balance = dailyBalance.get(dateKey) || 0;

      // Formatar data para exibição
      const date = new Date(dateKey);
      labels.push(date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: totalDays > 365 ? '2-digit' : undefined
      }));
      data.push(balance);
    }

    // Sempre incluir o último ponto
    if (step > 1 && sortedDates.length > 0) {
      const lastDateKey = sortedDates[sortedDates.length - 1];
      const lastBalance = dailyBalance.get(lastDateKey) || 0;
      const lastDate = new Date(lastDateKey);

      labels.push(lastDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: totalDays > 365 ? '2-digit' : undefined
      }));
      data.push(lastBalance);
    }

    // Destruir gráfico anterior se existir
    if (this.lineChart) {
      this.lineChart.destroy();
    }

    // Criar novo gráfico
    const canvas = this.container?.querySelector('#lineChart') as HTMLCanvasElement;
    const ctx = canvas?.getContext('2d');

    if (ctx) {
      // Determinar cor da linha baseada na tendência geral
      const firstValue = data[0] || 0;
      const lastValue = data[data.length - 1] || 0;
      const isPositiveTrend = lastValue >= firstValue;

      const lineColor = isPositiveTrend ? '#28a745' : '#dc3545';
      const fillColor = isPositiveTrend ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)';

      const config: ChartConfiguration = {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Saldo Acumulado',
            data,
            borderColor: lineColor,
            backgroundColor: fillColor,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: lineColor,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.parsed.y;
                  const trend = value >= 0 ? '📈' : '📉';
                  return `${trend} Saldo: ${formatCurrency(value)}`;
                }
              }
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: 'Período'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: 'Saldo (R$)'
              },
              ticks: {
                callback: (value) => formatCurrency(Number(value))
              },
              // Adicionar linha zero
              grid: {
                color: (context) => {
                  if (context.tick.value === 0) {
                    return '#dc3545';
                  }
                  return '#e9ecef';
                }
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          }
        }
      };

      this.lineChart = new Chart(ctx, config);
    }
  }

  private updateCategoryBreakdown(transactions: Transaction[], categories: Category[]): void {
    const container = this.container?.querySelector('#category-breakdown') as HTMLElement;
    if (!container) return;

    // Agrupar por categoria e tipo
    const categoryData = new Map<string, { income: number, expense: number, count: number }>();

    transactions.forEach(transaction => {
      if (!categoryData.has(transaction.categoriaId)) {
        categoryData.set(transaction.categoriaId, { income: 0, expense: 0, count: 0 });
      }

      const data = categoryData.get(transaction.categoriaId)!;
      data.count++;

      if (transaction.tipo === 'receita') {
        data.income += transaction.valor;
      } else {
        data.expense += transaction.valor;
      }
    });

    if (categoryData.size === 0) {
      container.innerHTML = '<p>Nenhuma transação encontrada para o período selecionado.</p>';
      return;
    }

    // Criar tabela de detalhes
    const breakdown = Array.from(categoryData.entries())
      .map(([categoryId, data]) => {
        const category = categories.find(c => c.id === categoryId);
        const total = data.income - data.expense;

        return {
          name: category?.nome || 'Categoria Desconhecida',
          income: data.income,
          expense: data.expense,
          total,
          count: data.count
        };
      })
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

    container.innerHTML = `
      <div class="breakdown-table">
        <div class="breakdown-header">
          <span>Categoria</span>
          <span>Receitas</span>
          <span>Despesas</span>
          <span>Saldo</span>
          <span>Transações</span>
        </div>
        ${breakdown.map(item => `
          <div class="breakdown-row">
            <span class="category-name">${item.name}</span>
            <span class="income-amount">${formatCurrency(item.income)}</span>
            <span class="expense-amount">${formatCurrency(item.expense)}</span>
            <span class="total-amount ${item.total >= 0 ? 'positive' : 'negative'}">${formatCurrency(item.total)}</span>
            <span class="transaction-count">${item.count}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  async show(): Promise<void> {
    if (this.container) {
      this.container.style.display = 'flex';
      await this.updateCharts();
    }
  }

  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  // Método para renderizar gráfico no dashboard principal
  renderDashboardChart(canvas: HTMLCanvasElement, transactions: Transaction[]): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Destruir gráfico existente se houver
    if ((canvas as any).chart) {
      ((canvas as any).chart as Chart).destroy();
    }

    // Preparar dados para gráfico de linha simples dos últimos 7 dias
    const last7Days = this.getLast7DaysData(transactions);

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: last7Days.map(d => d.label),
        datasets: [
          {
            label: 'Receitas',
            data: last7Days.map(d => d.income),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Despesas',
            data: last7Days.map(d => d.expense),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          },
          title: {
            display: true,
            text: 'Receitas vs Despesas (Últimos 7 dias)'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return formatCurrency(value as number);
              }
            }
          }
        }
      }
    });

    // Armazenar referência para destruição posterior
    (canvas as any).chart = chart;
  }

  private getLast7DaysData(transactions: Transaction[]): Array<{ label: string, income: number, expense: number }> {
    const result = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayTransactions = transactions.filter(t =>
        new Date(t.data).toISOString().split('T')[0] === dateStr
      );

      const income = dayTransactions
        .filter(t => t.tipo === 'receita')
        .reduce((sum, t) => sum + t.valor, 0);

      const expense = dayTransactions
        .filter(t => t.tipo === 'despesa')
        .reduce((sum, t) => sum + t.valor, 0);

      result.push({
        label: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
        income,
        expense
      });
    }

    return result;
  }

  destroy(): void {
    if (this.pieChart) {
      this.pieChart.destroy();
      this.pieChart = null;
    }
    if (this.barChart) {
      this.barChart.destroy();
      this.barChart = null;
    }
    if (this.lineChart) {
      this.lineChart.destroy();
      this.lineChart = null;
    }
    if (this.container) {
      this.container.remove();
    }
  }
}
