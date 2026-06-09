import { base44 } from "@/api/base44Client";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";

export const EVENT_MODE_REFETCH_INTERVAL = LIVE_SYNC_INTERVAL;
export const EVENT_MODE_FIELDS = ["staff_management_mode", "assignment_mode", "venue_map_mode"];

export async function loadEventById(eventId) {
  let event = null;
  try {
    event = await base44.entities.Event.get(eventId);
  } catch {
    const events = await base44.entities.Event.filter({ id: eventId });
    event = events?.[0] || null;
  }
  return event || null;
}