import { z } from "zod";

export const CreateStudyPlanSchema = z.object({
  topic: z.string().min(1, "Topic required"),
  currentLevel: z.string().min(1, "Current level required"),
  targetGoal: z.string().min(1, "Target goal required"),
  hoursPerWeek: z.number().int().positive().max(40),
  extraNotes: z.string().optional(),
});
