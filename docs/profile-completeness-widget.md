# Profile Completeness Widget

A header widget on the Article Object Page that shows overall style readiness and a per-section breakdown of how much data has been filled in.

---

## Files Involved

| File | Role |
|---|---|
| `webapp/ext/controller/ObjectPageExt.controller.js` | All calculation logic |
| `webapp/ext/fragment/ProductImage.fragment.xml` | Widget UI (chart + section bars) |
| `webapp/css/style.css` | Styling for bars, chart, grid layout |
| `webapp/manifest.json` | `sap.suite.ui.microchart` library dependency |
| `webapp/ext/controller/Classification.controller.js` | Triggers widget calculation via `onAfterBinding` |

---

## How It Works — End to End

### 1. Trigger Point

The widget is calculated inside `Classification.controller.js → routing.onAfterBinding`. This fires whenever the Object Page finishes binding to an entity. It dynamically requires the module and calls:

```javascript
sap.ui.require(["com/zmanprodlist/ext/controller/ObjectPageExt.controller"], function (ObjExt) {
    ObjExt._calculateCompleteness(oCurrentContext, oCurrentView);
});
```

`oCurrentContext` is the OData V4 binding context of the current product record.  
`oCurrentView` is the Object Page view (needed to set the `CompletenessModel`).

---

### 2. Model Initialisation

At the start of `_calculateCompleteness`, a `JSONModel` named **`CompletenessModel`** is created (or reused if it exists) and set on the view:

```javascript
oView.setModel(oCompletenessModel, "CompletenessModel");
```

Initial default state:
```json
{
  "overallProgress": 0,
  "sectionsNeedAttention": 9,
  "statusText": "Calculating...",
  "statusColor": "Warning",
  "overallCss": "progressValWarning",
  "overallState": "Critical",
  "sections": []
}
```

---

### 3. Data Fetching

Two parallel data-fetch strategies are used depending on the section type.

#### Strategy A — Main Entity Fields (`requestProperties`)

A dedicated OData V4 context binding is used to force-load the full entity object. This bypasses the UI lazy-loading of Fiori Elements:

```javascript
var oTempBinding = oView.getModel().bindContext(oContext.getPath());
oTempBinding.requestObject().then(function(oData) { ... });
```

The resolved `oData` object is the raw entity and is passed to `calculateSection()` for field-based sections.

#### Strategy B — Navigation Association (`checkAssociation`)

For sections that are child tables, a list binding is created and up to 1 context is requested. If even one record exists, progress = 100%; otherwise 0%:

```javascript
var oListBinding = oView.getModel().bindList(navProperty, oContext);
oListBinding.requestContexts(0, 1).then(function(aCtxs) {
    resolve(aCtxs && aCtxs.length > 0 ? 100 : 0);
});
```

#### Strategy C — Classification V2 Service (`fetchAttributes`)

For the **Attributes** section, an OData V2 call is made to the classification service. The `styleuuid` and `styleid` are extracted from the OData context path (matching the same pattern used by `Classification.controller.js`):

```javascript
var sPath = oContext.getPath();
var styleuuid = sPath.match(/styleuuid=([a-f0-9-]+)/i)[1];
var styleid    = decodeURIComponent(sPath.match(/styleid='(.*?)'/i)[1]);
```

**Service**: `GET /sap/opu/odata/sap/ZOD_MM_CLASSIF_CREATE_SRV/classificationSet`  
**Filters**: `Productuuid`, `styleuuid`, `styleid`

Progress = filled `charvalues` ÷ total rows where `charecteristics` is non-empty × 100.

---

### 4. Section Calculations

All five data-fetches run in parallel via `Promise.all`. Once resolved, three additional field-based sections are calculated synchronously from the already-fetched entity:

```javascript
Promise.all([
    checkAssociation("_Attachment"),   // → res[0]
    checkAssociation("_Variant"),      // → res[1]
    checkAssociation("_Unitofmes"),    // → res[2]
    checkAssociation("_Season"),       // → res[3]
    fetchAttributes(oContext)          // → res[4]
]).then(function(res) {
    var genInfoProg    = calculateSection([...], oEntity);
    var merchHierProg  = calculateSection([...], oEntity);
    var washCareProg   = calculateSection([...], oEntity);
    var prodIdProg     = calculateSection([...], oEntity);
    ...
});
```

---

### 5. Section Definitions

Each section, its strategy, and the exact fields or nav-property used:

| Section | Strategy | Fields / Nav Property |
|---|---|---|
| **Merchandise Hierarchy** | A – Main Entity | `Hierarchy1`, `Hierarchy2`, `Hierarchy3`, `Hierarchy4`, `Hierarchy5`, `Hierarchy6`, `Hierarchy7` |
| **General Information** | A – Main Entity | `ProductDescription`, `ProductGroup`, `OldCategory` |
| **Wash Care** | A – Main Entity | `WASH_CARE_TYPE`, `WASH_CARE`, `ITEM_LIST`, `PIECES_IN_SET` |
| **Unit of Measurement** | B – Association | `_Unitofmes` |
| **Picture** | B – Association | `_Attachment` |
| **Season** | B – Association | `_Season` |
| **Variants** | B – Association | `_Variant` |
| **Products Identification** | A – Main Entity | `product1`, `product2`, `product3`, `product4`, `product5` |
| **Attributes** | C – V2 Service | `/classificationSet` (non-empty `charecteristics` rows) |

---

### 6. `calculateSection` Helper

Used for Strategy A sections. Counts how many fields in the given list are non-null, non-empty, and not the zero-UUID:

```javascript
var calculateSection = function(fields, oDataObj) {
    var filled = 0;
    fields.forEach(function(f) {
        if (oDataObj[f] !== null &&
            oDataObj[f] !== undefined &&
            oDataObj[f] !== "" &&
            oDataObj[f] !== "00000000-0000-0000-0000-000000000000") {
            filled++;
        }
    });
    return fields.length > 0 ? Math.round((filled / fields.length) * 100) : 0;
};
```

---

### 7. Progress Colour Mapping

The `formatProgress` function maps a numeric percentage to both a `ValueState` (for `ProgressIndicator`) and a `ValueColor` (for `RadialMicroChart`):

| Progress | CSS Class | `valueColor` (ProgressIndicator) | `radialColor` (RadialMicroChart) |
|---|---|---|---|
| ≥ 90% | `progressValGood` | `Success` | `Good` |
| 70–89% | `progressValInformation` | `Information` | `Neutral` |
| 50–69% | `progressValWarning` | `Warning` | `Critical` |
| < 50% | `progressValError` | `Error` | `Error` |

> **Important**: `sap.m.ValueColor` and `sap.ui.core.ValueState` are different enums.  
> `ProgressIndicator` uses `ValueState` (`Success`, `Information`, `Warning`, `Error`).  
> `RadialMicroChart` uses `ValueColor` (`Good`, `Neutral`, `Critical`, `Error`).  
> The model stores both separately: `valueColor` and `radialColor`. `overallState` is set to `radialColor`.

---

### 8. Overall Progress

After all sections are computed, the overall is a simple mean:

```javascript
var overallProgress = Math.round(totalProgress / sections.length);
```

`sectionsNeedAttention` counts any section where `progress < 100`.

---

### 9. Model Data Written

```json
{
  "overallProgress": 87,
  "sectionsNeedAttention": 2,
  "statusText": "Not ready",
  "statusColor": "Error",
  "overallState": "Good",
  "overallCss": "progressValGood",
  "sections": [
    { "name": "Merchandise Hierarchy", "progress": 100, "cssClass": "progressValGood", "textClass": "textValGood", "valueColor": "Success", "radialColor": "Good" },
    ...
  ]
}
```

---

## Widget UI Structure (`ProductImage.fragment.xml`)

```
HBox (outer, wrap=Wrap)
 ├── HBox (avatar + product image)
 ├── VBox Column 1 (Product Description, Product Group, Brand)
 ├── VBox Column 2 (Created By, Last Changed By, Last Change Date)
 ├── VBox Column 3 (Creation Date, Status, Old Category)
 └── VBox.profileCompletenessBox  ← the widget
      ├── HBox (top row)
      │    ├── RadialMicroChart  ← bound to overallProgress + overallState (ValueColor)
      │    └── VBox
      │         ├── Text "Style Readiness"
      │         ├── Text "{overallProgress}% complete"
      │         └── Text "{sectionsNeedAttention} sections need attention"
      └── HBox (sections grid, items="{CompletenessModel>/sections}")
           └── VBox.profileCompGridItemTight  [template, repeated per section]
                ├── HBox
                │    ├── Text (section name)
                │    └── Text (progress%)
                └── HBox
                     └── ProgressIndicator (bound to valueColor/ValueState)
```

---

## CSS Classes Reference

| Class | Purpose |
|---|---|
| `.profileCompletenessBox` | Outer widget container (border, padding, min-width) |
| `.profileCompGridItemTight` | Each section cell — `width: 31%` forces a 3-column grid |
| `.profileCompTitle` | "Style Readiness" heading |
| `.profileCompSubtitle` | Subtitle text (grey, small) |
| `.profileCompBarRow` | Pulls progress bar tight up under its label |
| `.customProgressFlat` | Makes `ProgressIndicator` into a flat 4px bar |
| `.progressValGood/Information/Warning/Error` | Colours the progress bar fill |
| `.textValGood/Information/Warning/Error` | Colours the percentage text |

---

## How to Add a New Section

1. **Identify the data source** — main entity field(s), navigation association, or V2 service.

2. **Add the calculation** inside `_calculateCompleteness` in `ObjectPageExt.controller.js`:

   ```javascript
   // Strategy A – fields on main entity:
   var myNewProg = calculateSection(["FieldA", "FieldB"], oEntity);

   // Strategy B – child table:
   // Already handled via checkAssociation in Promise.all — add a new entry there

   // Strategy C – V2 service:
   // Clone fetchAttributes() with different filters if needed
   ```

3. **Push to the sections array**:

   ```javascript
   sections.push(formatSection("My New Section", formatProgress(myNewProg)));
   ```

4. No UI changes needed — the section grid auto-renders from the `sections` array binding.

> **Tip**: The grid uses `width: 31%` to force 3 columns. With 9 sections this gives 3 rows.  
> Adding a 10th section gives 3 rows of 3 + 1 orphan. Consider adjusting `.profileCompGridItemTight` width if the layout looks unbalanced (e.g. `width: 24%` for 4 columns).

---

## Dependencies

- `sap.suite.ui.microchart` — declared in `manifest.json` `libs` (required for `RadialMicroChart` to load synchronously)
- `sap/ui/model/Filter` and `sap/ui/model/FilterOperator` — imported in `ObjectPageExt.controller.js`
- `sap.ui.model.odata.v2.ODataModel` — used globally (no import needed, accessed via `sap.ui.*`)
