import axios from "axios";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../database/prisma";

export class AuthRouter {
  constructor(private readonly app: FastifyInstance) {
    this.register();
  }

  register() {
    return this.app.post("/register", async (request) => {
      const bodySchema = z.object({
        code: z.string(),
      });

      const { code } = bodySchema.parse(request.body);
      console.log(code);

      const accessTokenResponse = await axios.post(
        "https://github.com/login/oauth/access_token",
        null,
        {
          params: {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
          },
          headers: {
            Accept: "application/json",
          },
        }
      );

      const { access_token } = accessTokenResponse.data;

      const userSchema = z.object({
        id: z.number(),
        login: z.string(),
        name: z.string(),
        avatar_url: z.string().url(),
      });

      const userResponse = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const dataInfos = userSchema.parse(userResponse.data);

      let user = await prisma.user.findUnique({
        where: {
          githubId: dataInfos.id,
        },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            githubId: dataInfos.id,
            avatar: dataInfos.avatar_url,
            login: dataInfos.login,
            name: dataInfos.name,
          },
        });
      }

      const token = this.app.jwt.sign(
        {
          name: user.name,
          avatar_url: user.avatar,
        },
        {
          sub: user.id,
          expiresIn: "30d",
        }
      );

      return {
        token,
      };
    });
  }
}
