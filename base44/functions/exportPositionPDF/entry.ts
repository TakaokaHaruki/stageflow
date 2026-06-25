import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function compareByConfiguredOrder(a, b) {
  const parsedOrderA = Number(a?.order);
  const parsedOrderB = Number(b?.order);
  const orderA = Number.isFinite(parsedOrderA) ? parsedOrderA : Number.MAX_SAFE_INTEGER;
  const orderB = Number.isFinite(parsedOrderB) ? parsedOrderB : Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  const dateA = new Date(a?.created_date || 0).getTime();
  const dateB = new Date(b?.created_date || 0).getTime();
  if (dateA !== dateB) return dateA - dateB;
  return String(a?.name || '').localeCompare(String(b?.name || ''), 'ja');
}

function normalizeSlot(slot) {
  return slot === '開場前' ? '開場中' : (slot || '開場中');
}

function generateHTML(event, positions, staff, type) {
  const orderedPositions = [...positions].sort(compareByConfiguredOrder);
  const orderedStaff = [...staff].sort(compareByConfiguredOrder);

  // Staff lookup map for costume_change / break flags
  const staffMap = {};
  orderedStaff.forEach((s) => { staffMap[s.name] = s; });

  const styles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'Noto Sans JP', 'Arial Unicode MS', sans-serif;
        padding: 8px;
        background: white;
        color: #000;
        font-size: 12px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      @media print {
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }

      /* ヘッダー */
      .title-block { margin: 0 0 8px 0; }
      .event-title { font-size: 18px; font-weight: bold; }
      .event-info { font-size: 12px; color: #333; margin-top: 2px; }

      /* 3列グリッド */
      .slot-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 10px; }

      /* 時間帯カラム */
      .slot-column { border: 1px solid #888; border-radius: 4px; overflow: hidden; }
      .slot-column.col-open { border-left: 3px solid #555; }
      .slot-column.col-show { border-left: 3px solid #222; }
      .slot-column.col-after { border: 1px dashed #888; }

      /* カラムヘッダー */
      .slot-header { padding: 4px 8px; font-size: 14px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
      .slot-header.col-open { background: #e5e5e5; }
      .slot-header.col-show { background: #c8c8c8; background-image: repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 6px); }
      .slot-header.col-after { background: #ffffff; }
      .slot-header-info { font-size: 11px; font-weight: normal; opacity: 0.8; }

      /* カラム内ポジションリスト */
      .pos-list { padding: 4px; display: flex; flex-direction: column; gap: 4px; }

      /* PositionCard */
      .pos-card { border: 1px solid #aaa; border-radius: 3px; overflow: hidden; }
      .pos-card-bar { display: flex; align-items: center; gap: 4px; padding: 3px 6px; background: #f5f5f5; border-bottom: 1px solid #ccc; }
      .pos-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; border: 1px solid #333; }
      .pos-name { font-size: 12px; font-weight: bold; }
      .pos-count { font-size: 10px; color: #555; }
      .pos-badge { font-size: 10px; font-weight: bold; padding: 1px 4px; border: 1px solid #555; border-radius: 2px; margin-left: auto; white-space: nowrap; }
      .pos-badge.ok { background: #f5f5f5; }
      .pos-badge.short { background: #fff; border-style: dashed; }
      .pos-badge.over { background: #cccccc; }

      /* スタッフ行 */
      .staff-row { padding: 2px 6px; font-size: 12px; border-bottom: 1px solid #eee; }
      .staff-row:last-child { border-bottom: none; }
      .staff-flags { font-size: 10px; color: #555; margin-left: 4px; }
      .staff-empty { padding: 2px 6px; font-size: 11px; color: #999; font-style: italic; }

      /* split_by_side */
      .side-grid { display: grid; grid-template-columns: 1fr 1fr; }
      .side-label { font-size: 10px; font-weight: bold; color: #666; padding: 2px 6px; background: #f5f5f5; border-bottom: 1px solid #eee; }
      .side-grid > div:first-child { border-right: 1px solid #ddd; }

      /* 未配置スタッフ */
      .unassigned-section { margin-top: 10px; border: 2px dotted #888; border-radius: 4px; padding: 6px; }
      .unassigned-title { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
      .unassigned-list { display: flex; flex-wrap: wrap; gap: 4px; }
      .unassigned-item { font-size: 12px; padding: 2px 6px; background: #f5f5f5; border: 1px solid #ccc; border-radius: 2px; }

      /* タイムライン用（現行維持） */
      table { width: 100%; border-collapse: collapse; font-size: 15px; margin: 0 0 4px 0; }
      td, th { border: 1px solid #bbb; padding: 6px 8px; vertical-align: middle; text-align: left; line-height: 1.4; overflow: visible; }
      td.tl-name { background: #f3ede2; font-weight: bold; text-align: left; min-width: 50px; }
      td.tl-pos { background: #fffee8; text-align: center; min-width: 50px; }
      td.tl-empty { background: #fff; min-width: 50px; }
      tr.tl-header td { background: #cacaca; font-weight: bold; text-align: center; padding: 6px 8px; }
    </style>
  `;

  // イベント日付フォーマット
  let dateStr = '';
  if (event.date) {
    const d = new Date(event.date);
    dateStr = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  }

  let content = `
    <div class="title-block">
      <div class="event-title">${event.name}</div>
      <div class="event-info">${dateStr}${event.venue ? '　' + event.venue : ''}</div>
    </div>
  `;

  const timeSlots = ['開場中', '開演中', '終演後'];

  if (type === 'staff') {
    // Staff flags helper — [着替] / [休憩]
    const staffFlags = (name) => {
      const s = staffMap[name];
      if (!s) return '';
      let flags = '';
      if (s.costume_change) flags += ' <span class="staff-flags">[着替]</span>';
      if (s.break) flags += ' <span class="staff-flags">[休憩]</span>';
      return flags;
    };

    // Status badge — □充足 / △残○名 / ×超過○名
    const statusBadge = (assigned, required) => {
      if (required <= 0) return '';
      const diff = required - assigned;
      if (diff > 0) return `<span class="pos-badge short">△ 残${diff}名</span>`;
      if (diff === 0) return `<span class="pos-badge ok">□ 充足</span>`;
      return `<span class="pos-badge over">× 超過${Math.abs(diff)}名</span>`;
    };

    // Render staff rows for a list of names
    const renderStaffRows = (names) => {
      if (names.length === 0) return '<div class="staff-empty">（未配置）</div>';
      return names.map((name) => `<div class="staff-row">${name}${staffFlags(name)}</div>`).join('');
    };

    // Render a single PositionCard
    const renderPositionCard = (pos) => {
      const splitBySide = Boolean(pos.split_by_side);
      const kamiteNames = pos.staff_names_kamite || [];
      const shimoteNames = pos.staff_names_shimote || [];
      const staffNames = splitBySide ? [...new Set([...kamiteNames, ...shimoteNames])] : (pos.staff_names || []);
      const assignedCount = staffNames.length;
      const requiredCount = pos.required_count || 0;
      const color = pos.color || '#6366f1';

      let cardHtml = `<div class="pos-card">
        <div class="pos-card-bar">
          <div class="pos-dot" style="background: ${color};"></div>
          <span class="pos-name">${pos.name}</span>
          <span class="pos-count">${assignedCount}名${requiredCount > 0 ? '/' + requiredCount + '名' : ''}</span>
          ${statusBadge(assignedCount, requiredCount)}
        </div>`;

      if (splitBySide) {
        cardHtml += `<div class="side-grid">
          <div>
            <div class="side-label">上手</div>
            ${renderStaffRows(kamiteNames)}
          </div>
          <div>
            <div class="side-label">下手</div>
            ${renderStaffRows(shimoteNames)}
          </div>
        </div>`;
      } else {
        cardHtml += renderStaffRows(staffNames);
      }

      cardHtml += `</div>`;
      return cardHtml;
    };

    // 3-column grid
    content += `<div class="slot-grid">`;
    timeSlots.forEach((slot) => {
      const slotPositions = orderedPositions.filter((p) => normalizeSlot(p.time_slot) === slot);
      const slotClass = slot === '開場中' ? 'col-open' : slot === '開演中' ? 'col-show' : 'col-after';
      const totalRequired = slotPositions.reduce((sum, p) => sum + (p.required_count || 0), 0);
      const totalAssigned = slotPositions.reduce((sum, p) => {
        const names = p.split_by_side
          ? [...new Set([...(p.staff_names_kamite || []), ...(p.staff_names_shimote || [])])]
          : (p.staff_names || []);
        return sum + names.length;
      }, 0);

      content += `<div class="slot-column ${slotClass}">
        <div class="slot-header ${slotClass}">
          <span>${slot}</span>
          <span class="slot-header-info">${slotPositions.length}件 / 配置${totalAssigned}名${totalRequired > 0 ? ' / 必要' + totalRequired + '名' : ''}</span>
        </div>
        <div class="pos-list">`;

      if (slotPositions.length === 0) {
        content += `<div class="staff-empty">ポジションがありません</div>`;
      } else {
        slotPositions.forEach((pos) => {
          content += renderPositionCard(pos);
        });
      }

      content += `</div></div>`;
    });
    content += `</div>`;

    // 未配置スタッフ
    const assignedNames = new Set();
    orderedPositions.forEach((p) => {
      if (p.split_by_side) {
        (p.staff_names_kamite || []).forEach((n) => assignedNames.add(n));
        (p.staff_names_shimote || []).forEach((n) => assignedNames.add(n));
      } else {
        (p.staff_names || []).forEach((n) => assignedNames.add(n));
      }
    });
    const unassigned = orderedStaff.filter((s) => !assignedNames.has(s.name));
    if (unassigned.length > 0) {
      content += `<div class="unassigned-section">
        <div class="unassigned-title">未配置スタッフ（${unassigned.length}名）</div>
        <div class="unassigned-list">
          ${unassigned.map((s) => `<span class="unassigned-item">${s.name}${staffFlags(s.name)}</span>`).join('')}
        </div>
      </div>`;
    }

  } else if (type === 'timeline') {
    // スタッフ別タイムライン
    const staffTimeline = {};
    orderedStaff.forEach((s) => {
      staffTimeline[s.name] = { '開場中': [], '開演中': [], '終演後': [] };
    });
    orderedPositions.forEach((pos) => {
      const slot = normalizeSlot(pos.time_slot);
      (pos.staff_names || []).forEach((name) => {
        if (!staffTimeline[name]) staffTimeline[name] = { '開場中': [], '開演中': [], '終演後': [] };
        if (!staffTimeline[name][slot]) staffTimeline[name][slot] = [];
        staffTimeline[name][slot].push(pos.name || pos.role);
      });
    });

    content += `<table>`;
    content += `<tr class="tl-header">
      <td>スタッフ名</td>
      <td>開場中</td>
      <td>開演中</td>
      <td>終演後</td>
    </tr>`;

    const orderedStaffNames = orderedStaff.map((s) => s.name);
    const timelineNames = [
      ...orderedStaffNames,
      ...Object.keys(staffTimeline).filter((name) => !orderedStaffNames.includes(name)),
    ];
    timelineNames.forEach((name) => {
      const tl = staffTimeline[name];
      const hasAny = timeSlots.some(s => tl[s].length > 0);
      content += `<tr>
        <td class="tl-name">${name}</td>
        ${timeSlots.map(slot => tl[slot].length > 0
          ? `<td class="tl-pos">${tl[slot].join('・')}</td>`
          : `<td class="tl-empty">-</td>`
        ).join('')}
      </tr>`;
    });

    content += `</table>`;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
      ${styles}
    </head>
    <body>${content}</body>
    </html>
  `;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { eventId, type } = await req.json();

    if (!eventId) {
      return Response.json({ error: 'eventId required' }, { status: 400 });
    }

    const event = await base44.entities.Event.get(eventId);
    const positions = await base44.entities.Position.filter({ event_id: eventId });
    const staff = await base44.entities.Staff.filter({ event_id: eventId });

    const html = generateHTML(event, positions, staff, type);

    return Response.json({ html });
  } catch (error) {
    console.error('PDF Export Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});