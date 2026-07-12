import { Queue } from "bullmq";
import { connection, QUEUE_NAME } from "./queue-config.js";

export const studyplanQueue = new Queue(QUEUE_NAME, { connection });
