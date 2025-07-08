export class Transaction {
  constructor(
    public id: string,
    public userId: string,
    public valor: number,
    public data: string,               // ISO string (ex: "2024-06-12")
    public categoriaId: string,
    public descricao: string,
    public tipo: 'receita' | 'despesa',
    public formaPagamento: string,
    public recorrente: boolean = false,
    public mesesRecorrencia?: number
  ) { }
}
