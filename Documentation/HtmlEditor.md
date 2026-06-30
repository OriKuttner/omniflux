# HTML Editor Integration Guide 📝

OmniFlux includes a premium, responsive WYSIWYG editor custom element (`<html-editor>`) designed for content management. This guide explains how to integrate the editor into your frontend views and handle the HTML content and image uploads on the server side using OmniFlux's standard library.

---

## 1. Client-Side Setup 🌐

To use the editor on your frontend, you need to include the Font Awesome icon library (which the toolbar uses for formatting icons), the CSS styling, and register the custom element script.

### HTML Template Integration
Include the assets in your HTML layout and insert the `<html-editor>` custom element:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Edit Article</title>
    <!-- Font Awesome (Required for toolbar icons) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Bootstrap 5 CSS (Premium Styling Integration) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
</head>
<body>

    <div class="container mt-5" style="max-width: 800px;">
        <div class="card shadow-sm">
            <div class="card-header bg-primary text-white">
                <h4 class="mb-0">Create New Article</h4>
            </div>
            <div class="card-body">
                <!-- Standard Form Integration with Bootstrap -->
                <form action="/posts/save" method="POST">
                    <div class="mb-3">
                        <label for="title" class="form-label fw-bold">Title</label>
                        <input type="text" id="title" name="title" class="form-control" placeholder="Enter article title" required>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label fw-bold">Content</label>
                        <!-- HTML Editor Custom Element -->
                        <html-editor 
                            name="body" 
                            content="<p>Start writing your content here...</p>" 
                            dir="rtl"
                            cancel-url="/posts/dashboard">
                        </html-editor>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Register the HTML Editor Custom Element -->
    <script src="/public/js/html-editor.js"></script>
</body>
</html>
```

### Attributes Reference
| Attribute | Description | Default |
| :--- | :--- | :--- |
| `name` | The name attribute for the hidden input field, used for standard form submissions. | `""` |
| `content` | The initial HTML content to load into the editor. | `""` |
| `dir` | Text direction alignment: `"ltr"` (left-to-right) or `"rtl"` (right-to-left). Controls layout and infers default translation. | `"ltr"` |
| `lang` | The UI language: `"he"` (Hebrew) or `"en"` (English). If not specified, automatically determined by the `dir` attribute (Hebrew for `"rtl"`, English for `"ltr"`). | (dynamic) |
| `cancel-url` | If supplied, renders a "Cancel" link pointing to this URL on the toolbar. | `""` |

---

## 2. Server-Side Integration (OmniFlux) ⚙️

The `<html-editor>` does two things that interact with the server:
1. Submits the final HTML content inside the field specified by `name` (e.g. `body`) when the form is submitted.
2. Performs a background `POST` request to `/api/upload` when a user inserts an image, expecting a JSON response containing the public URL location of the saved file.

Here is how you handle both routes on your OmniFlux server:

```omniflux
include "stdlib/network.of"
include "stdlib/system.of"

listen on port 3000

# 1. API Route: Handle Image Uploads from HTML Editor
# The editor sends images to POST "/api/upload" via multipart/form-data.
# It expects a response of: { "location": "/public/uploads/filename.jpg" }
POST "/api/upload" (req, res) {
    # Ensure the upload directory exists
    dircreate("public/uploads")
    
    # Parse request and save files to public/uploads directory
    var ok = uploadfile(req, "public/uploads")
    
    if ok && req.file {
        # Construct the public URL path for the newly saved image
        var imageUrl = "/public/uploads/" + req.file.filename
        
        # Respond back to the editor with the image URL location
        respond json { "location": imageUrl }
    } else {
        respond status 500 and json { "error": "Failed to upload file" }
    }
}

# 2. Form Submission Route: Save Post and HTML Content
# Receives the regular text fields and HTML content submitted from the form.
POST "/posts/save" (req, res) {
    var title = req.body.title
    var htmlContent = req.body.body # Extracted from the HTML Editor's name attribute
    
    if title == "" || htmlContent == "" {
        respond status 400 and text "Missing title or content"
    }
    
    # Save the content into the database
    var post = dbinsert("articles", {
        title: title,
        content: htmlContent,
        created_at: time()
    })
    
    # Redirect back to the dashboard or display a success page
    redirect to "/posts/dashboard"
}

# Serve Static Assets (HTML editor js file, uploaded files, and CSS)
GET "/public/*file" (req, res) {
    var file_path = req.params.file.join("/")
    respond with file "public/" + file_path
}
```

---

## 3. How the Image Upload Flow Works under the Hood 🔍

1. **User interaction:** The user clicks the **Image icon** (<i class="fa fa-image"></i>) in the toolbar.
2. **File Selection:** A file picker opens in the browser. The user selects an image file.
3. **AJAX Request:** The editor instantly formats a `FormData` object containing the selected file under the key `file` and sends a `POST` request to `/api/upload`.
4. **Server Storage:** The server calls `uploadfile(req, "public/uploads")`, which:
   * Parses the multipart body.
   * Generates a safe, unique filename (using a timestamp and random suffix) to avoid file name collisions.
   * Writes the raw file buffer to the directory.
   * Populates `req.file` with metadata (including `req.file.filename`).
5. **Response and Insertion:** The server responds with `{ "location": "/public/uploads/[unique-name].png" }`. The editor receives this and inserts it at the cursor position as a standard `<img>` tag:
   ```html
   <img src="/public/uploads/1782709013900-482783355.png">
   ```

---

## 4. Key Built-in Features 🌟

### Dynamic Localization (i18n)
The editor supports Hebrew and English UI texts (buttons, dialogs, warnings, and messages) out of the box. Changing the `dir` or `lang` attribute dynamically at runtime will instantly update all UI texts without losing cursor focus or editor state:
```javascript
// Switch editor language and direction to English dynamically
const editor = document.querySelector('html-editor');
editor.setAttribute('dir', 'ltr');  // Automatically switches UI text to English
```

### Auto-saving and Unsaved Changes Protection
* **Autosave**: The editor checks for changes every 30 seconds. If the content is dirty (modified since the last save), it automatically performs an asynchronous form submission (via AJAX) to the form's `action` URL, showing a subtle "Saving..." / "Autosaving..." status indicator on the toolbar.
* **Unsaved Warnings**: The editor registers a `beforeunload` listener that warns the user if they try to close or reload the browser tab while having unsaved changes in the editor.

### Typographic Paragraph Indentation Normalization
The editor automatically implements smart typographic paragraph rules:
* It normalizes freeform line break behaviors into clean `<p>` paragraph structures.
* It dynamically injects `style="text-indent: 0;"` to any paragraph that immediately follows one or more blank lines (or lines containing only spaces/line-breaks). This prevents unwanted text indentation after blank/spacing breaks, aligning with standard book and article typography.
* It works in real-time on keystrokes (`O(1)` local inspection) ensuring smooth performance even for massive documents.
