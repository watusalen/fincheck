import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../firebase/firebase-config';
import { User } from '../model';

export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  private constructor() { }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Login com email e senha
  async login(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      this.currentUser = new User(
        firebaseUser.uid,
        firebaseUser.displayName || '',
        firebaseUser.email || ''
      );

      return this.currentUser;
    } catch (error: any) {
      throw new Error(`Erro no login: ${error.message}`);
    }
  }

  // Cadastro de novo usuário
  async register(email: string, password: string, nome: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      this.currentUser = new User(
        firebaseUser.uid,
        nome,
        firebaseUser.email || ''
      );

      return this.currentUser;
    } catch (error: any) {
      throw new Error(`Erro no cadastro: ${error.message}`);
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.currentUser = null;
    } catch (error: any) {
      throw new Error(`Erro no logout: ${error.message}`);
    }
  }

  // Verificar se há usuário logado
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Observar mudanças no estado de autenticação
  onAuthStateChange(callback: (user: User | null) => void): void {
    onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        this.currentUser = new User(
          firebaseUser.uid,
          firebaseUser.displayName || '',
          firebaseUser.email || ''
        );
        callback(this.currentUser);
      } else {
        this.currentUser = null;
        callback(null);
      }
    });
  }

  // Verificar se usuário está autenticado
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
}
