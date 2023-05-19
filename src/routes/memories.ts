import { PrismaClient } from "@prisma/client";
import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { extname, resolve } from "node:path";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import { z } from "zod";
import { prisma } from "../database/prisma";

const pump = promisify(pipeline);

export class MemoriesRoutes {
  private prisma: PrismaClient = prisma;
  constructor(private readonly app: FastifyInstance) {
    this.app.addHook("preHandler", async (request) => {
      await request.jwtVerify();
    });
    this.create();
    this.delete();
    this.getMemories();
    this.getUniqueMemory();
    this.updated();
    this.upload();
  }

  upload() {
    return this.app.post("/upload", async (request, replay) => {
      const upload = await request.file({
        limits: {
          fileSize: 5_242_880, // 5bm
        },
      });

      if (!upload) {
        return replay.status(400).send();
      }
      const mimeTypeRegex = /^(image|video)\/[a-zA-Z]+/;
      const isValidMimetypeRegex = mimeTypeRegex.test(upload.mimetype);

      if (!isValidMimetypeRegex) {
        return replay.status(400).send();
      }

      const fileId = randomUUID();
      const extName = extname(upload.filename);

      const fileName = fileId.concat(extName);

      const writeSteam = createWriteStream(
        resolve(__dirname, "../../uploads", fileName)
      );

      await pump(upload.file, writeSteam);

      const fullUrl = request.protocol.concat("://").concat(request.hostname);
      const fileUrl = new URL(`/uploads/${fileName}`, fullUrl).toString();
      return { fileUrl };
    });
  }

  getMemories() {
    return this.app.get("/memories", async (request) => {
      const memories = await this.prisma.memory.findMany({
        where: {
          userId: request.user.sub,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return memories.map((memory) => {
        return {
          id: memory.id,
          coverUrl: memory.coverUrl,
          excerpt: memory.content.substring(0, 115).concat("..."),
          createdAt: memory.createdAt,
        };
      });
    });
  }

  getUniqueMemory() {
    return this.app.get("/memories/:id", async (request, replay) => {
      await request.jwtVerify();
      const paramsSchema = z.object({
        id: z.string().uuid(),
      });
      const { id } = paramsSchema.parse(request.params);
      const memory = await this.prisma.memory.findUniqueOrThrow({
        where: {
          id,
        },
      });
      if (!memory.isPublic && memory.userId !== request.user.sub) {
        return replay.status(401).send();
      }
      return memory;
    });
  }

  create() {
    return this.app.post("/memories", async (request) => {
      const bodySchema = z.object({
        content: z.string(),
        coverUrl: z.coerce.string(),
        isPublic: z.coerce.boolean().default(false),
      });
      const { content, coverUrl, isPublic } = bodySchema.parse(request.body);
      const memory = await this.prisma.memory.create({
        data: {
          content,
          coverUrl,
          isPublic,
          userId: request.user.sub,
        },
      });
      return memory;
    });
  }

  updated() {
    return this.app.put("/memories/:id", async (request, replay) => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
      });
      const bodySchema = z.object({
        content: z.string(),
        coverUrl: z.coerce.string(),
        isPublic: z.coerce.boolean().default(false),
      });
      const { content, coverUrl, isPublic } = bodySchema.parse(request.body);
      const { id } = paramsSchema.parse(request.params);
      let memory = await prisma.memory.findUniqueOrThrow({
        where: {
          id,
        },
      });
      if (memory.userId !== request.user.sub) {
        return replay.status(401).send();
      }
      memory = await this.prisma.memory.update({
        where: {
          id,
        },
        data: {
          content,
          coverUrl,
          isPublic,
          userId: "ba2c8805-b37d-48a5-9212-9fab8a0fa6f8",
        },
      });
      return memory;
    });
  }

  delete() {
    return this.app.delete("/memories/:id", async (request, replay) => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
      });
      const { id } = paramsSchema.parse(request.params);
      let memory = await prisma.memory.findUniqueOrThrow({
        where: {
          id,
        },
      });
      if (memory.userId !== request.user.sub) {
        return replay.status(401).send();
      }
      await prisma.memory.delete({
        where: {
          id,
        },
      });
    });
  }
}
