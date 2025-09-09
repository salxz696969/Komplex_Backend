import {Request} from 'express'
export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        // add other user properties if needed
    };
}