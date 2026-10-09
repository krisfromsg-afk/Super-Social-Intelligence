import { z } from "zod"

/** Original SSI Community DTO, intentionally independent of proprietary
 * inbox-teams modules. Existing records are read-only until a dedicated
 * Community team-assignment service is implemented.
 */
export const inboxTeamResource = z.object({
  id: z.string(),
  name: z.string(),
})
