import { Request } from "express";

export interface AuthenticatedRequest extends Request<any, any, any, any, any> {
  user: {
    userId: number;
    // add other user properties if needed
  };
}
