#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { FakturowniaClient } from "./fakturownia-client.js";

// ── Configuration ────────────────────────────────────────────

const API_TOKEN = process.env.FAKTUROWNIA_API_TOKEN;
const DOMAIN = process.env.FAKTUROWNIA_DOMAIN;

if (!API_TOKEN || !DOMAIN) {
  console.error(
    "Required environment variables: FAKTUROWNIA_API_TOKEN, FAKTUROWNIA_DOMAIN",
  );
  process.exit(1);
}

const client = new FakturowniaClient({ apiToken: API_TOKEN, domain: DOMAIN });

// ── Helper ───────────────────────────────────────────────────

function result(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

// ── MCP Server ───────────────────────────────────────────────

const server = new McpServer({
  name: "fakturownia",
  version: "1.0.0",
});

// ═══════════════════════════════════════════════════════════════
//  INVOICES
// ═══════════════════════════════════════════════════════════════

server.tool(
  "list_invoices",
  "List invoices with optional filters (page, period, kind, status, etc.)",
  {
    page: z.string().optional().describe("Page number"),
    per_page: z.string().optional().describe("Items per page (max 100)"),
    period: z
      .string()
      .optional()
      .describe(
        "Period: last_12_months, this_month, last_month, this_year, last_year, all, more",
      ),
    date_from: z.string().optional().describe("Start date (YYYY-MM-DD) when period=more"),
    date_to: z.string().optional().describe("End date (YYYY-MM-DD) when period=more"),
    kind: z.string().optional().describe("Invoice type: vat, proforma, correction, etc."),
    status: z.string().optional().describe("Status: issued, sent, paid, partial, rejected"),
    include_positions: z.string().optional().describe("Include line items: true/false"),
    income: z.string().optional().describe("1 = income, 0 = expense"),
  },
  async (params) => {
    try {
      const queryParams: Record<string, string> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) queryParams[k] = v;
      }
      const data = await client.listInvoices(queryParams);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "get_invoice",
  "Get a single invoice by ID",
  {
    id: z.number().describe("Invoice ID"),
    include_positions: z.string().optional().describe("Include line items: true/false"),
  },
  async ({ id, include_positions }) => {
    try {
      const params: Record<string, string> = {};
      if (include_positions) params.include_positions = include_positions;
      const data = await client.getInvoice(id, params);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "create_invoice",
  "Create a new invoice. Provide invoice object with kind, positions, buyer info, etc.",
  {
    invoice: z
      .string()
      .describe(
        "JSON string of the invoice object (kind, positions, buyer_name, buyer_tax_no, sell_date, issue_date, etc.)",
      ),
    gov_save_and_send: z
      .boolean()
      .optional()
      .describe("Send to KSeF after saving"),
  },
  async ({ invoice, gov_save_and_send }) => {
    try {
      const invoiceData = JSON.parse(invoice);
      const data = await client.createInvoice(invoiceData, gov_save_and_send);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "update_invoice",
  "Update an existing invoice",
  {
    id: z.number().describe("Invoice ID"),
    invoice: z.string().describe("JSON string of fields to update"),
  },
  async ({ id, invoice }) => {
    try {
      const invoiceData = JSON.parse(invoice);
      const data = await client.updateInvoice(id, invoiceData);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "delete_invoice",
  "Delete an invoice by ID",
  { id: z.number().describe("Invoice ID") },
  async ({ id }) => {
    try {
      const data = await client.deleteInvoice(id);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "send_invoice_email",
  "Send an invoice by email",
  { id: z.number().describe("Invoice ID") },
  async ({ id }) => {
    try {
      const data = await client.sendInvoiceByEmail(id);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "change_invoice_status",
  "Change the status of an invoice",
  {
    id: z.number().describe("Invoice ID"),
    status: z
      .string()
      .describe("New status: issued, sent, paid, partial, rejected"),
  },
  async ({ id, status }) => {
    try {
      const data = await client.changeInvoiceStatus(id, status);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "get_invoice_pdf_url",
  "Get direct PDF download URL for an invoice",
  { id: z.number().describe("Invoice ID") },
  async ({ id }) => {
    try {
      const url = await client.getInvoicePdfUrl(id);
      return result({ pdf_url: url });
    } catch (err) {
      return errorResult(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════
//  KSeF
// ═══════════════════════════════════════════════════════════════

server.tool(
  "send_invoice_to_ksef",
  "Send an existing invoice to the KSeF system",
  { id: z.number().describe("Invoice ID") },
  async ({ id }) => {
    try {
      const data = await client.sendInvoiceToKsef(id);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "get_invoice_ksef_status",
  "Get KSeF status for an invoice (gov_status, gov_id, errors, etc.)",
  { id: z.number().describe("Invoice ID") },
  async ({ id }) => {
    try {
      const data = await client.getInvoiceKsefStatus(id);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════
//  CLIENTS
// ═══════════════════════════════════════════════════════════════

server.tool(
  "list_clients",
  "List clients with optional search filters",
  {
    page: z.string().optional().describe("Page number"),
    per_page: z.string().optional().describe("Items per page (max 100)"),
    name: z.string().optional().describe("Search by name"),
    email: z.string().optional().describe("Search by email"),
    tax_no: z.string().optional().describe("Search by NIP"),
    shortcut: z.string().optional().describe("Search by shortcut"),
    external_id: z.string().optional().describe("Search by external ID"),
  },
  async (params) => {
    try {
      const queryParams: Record<string, string> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) queryParams[k] = v;
      }
      const data = await client.listClients(queryParams);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "get_client",
  "Get a single client by ID",
  { id: z.number().describe("Client ID") },
  async ({ id }) => {
    try {
      const data = await client.getClient(id);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "create_client",
  "Create a new client. Only name is required.",
  {
    client_data: z
      .string()
      .describe(
        "JSON string of client object (name, tax_no, city, street, email, etc.)",
      ),
  },
  async ({ client_data }) => {
    try {
      const clientObj = JSON.parse(client_data);
      const data = await client.createClient(clientObj);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "update_client",
  "Update an existing client",
  {
    id: z.number().describe("Client ID"),
    client_data: z.string().describe("JSON string of fields to update"),
  },
  async ({ id, client_data }) => {
    try {
      const clientObj = JSON.parse(client_data);
      const data = await client.updateClient(id, clientObj);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "delete_client",
  "Delete a client by ID",
  { id: z.number().describe("Client ID") },
  async ({ id }) => {
    try {
      const data = await client.deleteClient(id);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════
//  PRODUCTS
// ═══════════════════════════════════════════════════════════════

server.tool(
  "list_products",
  "List products with optional filters",
  {
    page: z.string().optional().describe("Page number"),
    per_page: z.string().optional().describe("Items per page (max 100)"),
    warehouse_id: z.string().optional().describe("Filter by warehouse ID"),
    date_from: z
      .string()
      .optional()
      .describe("Products changed after this date (YYYY-MM-DD)"),
  },
  async (params) => {
    try {
      const queryParams: Record<string, string> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) queryParams[k] = v;
      }
      const data = await client.listProducts(queryParams);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "get_product",
  "Get a single product by ID",
  { id: z.number().describe("Product ID") },
  async ({ id }) => {
    try {
      const data = await client.getProduct(id);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "create_product",
  "Create a new product",
  {
    product: z
      .string()
      .describe(
        "JSON string of product object (name, code, price_net, tax, etc.)",
      ),
  },
  async ({ product }) => {
    try {
      const productData = JSON.parse(product);
      const data = await client.createProduct(productData);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "update_product",
  "Update an existing product",
  {
    id: z.number().describe("Product ID"),
    product: z.string().describe("JSON string of fields to update"),
  },
  async ({ id, product }) => {
    try {
      const productData = JSON.parse(product);
      const data = await client.updateProduct(id, productData);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════
//  PAYMENTS
// ═══════════════════════════════════════════════════════════════

server.tool(
  "list_payments",
  "List payments with optional filters",
  {
    page: z.string().optional().describe("Page number"),
    per_page: z.string().optional().describe("Items per page"),
    include: z
      .string()
      .optional()
      .describe("Set to 'invoices' to include linked invoice data"),
  },
  async (params) => {
    try {
      const queryParams: Record<string, string> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) queryParams[k] = v;
      }
      const data = await client.listPayments(queryParams);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "get_payment",
  "Get a single payment by ID",
  { id: z.number().describe("Payment ID") },
  async ({ id }) => {
    try {
      const data = await client.getPayment(id);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "create_payment",
  "Create a new payment",
  {
    payment: z
      .string()
      .describe(
        "JSON string of payment object (name, price, invoice_id or invoice_ids, paid, kind, etc.)",
      ),
  },
  async ({ payment }) => {
    try {
      const paymentData = JSON.parse(payment);
      const data = await client.createPayment(paymentData);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "update_payment",
  "Update an existing payment",
  {
    id: z.number().describe("Payment ID"),
    payment: z.string().describe("JSON string of fields to update"),
  },
  async ({ id, payment }) => {
    try {
      const paymentData = JSON.parse(payment);
      const data = await client.updatePayment(id, paymentData);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "delete_payment",
  "Delete a payment by ID",
  { id: z.number().describe("Payment ID") },
  async ({ id }) => {
    try {
      const data = await client.deletePayment(id);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════
//  WAREHOUSE DOCUMENTS
// ═══════════════════════════════════════════════════════════════

server.tool(
  "list_warehouse_documents",
  "List warehouse documents (PZ, WZ, MM)",
  {
    page: z.string().optional().describe("Page number"),
    per_page: z.string().optional().describe("Items per page"),
  },
  async (params) => {
    try {
      const queryParams: Record<string, string> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) queryParams[k] = v;
      }
      const data = await client.listWarehouseDocuments(queryParams);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "get_warehouse_document",
  "Get a warehouse document by ID",
  { id: z.number().describe("Warehouse document ID") },
  async ({ id }) => {
    try {
      const data = await client.getWarehouseDocument(id);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "create_warehouse_document",
  "Create a warehouse document (PZ, WZ, MM)",
  {
    document: z
      .string()
      .describe(
        "JSON string: kind (pz/wz/mm), warehouse_id, issue_date, warehouse_actions[], etc.",
      ),
  },
  async ({ document }) => {
    try {
      const docData = JSON.parse(document);
      const data = await client.createWarehouseDocument(docData);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "update_warehouse_document",
  "Update a warehouse document",
  {
    id: z.number().describe("Warehouse document ID"),
    document: z.string().describe("JSON string of fields to update"),
  },
  async ({ id, document }) => {
    try {
      const docData = JSON.parse(document);
      const data = await client.updateWarehouseDocument(id, docData);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "delete_warehouse_document",
  "Delete a warehouse document by ID",
  { id: z.number().describe("Warehouse document ID") },
  async ({ id }) => {
    try {
      const data = await client.deleteWarehouseDocument(id);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════
//  CATEGORIES
// ═══════════════════════════════════════════════════════════════

server.tool(
  "list_categories",
  "List all categories",
  {},
  async () => {
    try {
      const data = await client.listCategories();
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "create_category",
  "Create a new category",
  {
    category: z.string().describe("JSON string of category object (name, etc.)"),
  },
  async ({ category }) => {
    try {
      const catData = JSON.parse(category);
      const data = await client.createCategory(catData);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════
//  WAREHOUSES
// ═══════════════════════════════════════════════════════════════

server.tool(
  "list_warehouses",
  "List all warehouses",
  {},
  async () => {
    try {
      const data = await client.listWarehouses();
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "create_warehouse",
  "Create a new warehouse",
  {
    warehouse: z.string().describe("JSON string of warehouse object (name, etc.)"),
  },
  async ({ warehouse }) => {
    try {
      const whData = JSON.parse(warehouse);
      const data = await client.createWarehouse(whData);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════
//  DEPARTMENTS
// ═══════════════════════════════════════════════════════════════

server.tool(
  "list_departments",
  "List all company departments",
  {},
  async () => {
    try {
      const data = await client.listDepartments();
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "create_department",
  "Create a new department",
  {
    department: z
      .string()
      .describe("JSON string of department object (name, shortcut, etc.)"),
  },
  async ({ department }) => {
    try {
      const deptData = JSON.parse(department);
      const data = await client.createDepartment(deptData);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════
//  ACCOUNT
// ═══════════════════════════════════════════════════════════════

server.tool(
  "get_account_info",
  "Get current account information",
  {},
  async () => {
    try {
      const data = await client.getAccountInfo();
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
  },
);

// ── Start ────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
