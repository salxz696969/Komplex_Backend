import { Request, Response } from "express";

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
};

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;
};  