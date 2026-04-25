import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  JSONRPCMessageSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import sqlite3pkg from "sqlite3";
import { open } from "sqlite";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import fs from "fs/promises";

const { Database } = sqlite3pkg;
const DB_PATH = "/var/www/lamaiv1/brain.db";
const PORT = 3001;

const PUBLIC_URL = "https://mcp.lamai.vn";
const MESSAGES_ENDPOINT = `${PUBLIC_URL}/messages`;

/**
 * Manual SSE Transport to bypass SDK limitations with absolute URLs and proxies.
 */
class ManualSSETransport implements Transport {
  public onmessage?: (message: any) => void;
  public onclose?: () => void;
  public onerror?: (error: Error) => void;
  public sessionId: string;
  private res: express.Response;

  constructor(res: express.Response, sessionId: string, endpoint: string) {
    this.res = res;
    this.sessionId = sessionId;
    
    // Set headers manually for maximum compatibility
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    });

    // Send the discovery event immediately with the absolute URL
    res.write(`event: endpoint\ndata: ${endpoint}?sessionId=${sessionId}\n\n`);
    console.log(`[SSE] Handshake sent for session ${sessionId}`);
  }

  async start() {}
  async connect() {}
  async close() { 
    this.res.end(); 
    if (this.onclose) this.onclose(); 
  }
  
  async send(message: any) {
    this.res.write(`event: message\ndata: ${JSON.stringify(message)}\n\n`);
  }
}

const transports: Record<string, ManualSSETransport> = {};

function createServer(): Server {
  const server = new Server(
    { name: "lamai", version: "1.1.7" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.log("[MCP] ListTools called");
    return {
      tools: [
        {
          name: "today_orders",
          description: "Báo cáo hôm nay: Có bao nhiêu đơn hàng và bao nhiêu khách đăng ký mới. Dùng khi user hỏi 'hôm nay có mấy đơn', 'tình hình hôm nay'.",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "list_waitlist",
          description: "Danh sách khách mới: Tên và SĐT của 10 người đăng ký mới nhất hôm nay. Dùng khi user hỏi 'ai mới điền form', 'danh sách khách hôm nay'.",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "update_hero",
          description: "Đổi tiêu đề (hero title) trên trang chủ (landing page). Dùng khi user yêu cầu 'đổi tiêu đề thành X', 'cập nhật banner', 'thay chữ flash sale'.",
          inputSchema: {
            type: "object",
            properties: {
              new_title: {
                type: "string",
                description: "Nội dung tiêu đề mới (vd: 'Flash sale cuối tuần 30%')"
              }
            },
            required: ["new_title"]
          }
        },
        {
          name: "get_business_summary",
          description: "Báo cáo tổng quan tình hình kinh doanh (Tổng đơn, đơn thành công, doanh thu, khách mới). Có thể hỏi về hôm nay, hôm qua, tuần này, 24h qua.",
          inputSchema: {
            type: "object",
            properties: {
              timeframe: {
                type: "string",
                enum: ["today", "yesterday", "last_24h", "this_week", "this_month", "all_time"],
                description: "Khoảng thời gian cần báo cáo"
              }
            },
            required: ["timeframe"]
          }
        },
        {
          name: "biz__check_new_orders",
          description: "Kiểm tra đơn hàng mới trong 15 phút gần đây. Trả về định dạng ngắn gọn cho Telegram.",
          inputSchema: { type: "object", properties: {} }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    console.log(`[MCP] CallTool: ${toolName}`);

    if (toolName === "today_orders") {
      const db = await open({ filename: DB_PATH, driver: Database });
      // Múi giờ Việt Nam +7
      const orders = await db.get(`
        SELECT COUNT(*) as count FROM orders 
        WHERE strftime('%Y-%m-%d', purchase_date) = strftime('%Y-%m-%d', 'now', '+7 hours')
      `);
      const waitlist = await db.get(`
        SELECT COUNT(*) as count FROM customers 
        WHERE strftime('%Y-%m-%d', registration_date) = strftime('%Y-%m-%d', 'now', '+7 hours')
      `);
      await db.close();

      const orderCount = orders?.count ?? 0;
      const waitlistCount = waitlist?.count ?? 0;

      let msg = `Bao cao LAMAI hom nay:\n`;
      msg += `- Don hang: ${orderCount}\n`;
      msg += `- Khach moi: ${waitlistCount}\n`;
      
      if (orderCount > 0) msg += `\nHom nay co don moi roi!`;
      else msg += `\nHom nay chua co don moi.`;

      return { content: [{ type: "text", text: msg }] };
    }

    if (toolName === "list_waitlist") {
      const db = await open({ filename: DB_PATH, driver: Database });
      const rows = await db.all(`
        SELECT name, phone FROM customers 
        WHERE strftime('%Y-%m-%d', registration_date) = strftime('%Y-%m-%d', 'now', '+7 hours')
        ORDER BY id DESC LIMIT 10
      `);
      await db.close();

      if (!rows || rows.length === 0) {
        return { content: [{ type: "text", text: "Hôm nay chưa có khách mới nào đăng ký anh ạ." }] };
      }

      let msg = "Danh sách khách hàng mới hôm nay:\n";
      rows.forEach((r, i) => {
        msg += `${i+1}. ${r.name} - ${r.phone || 'N/A'}\n`;
      });
      return { content: [{ type: "text", text: msg }] };
    }

    if (toolName === "update_hero") {
      const newTitle = (request.params.arguments as any)?.new_title;
      if (!newTitle || typeof newTitle !== "string") {
        return { content: [{ type: "text", text: "Lỗi: Thiếu tham số new_title" }], isError: true };
      }

      const indexPath = "/var/www/lamaiv1/index.html";
      try {
        let html = await fs.readFile(indexPath, "utf-8");
        const h1Regex = /(<h1[^>]*>)([\s\S]*?)(<\/h1>)/i;
        
        if (h1Regex.test(html)) {
          html = html.replace(h1Regex, `$1${newTitle}$3`);
          await fs.writeFile(indexPath, html, "utf-8");
          return { content: [{ type: "text", text: `Đã đổi tiêu đề trang chủ thành: "${newTitle}". Khách hàng refresh website là thấy ngay!` }] };
        } else {
          return { content: [{ type: "text", text: "Lỗi: Không tìm thấy thẻ <h1> trên trang chủ." }], isError: true };
        }
      } catch (err: any) {
        return { content: [{ type: "text", text: `Lỗi khi sửa file: ${err.message}` }], isError: true };
      }
    }

    if (toolName === "get_business_summary") {
      const tf = (request.params.arguments as any)?.timeframe || "today";
      let dateConditionOrder = "";
      let dateConditionCustomer = "";
      let label = "Hom nay";

      if (tf === "today") {
        dateConditionOrder = "WHERE strftime('%Y-%m-%d', purchase_date) = strftime('%Y-%m-%d', 'now', '+7 hours')";
        dateConditionCustomer = "WHERE strftime('%Y-%m-%d', registration_date) = strftime('%Y-%m-%d', 'now', '+7 hours')";
      } else if (tf === "yesterday") {
        dateConditionOrder = "WHERE strftime('%Y-%m-%d', purchase_date) = strftime('%Y-%m-%d', 'now', '+7 hours', '-1 day')";
        dateConditionCustomer = "WHERE strftime('%Y-%m-%d', registration_date) = strftime('%Y-%m-%d', 'now', '+7 hours', '-1 day')";
        label = "Hom qua";
      } else if (tf === "last_24h") {
        dateConditionOrder = "WHERE purchase_date >= datetime('now', '+7 hours', '-24 hours')";
        dateConditionCustomer = "WHERE registration_date >= datetime('now', '+7 hours', '-24 hours')";
        label = "24h qua";
      } else if (tf === "this_week") {
        dateConditionOrder = "WHERE date(purchase_date) >= date('now', '+7 hours', '-7 days')";
        dateConditionCustomer = "WHERE date(registration_date) >= date('now', '+7 hours', '-7 days')";
        label = "7 ngay qua";
      } else if (tf === "this_month") {
        dateConditionOrder = "WHERE strftime('%Y-%m', purchase_date) = strftime('%Y-%m', 'now', '+7 hours')";
        dateConditionCustomer = "WHERE strftime('%Y-%m', registration_date) = strftime('%Y-%m', 'now', '+7 hours')";
        label = "Thang nay";
      } else {
        dateConditionOrder = ""; 
        dateConditionCustomer = "";
        label = "Tu truoc den nay";
      }

      const db = await open({ filename: DB_PATH, driver: Database });
      
      const ordersInfo = await db.get(`
        SELECT COUNT(*) as total_orders, 
               SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_orders,
               SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END) as total_revenue
        FROM orders ${dateConditionOrder}
      `);
      
      const customerInfo = await db.get(`
        SELECT COUNT(*) as new_customers 
        FROM customers ${dateConditionCustomer}
      `);
      await db.close();

      const totalOrders = ordersInfo?.total_orders ?? 0;
      const successfulOrders = ordersInfo?.successful_orders ?? 0;
      const totalRevenue = ordersInfo?.total_revenue ?? 0;
      const newCustomers = customerInfo?.new_customers ?? 0;

      const formattedRevenue = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue);

      let msg = `Bao cao kinh doanh (${label}):\n`;
      msg += `- Tong so don hang: ${totalOrders}\n`;
      msg += `- Don thanh cong: ${successfulOrders}\n`;
      msg += `- Doanh thu: ${formattedRevenue}\n`;
      msg += `- Khach hang moi: ${newCustomers}\n`;

      return { content: [{ type: "text", text: msg }] };
    }

    if (toolName === "biz__check_new_orders") {
      const db = await open({ filename: DB_PATH, driver: Database });
      
      // Query new orders in the last 15 minutes
      const newOrders = await db.all(`
        SELECT o.amount, c.name as customer_name
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.purchase_date >= datetime('now', '+7 hours', '-15 minutes')
        ORDER BY o.purchase_date DESC
      `);

      // Query total orders for today
      const todayStats = await db.get(`
        SELECT COUNT(*) as count FROM orders 
        WHERE strftime('%Y-%m-%d', purchase_date) = strftime('%Y-%m-%d', 'now', '+7 hours')
      `);

      await db.close();

      if (!newOrders || newOrders.length === 0) {
        return { content: [{ type: "text", text: "Không có đơn hàng mới nào trong 15 phút qua." }] };
      }

      const totalToday = todayStats?.count ?? 0;
      let msg = "";
      
      newOrders.forEach(order => {
        const amountFormatted = new Intl.NumberFormat('vi-VN').format(order.amount);
        msg += `Đơn mới: ${order.customer_name}, ${amountFormatted}đ, 1 sp. `;
      });

      msg += `Tổng hôm nay: ${totalToday} đơn.`;

      return { content: [{ type: "text", text: msg }] };
    }

    return { content: [{ type: "text", text: "Tool not found" }], isError: true };
  });

  return server;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => res.send("LAMAI MCP Server v1.1.6 OK"));

app.get("/sse", async (req, res) => {
  const sessionId = crypto.randomUUID();
  console.log(`[SSE] New connection: ${sessionId} from ${req.ip}`);
  
  const transport = new ManualSSETransport(res, sessionId, MESSAGES_ENDPOINT);
  transports[sessionId] = transport;

  const server = createServer();
  
  res.on("close", () => {
    console.log(`[SSE] Disconnected: ${sessionId}`);
    delete transports[sessionId];
  });

  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  let transport = transports[sessionId];
  
  // Xử lý Race Condition: Chờ nhẹ nếu session chưa kịp đăng ký
  if (!transport) {
    await new Promise(resolve => setTimeout(resolve, 100));
    transport = transports[sessionId];
  }

  if (!transport) {
    console.error(`[MSG] Session ${sessionId} not found`);
    return res.status(400).send("Session not found");
  }

  try {
    const message = JSONRPCMessageSchema.parse(req.body);
    if (transport.onmessage) {
      transport.onmessage(message);
    }
    res.status(202).send("Accepted");
  } catch (err: any) {
    console.error(`[MSG] Invalid message: ${err.message}`);
    res.status(400).send(`Invalid message: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 LAMAI MCP Server v1.1.6 (Manual Transport)`);
  console.log(`🔗 Public URL: ${PUBLIC_URL}/sse`);
  console.log(`========================================\n`);
});
