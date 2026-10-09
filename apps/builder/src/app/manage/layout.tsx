import { notFound } from "next/navigation"

/** SSI Community does not ship the proprietary reseller/portal implementation.
 * Keep the route closed until an independent SSI module is ready.
 */
export default function CommunityManageLayout() {
  notFound()
}
