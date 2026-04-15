import { Router, type Router as ExpressRouter } from "express";

export abstract class BaseRoute {
  protected readonly router: ExpressRouter;

  protected constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  protected abstract registerRoutes(): void;

  public getRouter(): ExpressRouter {
    return this.router;
  }
}
