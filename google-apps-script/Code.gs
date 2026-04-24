/**
 * Google Apps Script - Web App cho LMS DOSCOM
 * 
 * File này dùng để deploy lên Google Apps Script,
 * làm API trung gian đọc dữ liệu từ Google Sheets.
 * 
 * SPREADSHEET_ID: Lấy từ URL Google Sheets
 * URL mẫu: https://docs.google.com/spreadsheets/d/1tY95WGz1nRZWBF7ZtGPhN5maWMSCmD2bHVHPQX2PLlA/edit
 * => SPREADSHEET_ID = "1tY95WGz1nRZWBF7ZtGPhN5maWMSCmD2bHVHPQX2PLlA"
 */

const SPREADSHEET_ID = "1tY95WGz1nRZWBF7ZtGPhN5maWMSCmD2bHVHPQX2PLlA";

/**
 * Hàm xử lý GET request (Web App entry point)
 */
function doGet(e) {
  const action = e.parameter.action;

  let result;

  try {
    switch (action) {
      case "getProducts":
        result = getSheetData("products");
        break;
      case "getCourses":
        result = getSheetData("courses");
        break;
      case "getQuizzes":
        result = getSheetData("quizzes");
        break;
      case "getQuizQuestions":
        result = getSheetData("quiz_questions");
        break;
      case "getEmployees":
        result = getSheetData("employees");
        break;
      case "getSystemConfig":
        result = getSheetData("system_config");
        break;
      default:
        return jsonResponse({ success: false, error: "Action không hợp lệ: " + action });
    }

    return jsonResponse({ success: true, data: result });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * Đọc dữ liệu từ 1 sheet và trả về dạng array of objects
 * Row 1 = headers, Row 2+ = data
 */
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error("Không tìm thấy sheet: " + sheetName);
  }

  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return []; // Chỉ có header, không có data
  }

  // Row đầu tiên là headers
  const headers = data[0].map(function (h) {
    return h.toString().trim();
  });

  // Các row còn lại là data
  const result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    // Bỏ qua row trống (kiểm tra cột đầu tiên)
    if (!row[0] || row[0].toString().trim() === "") continue;

    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      if (headers[j]) { // Bỏ qua cột không có header
        obj[headers[j]] = row[j] !== undefined && row[j] !== null
          ? row[j].toString().trim()
          : "";
      }
    }
    result.push(obj);
  }

  return result;
}

/**
 * Helper: Trả về JSON response với CORS headers
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Test function - chạy thử trong Apps Script Editor
 */
function testGetProducts() {
  var data = getSheetData("products");
  Logger.log(JSON.stringify(data, null, 2));
}

function testGetCourses() {
  var data = getSheetData("courses");
  Logger.log(JSON.stringify(data, null, 2));
}

function testGetQuizzes() {
  var data = getSheetData("quizzes");
  Logger.log(JSON.stringify(data, null, 2));
}

function testGetQuizQuestions() {
  var data = getSheetData("quiz_questions");
  Logger.log(JSON.stringify(data, null, 2));
}
