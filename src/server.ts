import "dotenv/config";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastify from "fastify";
import { resolve } from "path";
import { MemoriesRoutes } from "./routes/memories";
import { AuthRouter } from "./routes/auth";

const app = fastify();

app.register(cors, {
  origin: true,
});

app.register(jwt, {
  secret: "spacetime",
});

app.register(require("@fastify/static"), {
  root: resolve(__dirname, "../uploads"),
  prefix: "/uploads",
});

app.register(multipart);

app.register(async (app) => new AuthRouter(app));

app.register(async (app) => new MemoriesRoutes(app));

(async (cb: (port: number) => void) => {
  const port = 3333;
  await app.listen({
    port,
  });
  cb(port);
})((port) => {
  console.log(`Server is running on port ${port}`);
});
