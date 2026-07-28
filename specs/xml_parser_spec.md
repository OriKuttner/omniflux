# OmniFlux RFC - XML Parsing Built-in Specification (`xml_parse`)

**מפרט רשמי להוספת תמיכה מובנית ב-XML בקומפיילר וב-Runtime של OmniFlux**

---

## 1. מטרת העדכון

מתן מענה מובנה, מהיר וטבעי לניתוח (Parsing) ושליפת נתונים מקובצי XML / OPF / XHTML / RSS ישירות בשפת OmniFlux, ללא תלות בספריות JS חיצוניות, תוך שמירה על עקרון הפשטות של השפה הפרוצדורלית.

---

## 2. מבנה הנתונים הריצה (Data Structure)

הפונקציה `xml_parse(xml_str)` מקבלת מחרוזת XML ומחזירה מבנה עץ מסוג `Map` (אובייקט מילון) במבנה אחיד:

```json
{
  "tag": "item",
  "attributes": {
    "id": "cover-image",
    "href": "images/cover.jpg",
    "media-type": "image/jpeg"
  },
  "text": "",
  "children": []
}
```

### תיאור שדות האובייקט:
- **`tag`**: שם התגית (string, למשל `"item"`).
- **`attributes`**: מילון `Map` של כל ה-Attributes (שם -> ערך, למשל `{"href": "cover.jpg"}`).
- **`text`**: תוכן הטקסט הפנימי הישיר של התגית (string).
- **`children`**: מערך (`List`) של כל תגיות הילדים במבנה זהה.

---

## 3. פונקציות העזר הפרוצדורליות (Standard Library / Runtime Functions)

### א. `xml_parse(xml_string)`
- **קלט**: מחרוזת XML (`string`).
- **פלט**: אובייקט `Map` של התגית הראשית (Root Node), או `null` במקרה של שגיאת ניתוח.

### ב. `xml_find(node, tag_name)`
- **קלט**: אובייקט צומת `node` ושם תגית `tag_name` (`string`).
- **פלט**: מערך (`List`) של כל הילדים (ברקורסיה/בעץ) המתאימים לשם התגית.

### ג. `xml_find_one(node, tag_name)`
- **קלט**: אובייקט צומת `node` ושם תגית `tag_name` (`string`).
- **פלט**: אובייקט הצומת הראשון המתאים ל-`tag_name`, או `null` אם לא נמצא.

### ד. `xml_attr(node, attr_name)`
- **קלט**: אובייקט צומת `node` ושם Attribute (`string`).
- **פלט**: הערך כמחרוזת (או מחרוזת ריקה `""` אם לא קיים).

### ה. `xml_text(node)`
- **קלט**: אובייקט צומת `node`.
- **פלט**: הטקסט הפנימי המשורשר של הצומת.

---

## 4. השינויים הנדרשים ב-Runtime וב-Compiler (`~/work/omniflux`)

1. **עדכון ה-Runtime (`runtime.js` / `stdlib/xml.of`)**:
   - מימוש פונקציית Parser קלה ומהירה עבור XML ל-Map.
   - מימוש פונקציות העזר הגלובליות: `global.xml_parse`, `global.xml_find`, `global.xml_find_one`, `global.xml_attr`, `global.xml_text`.

2. **עדכון הטרנספיילר (`compiler/transpiler.of`)**:
   - רישום שמות הפונקציות כפונקציות שמורות במידת הצורך בתוסף ה-Stdlib.

---

## 5. דוגמת קוד ב-OmniFlux

```omniflux
include "stdlib/xml.of"

var opf_content = readfile("content.opf")
var doc = xml_parse(opf_content)

// שליפת כל תגיות ה-item מתוך העץ
var items = xml_find(doc, "item")

for item in items {
    var id = xml_attr(item, "id")
    var href = xml_attr(item, "href")
    
    if id == "cover-image" {
        print("Found cover: " + href)
    }
}
```
