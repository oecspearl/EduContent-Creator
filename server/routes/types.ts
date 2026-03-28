import type { Express, Request, Response, NextFunction } from "express";
import type { IStorage } from "../storage";

/** Express request with typed session. */
export interface AuthenticatedRequest extends Request {
  session: Request["session"] & {
    userId?: string;
    oauthReturnTo?: string;
  };
}

export type AuthMiddleware = (req: Request, res: Response, next: NextFunction) => void;

export interface RouteContext {
  app: Express;
  storage: IStorage;
  requireAuth: AuthMiddleware;
  requireTeacher: AuthMiddleware;
}
