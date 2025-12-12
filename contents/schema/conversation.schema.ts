import { z } from "zod";

export const ConversationSchema = z.object({
  segments: z.array(
    z.object({
      speaker: z.string(),
      text: z.string(),
    })
  ),
  formatted_conversation: z.string(),
});

export type ConversationResult = z.infer<typeof ConversationSchema>;
