import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
  const styles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: 'Noto Sans JP', 'Arial Unicode MS', sans-serif; 
        padding: 4px 6px;
        background: white;
        color: #000;
        font-size: 15px;
      }
      .title-block { display: flex; align-items: center; gap: 12px; margin: 0 0 6px 0; }
      .event-title { font-size: 23px; font-weight: bold; }
      .event-info { font-size: 14px; color: #555; }
      table { width: 100%; border-collapse: collapse; font-size: 15px; margin: 0 0 4px 0; }
      td, th { border: 1px solid #bbb; padding: 6px 8px; vertical-align: middle; text-align: left; line-height: 1.4; overflow: visible; }
      
      /* 時間帯セクションヘッダー（サーモン色） */
      tr.slot-header td { 
        background: #f2a482; 
        font-weight: bold; 
        text-align: left;
        padding: 6px 8px;
        font-size: 16px;
        line-height: 1.4;
        vertical-align: middle;
      }
      tr.slot-header td.count-cell {
        text-align: left;
      }
      
      /* カラムヘッダー行（グレー） */
      tr.col-header td { 
        background: #cacaca; 
        font-weight: bold; 
        text-align: left;
        font-size: 14px;
        padding: 6px 8px;
        vertical-align: middle;
      }
      
      /* ポジション名列（薄いベージュ） */
      td.pos-name { 
        background: #f3ede2; 
        font-weight: bold; 
        text-align: left;
        white-space: nowrap;
        vertical-align: middle;
      }
      
      /* 人数列 */
      td.count { 
        background: #f3ede2; 
        text-align: center; 
        white-space: nowrap;
        font-weight: bold;
        vertical-align: middle;
      }
      
      /* スタッフ名セル（薄い黄色） */
      td.staff-cell { 
        background: #fffee8; 
        text-align: center;
        white-space: nowrap;
        vertical-align: middle;
      }
      
      /* 空セル */
      td.empty { 
        background: #ffffff; 
        white-space: nowrap;
        vertical-align: middle;
      }
      
      /* 備考列 */
      td.notes { 
        background: #ffffff; 
        text-align: left;
        vertical-align: middle;
      }
      
      /* ポジション名・人数列の固定幅 */
      td.pos-name, th.pos-name { width: 90px; min-width: 90px; }
      td.count, th.count { width: 40px; min-width: 40px; }
      /* スタッフ列は均等幅 */
      td.staff-cell, td.empty, td.col-header-num { width: auto; }
      table { table-layout: fixed; }

      /* 空白区切り行 */
      tr.spacer td { 
        border: none; 
        background: white; 
        height: 8px; 
        padding: 0;
      }

      /* タイムライン用 */
      td.tl-name { background: #f3ede2; font-weight: bold; text-align: left; min-width: 50px; }
      td.tl-pos { background: #fffee8; text-align: center; min-width: 50px; }
      td.tl-empty { background: #fff; min-width: 50px; }
      tr.tl-header td { background: #cacaca; font-weight: bold; text-align: center; padding: 6px 8px; }
      tr.tl-slot-header td { background: #f2a482; font-weight: bold; padding: 6px 8px; }
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
      <div>
        <div class="event-title">${event.name}</div>
        <div class="event-info">${dateStr}${event.venue ? '　' + event.venue : ''}</div>
      </div>
    </div>
  `;

  const timeSlots = ['開場中', '開演中', '終演後'];
  // 1行あたり最大10列固定
  const staffCols = 10;

  if (type === 'staff') {
    content += `<table>`;

    timeSlots.forEach((slot) => {
      const slotPositions = orderedPositions.filter((p) => normalizeSlot(p.time_slot) === slot);
      if (slotPositions.length === 0) return;

      const totalStaff = slotPositions.reduce((sum, p) => sum + (p.staff_names || []).length, 0);

      // 時間帯ヘッダー行
      content += `<tr class="slot-header">
        <td>${slot}</td>
        <td class="count-cell">${totalStaff}</td>
        ${Array(staffCols).fill('<td></td>').join('')}
      </tr>`;

      // カラムヘッダー
      content += `<tr class="col-header">
        <td class="pos-name">ポジション</td>
        <td class="count">人数</td>
        ${Array(staffCols).fill('').map((_, i) => `<td style="width:auto">${i + 1}</td>`).join('')}
      </tr>`;

      // 各ポジション
      // グループ分けのための空行挿入（前のposから役割が変わったら）
      let prevRole = null;
      slotPositions.forEach((pos) => {
        const names = pos.staff_names || [];
        const count = names.length;

        // 役割が変わったら空白行
        if (prevRole !== null && prevRole !== pos.role) {
          content += `<tr class="spacer"><td colspan="${staffCols + 3}"></td></tr>`;
        }
        prevRole = pos.role;

        // 10人ずつ行に分けて出力
        const rows = Math.max(1, Math.ceil(names.length / staffCols));
        for (let row = 0; row < rows; row++) {
          const rowNames = names.slice(row * staffCols, (row + 1) * staffCols);
          if (row === 0) {
            content += `<tr>
              <td class="pos-name" rowspan="${rows}">${pos.name || pos.role}</td>
              <td class="count" rowspan="${rows}">${count}</td>`;
          } else {
            content += `<tr>`;
          }
          for (let i = 0; i < staffCols; i++) {
            if (i < rowNames.length) {
              content += `<td class="staff-cell">${rowNames[i]}</td>`;
            } else {
              content += `<td class="empty"></td>`;
            }
          }
          content += `</tr>`;
        }
      });
    });

    // 未配置スタッフ
    const assignedNames = new Set(orderedPositions.flatMap(p => p.staff_names || []));
    const unassigned = orderedStaff.filter((s) => !assignedNames.has(s.name));
    if (unassigned.length > 0) {
      content += `<tr class="slot-header"><td>未配置スタッフ</td><td class="count-cell">${unassigned.length}</td>${Array(staffCols).fill('<td></td>').join('')}</tr>`;
      content += `<tr class="col-header"><td>スタッフ名</td><td colspan="${staffCols + 1}">備考</td></tr>`;
      unassigned.forEach((s) => {
        content += `<tr>
          <td class="pos-name">${s.name}</td>
          <td colspan="${staffCols + 1}" class="notes">${s.note || ''}</td>
        </tr>`;
      });
    }

    content += `</table>`;

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

    const event = await base44.asServiceRole.entities.Event.get(eventId);
    const positions = await base44.asServiceRole.entities.Position.filter({ event_id: eventId });
    const staff = await base44.asServiceRole.entities.Staff.filter({ event_id: eventId });

    const html = generateHTML(event, positions, staff, type);

    return Response.json({ html });
  } catch (error) {
    console.error('PDF Export Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});