export class Category {
  constructor(
    public id: string,
    public userId: string,
    public nome: string,
    public descricao: string,
    public cor: string,
    public limiteGasto?: number // em reais
  ) { }
}
