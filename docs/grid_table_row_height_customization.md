# Reference Guide: Customizing Grid Table Row Height & Centering in Fiori Elements V4

This document serves as a reference for customizing the row heights and content alignments in the **Products List Report** Grid Table (`sap.ui.table.Table`), specifically resolving product image cropping (rendered via `sap.f.Avatar`) and preventing alignment offsets during virtual scrolling.

---

## 1. Core Technical Architecture & Challenges

When customizing heights in a SAPUI5 Grid Table (`sap.ui.table.Table`), there are three major challenges that require a **hybrid (JS + CSS)** approach:

### A. Virtual Scrolling Offset (Why Pure CSS fails)
The Grid Table renders only the visible rows and repositions them dynamically as you scroll using absolute `top` coordinate offsets in JavaScript. 
Furthermore, the **Left Selection Column** (containing row checkboxes) and the **Right Data Column** are two separate tables scrollable in parallel. 
* If you modify row heights in CSS only (e.g. `3rem` or `48px`), but do not update the JS layout engine, the JS engine continues to calculate row top-offsets using the default compact height (e.g., `50px`).
* This difference is cumulative: **Row 1** shifts by `2px`, **Row 2** by `4px`, **Row 3** by `6px`, making the checkboxes and data borders completely misaligned as you go down.
* **Solution**: You must tell the JS layout engine to calculate offsets at `48px` using `.setRowHeight(48)` in the controller, alongside matching `3rem` CSS rules.

### B. Header Height Bleeding
In Fiori Elements V4, the column header container also shares class names like `.sapUiTableCtrlScr` and `.sapUiTableCell` with the table body. 
* Scoping by `.sapUiTableCtrlScr` will still accidentally target and expand the column headers.
* **Solution**: You must use CSS `:not(.sapUiTableHeaderCell)` and `:not(.sapUiTableHeaderRow)` selectors to isolate the header cells and rows completely.

### C. Avatar Image Rendering
The Product Image column uses an `sap.f.Avatar` control which renders the image using a CSS `background-image` on a nested `span` (`.sapFAvatarImageHolder`) instead of an `<img>` tag. 
* **Solution**: We must target `.sapFAvatar`, `.sapFAvatarImageHolder`, and `.sapFAvatarImageContain` in the stylesheet and apply `background-size: contain` and `height: 3rem`.

---

## 2. Implementation Guide (Hybrid Solution)

To re-apply this solution in the future, follow these two steps:

### Step 1: Update the Controller (`webapp/ext/controller/ListManProduct.controller.js`)
Retrieve the MDC table control, locate the underlying `sap.ui.table.Table`, and set its row height to `48` pixels (corresponding to `3rem`).

Add the following logic to both `onInit` and `routing.onAfterBinding`:

```javascript
// Programmatically adjust grid row height to 48px to match the CSS height of 3rem
var oView = this.getView();
var oTable = oView.byId("fe::table::zc_cdsv_man_product::LineItem") || 
             (sap.ui.core.Element ? sap.ui.core.Element.getElementById("com.zmanprodlist::zc_cdsv_man_productList--fe::table::zc_cdsv_man_product::LineItem") : null) ||
             sap.ui.getCore().byId("com.zmanprodlist::zc_cdsv_man_productList--fe::table::zc_cdsv_man_product::LineItem");

if (oTable) {
  var fnAdjustTable = function () {
    var oInnerTable = oTable.getAggregation("_table") || oTable._oTable;
    if (oInnerTable && oInnerTable.setRowHeight) {
      oInnerTable.setRowHeight(48); // 48px matches 3rem
    }
  };
  fnAdjustTable();
  
  // For onInit phase, attach to modelContextChange as a fallback
  if (oTable.attachEventOnce) {
    oTable.attachEventOnce("modelContextChange", fnAdjustTable);
  }
}
```

---

### Step 2: Append Styles to CSS (`webapp/css/style.css`)
Add the following blocks at the end of your `style.css` stylesheet to handle row height expansion, vertical alignment, and horizontal image column alignment:

```css
/* =========================================================================
   Grid Table Row Height Customization for Product List
   ========================================================================= */

/* 1. Explicitly restrict column headers to their standard compact height */
[id*="zc_cdsv_man_product::LineItem"] .sapUiTableColHdrScr,
[id*="zc_cdsv_man_product::LineItem"] .sapUiTableColHdrRow,
[id*="zc_cdsv_man_product::LineItem"] .sapUiTableColHdrRow .sapUiTableCol,
[id*="zc_cdsv_man_product::LineItem"] .sapUiTableColHdrTr .sapUiTableCell,
[id*="zc_cdsv_man_product::LineItem"] .sapUiTableColHdrRow .sapUiTableCellInner {
    height: 2rem !important;
    max-height: 2rem !important;
    line-height: 2rem !important;
}

/* 2. Set custom row height only for the data rows (line items), NOT the headers */
[id*="zc_cdsv_man_product::LineItem"] .sapUiTableTr:not(.sapUiTableHeaderRow),
[id*="zc_cdsv_man_product::LineItem"] .sapUiTableTr:not(.sapUiTableHeaderRow)>td,
[id*="zc_cdsv_man_product::LineItem"] .sapUiTableCell:not(.sapUiTableHeaderCell),
[id*="zc_cdsv_man_product::LineItem"] .sapUiTableCell:not(.sapUiTableHeaderCell) .sapUiTableCellInner,
[id*="zc_cdsv_man_product::LineItem"] .sapUiTableRowHdrScr .sapUiTableRowHdr,
[id*="zc_cdsv_man_product::LineItem"] .sapUiTableRowSelectionCell {
    height: 3rem !important;
    max-height: 3rem !important;
}

/* 3. Vertically center align cell content for all data columns and selection checkboxes */
[id*="zc_cdsv_man_product::LineItem"] .sapUiTableCell:not(.sapUiTableHeaderCell) .sapUiTableCellInner,
[id*="zc_cdsv_man_product::LineItem"] .sapUiTableRowHdrScr .sapUiTableRowHdr,
[id*="zc_cdsv_man_product::LineItem"] .sapUiTableRowSelectionCell {
    display: flex !important;
    align-items: center !important;
}

/* 4. Horizontally center align content in the Product Image column and selection checkboxes */
[id*="zc_cdsv_man_product::LineItem"] td[data-sap-ui-colid*="ProductImage"]:not(.sapUiTableHeaderCell) .sapUiTableCellInner,
[id*="zc_cdsv_man_product::LineItem"] .sapUiTableRowHdrScr .sapUiTableRowHdr,
[id*="zc_cdsv_man_product::LineItem"] .sapUiTableRowSelectionCell {
    justify-content: center !important;
}

/* 5. Ensure images and Avatars inside the grid table scale beautifully without cropping */
[id*="zc_cdsv_man_product::LineItem"] .sapFAvatar,
[id*="zc_cdsv_man_product::LineItem"] .sapFAvatarImageHolder,
[id*="zc_cdsv_man_product::LineItem"] .sapFAvatarImageContain,
[id*="zc_cdsv_man_product::LineItem"] .sapMImg,
[id*="zc_cdsv_man_product::LineItem"] img {
    height: 3rem !important;
    max-height: 3rem !important;
    max-width: 100% !important;
    object-fit: contain !important;
    background-size: contain !important;
}
```

---

## 3. Verification Checklist (Caching Bypass)
Due to aggressive caching of Fiori Assets on local servers:
1. Open browser **Developer Tools (`F12`)**.
2. Right-click the **browser reload button**.
3. Select **"Empty Cache and Hard Reload"**.
