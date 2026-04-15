export abstract class BaseService {
  protected readonly serviceName: string;

  protected constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  protected buildErrorMessage(action: string, error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return `[${this.serviceName}] ${action} failed: ${message}`;
  }

  protected async run<T>(action: string, work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      throw new Error(this.buildErrorMessage(action, error));
    }
  }
}
