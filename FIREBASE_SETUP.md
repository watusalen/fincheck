# 🔥 Configuração do Firebase para o FinCheck

## Pré-requisitos

1. Conta no [Firebase Console](https://console.firebase.google.com/)
2. Node.js instalado
3. NPM ou Yarn

## Passo a Passo

### 1. Criar Projeto no Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Digite o nome do projeto (ex: "fincheck-mvp")
4. Configure o Google Analytics (opcional)
5. Clique em "Criar projeto"

### 2. Configurar Autenticação

1. No painel do Firebase, vá em **Authentication**
2. Clique em **Get started**
3. Na aba **Sign-in method**, habilite:
   - **Email/Password** ✅
4. Configure domínios autorizados se necessário

### 3. Configurar Realtime Database

1. No painel do Firebase, vá em **Realtime Database**
2. Clique em **Create Database**
3. Escolha a localização (ex: us-central1)
4. Comece em **modo de teste** para desenvolvimento:
   ```json
   {
     "rules": {
       ".read": "auth != null",
       ".write": "auth != null"
     }
   }
   ```

### 4. Configurar Web App

1. No painel do Firebase, vá em **Project Settings** (ícone da engrenagem)
2. Na aba **General**, role até **Your apps**
3. Clique em **Add app** e escolha **Web** (</>)
4. Digite o nome do app (ex: "fincheck-web")
5. **NÃO** marque "Also set up Firebase Hosting" (faremos depois)
6. Clique em **Register app**
7. **COPIE** as configurações mostradas:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "fincheck-mvp.firebaseapp.com",
  databaseURL: "https://fincheck-mvp-default-rtdb.firebaseio.com/",
  projectId: "fincheck-mvp",
  storageBucket: "fincheck-mvp.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

### 5. Configurar no Projeto

1. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edite o arquivo `src/firebase/firebase-config.ts` e substitua as configurações:
   ```typescript
   const firebaseConfig = {
     apiKey: "sua-api-key-aqui",
     authDomain: "seu-projeto.firebaseapp.com",
     databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com/",
     projectId: "seu-projeto-id",
     storageBucket: "seu-projeto.appspot.com",
     messagingSenderId: "123456789",
     appId: "seu-app-id"
   };
   ```

### 6. Estrutura do Database

O Realtime Database será organizado da seguinte forma:

```
fincheck-database/
├── users/
│   └── {userId}/
│       ├── nome: "string"
│       ├── email: "string"
│       └── createdAt: "timestamp"
├── transactions/
│   └── {userId}/
│       └── {transactionId}/
│           ├── valor: number
│           ├── data: "YYYY-MM-DD"
│           ├── categoriaId: "string"
│           ├── descricao: "string"
│           ├── tipo: "receita" | "despesa"
│           ├── formaPagamento: "string"
│           ├── recorrente: boolean
│           └── mesesRecorrencia?: number
├── categories/
│   └── {userId}/
│       └── {categoryId}/
│           ├── nome: "string"
│           ├── descricao: "string"
│           ├── cor: "#HEXCOLOR"
│           └── limiteGasto?: number
├── goals/
│   └── {userId}/
│       └── {goalId}/
│           ├── nome: "string"
│           ├── descricao: "string"
│           ├── valorAlvo: number
│           └── validade: "YYYY-MM-DD"
└── reminders/
    └── {userId}/
        └── {reminderId}/
            ├── transactionId: "string"
            ├── dataVencimento: "YYYY-MM-DD"
            ├── frequenciaDias: number
            └── ativo: boolean
```

### 7. Regras de Segurança (Produção)

Para produção, use regras mais restritivas:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "transactions": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "categories": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "goals": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "reminders": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

### 8. Testar Configuração

Execute o projeto:
```bash
npm run dev
```

Se tudo estiver configurado corretamente, você poderá:
- ✅ Criar conta de usuário
- ✅ Fazer login/logout
- ✅ Salvar dados no database
- ✅ Ver dados sincronizados em tempo real

## 🚨 Importante

- **NUNCA** commite o arquivo `.env` ou as chaves do Firebase
- Use variáveis de ambiente em produção
- Configure regras de segurança adequadas antes de ir para produção
- Monitore o uso do Firebase para evitar custos inesperados