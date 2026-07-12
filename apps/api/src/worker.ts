import { Worker } from "bullmq";
import { connection, QUEUE_NAME } from "./config/queue-config.js";
import { generateStudyPlan } from "./modules/study-plans/services.js";

export const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { planId } = job.data
    await generateStudyPlan(planId)
  },
  {
    connection: connection,
  },
);