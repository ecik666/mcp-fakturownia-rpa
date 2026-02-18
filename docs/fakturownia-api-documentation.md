# Fakturownia.pl API Documentation

> Source: https://github.com/fakturownia/API
> Consolidated for Claude Code local usage

## Overview

Fakturownia.pl is a Polish invoicing system. The API is REST/JSON based.

- **Base URL**: `https://YOUR_DOMAIN.fakturownia.pl/`
- **Authentication**: `api_token` parameter (query string or JSON body)
- **Format**: JSON (`Accept: application/json`, `Content-Type: application/json`)

## Authentication

### API Token

Get your token from: Settings → Account Settings → Integration → API Token

### Login via API

```bash
curl https://app.fakturownia.pl/login.json \
    -H 'Accept: application/json' \
    -H 'Content-Type: application/json' \
    -d '{"login": "login_or_email", "password": "password", "integration_token": ""}'
```

Response:
```json
{"login":"marcin", "email":"email@test.pl", "prefix":"YYYYYYY", "url":"https://YYYYYYY.fakturownia.pl", "first_name":"Jan", "last_name":"Kowalski", "api_token":"XXXXXXXXXXXXXX"}
```

### Public invoice links (no auth required)

- Preview: `https://YOUR_DOMAIN.fakturownia.pl/invoice/{{token}}`
- PDF: `https://YOUR_DOMAIN.fakturownia.pl/invoice/{{token}}.pdf`
- PDF inline: `https://YOUR_DOMAIN.fakturownia.pl/invoice/{{token}}.pdf?inline=yes`

---

## Common Parameters

### Pagination & Filtering

- `page=N` - page number
- `per_page=N` - items per page (max 100)
- `period=last_12_months|this_month|last_month|this_year|last_year|all|more` (with `date_from` & `date_to`)
- `include_positions=true` - include invoice line items
- `income=1|0` - income (1) or expense (0)
- `invoice_ids=1,2,3` - filter by IDs
- `number=FV/1/2024` - filter by number
- `kind=vat` - filter by type
- `kinds=vat,proforma` - filter by multiple types
- `search_date_type=issue_date|sell_date|paid_date|created_at`
- `order=asc|desc`

---

## Invoices (Faktury)

### CRUD Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/invoices/1.json` | Get invoice by ID |
| POST | `/invoices.json` | Create new invoice |
| PUT | `/invoices/1.json` | Update invoice |
| DELETE | `/invoices/1.json` | Delete invoice |

### Create Invoice (minimal)

```bash
curl https://YOUR_DOMAIN.fakturownia.pl/invoices.json \
    -H 'Accept: application/json' \
    -H 'Content-Type: application/json' \
    -d '{"api_token": "API_TOKEN",
        "invoice": {
            "payment_to_kind": 5,
            "client_id": 1,
            "positions":[
                {"product_id": 1, "quantity":2}
            ]
        }}'
```

### Invoice Fields Reference

#### Core Fields

| Field | Description | Example |
|-------|-------------|---------|
| `number` | Invoice number (auto-generated if omitted) | `"13/2012"` |
| `kind` | Invoice type | `"vat"`, `"proforma"`, `"correction"` |
| `income` | Income (1) or expense (0) | `"1"` |
| `issue_date` | Issue date | `"2013-01-16"` |
| `place` | Place of issue | `"Warszawa"` |
| `sell_date` | Sell date (date or month) | `"2013-01-16"` or `"2012-12"` |
| `category_id` | Category ID | `""` |
| `department_id` | Company department ID | `"1"` |
| `accounting_kind` | Expense type for cost invoices | `"purchases"`, `"expenses"` |
| `currency` | Currency | `"PLN"` |
| `lang` | Language | `"pl"`, `"en"`, `"pl/en"` |
| `status` | Status | `"issued"`, `"sent"`, `"paid"` |
| `paid` | Amount paid | `"0,00"` |
| `oid` | External order number | `"zamowienie10021"` |
| `oid_unique` | If `"yes"`, prevent duplicate OID | `"yes"` |
| `warehouse_id` | Warehouse ID | `"1090"` |
| `description` | Notes on invoice | `""` |
| `description_footer` | Footer description | `""` |
| `description_long` | Back of invoice description | `""` |
| `internal_note` | Private note (not printed) | `""` |
| `split_payment` | Split payment flag | `"1"` or `"0"` |
| `use_oss` | OSS classification | `"1"` or `"0"` |

#### Seller Fields

| Field | Description |
|-------|-------------|
| `seller_name` | Seller name |
| `seller_tax_no` | Seller tax ID (NIP) |
| `seller_tax_no_kind` | Tax ID type: `""` (NIP), `"nip_ue"`, `"other"`, `"empty"` |
| `seller_bank_account` | Bank account number |
| `seller_bank` | Bank name |
| `seller_post_code` | Postal code |
| `seller_city` | City |
| `seller_street` | Street |
| `seller_country` | Country (ISO 3166) |
| `seller_email` | Email |
| `seller_person` | Issuer name |
| `seller_bdo_no` | BDO number |

#### Buyer Fields

| Field | Description |
|-------|-------------|
| `client_id` | Client ID (-1 to auto-create) |
| `buyer_name` | Buyer name |
| `buyer_tax_no` | Buyer tax ID (NIP) |
| `buyer_tax_no_kind` | Tax ID type |
| `disable_tax_no_validation` | Disable NIP validation |
| `buyer_post_code` | Postal code |
| `buyer_city` | City |
| `buyer_street` | Street |
| `buyer_country` | Country (ISO 3166) |
| `buyer_note` | Additional description |
| `buyer_email` | Email |
| `buyer_company` | Is company: `"1"` or `"0"` |
| `buyer_person` | Recipient signature |
| `buyer_first_name` | First name |
| `buyer_last_name` | Last name |

#### Recipient Fields

| Field | Description |
|-------|-------------|
| `recipient_id` | Recipient client ID |
| `recipient_name` | Recipient name |
| `recipient_street` | Street |
| `recipient_post_code` | Postal code |
| `recipient_city` | City |
| `recipient_country` | Country (ISO 3166) |
| `recipient_email` | Email |
| `recipient_phone` | Phone |
| `recipient_note` | Additional description |

#### Payment Fields

| Field | Description |
|-------|-------------|
| `payment_type` | Payment type (see enum below) |
| `payment_to_kind` | Payment term: number (days), `"off"`, or `"other_date"` |
| `payment_to` | Payment deadline date |
| `paid_date` | Date paid |

#### Position (Line Item) Fields

| Field | Description |
|-------|-------------|
| `product_id` | Product ID |
| `name` | Product name |
| `additional_info` | Additional info (e.g., PKWiU) |
| `discount_percent` | Percentage discount |
| `discount` | Amount discount |
| `quantity` | Quantity |
| `quantity_unit` | Unit (e.g., "szt") |
| `price_net` | Net price (auto-calculated if omitted) |
| `tax` | Tax rate: number, `"np"` (N/A), `"zw"` (exempt) |
| `price_gross` | Gross price (auto-calculated if omitted) |
| `total_price_net` | Total net (auto-calculated) |
| `total_price_gross` | Total gross |
| `description` | Position description |
| `code` | Product code |
| `gtu_code` | GTU code (e.g., `"GTU_01"`) |
| `lump_sum_tax` | Lump sum tax rate |

#### Calculation Strategy

```json
"calculating_strategy": {
  "position": "default" | "keep_gross",
  "sum": "sum" | "keep_gross" | "keep_net",
  "invoice_form_price_kind": "net" | "gross"
}
```

#### Currency Exchange Fields

| Field | Description |
|-------|-------------|
| `exchange_currency` | Target currency for conversion (e.g., `"PLN"`) |
| `exchange_kind` | Rate source: `"ecb"`, `"nbp"`, `"cbr"`, `"nbu"`, `"nbg"`, `"own"` |
| `exchange_currency_rate` | Custom rate (when `exchange_kind` = `"own"`) |
| `exchange_note` | Rate note (auto-generated except for `"own"`) |

#### Correction-specific Fields

| Field | Description |
|-------|-------------|
| `invoice_id` | Related document ID |
| `from_invoice_id` | Source invoice ID (e.g., VAT from Proforma) |
| `corrected_content_before` | Content before correction |
| `corrected_content_after` | Correct content |

#### Tax Exemption Fields

| Field | Description |
|-------|-------------|
| `exempt_tax_kind` | Basis for VAT exemption (when tax="zw") |
| `np_tax_kind` | Basis for N/A tax: `"export_service"`, `"export_service_eu"`, `"not_specified"` |
| `reverse_charge` | Reverse charge flag (forces tax to "oo" for PL or "np" for others) |

#### Procedure Designations

| Field | Description |
|-------|-------------|
| `procedure_designations` | Array: `"SW"`, `"EE"`, `"TP"`, `"TT_WNT"`, `"TT_D"`, `"MR_T"`, `"MR_UZ"`, `"I_42"`, `"I_63"`, `"B_SPV"`, `"B_SPV_DOSTAWA"`, `"B_MPV_PROWIZJA"`, `"MPP"` |

#### Skonto Fields

| Field | Description |
|-------|-------------|
| `skonto_active` | `"1"` or `"0"` |
| `skonto_discount_date` | Skonto payment deadline |
| `skonto_discount_value` | Discount percentage |

### Enum Values

#### `kind` (Invoice Type)

| Value | Description |
|-------|-------------|
| `vat` | VAT invoice |
| `proforma` | Proforma invoice |
| `bill` | Bill (rachunek) |
| `receipt` | Receipt (paragon) |
| `advance` | Advance invoice (zaliczkowa) |
| `final` | Final invoice (końcowa) |
| `correction` | Correction invoice (korekta) |
| `invoice_other` | Other invoice |
| `vat_margin` | Margin VAT invoice |
| `kp` | Cash receipt (kasa przyjmie) |
| `kw` | Cash disbursement (kasa wyda) |
| `estimate` | Estimate/Order (zamówienie) |
| `vat_mp` | MP VAT invoice |
| `vat_rr` | RR VAT invoice |
| `correction_note` | Correction note (nota korygująca) |
| `accounting_note` | Accounting note (nota księgowa) |
| `client_order` | Custom non-accounting document |
| `dw` | Internal document (dowód wewnętrzny) |
| `wnt` | Intra-community acquisition |
| `wdt` | Intra-community delivery |
| `import_service` | Import of services |
| `import_service_eu` | Import of services from EU |
| `import_products` | Import of products (simplified) |
| `export_products` | Export of products |

#### `lang` (Language)

`"pl"`, `"en"`, `"en-GB"`, `"de"`, `"fr"`, `"cz"`, `"ru"`, `"es"`, `"it"`, `"nl"`, `"hr"`, `"ar"`, `"sk"`, `"sl"`, `"el"`, `"et"`, `"cn"`, `"hu"`, `"tr"`, `"fa"`

Bilingual: `"pl/en"` (combine with slash)

#### `accounting_kind` (Expense Type)

`"purchases"`, `"expenses"`, `"media"`, `"salary"`, `"incident"`, `"fuel0"`, `"fuel_expl75"`, `"fuel_expl100"`, `"fixed_assets"`, `"fixed_assets50"`, `"no_vat_deduction"`

#### `payment_type`

`"transfer"`, `"card"`, `"cash"`, `"barter"`, `"cheque"`, `"bill_of_exchange"`, `"cash_on_delivery"`, `"compensation"`, `"letter_of_credit"`, `"payu"`, `"paypal"`, `"off"`, or any custom text

#### `status`

`"issued"`, `"sent"`, `"paid"`, `"partial"`, `"rejected"`

#### `discount_kind`

`"percent_unit"` (from net unit price), `"percent_unit_gross"` (from gross unit price), `"percent_total"` (from total), `"amount"` (fixed amount)

### GTU Codes

Products: `GTU_01` (alcohol), `GTU_02` (art.103), `GTU_03` (fuels/oils), `GTU_04` (tobacco), `GTU_05` (waste), `GTU_06` (electronics), `GTU_07` (vehicles), `GTU_08` (metals), `GTU_09` (pharmaceuticals), `GTU_10` (buildings/land)

Services: `GTU_11` (emission trading), `GTU_12` (intangible services), `GTU_13` (transport/warehousing)

### Special Operations

#### Get Invoice PDF

```bash
curl "https://YOUR_DOMAIN.fakturownia.pl/invoices/1.pdf?api_token=API_TOKEN"
```

#### Send Invoice by Email

```bash
curl -X POST "https://YOUR_DOMAIN.fakturownia.pl/invoices/1/send_by_email.json?api_token=API_TOKEN"
```

#### Change Invoice Status

```bash
curl "https://YOUR_DOMAIN.fakturownia.pl/invoices/1/change_status.json?api_token=API_TOKEN&status=STATUS"
```

#### Download Attachment

```bash
curl -X GET "https://YOUR_DOMAIN.fakturownia.pl/invoices/INVOICE_ID/attachments/ATTACHMENT_ID?api_token=API_TOKEN"
```

#### Add Attachment

```bash
curl -X POST https://YOUR_DOMAIN.fakturownia.pl/invoices/INVOICE_ID/attachments.json \
    -F 'api_token=API_TOKEN' \
    -F 'attachment[file]=@/path/to/file.pdf'
```

#### Fiscal Print

```bash
curl "https://YOUR_DOMAIN.fakturownia.pl/invoices/1/fiscal_print.json?api_token=API_TOKEN"
```

---

## Clients (Klienci)

### CRUD Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/clients.json?api_token=API_TOKEN&page=1` | List clients |
| GET | `/clients.json?api_token=API_TOKEN&name=NAME` | Search by name |
| GET | `/clients.json?api_token=API_TOKEN&email=EMAIL` | Search by email |
| GET | `/clients.json?api_token=API_TOKEN&shortcut=SHORT` | Search by shortcut |
| GET | `/clients.json?api_token=API_TOKEN&tax_no=TAX` | Search by NIP |
| GET | `/clients/100.json?api_token=API_TOKEN` | Get by ID |
| GET | `/clients.json?external_id=100&api_token=API_TOKEN` | Get by external ID |
| POST | `/clients.json` | Create client |
| PUT | `/clients/111.json` | Update client |
| DELETE | `/clients/CLIENT_ID.json?api_token=API_TOKEN` | Delete client |

### Create Client

```bash
curl https://YOUR_DOMAIN.fakturownia.pl/clients.json \
    -H 'Accept: application/json' \
    -H 'Content-Type: application/json' \
    -d '{"api_token": "API_TOKEN",
        "client": {
            "name": "Klient1",
            "tax_no": "6272616681",
            "bank": "bank1",
            "bank_account": "bank_account1",
            "city": "city1",
            "country": "",
            "email": "email@gmail.com",
            "person": "person1",
            "post_code": "post-code1",
            "phone": "phone1",
            "street": "street1"
        }}'
```

Only `name` is required. Default: company (`"company": true`). For private person: send `"company": false` and `"last_name"`.

### Client Fields

| Field | Description |
|-------|-------------|
| `name` | Client name |
| `shortcut` | Short name |
| `tax_no_kind` | Tax ID type: `"NIP"`, `"PESEL"`, or KSeF values |
| `tax_no` | Tax identification number |
| `register_number` | REGON |
| `accounting_id` | Accounting software ID |
| `post_code`, `city`, `street` | Address |
| `country` | Country (ISO 3166) |
| `use_delivery_address` | Use separate delivery address |
| `delivery_address` | Delivery address |
| `first_name`, `last_name` | Name (for private persons) |
| `email`, `phone`, `mobile_phone` | Contact |
| `www`, `fax` | Web & fax |
| `note` | Additional description |
| `tag_list` | Tags array: `["tag1", "tag2"]` |
| `company` | Is company: `"1"` or `"0"` |
| `kind` | Type: `"buyer"`, `"seller"`, `"both"` |
| `category_id` | Category ID |
| `bank`, `bank_account` | Banking info |
| `discount` | Default discount percentage |
| `default_tax` | Default tax rate |
| `price_list_id` | Default price list ID |
| `payment_to_kind` | Default payment term |
| `default_payment_type` | Default payment type |
| `disable_auto_reminders` | `"1"` to disable auto reminders |
| `person` | Invoice receiving person |
| `buyer_id` | Associated buyer ID |
| `mass_payment_code` | Individual bank account |
| `external_id` | External client ID |
| `tp_client_connection` | TP entity connections flag |

---

## Products (Produkty)

### CRUD Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products.json?api_token=API_TOKEN&page=1` | List products |
| GET | `/products.json?api_token=API_TOKEN&date_from=DATE` | Products changed after date |
| GET | `/products.json?api_token=API_TOKEN&warehouse_id=WID` | Products with warehouse stock |
| GET | `/products/100.json?api_token=API_TOKEN` | Get by ID |
| POST | `/products.json` | Create product |
| PUT | `/products/333.json` | Update product |

### Create Product

```bash
curl https://YOUR_DOMAIN.fakturownia.pl/products.json \
    -H 'Accept: application/json' \
    -H 'Content-Type: application/json' \
    -d '{"api_token": "API_TOKEN",
        "product": {
            "name": "ProductAA",
            "code": "A001",
            "price_net": "100",
            "tax": "23"
        }}'
```

**Note:** Net price is calculated from gross price and tax; cannot be edited directly via API.

### Product Fields

| Field | Description |
|-------|-------------|
| `name` | Product name |
| `code` | Product code |
| `ean_code` | EAN code |
| `description` | Description |
| `price_net` | Net price |
| `tax` | VAT: number, `"np"`, `"zw"`, `"disabled"` |
| `price_gross` | Gross price |
| `currency` | Currency |
| `category_id` | Category ID |
| `tag_list` | Tags: `["tag1", "tag2"]` |
| `service` | Is service: `"1"` / `"0"` |
| `electronic_service` | Is electronic service |
| `gtu_codes` | GTU codes: `["GTU_01"]` |
| `limited` | Stock limited: `"1"` / `"0"` |
| `stock_level` | Available quantity |
| `purchase_price_net` | Purchase net price |
| `purchase_tax` | Purchase VAT |
| `purchase_price_gross` | Purchase gross price |
| `package` | Is bundle: `"1"` / `"0"` |
| `quantity_unit` | Unit (e.g., "szt") |
| `quantity` | Default quantity |
| `additional_info` | PKWiU code |
| `supplier_code` | Supplier code |
| `accounting_id` | Accounting code (sales) |
| `disabled` | Inactive: `"1"` / `"0"` |
| `use_moss` | OSS flag |
| `size`, `size_width`, `size_height`, `size_unit` | Dimensions |
| `weight`, `weight_unit` | Weight |

### Create Product Bundle

```bash
curl https://YOUR_DOMAIN.fakturownia.pl/products.json \
    -H 'Accept: application/json' \
    -H 'Content-Type: application/json' \
    -d '{"api_token": "API_TOKEN",
        "product": {
            "name": "zestaw",
            "price_net": "100",
            "tax": "23",
            "service": "true",
            "package": "true",
            "package_products_details": {
                "0": {"quantity": 1, "id": PRODUCT_ID},
                "1": {"quantity": 1, "id": PRODUCT_ID}
            }
        }}'
```

---

## Price Lists (Cenniki)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/price_lists.json?api_token=API_TOKEN` | List price lists |
| POST | `/price_lists.json` | Create price list |
| PUT | `/price_lists/100.json` | Update price list |
| DELETE | `/price_lists/100.json?api_token=API_TOKEN` | Delete price list |

---

## Warehouse Documents (Dokumenty magazynowe)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/warehouse_documents.json?api_token=API_TOKEN` | List all |
| GET | `/warehouse_documents/555.json?api_token=API_TOKEN` | Get by ID |
| POST | `/warehouse_documents.json` | Create document |
| PUT | `/warehouse_documents/555.json` | Update document |
| DELETE | `/warehouse_documents/100.json?api_token=API_TOKEN` | Delete document |

### Document Types

- `mm` - Inter-warehouse transfer
- `pz` - Goods received
- `wz` - Goods issued

### Create PZ Document

```bash
curl https://YOUR_DOMAIN.fakturownia.pl/warehouse_documents.json \
    -H 'Accept: application/json' \
    -H 'Content-Type: application/json' \
    -d '{"api_token": "API_TOKEN",
        "warehouse_document": {
            "kind":"pz",
            "number": null,
            "warehouse_id": "1",
            "issue_date": "2017-10-23",
            "department_name": "Department1 SA",
            "client_name": "Client1 SA",
            "warehouse_actions":[
                {"product_name":"Produkt A1", "purchase_tax":23, "purchase_price_net":10.23, "quantity":1},
                {"product_name":"Produkt A2", "purchase_tax":0, "purchase_price_net":50, "quantity":2}
            ]
        }}'
```

### Link Invoices to Warehouse Document

```bash
curl https://YOUR_DOMAIN.fakturownia.pl/warehouse_documents/555.json \
    -X PUT \
    -H 'Accept: application/json' \
    -H 'Content-Type: application/json' \
    -d '{"api_token": "API_TOKEN",
        "warehouse_document": {
            "invoice_ids": [100, 111]
        }}'
```

---

## Payments (Płatności)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/banking/payments.json?api_token=API_TOKEN` | List payments |
| GET | `/banking/payment/100.json?api_token=API_TOKEN` | Get by ID |
| POST | `/banking/payments.json` | Create payment |
| PATCH | `/banking/payments/555.json` | Update payment |
| DELETE | `/banking/payments/555.json?api_token=API_TOKEN` | Delete payment |

### Create Payment

```bash
curl https://YOUR_DOMAIN.fakturownia.pl/banking/payments.json \
    -H 'Accept: application/json' \
    -H 'Content-Type: application/json' \
    -d '{"api_token": "API_TOKEN",
        "banking_payment": {
            "name":"Payment 001",
            "price": 100.05,
            "invoice_id": null,
            "paid":true,
            "kind": "api"
        }}'
```

### Payment with Multiple Invoices

```bash
curl https://YOUR_DOMAIN.fakturownia.pl/banking/payments.json \
    -H 'Accept: application/json' \
    -H 'Content-Type: application/json' \
    -d '{"api_token": "API_TOKEN",
        "banking_payment": {
            "name":"Payment 003",
            "price": 200,
            "invoice_ids": [555, 666],
            "paid":true,
            "kind": "api"
        }}'
```

Invoices are paid in order of `invoice_ids`. If payment < total, partial payment applies.

### Include Invoice Data with Payments

```bash
curl "https://YOUR_DOMAIN.fakturownia.pl/banking/payments.json?include=invoices&api_token=API_TOKEN"
```

---

## Categories (Kategorie)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories.json?api_token=API_TOKEN` | List all |
| GET | `/categories/100.json?api_token=API_TOKEN` | Get by ID |
| POST | `/categories.json` | Create |
| PUT | `/categories/100.json` | Update |
| DELETE | `/categories/100.json?api_token=API_TOKEN` | Delete |

---

## Warehouses (Magazyny)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/warehouses.json?api_token=API_TOKEN` | List all |
| GET | `/warehouses/100.json?api_token=API_TOKEN` | Get by ID |
| POST | `/warehouses.json` | Create |
| PUT | `/warehouses/100.json` | Update |
| DELETE | `/warehouses/100.json?api_token=API_TOKEN` | Delete |

---

## Warehouse Actions (Akcje magazynowe)

```bash
curl "https://YOUR_DOMAIN.fakturownia.pl/warehouse_actions.json?api_token=API_TOKEN"
```

Additional parameters: `warehouse_id`, `kind`, `product_id`, `date_from`, `date_to`, `from_warehouse_document`, `to_warehouse_document`, `warehouse_document_id`

---

## Departments (Działy)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/departments.json?api_token=API_TOKEN` | List all |
| GET | `/departments/100.json?api_token=API_TOKEN` | Get by ID |
| POST | `/departments.json` | Create |
| PUT | `/departments/100.json` | Update |
| DELETE | `/departments/100.json?api_token=API_TOKEN` | Delete |

### Upload Logo

```bash
curl -X PUT https://YOUR_DOMAIN.fakturownia.pl/departments/DEPARTMENT_ID.json \
    -F 'api_token=API_TOKEN' \
    -F 'department[logo]=@/file_path/logo.png'
```

---

## Issuers (Wystawcy)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/issuers.json?api_token=API_TOKEN` | List all |
| GET | `/issuers/1.json?api_token=API_TOKEN` | Get by ID |
| POST | `/issuers.json` | Create |
| PUT | `/issuers/1.json` | Update |
| DELETE | `/issuers/1.json?api_token=API_TOKEN` | Delete |

---

## Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/webhooks.json?api_token=API_TOKEN` | List all |
| GET | `/webhooks/1.json?api_token=API_TOKEN` | Get by ID |
| POST | `/webhooks.json` | Create |
| PUT | `/webhooks/1.json` | Update |
| DELETE | `/webhooks/1.json?api_token=API_TOKEN` | Delete |

---

## System Accounts

### Create Account (for Partners)

```bash
curl https://YOUR_DOMAIN.fakturownia.pl/account.json \
    -H 'Accept: application/json' \
    -H 'Content-Type: application/json' \
    -d '{"api_token": "API_TOKEN",
        "account": {"prefix": "prefix1", "lang": "pl"},
        "user": {"login": "login1", "email": "email1@email.pl", "password": "password1", "from_partner": "PARTNER_CODE"},
        "company": {"name": "Company1", "tax_no": "5252445700", "post_code": "00-112", "city": "Warsaw", "street": "Street 1/10"},
        "integration_token": ""
    }'
```

### Get Account Info

```bash
curl "https://YOUR_DOMAIN.fakturownia.pl/account.json?api_token=API_TOKEN&integration_token="
```

### Delete Account

```bash
curl https://YOUR_DOMAIN.fakturownia.pl/account/delete.json \
    -X POST -H 'Accept:application/json' -H 'Content-Type: application/json' \
    -d '{"api_token": "API_TOKEN"}'
```

### Add User to Account

```bash
curl -X POST https://YOUR_DOMAIN.fakturownia.pl/account/add_user.json \
    -H 'Content-Type: application/json' \
    -d '{"api_token": "API_TOKEN",
        "integration_token": "INTEGRATION_TOKEN",
        "user": {
            "invite": true,
            "email": "email@test.pl",
            "password": "Password123",
            "role": "member",
            "department_ids": []
        }}'
```

Roles: `"member"` (regular), `"admin"` (administrator), `"accountant"` (bookkeeper), or custom role ID: `"role_1234"`

### Unlink Account (from accounting firm)

```bash
curl https://YOUR_DOMAIN.fakturownia.pl/account/unlink.json \
    -X PATCH -H 'Accept: application/json' -H 'Content-Type: application/json' \
    -d '{"api_token": "API_TOKEN", "prefix": "SUB_DOMAIN_1"}'
```

---

## KSeF Integration (Krajowy System e-Faktur)

KSeF is Poland's mandatory electronic invoicing system. Obligation starts February 1, 2026.

### Quick Start - Create and Send to KSeF

```bash
curl -X POST "https://app.fakturownia.pl/invoices.json" \
  -H "Content-Type: application/json" \
  -d '{
    "api_token": "YOUR_TOKEN",
    "gov_save_and_send": true,
    "invoice": {
      "kind": "vat",
      "seller_name": "Moja Firma Sp. z o.o.",
      "seller_tax_no": "5252445767",
      "seller_street": "ul. Przykładowa 10",
      "seller_post_code": "00-001",
      "seller_city": "Warszawa",
      "buyer_name": "Klient ABC Sp. z o.o.",
      "buyer_tax_no": "9876543210",
      "buyer_company": true,
      "positions": [
        {"name": "Usługa", "quantity": 1, "total_price_gross": 1230.00, "tax": 23}
      ]
    }
  }'
```

Key: `gov_save_and_send` triggers KSeF submission after saving.

### Required Fields When KSeF Is Active

#### Seller (required)

`seller_tax_no`, `seller_name`, `seller_street`, `seller_post_code`, `seller_city`, `seller_country`

#### Buyer (required)

`buyer_company` (true/false), `buyer_name`, `buyer_tax_no` (required when `buyer_company=true` unless `buyer_tax_no_kind="empty"`), `buyer_tax_no_kind`, `buyer_country`

For individuals (`buyer_company=false`): `buyer_first_name` and `buyer_last_name` required.

#### Conditional

- `exempt_tax_kind` - when positions have tax `"zw"` (exempt)
- `np_tax_kind` - when positions have tax `"np"` (not applicable)

### Tax ID Types (`tax_no_kind`)

| Value | Description | Format |
|-------|-------------|--------|
| `""` (empty/default) | Polish NIP | 10 digits |
| `"nip_ue"` | EU VAT number | 1-12 chars |
| `"other"` | Other tax ID | 1-50 alphanumeric |
| `"empty"` | No tax ID | tax_no must be empty |
| `"nip_with_id"` | NIP + internal ID | `{NIP}-{5-digit-ID}` |

### Field Length Limits (KSeF)

| Field | Max Length |
|-------|-----------|
| Position name (`positions[].name`) | 256 chars |
| Description/footer (`description`) | 3500 chars |
| Email | 255 chars |
| Phone | 16 chars |
| Correction reason (`correction_reason`) | 256 chars |

### Invoice Types Sent to KSeF

`vat`, `correction`, `vat_mp`, `vat_margin`, `wdt`, `export_products`, `advance`, `final`

Other types (proforma, receipt, estimate, etc.) get status `not_applicable`.

### Sending to KSeF

#### Method 1: On creation

```bash
POST /invoices.json?gov_save_and_send=1&api_token=YOUR_TOKEN
```

#### Method 2: Existing invoice

```bash
GET /invoices/{ID}.json?send_to_ksef=yes&api_token=YOUR_TOKEN
```

### Auto-send Modes (configured in UI)

| Mode | Description |
|------|-------------|
| `null` | Manual only |
| `pl_companies` | Polish companies only (`buyer_company=true` + PL country) |
| `all_companies` | All companies (`buyer_company=true`) |
| `all` | All invoices (companies + individuals) |

### KSeF Status Fields

```bash
GET /invoices/{ID}.json?fields[invoice]=gov_status,gov_id,gov_send_date,gov_sell_date,gov_error_messages,gov_verification_link,gov_link,gov_corrected_invoice_number&api_token=YOUR_TOKEN
```

#### `gov_status` Values

| Status | Description |
|--------|-------------|
| `ok` | Successfully sent |
| `processing` | Being sent |
| `send_error` | Send error (check `gov_error_messages`) |
| `server_error` | KSeF server error (retry later) |
| `not_applicable` | Not eligible for KSeF |
| `not_connected` | KSeF not connected |
| `null` | Not sent |

Demo statuses: `demo_ok`, `demo_processing`, `demo_send_error`, `demo_server_error`, `demo_not_applicable`, `demo_not_connected`

#### `gov_id` (KSeF Number)

Format: `{SELLER_NIP}-{DATE}-{ID}`, e.g., `5252445767-20260201-ABC123DEF456`

### Download KSeF Documents

```bash
# XML invoice (KSeF schema)
GET /invoices/{ID}/attachment?kind=gov&api_token=YOUR_TOKEN

# XML UPO (Official Receipt Confirmation)
GET /invoices/{ID}/attachment?kind=gov_upo&api_token=YOUR_TOKEN
```

Returns HTTP 302 (redirect to file) or HTTP 404 (not available).

### KSeF Issuers

```json
{
  "invoice": {
    "issuers": [
      {
        "name": "Biuro Rachunkowe ABC",
        "tax_no": "1234567890",
        "company": true,
        "country": "PL",
        "role": "Wystawca faktury"
      }
    ]
  }
}
```

Roles: `"Wystawca faktury"`, `"Faktor"`, `"Podmiot pierwotny"`, `"JST – wystawca"`, `"Członek GV – wystawca"`, `"Rola inna"` (with `role_description`, max 25 chars)

### KSeF Recipients

```json
{
  "invoice": {
    "recipients": [
      {
        "name": "Współwłaściciel XYZ",
        "tax_no": "1111111111",
        "company": true,
        "country": "PL",
        "street": "ul. Przykładowa 1",
        "city": "Warszawa",
        "post_code": "00-001",
        "role": "Dodatkowy nabywca",
        "participation": 30.0
      }
    ]
  }
}
```

Roles: `"Odbiorca"`, `"Dodatkowy nabywca"` (with `participation` %), `"Dokonujący płatności"`, `"JST – odbiorca"`, `"Członek GV – odbiorca"`, `"Pracownik"`, `"Rola inna"`

### KSeF Corrections

- `invoice_id` must reference existing invoice
- Cannot change: seller tax data, buyer company flag/tax_no, invoice issuer settings
- `gov_corrected_invoice_number` contains KSeF number of corrected invoice
- No deletion in KSeF - only correction to zero

### OFFLINE Modes

- **OFFLINE24**: Auto-detected when `issue_date` < today. Must send to KSeF within 24h. No MF notification needed.
- **OFFLINE (emergency)**: Official KSeF outage. Send after system restored.

### Validation Setting (`validate_invoices_for_gov`)

When enabled (Settings → KSeF → "Block creation of non-KSeF-compliant invoices"):
- Invoice won't save if KSeF requirements not met (HTTP 422)

When disabled:
- Invoice saves but `gov_error_messages` contains errors
- Auto-send will fail

---

## Code Examples

### cURL

```bash
curl https://YOUR_DOMAIN.fakturownia.pl/invoices.json \
    -H 'Accept: application/json' \
    -H 'Content-Type: application/json' \
    -d '{"api_token": "YOUR_TOKEN",
        "invoice": {
            "kind":"vat",
            "number": null,
            "sell_date": "2013-07-19",
            "issue_date": "2013-07-19",
            "payment_to": "2013-07-26",
            "seller_name": "Wystawca Sp. z o.o.",
            "seller_tax_no": "6272616681",
            "buyer_name": "Klient1 Sp. z o.o.",
            "buyer_tax_no": "6272616681",
            "positions":[
                {"name":"Produkt A1", "tax":23, "total_price_gross":10.23, "quantity":1},
                {"name":"Produkt A2", "tax":0, "total_price_gross":50, "quantity":3}
            ]
        }}'
```

### PHP

```php
<?php
$host = 'XXXXXX.fakturownia.pl';
$token = 'XXXXXXXXXX';
$json = '{"api_token": "'.$token.'", "invoice": {"kind":"vat", "number": null, "sell_date": "2013-04-17", "issue_date": "2013-04-17", "payment_to": "2013-04-24", "seller_name": "Wystawca Sp. z o.o.", "seller_tax_no": "6272616681", "buyer_name": "Klient1 Sp. z o.o.", "buyer_tax_no": "6272616681", "positions":[{"name":"Produkt A1", "tax":23, "total_price_gross":10.23, "quantity":1}, {"name":"Produkt A2", "tax":0, "total_price_gross":50, "quantity":3}]}}';

$c = curl_init();
curl_setopt($c, CURLOPT_URL, 'https://'.$host.'/invoices.json');
$head[] = 'Accept: application/json';
$head[] = 'Content-Type: application/json';
curl_setopt($c, CURLOPT_HTTPHEADER, $head);
curl_setopt($c, CURLOPT_POSTFIELDS, $json);
curl_exec($c);
?>
```

### Ruby

```ruby
require 'net/https'
require 'uri'
require 'json'

endpoint = 'https://YOUR_DOMAIN.fakturownia.pl/invoices.json'
uri = URI.parse(endpoint)

json_params = {
  "api_token" => "YOUR_TOKEN",
  "invoice" => {
    "kind" => "vat",
    "number" => nil,
    "sell_date" => "2013-07-19",
    "issue_date" => "2013-07-19",
    "payment_to" => "2013-07-26",
    "seller_name" => "Wystawca Sp. z o.o.",
    "seller_tax_no" => "6272616681",
    "buyer_name" => "Klient1 Sp. z o.o.",
    "buyer_tax_no" => "6272616681",
    "positions" => [
      {"name" => "Produkt A1", "tax" => 23, "total_price_gross" => 10.23, "quantity" => 1},
      {"name" => "Produkt A2", "tax" => 0, "total_price_gross" => 50, "quantity" => 3}
    ]
  }
}

request = Net::HTTP::Post.new(uri.path)
request.body = JSON.generate(json_params)
request["Content-Type"] = "application/json"

http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true
response = http.start { |h| h.request(request) }

puts JSON.parse(response.body).to_json if response.code == '201'
```

### Ruby Gem

Available at: https://github.com/kkempin/fakturownia

---

## E-Receipts (E-paragony)

See: https://github.com/e-paragony/api
