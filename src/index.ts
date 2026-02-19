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

// ── Helpers ─────────────────────────────────────────────────

/** Wrap successful response as MCP tool result. */
function result(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

/** Wrap error as MCP tool error result. */
function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

/**
 * Safely parse a JSON string and validate it is a non-null object.
 * Throws a descriptive error on invalid input.
 */
function parseJsonObject(raw: string, label: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `Invalid JSON for "${label}": ${raw.length > 200 ? raw.slice(0, 200) + "…" : raw}`,
    );
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      `"${label}" must be a JSON object (got ${parsed === null ? "null" : Array.isArray(parsed) ? "array" : typeof parsed})`,
    );
  }
  return parsed as Record<string, unknown>;
}

/**
 * Strip undefined values from params and return a clean query params object. (#8)
 */
function buildQueryParams(
  params: Record<string, string | undefined>,
): Record<string, string> {
  const queryParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) queryParams[k] = v;
  }
  return queryParams;
}

/**
 * Wrap a tool handler with standard try/catch error handling. (#9)
 */
function handleTool<P>(
  fn: (params: P) => Promise<unknown> | unknown,
): (params: P) => Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  return async (params: P) => {
    try {
      const data = await fn(params);
      return result(data);
    } catch (err) {
      return errorResult(err);
    }
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
  handleTool((params) => client.listInvoices(buildQueryParams(params))),
);

server.tool(
  "get_invoice",
  "Get a single invoice by ID",
  {
    id: z.number().describe("Invoice ID"),
    include_positions: z.string().optional().describe("Include line items: true/false"),
  },
  handleTool(({ id, include_positions }) => {
    const params: Record<string, string> = {};
    if (include_positions) params.include_positions = include_positions;
    return client.getInvoice(id, params);
  }),
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
  handleTool(({ invoice, gov_save_and_send }) => {
    const invoiceData = parseJsonObject(invoice, "invoice");
    return client.createInvoice(invoiceData, gov_save_and_send);
  }),
);

server.tool(
  "update_invoice",
  "Update an existing invoice",
  {
    id: z.number().describe("Invoice ID"),
    invoice: z.string().describe("JSON string of fields to update"),
  },
  handleTool(({ id, invoice }) => {
    const invoiceData = parseJsonObject(invoice, "invoice");
    return client.updateInvoice(id, invoiceData);
  }),
);

server.tool(
  "delete_invoice",
  "Delete an invoice by ID",
  { id: z.number().describe("Invoice ID") },
  handleTool(({ id }) => client.deleteInvoice(id)),
);

server.tool(
  "send_invoice_email",
  "Send an invoice by email",
  { id: z.number().describe("Invoice ID") },
  handleTool(({ id }) => client.sendInvoiceByEmail(id)),
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
  handleTool(({ id, status }) => client.changeInvoiceStatus(id, status)),
);

server.tool(
  "get_invoice_pdf_url",
  "Get PDF download URL for an invoice (URL requires authentication, token is not exposed)",
  { id: z.number().describe("Invoice ID") },
  handleTool(({ id }) => client.getInvoicePdfUrl(id)),
);

// ═══════════════════════════════════════════════════════════════
//  KSeF
// ═══════════════════════════════════════════════════════════════

server.tool(
  "send_invoice_to_ksef",
  "Send an existing invoice to the KSeF system",
  { id: z.number().describe("Invoice ID") },
  handleTool(({ id }) => client.sendInvoiceToKsef(id)),
);

server.tool(
  "get_invoice_ksef_status",
  "Get KSeF status for an invoice (gov_status, gov_id, errors, etc.)",
  { id: z.number().describe("Invoice ID") },
  handleTool(({ id }) => client.getInvoiceKsefStatus(id)),
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
  handleTool((params) => client.listClients(buildQueryParams(params))),
);

server.tool(
  "get_client",
  "Get a single client by ID",
  { id: z.number().describe("Client ID") },
  handleTool(({ id }) => client.getClient(id)),
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
  handleTool(({ client_data }) => {
    const clientObj = parseJsonObject(client_data, "client_data");
    return client.createClient(clientObj);
  }),
);

server.tool(
  "update_client",
  "Update an existing client",
  {
    id: z.number().describe("Client ID"),
    client_data: z.string().describe("JSON string of fields to update"),
  },
  handleTool(({ id, client_data }) => {
    const clientObj = parseJsonObject(client_data, "client_data");
    return client.updateClient(id, clientObj);
  }),
);

server.tool(
  "delete_client",
  "Delete a client by ID",
  { id: z.number().describe("Client ID") },
  handleTool(({ id }) => client.deleteClient(id)),
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
  handleTool((params) => client.listProducts(buildQueryParams(params))),
);

server.tool(
  "get_product",
  "Get a single product by ID",
  { id: z.number().describe("Product ID") },
  handleTool(({ id }) => client.getProduct(id)),
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
  handleTool(({ product }) => {
    const productData = parseJsonObject(product, "product");
    return client.createProduct(productData);
  }),
);

server.tool(
  "update_product",
  "Update an existing product",
  {
    id: z.number().describe("Product ID"),
    product: z.string().describe("JSON string of fields to update"),
  },
  handleTool(({ id, product }) => {
    const productData = parseJsonObject(product, "product");
    return client.updateProduct(id, productData);
  }),
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
  handleTool((params) => client.listPayments(buildQueryParams(params))),
);

server.tool(
  "get_payment",
  "Get a single payment by ID",
  { id: z.number().describe("Payment ID") },
  handleTool(({ id }) => client.getPayment(id)),
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
  handleTool(({ payment }) => {
    const paymentData = parseJsonObject(payment, "payment");
    return client.createPayment(paymentData);
  }),
);

server.tool(
  "update_payment",
  "Update an existing payment",
  {
    id: z.number().describe("Payment ID"),
    payment: z.string().describe("JSON string of fields to update"),
  },
  handleTool(({ id, payment }) => {
    const paymentData = parseJsonObject(payment, "payment");
    return client.updatePayment(id, paymentData);
  }),
);

server.tool(
  "delete_payment",
  "Delete a payment by ID",
  { id: z.number().describe("Payment ID") },
  handleTool(({ id }) => client.deletePayment(id)),
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
  handleTool((params) => client.listWarehouseDocuments(buildQueryParams(params))),
);

server.tool(
  "get_warehouse_document",
  "Get a warehouse document by ID",
  { id: z.number().describe("Warehouse document ID") },
  handleTool(({ id }) => client.getWarehouseDocument(id)),
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
  handleTool(({ document }) => {
    const docData = parseJsonObject(document, "document");
    return client.createWarehouseDocument(docData);
  }),
);

server.tool(
  "update_warehouse_document",
  "Update a warehouse document",
  {
    id: z.number().describe("Warehouse document ID"),
    document: z.string().describe("JSON string of fields to update"),
  },
  handleTool(({ id, document }) => {
    const docData = parseJsonObject(document, "document");
    return client.updateWarehouseDocument(id, docData);
  }),
);

server.tool(
  "delete_warehouse_document",
  "Delete a warehouse document by ID",
  { id: z.number().describe("Warehouse document ID") },
  handleTool(({ id }) => client.deleteWarehouseDocument(id)),
);

// ═══════════════════════════════════════════════════════════════
//  CATEGORIES (#7 — added get, update, delete)
// ═══════════════════════════════════════════════════════════════

server.tool(
  "list_categories",
  "List all categories",
  {},
  handleTool(() => client.listCategories()),
);

server.tool(
  "get_category",
  "Get a single category by ID",
  { id: z.number().describe("Category ID") },
  handleTool(({ id }) => client.getCategory(id)),
);

server.tool(
  "create_category",
  "Create a new category",
  {
    category: z.string().describe("JSON string of category object (name, etc.)"),
  },
  handleTool(({ category }) => {
    const catData = parseJsonObject(category, "category");
    return client.createCategory(catData);
  }),
);

server.tool(
  "update_category",
  "Update an existing category",
  {
    id: z.number().describe("Category ID"),
    category: z.string().describe("JSON string of fields to update"),
  },
  handleTool(({ id, category }) => {
    const catData = parseJsonObject(category, "category");
    return client.updateCategory(id, catData);
  }),
);

server.tool(
  "delete_category",
  "Delete a category by ID",
  { id: z.number().describe("Category ID") },
  handleTool(({ id }) => client.deleteCategory(id)),
);

// ═══════════════════════════════════════════════════════════════
//  WAREHOUSES (#7 — added get, update, delete)
// ═══════════════════════════════════════════════════════════════

server.tool(
  "list_warehouses",
  "List all warehouses",
  {},
  handleTool(() => client.listWarehouses()),
);

server.tool(
  "get_warehouse",
  "Get a single warehouse by ID",
  { id: z.number().describe("Warehouse ID") },
  handleTool(({ id }) => client.getWarehouse(id)),
);

server.tool(
  "create_warehouse",
  "Create a new warehouse",
  {
    warehouse: z.string().describe("JSON string of warehouse object (name, etc.)"),
  },
  handleTool(({ warehouse }) => {
    const whData = parseJsonObject(warehouse, "warehouse");
    return client.createWarehouse(whData);
  }),
);

server.tool(
  "update_warehouse",
  "Update an existing warehouse",
  {
    id: z.number().describe("Warehouse ID"),
    warehouse: z.string().describe("JSON string of fields to update"),
  },
  handleTool(({ id, warehouse }) => {
    const whData = parseJsonObject(warehouse, "warehouse");
    return client.updateWarehouse(id, whData);
  }),
);

server.tool(
  "delete_warehouse",
  "Delete a warehouse by ID",
  { id: z.number().describe("Warehouse ID") },
  handleTool(({ id }) => client.deleteWarehouse(id)),
);

// ═══════════════════════════════════════════════════════════════
//  DEPARTMENTS (#7 — added get, update, delete)
// ═══════════════════════════════════════════════════════════════

server.tool(
  "list_departments",
  "List all company departments",
  {},
  handleTool(() => client.listDepartments()),
);

server.tool(
  "get_department",
  "Get a single department by ID",
  { id: z.number().describe("Department ID") },
  handleTool(({ id }) => client.getDepartment(id)),
);

server.tool(
  "create_department",
  "Create a new department",
  {
    department: z
      .string()
      .describe("JSON string of department object (name, shortcut, etc.)"),
  },
  handleTool(({ department }) => {
    const deptData = parseJsonObject(department, "department");
    return client.createDepartment(deptData);
  }),
);

server.tool(
  "update_department",
  "Update an existing department",
  {
    id: z.number().describe("Department ID"),
    department: z.string().describe("JSON string of fields to update"),
  },
  handleTool(({ id, department }) => {
    const deptData = parseJsonObject(department, "department");
    return client.updateDepartment(id, deptData);
  }),
);

server.tool(
  "delete_department",
  "Delete a department by ID",
  { id: z.number().describe("Department ID") },
  handleTool(({ id }) => client.deleteDepartment(id)),
);

// ═══════════════════════════════════════════════════════════════
//  ACCOUNT
// ═══════════════════════════════════════════════════════════════

server.tool(
  "get_account_info",
  "Get current account information",
  {},
  handleTool(() => client.getAccountInfo()),
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
