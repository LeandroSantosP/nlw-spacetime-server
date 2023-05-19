import { PrismaClient } from "@prisma/client";
import { FastifyInstance } from "fastify";
import { prisma } from "../database/prisma";

class AuthMiddleWare {
  private readonly prisma: PrismaClient = prisma;
  constructor(private readonly request: FastifyInstance) {}

  verify() {
    this.request.jwt.verify;
  }
}
