# OmniFlux Template Engine & SPA Interceptor (`of-target`) 🚀

OmniFlux includes a powerful, zero-dependency HTML Template Engine built directly into the runtime. It combines dynamic server-side template rendering with a unique, built-in Single Page Application (SPA) interceptor mechanism (`of-target`), enabling flicker-free partial DOM updates without needing external client-side frameworks.

---

## 1. Value Interpolation & OmniFlux Dynamic Expressions (`{{ ... }}`)

The `{{ ... }}` syntax is used for inserting dynamic values, calculating expressions, and invoking helper tasks and functions directly inside HTML templates.

### Simple Variable Interpolation
```html
<h1>Welcome, {{ username }}!</h1>
<p>Your email is: {{ user.email }}</p>
```

### Dynamic OmniFlux Expressions & Operators
You can use standard expressions, ternary operators, and arithmetic inside `{{ ... }}`:
```html
<p>Total Price (incl. VAT): {{ item.price * 1.17 }} ₪</p>
<span class="status {{ isCompleted ? 'status-active' : 'status-pending' }}">
    {{ isCompleted ? 'Completed ✓' : 'Pending...' }}
</span>
```

### OmniFlux Function & Helper Calls Inside `{{ ... }}`
Any helper task or function passed in the template `context` or defined globally in OmniFlux can be called directly inside `{{ ... }}`:

**Template (`views/invoice.of.html`):**
```html
<tr>
    <td>{{ inv.supplier_name }}</td>
    <td>{{ formatDate(inv.date) }}</td>
    <td>{{ formatCurrency(inv.total, inv.currency) }}</td>
</tr>
```

**OmniFlux Server Code (`main.of`):**
```omniflux
define task format_date(d) {
    # OmniFlux date formatting helper
    return d
}

define task format_currency(amount, curr) {
    return amount + " " + (curr == "ILS" ? "₪" : curr)
}

GET "/invoice/:id" (req, res) {
    var context = {
        inv: { supplier_name: "Helicon Books", date: "2026-07-23", total: 450, currency: "ILS" },
        formatDate: format_date,
        formatCurrency: format_currency
    }
    respond template("views/invoice.of.html", context)
}
```

---

## 2. Control Flow Directives (`@if`, `@else if`, `@else`, `@for`, `@}`)

OmniFlux template control directives allow conditional rendering and loops.

### Syntax Directives
- `@if (condition) {` - Starts a conditional block.
- `@else if (condition) {` - Evaluates secondary condition if previous check failed.
- `@else {` - Fallback block if all preceding checks fail.
- `@for (item of list) {` - Iterates over an array or iterable list.
- `@}` - **Mandatory closing directive** for `@if` and `@for` blocks.

---

> [!CAUTION]
> **CRITICAL SYNTAX RULE: DO NOT write `@}` before `@else` or `@else if`**
> In OmniFlux's template compiler, the `@else` and `@else if` directives **automatically emit the closing brace `}`** for the preceding `@if` block.
> 
> If you write `@}` before `@else` (e.g. writing `@} else {` or `@} @else {`), the compiler generates duplicate closing braces `} } else {`, resulting in a syntax crash that returns `<!-- Template Error -->` and renders a blank screen!

#### ❌ WRONG (Causes Template Error & Blank Screen):
```html
<!-- INCORRECT: Do NOT put @} before @else -->
@if (user.isLoggedIn) {
    <p>Hello {{ user.name }}</p>
@} else {
    <p>Please log in</p>
@}
```

#### ✅ CORRECT Structure:
```html
<!-- CORRECT: @else automatically closes the previous @if block -->
@if (user.role == "admin") {
    <div class="badge-admin">Admin Dashboard</div>
    <p>Full administrative access</p>
@else if (user.role == "editor") {
    <div class="badge-editor">Editor Panel</div>
    <p>Content editing access</p>
@else {
    <div class="badge-user">User Profile</div>
    <p>Standard member access</p>
@}
```

---

## 3. Loop Iteration (`@for`)

Iterate over arrays or lists effortlessly:

```html
<ul class="invoices-list">
    @if (hasInvoices) {
        @for (inv of invoices) {
            <li class="invoice-row">
                <span class="supplier">{{ inv.supplier_name }}</span>
                <span class="amount">{{ inv.total }} ₪</span>
                <a href="/invoices/{{ inv.id }}" of-target="#detailsView">View Details</a>
            </li>
        @}
    @else {
        <li class="empty-state">No invoices found for the selected date range.</li>
    @}
</ul>
```

---

## 4. Partials & Static Inclusions (`@include`)

Reuse headers, footers, and sidebars across multiple templates using `@include`:

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>{{ title }}</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <!-- Includes partial file relative to project root -->
    @include("views/partials/header.html")

    <main class="container">
        <h1>{{ title }}</h1>
    </main>

    @include("views/partials/footer.html")
</body>
</html>
```

---

## 5. OmniFlux SPA Interceptors (`of-target`) ⚡

The `of-target` attribute is a **unique, game-changing feature of OmniFlux**. It delivers true Single Page Application (SPA) responsiveness with zero client-side dependencies, zero bundlers, and zero framework overhead.

### How `of-target` Works Under the Hood

When `template()` renders an HTML template containing a `</body>` tag, OmniFlux automatically injects a lightweight client-side script before `</body>`.

This interceptor listens for HTML `<form>` submissions and `<a>` link clicks decorated with the `of-target="#selector"` attribute.

```
[User Clicks Form Submit / Link with of-target="#targetContainer"]
                           │
                           ▼
[OmniFlux Client Interceptor (e.preventDefault)]
                           │
                           ▼
[Async Request Sent to Server]
                           │
                           ▼
[OmniFlux Server Responds with Partial HTML]
                           │
                           ▼
[Target Element Updated: document.querySelector('#targetContainer').innerHTML = htmlResult]
                           │
                           ▼
[Re-executes Embedded Scripts inside Target (_of_exec_scripts)]
```

### Form Interceptions (`<form of-target="...">`)

When a user submits a form with `of-target="#targetId"`:
1. Intercepts the browser `submit` event (`e.preventDefault()`).
2. Collects all form inputs into `FormData`.
3. Sends an asynchronous HTTP POST request to `form.action`.
4. Updates the target element's `innerHTML` with the server's HTML response.
5. **Script Execution:** Parses and re-executes any inline `<script>` tags returned inside the updated container (`_of_exec_scripts`), enabling dynamic client-side behaviors in server-rendered partials.

```html
<!-- Form submits asynchronously and updates ONLY #invoicesContainer -->
<form action="/api/scan" method="POST" of-target="#invoicesContainer">
    <div class="form-group">
        <label for="startDate">From:</label>
        <input type="date" id="startDate" name="startDate">
    </div>
    <div class="form-group">
        <label for="endDate">To:</label>
        <input type="date" id="endDate" name="endDate">
    </div>
    <button type="submit" class="btn">Scan Invoices</button>
</form>

<!-- Target element updated dynamically without full page reload -->
<div id="invoicesContainer">
    <p>Select date range and click Scan</p>
</div>
```

### Link Interceptions (`<a of-target="...">`)

When a user clicks a link with `of-target="#targetId"`:
1. Intercepts the browser `click` event.
2. Fetches `link.href` asynchronously.
3. Injects the returned partial HTML directly into the target container.

```html
<!-- Clicking loads invoice details into #modalContent without page reload -->
<a href="/api/invoice/1042/details" of-target="#modalContent" class="btn">
    View Invoice #1042
</a>

<div id="modalContent"></div>
```

---

## 6. Complete Real-World Example

### Template (`views/dashboard.of.html`):
```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>{{ title }}</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    @include("views/partials/header.html")

    <main class="container">
        <!-- Conditional User Greeting -->
        @if (user.isConnected) {
            <div class="user-pill">Connected as: {{ user.name }} ({{ user.email }})</div>
        @else {
            <button type="button" class="btn-primary" onclick="openLoginModal()">Login to Service</button>
        @}

        <!-- Asynchronous Filter Form -->
        <section class="card">
            <h2>Scan & Filter Invoices</h2>
            <form action="/api/scan" method="POST" of-target="#tableContainer">
                <input type="date" name="startDate" value="{{ startDate }}">
                <input type="date" name="endDate" value="{{ endDate }}">
                <button type="submit" class="btn">Scan</button>
            </form>
        </section>

        <!-- Target Container updated by of-target -->
        <section class="card" id="tableContainer">
            @if (hasInvoices) {
                <table>
                    <thead>
                        <tr>
                            <th>Supplier</th>
                            <th>Date</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (inv of invoices) {
                            <tr>
                                <td>{{ inv.supplier_name }}</td>
                                <td>{{ inv.date }}</td>
                                <td>{{ inv.total }} ₪</td>
                            </tr>
                        @}
                    </tbody>
                </table>
            @else {
                <p>No invoices found.</p>
            @}
        </section>
    </main>
</body>
</html>
```

### OmniFlux Server Entrypoint (`main.of`):
```omniflux
include "config.of"

listen on port $serverPort

GET "/" (req, res) {
    var context = {
        title: "Invoice Scanner",
        startDate: "2026-07-01",
        endDate: "2026-07-23",
        user: { isConnected: true, name: "Ori", email: "ori@example.com" },
        hasInvoices: true,
        invoices: [
            { supplier_name: "Google Cloud", date: "2026-07-15", total: 120 },
            { supplier_name: "Microsoft 365", date: "2026-07-20", total: 85 }
        ]
    }
    
    respond template("views/dashboard.of.html", context)
}

POST "/api/scan" (req, res) {
    var startDate = req.body.startDate
    var endDate = req.body.endDate
    
    # Process scan and return partial HTML table for #tableContainer
    var partial_template = fileread("views/partials/table.of.html")
    var context = {
        hasInvoices: true,
        invoices: [
            { supplier_name: "Fresh Scan Result", date: startDate, total: 340 }
        ]
    }
    
    respond template(partial_template, context)
}
```
