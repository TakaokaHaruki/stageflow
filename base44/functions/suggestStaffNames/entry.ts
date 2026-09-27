import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { rankCandidates } from '../../shared/staffNameSearch.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "chief"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { query } = await req.json();
    const allStaff = await base44.asServiceRole.entities.Staff.filter({}, "-created_date", 5000);
    const names = [...new Set((allStaff || []).map(s => (s.name || "").trim()).filter(Boolean))];
    const candidates = rankCandidates(query, names, 15).map(c => ({
      name: c.name,
      matchType: c.matchType,
    }));

    return Response.json({ candidates });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}