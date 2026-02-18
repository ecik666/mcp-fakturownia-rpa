# MCP Fakturownia

Serwer MCP (Model Context Protocol) dla API [Fakturownia.pl](https://fakturownia.pl) - polskiego systemu do fakturowania.

## Wymagania

- Node.js 18+
- Konto w Fakturownia.pl z tokenem API

## Instalacja

```bash
npm install
npm run build
```

## Konfiguracja

Serwer wymaga dwoch zmiennych srodowiskowych:

| Zmienna | Opis | Przyklad |
|---------|------|----------|
| `FAKTUROWNIA_API_TOKEN` | Token API z ustawien konta | `abc123xyz` |
| `FAKTUROWNIA_DOMAIN` | Subdomena konta | `mojafirma` (z `mojafirma.fakturownia.pl`) |

Token API znajdziesz w: **Ustawienia > Ustawienia konta > Integracja > Kod autoryzacyjny API**

### Claude Desktop

Dodaj do `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fakturownia": {
      "command": "node",
      "args": ["/sciezka/do/mcp-fakturownia-rpa/dist/index.js"],
      "env": {
        "FAKTUROWNIA_API_TOKEN": "twoj-token",
        "FAKTUROWNIA_DOMAIN": "twoja-subdomena"
      }
    }
  }
}
```

### Claude Code

Dodaj do `.claude/settings.json`:

```json
{
  "mcpServers": {
    "fakturownia": {
      "command": "node",
      "args": ["/sciezka/do/mcp-fakturownia-rpa/dist/index.js"],
      "env": {
        "FAKTUROWNIA_API_TOKEN": "twoj-token",
        "FAKTUROWNIA_DOMAIN": "twoja-subdomena"
      }
    }
  }
}
```

## Dostepne narzedzia

### Faktury
- `list_invoices` - Lista faktur z filtrami (strona, okres, typ, status)
- `get_invoice` - Pobranie faktury po ID
- `create_invoice` - Utworzenie nowej faktury
- `update_invoice` - Aktualizacja faktury
- `delete_invoice` - Usuniecie faktury
- `send_invoice_email` - Wyslanie faktury mailem
- `change_invoice_status` - Zmiana statusu faktury
- `get_invoice_pdf_url` - URL do pobrania PDF

### KSeF
- `send_invoice_to_ksef` - Wyslanie faktury do KSeF
- `get_invoice_ksef_status` - Status KSeF faktury

### Klienci
- `list_clients` - Lista klientow (wyszukiwanie po nazwie, NIP, email)
- `get_client` - Pobranie klienta po ID
- `create_client` - Utworzenie klienta
- `update_client` - Aktualizacja klienta
- `delete_client` - Usuniecie klienta

### Produkty
- `list_products` - Lista produktow
- `get_product` - Pobranie produktu po ID
- `create_product` - Utworzenie produktu
- `update_product` - Aktualizacja produktu

### Platnosci
- `list_payments` - Lista platnosci
- `get_payment` - Pobranie platnosci po ID
- `create_payment` - Utworzenie platnosci
- `update_payment` - Aktualizacja platnosci
- `delete_payment` - Usuniecie platnosci

### Magazyn
- `list_warehouse_documents` - Lista dokumentow magazynowych (PZ, WZ, MM)
- `get_warehouse_document` - Pobranie dokumentu
- `create_warehouse_document` - Utworzenie dokumentu
- `update_warehouse_document` - Aktualizacja dokumentu
- `delete_warehouse_document` - Usuniecie dokumentu

### Pozostale
- `list_categories` / `create_category` - Kategorie
- `list_warehouses` / `create_warehouse` - Magazyny
- `list_departments` / `create_department` - Dzialy firmy
- `get_account_info` - Informacje o koncie
