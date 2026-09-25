import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { staffInPosition, staffSideInPosition, isChiefOfPosition } from '../../shared/positionStaff.ts';

const TIME_SLOTS = ["開場中", "開演中", "終演後", "通し"];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "chief"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { query } = await req.json();
    const q = (query || "").trim().toLowerCase();

    const [allStaff, allEvents] = await Promise.all([
      base44.asServiceRole.entities.Staff.filter({}, "-created_date", 5000),
      base44.asServiceRole.entities.Event.list("-date", 5000),
    ]);

    const eventMap = new Map((allEvents || []).map(e => [e.id, e]));
    const matchedStaff = q
      ? (allStaff || []).filter(s => (s.name || "").toLowerCase().includes(q))
      : (allStaff || []);

    // 名前で集約
    const byName = new Map();
    for (const s of matchedStaff) {
      if (!s.name) continue;
      const key = s.name.trim();
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(s);
    }

    // 関連イベントのポジションを取得
    const eventIds = [...new Set(matchedStaff.map(s => s.event_id))];
    let positions = [];
    if (eventIds.length) {
      positions = await base44.asServiceRole.entities.Position.filter({ event_id: { $in: eventIds } });
    }
    const positionsByEvent = new Map();
    for (const p of positions || []) {
      if (!positionsByEvent.has(p.event_id)) positionsByEvent.set(p.event_id, []);
      positionsByEvent.get(p.event_id).push(p);
    }

    const results = [];
    for (const [name, staffRecords] of byName.entries()) {
      const eids = [...new Set(staffRecords.map(s => s.event_id))];
      const eventsOut = [];
      let positionCount = 0;
      let chiefCount = 0;
      const timeSlotCounts = {};
      const venueCountsMap = {};
      const positionCountsMap = {};
      const rolesSet = new Set();
      const skillsSet = new Set();
      const genderCounter = {};

      for (const s of staffRecords) {
        if (s.gender) genderCounter[s.gender] = (genderCounter[s.gender] || 0) + 1;
        (s.roles || []).forEach(r => rolesSet.add(r));
        (s.skills || []).forEach(sk => skillsSet.add(sk));
      }

      for (const eid of eids) {
        const ev = eventMap.get(eid);
        const evPositions = positionsByEvent.get(eid) || [];
        const staffRecord = staffRecords.find(s => s.event_id === eid);
        const myPositions = [];
        for (const p of evPositions) {
          if (!staffInPosition(p, name)) continue;
          const side = staffSideInPosition(p, name);
          const isChief = isChiefOfPosition(p, name);
          myPositions.push({
            name: p.name,
            time_slot: p.time_slot,
            side,
            is_chief: isChief,
            category: p.category || "",
          });
          positionCount++;
          if (isChief) chiefCount++;
          if (p.time_slot) timeSlotCounts[p.time_slot] = (timeSlotCounts[p.time_slot] || 0) + 1;
          if (p.name) positionCountsMap[p.name] = (positionCountsMap[p.name] || 0) + 1;
        }
        if (ev && ev.venue) venueCountsMap[ev.venue] = (venueCountsMap[ev.venue] || 0) + 1;
        eventsOut.push({
          event_id: eid,
          event_name: ev?.name || "(名称不明)",
          date: ev?.date || "",
          venue: ev?.venue || "",
          status: ev?.status || "",
          staff: staffRecord ? {
            gender: staffRecord.gender || "",
            roles: staffRecord.roles || [],
            skills: staffRecord.skills || [],
            note: staffRecord.note || "",
          } : null,
          positions: myPositions,
        });
      }

      eventsOut.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      const gender = Object.entries(genderCounter).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

      results.push({
        name,
        gender,
        roles: [...rolesSet],
        skills: [...skillsSet],
        eventCount: eids.length,
        positionCount,
        chiefCount,
        timeSlotCounts,
        venueCounts: Object.entries(venueCountsMap).map(([venue, count]) => ({ venue, count })).sort((a, b) => b.count - a.count),
        positionCounts: Object.entries(positionCountsMap).map(([n, count]) => ({ name: n, count })).sort((a, b) => b.count - a.count),
        events: eventsOut,
      });
    }

    results.sort((a, b) => b.eventCount - a.eventCount || a.name.localeCompare(b.name, "ja"));
    const capped = q ? results : results.slice(0, 200);

    return Response.json({ results: capped, total: results.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}