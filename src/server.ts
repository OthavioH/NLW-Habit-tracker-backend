import Fastify from "fastify";
import cors from "@fastify/cors";

import { appRoutes } from "./routes";

const app = Fastify({ logger: true });

app.register(cors, {
  origin: "*",
});

app.register(appRoutes);

const port: any = process.env.PORT || 8080;

app
  .listen({
    port: port,
    host: "0.0.0.0",
  })
  .then(() => {
    console.log("Server is running");
  });
