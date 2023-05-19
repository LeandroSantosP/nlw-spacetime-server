import "@fastify/jwt";

declare module "@fastify/jwt" {
  export interface FastifyJWT {
    user: {
      name: string;
      avatar_url: string;
      sub: string;
    };
  }
}
