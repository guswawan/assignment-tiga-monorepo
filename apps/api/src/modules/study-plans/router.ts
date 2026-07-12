import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { CreateStudyPlanSchema } from "./schema.js";
import { prisma } from "../../utils/prisma.js";
import { studyplanQueue } from "../../config/queue.js";

export const studyplanRouter = new Hono()
  .get("/", async (c) => {
    const studyPlan = await prisma.studyPlan.findMany();
    return c.json(studyPlan);
  })
  .post("/", zValidator("json", CreateStudyPlanSchema), async (c) => {
    const body = c.req.valid("json");
    console.log(body);

    const newPlan = await prisma.studyPlan.create({
      data: body,
    });

    await studyplanQueue.add("generate-study-plan", { planId: newPlan.id });

    return c.json({
      message: "Study plan is on queue",
      studyPlanId: newPlan.id,
    });
  })
  .get("/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const studyPlan = await prisma.studyPlan.findUnique({ where: { id } });

    if (!studyPlan) return c.json({ error: "Data Not found" }, 404);
    return c.json(studyPlan);
  })