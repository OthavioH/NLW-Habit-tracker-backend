import Fastify from "fastify";
import cors from "@fastify/cors";
import morgan from "morgan";

import { appRoutes } from "./routes";

const app = Fastify({ logger: true });

app.register(cors, {
  origin: "*",
});

app.register(appRoutes);

app
  .listen({
    port: 3333,
    host: "0.0.0.0",
  })
  .then(() => {
    console.log("Server is running");
  });
