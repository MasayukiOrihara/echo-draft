import { ChatOpenAI } from "@langchain/openai";

/** gpt 4o mini */
export const gpt4oMini = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.2,
});
