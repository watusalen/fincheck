# 💰 FinCheck - Gerenciador Financeiro Pessoal

<div align="center">

**Aplicação web moderna para controle financeiro pessoal - Versão MVP**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chart.js&logoColor=white)](https://www.chartjs.org/)

</div>

## 📋 Sobre o Projeto

O **FinCheck MVP** é um gerenciador financeiro pessoal enxuto, focado nas funcionalidades essenciais para controle de receitas e despesas. Desenvolvido com arquitetura MVC em TypeScript e integração Firebase para persistência de dados.

## ✨ Funcionalidades MVP

- 🏗️ **Arquitetura em Camadas** - MVC pattern com TypeScript
- 💰 **Gestão de Transações** - Cadastro de receitas e despesas
- 📊 **Gráficos Simples** - Visualização básica com Chart.js
- 🔥 **Firebase Integration** - Authentication + Firestore
- 📱 **Design Responsivo** - Interface moderna e adaptável
- 🎯 **Dashboard Simples** - Saldo atual e totais do mês
- 📋 **Histórico do Mês Atual** - Timeline de transações
- 🗂️ **Categorias Padrão** - Sistema automático de categorização

## 🛠️ Tecnologias

- **TypeScript** - Linguagem principal
- **HTML5 & CSS3** - Interface responsiva
- **Chart.js** - Gráficos interativos
- **Firebase** - Authentication + Firestore
- **Parcel** - Bundler e dev server

## 🚀 Como Executar o Projeto

### **Pré-requisitos**
- Node.js (v16 ou superior)
- NPM ou Yarn
- Conta no Firebase

### **1. Clone e instale dependências**
```bash
git clone https://github.com/watusalen/fincheck.git
cd fincheck
npm install
```

### **2. Configure o Firebase**

1. **Crie um projeto no [Firebase Console](https://console.firebase.google.com/)**

2. **Configure Authentication:**
   - Vá em Authentication > Sign-in method
   - Ative "Email/password"

3. **Configure Firestore:**
   - Vá em Firestore Database > Create database
   - Escolha "Start in test mode"

4. **Obtenha as credenciais:**
   - Vá em Project Settings > General > Your apps
   - Clique em "Web" e registre o app
   - Copie as configurações

5. **Crie o arquivo `.env` na raiz do projeto:**
```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_project_id
VITE_FIREBASE_STORAGE_BUCKET=seu_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

### **3. Execute o projeto**
```bash
npm run dev
```

O projeto estará disponível em `http://localhost:1234` (ou outra porta se 1234 estiver ocupada).

### **4. Build para produção**
```bash
npm run build
```

## 📱 Como Usar

1. **Primeiro Acesso:** Crie uma conta ou faça login
2. **Transações:** Use "Nova Transação" para adicionar receitas/despesas
3. **Dashboard:** Visualize saldo atual e totais do mês
4. **Histórico:** Navegue pelo histórico financeiro do mês atual

## 📊 Status do Projeto

### **MVP Finalizado (100%)**
- ✅ Arquitetura MVC com TypeScript
- ✅ CRUD de Transações
- ✅ Sistema de autenticação Firebase
- ✅ Dashboard com saldo e totais
- ✅ Gráficos simples 
- ✅ Histórico do mês atual
- ✅ Interface responsiva moderna
- ✅ Persistência no Firebase
- ✅ Categorias padrão automáticas

### **Escopo MVP Limitado**
- ❌ Categorias customizadas
- ❌ Metas financeiras
- ❌ Sistema de alertas
- ❌ Transações recorrentes
- ❌ Lembretes
- ❌ Relatórios avançados
- ❌ Histórico multi-período

## 🎯 Estrutura do Projeto

```
src/
├── controller/          # Camada de controle
│   ├── AuthController.ts
│   ├── DashboardController.ts
│   ├── TransactionController.ts
│   └── CategoryController.ts
├── model/              # Modelos de dados
│   ├── User.ts
│   ├── Transaction.ts
│   └── Category.ts
├── service/            # Camada de serviço
│   ├── FirebaseService.ts
│   ├── TransactionService.ts
│   └── CategoryService.ts
├── view/               # Camada de apresentação
│   ├── DashboardView.ts
│   ├── TransactionView.ts
│   └── CreateView.ts
└── main.ts             # Ponto de entrada
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

<div align="center">

**Projeto acadêmico MVP - TypeScript e Firebase**
</div>