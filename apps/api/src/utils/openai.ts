import { OpenAIClient } from "@anvia/openai";

export const openaiClient = new OpenAIClient({
  baseUrl: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
});

export function getModel(modelName: string = "deepseek-v4-pro") {
  return openaiClient.completionModel(modelName);
}
