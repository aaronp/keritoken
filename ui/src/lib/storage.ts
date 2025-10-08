// IndexedDB storage utility for managing application state

const DB_NAME = 'GovernanceTokenDB';
const DB_VERSION = 1;
const STORE_NAME = 'appState';

export interface DeployedGovernanceToken {
  address: string;
  name: string;
  network: string;
  chainId: number;
  deployedAt: number;
}

export interface DeployedToken {
  address: string;
  name: string;
  symbol: string;
  governanceTokenAddress: string;
  network: string;
  chainId: number;
  deployedAt: number;
}

// AppState interface reserved for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface AppState {
  governanceTokenAddress?: string;
  governanceTokens?: DeployedGovernanceToken[];
  tokens?: DeployedToken[];
}

class Storage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getGovernanceTokenAddress(): Promise<string | undefined> {
    return this.get<string>('governanceTokenAddress');
  }

  async setGovernanceTokenAddress(address: string): Promise<void> {
    return this.set('governanceTokenAddress', address);
  }

  async getGovernanceTokens(): Promise<DeployedGovernanceToken[]> {
    const tokens = await this.get<DeployedGovernanceToken[]>('governanceTokens');
    return tokens || [];
  }

  async addGovernanceToken(token: DeployedGovernanceToken): Promise<void> {
    const tokens = await this.getGovernanceTokens();
    tokens.push(token);
    return this.set('governanceTokens', tokens);
  }

  async removeGovernanceToken(address: string): Promise<void> {
    const tokens = await this.getGovernanceTokens();
    const filtered = tokens.filter(t => t.address.toLowerCase() !== address.toLowerCase());
    return this.set('governanceTokens', filtered);
  }

  async getTokens(): Promise<DeployedToken[]> {
    const tokens = await this.get<DeployedToken[]>('tokens');
    return tokens || [];
  }

  async addToken(token: DeployedToken): Promise<void> {
    const tokens = await this.getTokens();
    tokens.push(token);
    return this.set('tokens', tokens);
  }

  async removeToken(address: string): Promise<void> {
    const tokens = await this.getTokens();
    const filtered = tokens.filter(t => t.address.toLowerCase() !== address.toLowerCase());
    return this.set('tokens', filtered);
  }
}

export const storage = new Storage();
