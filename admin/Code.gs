// ====== CẤU HÌNH TÊN CÁC TRANG TÍNH ======
const SHEET_CUSTOMERS = "customers";
const SHEET_ORDERS = "orders";
const SHEET_PRODUCTS = "products";

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss.getSheetByName(SHEET_CUSTOMERS)) {
    var sheetCus = ss.insertSheet(SHEET_CUSTOMERS);
    sheetCus.appendRow(["Thời gian", "Họ Tên", "Số điện thoại", "Địa chỉ", "Size", "Sản phẩm", "Giá tiền"]);
  }
  if (!ss.getSheetByName(SHEET_ORDERS)) {
    var sheetOrd = ss.insertSheet(SHEET_ORDERS);
    sheetOrd.appendRow(["Ngày mua", "Khách hàng", "Sản phẩm", "Số tiền (VNĐ)", "Trạng thái", "Mã GD Ngân hàng"]);
  }
  if (!ss.getSheetByName(SHEET_PRODUCTS)) {
    var sheetProd = ss.insertSheet(SHEET_PRODUCTS);
    sheetProd.appendRow(["Tên Sản Phẩm", "Giá (VNĐ)", "Mô tả", "Tồn kho"]);
  }
}

// Bật mí cho Admin Panel biết các cột chuẩn để làm Header
function getHeaders(sheetName) {
  if(sheetName === SHEET_CUSTOMERS) return ["Thời gian", "Họ Tên", "Số điện thoại", "Địa chỉ", "Size", "Sản phẩm", "Giá tiền"];
  if(sheetName === SHEET_ORDERS) return ["Ngày mua", "Khách hàng", "Sản phẩm", "Số tiền (VNĐ)", "Trạng thái", "Mã GD Ngân hàng"];
  if(sheetName === SHEET_PRODUCTS) return ["Tên Sản Phẩm", "Giá (VNĐ)", "Mô tả", "Tồn kho"];
  return [];
}

// Hàm chuẩn hóa response CORS Json
function responseJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Hàm giải quyết GET Requests
function doGet(e) {
  setupSheets();
  var action = e.parameter.action;
  
  try {
    // API: WEBSITE HỎI "TIỀN VỀ CHƯA?"
    if (action === 'check_payment') {
      var sheetOrd = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ORDERS);
      if (!sheetOrd) return responseJson({ verified: false });

      var lastRow = sheetOrd.getLastRow();
      if (lastRow <= 1) return responseJson({ verified: false });
      
      var dataRow = sheetOrd.getRange(lastRow, 1, 1, 6).getValues()[0];
      if (dataRow[4] && dataRow[4].toString().toUpperCase() === "ĐÃ THANH TOÁN") {
         return responseJson({ verified: true, amount: dataRow[3] });
      }
      return responseJson({ verified: false });
    }

    // API: ADMIN LẤY DỮ LIỆU BẢNG (READ)
    if (action === 'getRows') {
      var sheetName = e.parameter.sheet;
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      if (!sheet) return responseJson({ success: true, data: [] });

      var data = sheet.getDataRange().getValues();
      var result = [];
      for(var i = 1; i < data.length; i++) {
        result.push({ row: i + 1, cols: data[i] }); // row 1-based in Sheet, i+1 b/c of header
      }
      return responseJson({ success: true, data: result });
    }
  } catch(err) {
    return responseJson({ success: false, error: err.message });
  }
  
  return ContentService.createTextOutput("Hệ thống Webhook & API hoạt động bình thường!").setMimeType(ContentService.MimeType.TEXT);
}

// Hàm giải quyết POST Requests
function doPost(e) {
  // Fix CORS Headers Support manually for POST if needed, but ContentService defaults to generic
  setupSheets();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    // -------------------------------------------------------------
    // LUỒNG 1: SEPAY BÁO TIỀN VỀ (WEBHOOK JSON)
    // -------------------------------------------------------------
    if (e.postData && e.postData.contents) {
      try {
        var payload = JSON.parse(e.postData.contents);
        
        // CATCH SEPAY
        if (payload.gateway === "Sepay" && payload.transferType === "in") {
          var sheetOrders = ss.getSheetByName(SHEET_ORDERS);
          var newOrder = [
            payload.transactionDate || new Date().toLocaleString(), 
            payload.content || "Không có nội dung", 
            "Váy LADY GRACE", // Sản phẩm mặc định
            payload.transferAmount || 0,
            "Đã Thanh Toán",
            payload.referenceCode || "N/A" 
          ];
          sheetOrders.appendRow(newOrder);
          return responseJson({success: true, message: "Đã ghi nhận đơn hàng SEPAY"});
        }
        
        // -------------------------------------------------------------
        // LUỒNG 2: ADMIN PANEL GỌI ĐẾN (CREATE / UPDATE / DELETE) 
        // -------------------------------------------------------------
        if(payload.action) {
           var action = payload.action;
           var sheetName = payload.sheet;
           var sheet = ss.getSheetByName(sheetName);
           
           if(action === 'create') {
             sheet.appendRow(payload.data);
             
             // LOGIC ĐẶC BIỆT: NẾU THÊM ĐƠN HÀNG MỚI -> TRỪ TỒN KHO SẢN PHẨM & TÍNH TIỀN
             if (sheetName === SHEET_ORDERS) {
                var productName = payload.data[2]; // Cột Sản Phẩm
                var productsSheet = ss.getSheetByName(SHEET_PRODUCTS);
                var pData = productsSheet.getDataRange().getValues();
                
                for(var i=1; i<pData.length; i++) {
                   // Tìm sản phẩm trùng tên
                   if(pData[i][0] == productName) {
                      var currentStock = parseInt(pData[i][3]) || 0;
                      if(currentStock > 0) {
                        productsSheet.getRange(i+1, 4).setValue(currentStock - 1);
                      }
                      break;
                   }
                }
             }

             return responseJson({success: true, message: "Đã thêm mới thành công"});
             
           } else if (action === 'update') {
             var rowNum = parseInt(payload.row);
             // Ghi đè vào dòng tương ứng (chú ý index 1-based, bỏ qua header nếu row <=1)
             if(rowNum > 1 && payload.data.length > 0) {
               sheet.getRange(rowNum, 1, 1, payload.data.length).setValues([payload.data]);
             }
             return responseJson({success: true, message: "Đã cập nhật thành công"});

           } else if (action === 'delete') {
             var rowNum = parseInt(payload.row);
             if(rowNum > 1) {
               sheet.deleteRow(rowNum);
             }
             return responseJson({success: true, message: "Đã xóa vĩnh viễn"});
           }
         }
      } catch (jsonError) {
        // Lỗi parse hoặc chạy JSON -> rớt xuống check URL encoded
      }
    }

    // -------------------------------------------------------------
    // LUỒNG 3: FORM TRÊN WEBSITE ĐĂNG KÝ (URL Form Encoded)
    // -------------------------------------------------------------
    if (e.parameter && (e.parameter.fullname || e.parameter.phone)) {
      var sheetCustomers = ss.getSheetByName(SHEET_CUSTOMERS);
      var newCustomer = [
        e.parameter.orderTime || new Date().toLocaleString(),
        e.parameter.fullname || "Khách Vãng Lai",
        e.parameter.phone || "",
        e.parameter.address || "",
        e.parameter.size || "",
        e.parameter.product || "",
        e.parameter.price || ""
      ];
      sheetCustomers.appendRow(newCustomer);
      return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
    }

    return responseJson({success: false, error: "Dữ liệu không khớp bất cứ định dạng nào"});

  } catch(error) {
    return responseJson({success: false, error: error.message});
  }
}
