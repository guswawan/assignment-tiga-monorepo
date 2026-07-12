import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { Hono } from "hono";
import { studyplanRouter } from "./modules/study-plans/router.js";
import { chatRouter } from "./modules/chats/router.js";

const app = new Hono()
  .use(cors())
  .route("/study-plans", studyplanRouter)
  .route("/chats", chatRouter);

export type AppType = typeof app;

serve(
  {
    fetch: app.fetch,
    port: 8000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
