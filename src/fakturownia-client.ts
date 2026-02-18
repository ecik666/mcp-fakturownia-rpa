/**
 * Fakturownia.pl REST API client.
 */

export interface FakturowniaConfig {
  apiToken: string;
  domain: string; // e.g. "mycompany" → mycompany.fakturownia.pl
}

export class FakturowniaClient {
  private baseUrl: string;
  private apiToken: string;

  constructor(config: FakturowniaConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = `https://${config.domain}.fakturownia.pl`;
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    queryParams?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);

    // Always add api_token as query param for GET/DELETE
    if (method === "GET" || method === "DELETE") {
      url.searchParams.set("api_token", this.apiToken);
    }

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const fetchOptions: RequestInit = { method, headers };

    if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
      fetchOptions.body = JSON.stringify({
        api_token: this.apiToken,
        ...body,
      });
    }

    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Fakturownia API error ${response.status}: ${errorText}`,
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  }

  // ── Invoices ────────────────────────────────────────────────

  async listInvoices(params?: Record<string, string>) {
    return this.request("GET", "/invoices.json", undefined, params);
  }

  async getInvoice(id: number, params?: Record<string, string>) {
    return this.request("GET", `/invoices/${id}.json`, undefined, params);
  }

  async createInvoice(
    invoice: Record<string, unknown>,
    govSaveAndSend?: boolean,
  ) {
    const query: Record<string, string> = {};
    if (govSaveAndSend) query.gov_save_and_send = "1";
    return this.request("POST", "/invoices.json", { invoice }, query);
  }

  async updateInvoice(id: number, invoice: Record<string, unknown>) {
    return this.request("PUT", `/invoices/${id}.json`, { invoice });
  }

  async deleteInvoice(id: number) {
    return this.request("DELETE", `/invoices/${id}.json`);
  }

  async sendInvoiceByEmail(id: number) {
    return this.request(
      "POST",
      `/invoices/${id}/send_by_email.json`,
      {},
      {},
    );
  }

  async changeInvoiceStatus(id: number, status: string) {
    return this.request("GET", `/invoices/${id}/change_status.json`, undefined, {
      status,
    });
  }

  async getInvoicePdfUrl(id: number): Promise<string> {
    return `${this.baseUrl}/invoices/${id}.pdf?api_token=${this.apiToken}`;
  }

  async sendInvoiceToKsef(id: number) {
    return this.request("GET", `/invoices/${id}.json`, undefined, {
      send_to_ksef: "yes",
    });
  }

  async getInvoiceKsefStatus(id: number) {
    return this.request("GET", `/invoices/${id}.json`, undefined, {
      "fields[invoice]":
        "gov_status,gov_id,gov_send_date,gov_sell_date,gov_error_messages,gov_verification_link,gov_link,gov_corrected_invoice_number",
    });
  }

  // ── Clients ─────────────────────────────────────────────────

  async listClients(params?: Record<string, string>) {
    return this.request("GET", "/clients.json", undefined, params);
  }

  async getClient(id: number) {
    return this.request("GET", `/clients/${id}.json`);
  }

  async createClient(client: Record<string, unknown>) {
    return this.request("POST", "/clients.json", { client });
  }

  async updateClient(id: number, client: Record<string, unknown>) {
    return this.request("PUT", `/clients/${id}.json`, { client });
  }

  async deleteClient(id: number) {
    return this.request("DELETE", `/clients/${id}.json`);
  }

  // ── Products ────────────────────────────────────────────────

  async listProducts(params?: Record<string, string>) {
    return this.request("GET", "/products.json", undefined, params);
  }

  async getProduct(id: number) {
    return this.request("GET", `/products/${id}.json`);
  }

  async createProduct(product: Record<string, unknown>) {
    return this.request("POST", "/products.json", { product });
  }

  async updateProduct(id: number, product: Record<string, unknown>) {
    return this.request("PUT", `/products/${id}.json`, { product });
  }

  // ── Payments ────────────────────────────────────────────────

  async listPayments(params?: Record<string, string>) {
    return this.request("GET", "/banking/payments.json", undefined, params);
  }

  async getPayment(id: number) {
    return this.request("GET", `/banking/payment/${id}.json`);
  }

  async createPayment(payment: Record<string, unknown>) {
    return this.request("POST", "/banking/payments.json", {
      banking_payment: payment,
    });
  }

  async updatePayment(id: number, payment: Record<string, unknown>) {
    return this.request("PATCH", `/banking/payments/${id}.json`, {
      banking_payment: payment,
    });
  }

  async deletePayment(id: number) {
    return this.request("DELETE", `/banking/payments/${id}.json`);
  }

  // ── Warehouse Documents ─────────────────────────────────────

  async listWarehouseDocuments(params?: Record<string, string>) {
    return this.request(
      "GET",
      "/warehouse_documents.json",
      undefined,
      params,
    );
  }

  async getWarehouseDocument(id: number) {
    return this.request("GET", `/warehouse_documents/${id}.json`);
  }

  async createWarehouseDocument(doc: Record<string, unknown>) {
    return this.request("POST", "/warehouse_documents.json", {
      warehouse_document: doc,
    });
  }

  async updateWarehouseDocument(id: number, doc: Record<string, unknown>) {
    return this.request("PUT", `/warehouse_documents/${id}.json`, {
      warehouse_document: doc,
    });
  }

  async deleteWarehouseDocument(id: number) {
    return this.request("DELETE", `/warehouse_documents/${id}.json`);
  }

  // ── Categories ──────────────────────────────────────────────

  async listCategories() {
    return this.request("GET", "/categories.json");
  }

  async getCategory(id: number) {
    return this.request("GET", `/categories/${id}.json`);
  }

  async createCategory(category: Record<string, unknown>) {
    return this.request("POST", "/categories.json", { category });
  }

  async updateCategory(id: number, category: Record<string, unknown>) {
    return this.request("PUT", `/categories/${id}.json`, { category });
  }

  async deleteCategory(id: number) {
    return this.request("DELETE", `/categories/${id}.json`);
  }

  // ── Warehouses ──────────────────────────────────────────────

  async listWarehouses() {
    return this.request("GET", "/warehouses.json");
  }

  async getWarehouse(id: number) {
    return this.request("GET", `/warehouses/${id}.json`);
  }

  async createWarehouse(warehouse: Record<string, unknown>) {
    return this.request("POST", "/warehouses.json", { warehouse });
  }

  async updateWarehouse(id: number, warehouse: Record<string, unknown>) {
    return this.request("PUT", `/warehouses/${id}.json`, { warehouse });
  }

  async deleteWarehouse(id: number) {
    return this.request("DELETE", `/warehouses/${id}.json`);
  }

  // ── Departments ─────────────────────────────────────────────

  async listDepartments() {
    return this.request("GET", "/departments.json");
  }

  async getDepartment(id: number) {
    return this.request("GET", `/departments/${id}.json`);
  }

  async createDepartment(department: Record<string, unknown>) {
    return this.request("POST", "/departments.json", { department });
  }

  async updateDepartment(id: number, department: Record<string, unknown>) {
    return this.request("PUT", `/departments/${id}.json`, { department });
  }

  async deleteDepartment(id: number) {
    return this.request("DELETE", `/departments/${id}.json`);
  }

  // ── Account ─────────────────────────────────────────────────

  async getAccountInfo() {
    return this.request("GET", "/account.json", undefined, {
      integration_token: "",
    });
  }
}
