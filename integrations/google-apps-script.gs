/**
 * EvalAIH — Webhook mẫu (Google Apps Script) lưu đóng góp chuyên gia vào Google Sheet
 * và gửi bản sao về email. Dùng làm "máy chủ trung tâm" tạm thời trước khi có backend HealthV.
 *
 * Cách dùng:
 *  1. Tạo Google Sheet mới → Extensions → Apps Script → dán file này.
 *  2. Deploy → New deployment → Web app → Execute as: Me · Who has access: Anyone.
 *  3. Copy URL web app vào EVALAI_CONFIG.KB_WEBHOOK_URL (assets/js/config.js).
 *  4. Lưu ý pháp lý: Google lưu dữ liệu ngoài Việt Nam — chỉ gửi dữ liệu đã khử định danh,
 *     và thông báo chuyển dữ liệu ra nước ngoài theo Luật 91/2025/QH15 nếu có dữ liệu cá nhân của chuyên gia.
 */
const NOTIFY_EMAIL = 'htsolutiontech@gmail.com';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(body.type || 'inbox') || ss.insertSheet(body.type || 'inbox');
    if (sheet.getLastRow() === 0) sheet.appendRow(['received_at', 'type', 'id', 'kind', 'specialty', 'status', 'author', 'json']);
    const entry = body.entry || body.payload || {};
    sheet.appendRow([
      new Date(), body.type || '', entry.id || body.ref || '', entry.kind || '', entry.specialty || '',
      entry.status || '', (entry.author && entry.author.name) || '', JSON.stringify(body)
    ]);
    MailApp.sendEmail(NOTIFY_EMAIL, '[EvalAIH webhook] ' + (body.type || 'record') + ' ' + (entry.id || ''),
      JSON.stringify(body, null, 2));
    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}
