import { Transaction } from '../model/Transaction';
import { Category } from '../model/Category';
import { DashboardController } from '../controller/DashboardController';
import { formatCurrency } from '../utils/validators';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

interface MonthData {
  year: number;
  month: number;
  displayName: string;
  transactions: Transaction[];
}

export class HistoryView {
  private dashboardController: DashboardController;
  private monthsData: MonthData[] = [];
  private currentMonthIndex: number = 0;
  private historyChart: Chart | null = null;

  constructor() {
    this.dashboardController = DashboardController.getInstance();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listener para quando a seção de histórico for ativada
    window.addEventListener('historyActivated', () => {
      this.loadHistoryData();
    });
  }

  async loadHistoryData(): Promise<void> {
    console.log('🔄 Carregando dados do histórico...');

    // Carregar todas as transações diretamente do TransactionController
    const user = this.dashboardController.getCurrentUser();
    if (!user) {
      console.error('❌ Usuário não autenticado');
      return;
    }

    const result = await this.dashboardController.getAllTransactionsForHistory(user.uid);

    if (result.success && result.data) {
      const transactions = result.data.transactions || [];
      const categories = result.data.categories || [];

      this.processMonthsData(transactions);
      this.renderMonthsList();

      if (this.monthsData.length > 0) {
        this.selectMonth(0);
        this.renderChart(categories);
      }
    } else {
      console.error('❌ Erro ao carregar dados do histórico:', result.message);
    }
  }

  private processMonthsData(transactions: Transaction[]): void {
    const monthsMap = new Map<string, Transaction[]>();

    // Agrupar transações por mês/ano
    transactions.forEach(transaction => {
      const date = new Date(transaction.data);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${month}`;

      if (!monthsMap.has(key)) {
        monthsMap.set(key, []);
      }
      monthsMap.get(key)!.push(transaction);
    });

    // Converter para array e ordenar (mais recente primeiro)
    this.monthsData = Array.from(monthsMap.entries())
      .map(([key, transactions]) => {
        const [year, month] = key.split('-').map(Number);
        return {
          year,
          month,
          displayName: this.formatMonthDisplay(year, month),
          transactions
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

    console.log('📅 Meses com dados:', this.monthsData.map(m => m.displayName));
  }

  private formatMonthDisplay(year: number, month: number): string {
    const monthNames = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];

    return `${monthNames[month]}/${year.toString().slice(-2)}`;
  }

  private renderMonthsList(): void {
    const monthsList = document.querySelector('#months-list') as HTMLUListElement;
    if (!monthsList) return;

    monthsList.innerHTML = '';

    this.monthsData.forEach((monthData, index) => {
      const li = document.createElement('li');
      li.className = 'month-item';
      if (index === this.currentMonthIndex) {
        li.classList.add('active');
      }

      const link = document.createElement('a');
      link.href = '#';
      link.className = 'month-link';
      link.textContent = monthData.displayName;

      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.selectMonth(index);
      });

      li.appendChild(link);
      monthsList.appendChild(li);
    });
  }

  private selectMonth(index: number): void {
    this.currentMonthIndex = index;

    // Atualizar visual da lista
    const monthItems = document.querySelectorAll('.month-item');
    monthItems.forEach((item, i) => {
      if (i === index) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Atualizar título do gráfico
    const chartTitle = document.querySelector('#history-chart-title') as HTMLElement;
    if (chartTitle && this.monthsData[index]) {
      chartTitle.textContent = `Gasto por categoria do mês de ${this.monthsData[index].displayName}`;
    }

    // Renderizar gráfico do mês selecionado
    this.renderChart();
  }

  private async renderChart(categories?: Category[]): Promise<void> {
    if (!this.monthsData[this.currentMonthIndex]) return;

    const canvas = document.querySelector('#history-chart') as HTMLCanvasElement;
    if (!canvas) return;

    // Destruir gráfico anterior se existir
    if (this.historyChart) {
      this.historyChart.destroy();
    }

    // Obter categorias se não foram fornecidas
    if (!categories) {
      const user = this.dashboardController.getCurrentUser();
      if (!user) return;

      const result = await this.dashboardController.getAllTransactionsForHistory(user.uid);
      if (result.success && result.data) {
        categories = result.data.categories || [];
      } else {
        categories = [];
      }
    }

    const monthData = this.monthsData[this.currentMonthIndex];
    const expenseTransactions = monthData.transactions.filter(t => t.tipo === 'despesa');

    // Agrupar despesas por categoria
    const categoryExpenses = new Map<string, number>();

    expenseTransactions.forEach(transaction => {
      const current = categoryExpenses.get(transaction.categoriaId) || 0;
      categoryExpenses.set(transaction.categoriaId, current + Math.abs(transaction.valor));
    });

    // Preparar dados para o gráfico
    const labels: string[] = [];
    const data: number[] = [];
    const backgroundColors: string[] = [];

    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
      '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'
    ];

    let colorIndex = 0;
    for (const [categoryId, amount] of categoryExpenses) {
      const category = categories.find(c => c.id === categoryId);
      labels.push(category?.nome || 'Categoria Desconhecida');
      data.push(amount);
      backgroundColors.push(colors[colorIndex % colors.length]);
      colorIndex++;
    }

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Gastos',
          data,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map(color => color),
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.label}: ${formatCurrency(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 45,
              minRotation: 0
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#f3f4f6'
            },
            ticks: {
              callback: function (value) {
                return formatCurrency(value as number);
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

    this.historyChart = new Chart(canvas, config);
    console.log('📊 Gráfico de histórico renderizado para:', monthData.displayName);
  }

  show(): void {
    // Este método pode ser usado se necessário para ações específicas quando a view é mostrada
    this.loadHistoryData();
  }

  hide(): void {
    // Limpar se necessário
    if (this.historyChart) {
      this.historyChart.destroy();
      this.historyChart = null;
    }
  }
}
