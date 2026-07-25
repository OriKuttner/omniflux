# OmniFlux RFC - Serve Directive Specification (`serve "public"`)

**מפרט רשמי לעדכון הקומפיילר והתיעוד של OmniFlux**

---

## 1. מטרת העדכון

מימוש עיקרון השפה הקלה בעולם (The World's Simplest Procedural Language) עבור הגשת קבצים סטטיים:
מפתח מגיש תיקיית משאבים סטטית בשורה אחת נקייה בלבד, ללא לוכסנים וללא תלויות:

```omniflux
serve "public"
```

הוראה זו מנחה את מנוע OmniFlux להגיש את כל הקבצים שבתוך תיקיית `public` בצורה שקופה.

---

## 2. השינוי הנדרש בטרנספיילר (`compiler/transpiler.of`)

בתוך הקובץ [compiler/transpiler.of](file:///home/ori/work/omniflux/compiler/transpiler.of), לפני הטיפול ב-`redirect to`, יש להוסיף את בלוק הטיפול הבא:

```omniflux
    // --- serve "dir" directive (The World's Simplest Directive) ---
    var serve_dir_m = match(route_line, "/^serve\\s+[\"']([^\"']+)[\"']/i")
    if serve_dir_m {
        var dir_name = serve_dir_m[0]
        var mount_path = "/" + strreplace(dir_name, "/^\\//", "")
        arraypush(out, "app.use(\"" + mount_path + "\", express.static(require('path').join(global.__app_root, \"" + dir_name + "\")));")
        arraypush(out, "app.use(express.static(require('path').join(global.__app_root, \"" + dir_name + "\")));")
        return out
    }
```

---

## 3. שלבי הקומפילציה והעדכון ב-`~/work/omniflux`

1. הוספת הבלוק לעיל ל-[compiler/transpiler.of](file:///home/ori/work/omniflux/compiler/transpiler.of).
2. קימפול מחדש של הקומפיילר מתוך תיקיית הפרויקט:
   ```bash
   omniflux compiler/omniflux.of
   ```
3. עדכון התיעוד הרשמי ב-`README.md` והפצתו.

---

## 4. דוגמת קוד סופית ב-OmniFlux

```omniflux
include "stdlib/network.of"

listen on port 3000

# הגשת כל הקבצים הסטטיים בשורה אחת!
serve "public"

GET "/" (req, res) {
    respond template("views/index.html", {
        title: "הספרייה של אורי קוטנר"
    })
}
```
