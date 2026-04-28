// =====================================================
// GOOGLE APPS SCRIPT - YoungTiger Orders Webhook
// =====================================================
//
// CARA SETUP:
//
// 1. Buka Google Sheets baru — namakan "YoungTiger Orders"
//
// 2. Pada Row 1 (header), tulis column ni:
//    A1: Tarikh
//    B1: Nama
//    C1: Email
//    D1: Telefon
//    E1: Alamat
//    F1: Bandar
//    G1: Negeri
//    H1: Poskod
//    I1: Pakej
//    J1: Jersey Details
//    K1: Custom (helai)
//    L1: Harga (RM)
//    M1: Order Ref
//    N1: Payment Method
//    O1: Status
//
// 3. Extensions > Apps Script
//
// 4. Delete code default, paste semua code bawah ni
//
// 5. Deploy > New Deployment
//    - Type: Web App
//    - Execute as: Me
//    - Who has access: Anyone
//    - Deploy
//
// 6. Copy URL yang keluar — letak dalam Cloudflare env var
//    GOOGLE_SHEET_WEBHOOK
//
// =====================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    // Callback dari ToyyibPay — update status je
    if (data.updateOnly && data.billCode) {
      var range = sheet.getDataRange();
      var values = range.getValues();
      for (var i = 1; i < values.length; i++) {
        if (values[i][12] === data.billCode) { // Column M = Order Ref
          sheet.getRange(i + 1, 15).setValue(data.status); // Column O = Status
          break;
        }
      }
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'updated' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Order baru — tambah row
    sheet.appendRow([
      new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' }),
      data.name || '',
      data.email || '',
      data.phone || '',
      data.address || '',
      data.city || '',
      data.state || '',
      data.postcode || '',
      data.package || '',
      data.jerseyDetails || '',
      data.customCount || 0,
      data.price || 0,
      data.billCode || '-',
      data.paymentMethod || '',
      data.status || 'Pending'
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
