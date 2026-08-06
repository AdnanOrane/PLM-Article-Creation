# Authorization-Based Button Hiding in SAP Fiori Elements v4

## Overview

This document describes how toolbar action buttons (including those nested inside dropdown Menu groups) are dynamically hidden based on user authorizations fetched from a backend OData service (`userValidationSet`).

## Problem Statement

The PLM Article Creation app uses a **Fiori Elements v4 List Report** with multiple OData actions grouped inside dropdown menus (e.g., "Reference Style", "Handover Accept"). The business requirement is to **hide specific actions** based on the logged-in user's authorization profile.

### Why Standard Approaches Failed

| Approach | Why It Failed |
|----------|--------------|
| `byId()` / `sap.ui.getCore().byId()` | The IDs of menu items inside dropdown groups are **not stable** and change when actions are moved into Menu groups |
| UI5 Element Registry search | Menu items are **lazily instantiated** — they don't exist in the registry until the user clicks the dropdown |
| Intercepting `Menu.open()` / `Menu.openBy()` | Fiori Elements v4 may use internal mechanisms that bypass the standard `sap.m.Menu` API |
| CSS injection via `<style>` tag | The generated DOM IDs for lazy menu items don't contain predictable action name fragments |

### Solution: Manifest Visibility Binding + JSONModel

The working approach uses **Fiori Elements v4's built-in support** for overriding action properties in `manifest.json`, combined with a `JSONModel` set from the controller.

---

## Architecture

### Data Flow

```
┌─────────────────────────┐
│  Backend OData Service  │
│  ZOD_MM_CLASSIF_CREATE  │
│  /userValidationSet     │
└───────────┬─────────────┘
            │ Returns restriction codes
            │ e.g. { ActionAuth: "SMU" }
            ▼
┌─────────────────────────┐
│  ListManProduct         │
│  Controller Extension   │
│  (onInit)               │
└───────────┬─────────────┘
            │ Sets flags to true
            ▼
┌─────────────────────────┐
│  plmAuth JSONModel      │
│  { SMU: true, ... }     │
└─────┬───────────┬───────┘
      │           │
      ▼           ▼
┌───────────┐  ┌──────────────────┐
│ manifest  │  │  Controller      │
│ visible   │  │  setVisible()    │
│ bindings  │  │  (standalone)    │
└─────┬─────┘  └────────┬─────────┘
      │                 │
      ▼                 ▼
┌───────────┐  ┌──────────────────┐
│ Menu      │  │ Toolbar buttons: │
│ dropdown  │  │ Create, Delete,  │
│ items     │  │ SetApprove,      │
│ (hidden)  │  │ SetReject,       │
└───────────┘  │ Change Season    │
               │ (hidden)         │
               └──────────────────┘
```

### Two Hiding Mechanisms

| Mechanism | Used For | Why |
|-----------|----------|-----|
| **Manifest `visible` binding** | Actions inside Menu dropdown groups (Reference Style, Handover, Reopen) | These are lazily created — only manifest-level binding works |
| **Programmatic `setVisible()`** | Standalone toolbar buttons (Create, Delete, SetApprove, SetReject, Change Season) | These exist in the toolbar immediately — manifest binding doesn't apply to them |

---

## Step-by-Step Implementation

### Step 1: Define Menu Groups in `manifest.json`

In the `controlConfiguration` section of the List Report page, define your Menu groups. Each group collects related actions into a dropdown button:

```json
"controlConfiguration": {
    "@com.sap.vocabularies.UI.v1.LineItem": {
        "actions": {
            "ReferenceStyleGroup": {
                "type": "Menu",
                "text": "Reference Style",
                "position": {
                    "placement": "Before",
                    "anchor": "DataFieldForAction::com.sap.gateway.srvd.zsd_man_product.v0001.ApprovalInit::com.sap.gateway.srvd.zsd_man_product.v0001.zc_cdsv_man_productType"
                },
                "menu": [
                    "DataFieldForAction::com.sap.gateway.srvd.zsd_man_product.v0001.setCopyStyle::com.sap.gateway.srvd.zsd_man_product.v0001.zc_cdsv_man_productType",
                    "DataFieldForAction::com.sap.gateway.srvd.zsd_man_product.v0001.setSMUStyle::com.sap.gateway.srvd.zsd_man_product.v0001.zc_cdsv_man_productType",
                    "..."
                ]
            }
        }
    }
}
```

### Step 2: Add Visibility Overrides for Individual Actions

In the **same `"actions"` object**, add override entries for each action that needs authorization control. Use expression binding to bind the `visible` property to a named JSONModel (`plmAuth`):

```json
"DataFieldForAction::com.sap.gateway.srvd.zsd_man_product.v0001.setSMUStyle::com.sap.gateway.srvd.zsd_man_product.v0001.zc_cdsv_man_productType": {
    "visible": "{= !${plmAuth>/SMU} }"
}
```

**How the binding works:**
- `plmAuth>/SMU` reads the `/SMU` property from the `plmAuth` JSONModel
- `!` negates it: when `SMU` is `false` → `!false` = `true` → action **visible**
- When `SMU` is `true` → `!true` = `false` → action **hidden**

> [!IMPORTANT]
> The action key in the override must **exactly match** the key used in the `"menu"` array. Both use the full `DataFieldForAction::` path.

### Step 3: Create the JSONModel in the Controller Extension

In `ListManProduct.controller.js`, create a `JSONModel` named `plmAuth` with all authorization codes as properties, defaulting to `false`:

```javascript
sap.ui.define(
  ["sap/ui/core/mvc/ControllerExtension", "sap/ui/model/json/JSONModel"],
  function (ControllerExtension, JSONModel) {
    "use strict";

    return ControllerExtension.extend(
      "com.zmanprodlist.ext.controller.ListManProduct",
      {
        override: {
          onInit: function () {
            var that = this;

            // All flags default to false = NOT restricted = visible
            var oAuthModel = new JSONModel({
              CREATE: false,
              DELETE: false,
              SMU: false,
              ONL: false,
              COPY: false,
              REPI: false,
              REPA: false,
              DSAP: false,
              HOIN: false,
              HOAP: false,
              CHSN: false
            });

            // Set model on the view
            this.base.getView().getContent()[0].setModel(oAuthModel, "plmAuth");
            this.base.getView().setModel(oAuthModel, "plmAuth");

            // Fetch restrictions from backend
            var oValidationModel = new sap.ui.model.odata.v2.ODataModel({
              serviceUrl: "/sap/opu/odata/sap/ZOD_MM_CLASSIF_CREATE_SRV",
            });

            oValidationModel.read("/userValidationSet", {
              success: function (oData) {
                if (oData && oData.results) {
                  oData.results.forEach(function (item) {
                    oAuthModel.setProperty("/" + item.ActionAuth, true);
                  });
                }
              },
              error: function (oError) {
                console.error("PLM Auth: Error fetching userValidationSet:", oError);
              },
            });
          }
        }
      }
    );
  }
);
```

### Step 4: Backend Service Returns Restriction Codes

The OData V2 service `ZOD_MM_CLASSIF_CREATE_SRV` exposes an entity set `/userValidationSet` that returns records like:

```json
{
  "results": [
    { "ActionAuth": "SMU" },
    { "ActionAuth": "COPY" },
    { "ActionAuth": "HOIN" }
  ]
}
```

Each `ActionAuth` code represents a **restriction** — the user should NOT see the corresponding actions.

---

## Authorization Code Reference

| Auth Code | Actions Hidden | Location | Mechanism |
|-----------|---------------|----------|-----------|
| `CREATE` | Standard Create button, Send for approval | List Report Toolbar | Programmatic `setVisible()` |
| `DELETE` | Standard Delete button | List Report & Object Page Toolbar | Programmatic `setVisible()` |
| `EDIT` | Standard Edit button | Object Page Toolbar | Programmatic `setVisible()` |
| `SMU` | SMU Style (same Design Color), SMU Style (new Design Color) | Reference Style menu | Manifest binding |
| `ONL` | Online Style (same Design Color), Online Style (new Design Color) | Reference Style menu | Manifest binding |
| `COPY` | Copy Style | Reference Style menu | Manifest binding |
| `REPI` | Repeat In Same Season (same Design Color), Repeat In Same Season (new Design Color) | Reference Style menu | Manifest binding |
| `REPA` | Repeat In Another Season | Reference Style menu | Manifest binding |
| `DSAP` | SetApprove, SetReject (capital 'S') | List Report Toolbar | Programmatic `setVisible()` |
| `HOIN` | Complete Handover Initiation, Partial Handover Initiation | Sent For Handover Approval menu | Manifest binding |
| `HOAP` | Partial Handover Accept, Handover Accept, Handover Reject | Handover Accept menu | Manifest binding |
| `CHSN` | Change Season | List Report Toolbar | Programmatic `setVisible()` |
| `REOPEN` | ReCOMP, ReSADD, ReBOM | Reopen menu | Manifest binding |

---

## Files Modified

### [`manifest.json`](file:///e:/Orane/Fiori%20Projects/PLM%20Article%20Creation/webapp/manifest.json)

**Section:** `sap.ui5` → `routing` → `targets` → `zc_cdsv_man_productList` → `options` → `settings` → `controlConfiguration` → `@com.sap.vocabularies.UI.v1.LineItem` → `actions`

**Changes:**
- Added visibility override entries for each `DataFieldForAction` that requires authorization control
- Each override uses an expression binding: `"{= !${plmAuth>/CODE} }"`

### [`ListManProduct.controller.js`](file:///e:/Orane/Fiori%20Projects/PLM%20Article%20Creation/webapp/ext/controller/ListManProduct.controller.js)

**Changes:**
- Creates a `JSONModel` named `plmAuth` with all auth flags defaulting to `false`
- Sets the model on the view and its content for binding propagation
- Reads `/userValidationSet` from the OData V2 service
- Sets each returned `ActionAuth` code to `true` in the model, triggering the binding to hide the corresponding actions

### [`ObjectPageExt.controller.js`](file:///e:/Orane/Fiori%20Projects/PLM%20Article%20Creation/webapp/ext/controller/ObjectPageExt.controller.js)

**Changes:**
- Implements the same programmatic button hiding logic for standard Object Page header actions.
- Initializes the `plmAuth` JSONModel on the Object Page view during completeness calculation.
- Fetches `/userValidationSet` OData restrictions, setting matching property flags.
- Programmatically hides standard Edit and Delete action buttons on the Object Page toolbar if `EDIT` or `DELETE` restriction codes are returned.

---

## Testing

### To test hiding specific actions locally:

Change the default value of any flag in the JSONModel from `false` to `true`:

```javascript
var oAuthModel = new JSONModel({
  SMU: true,    // ← This will hide SMU Style buttons immediately
  COPY: true,   // ← This will hide Copy Style button
  // ... rest stay false
});
```

### To verify in the browser console:

```javascript
// Check current auth model values
sap.ui.getCore().byId("container-comzmanprodlist---appRootView").getModel("plmAuth").getData()

// Manually restrict SMU at runtime
sap.ui.getCore().byId("container-comzmanprodlist---appRootView").getModel("plmAuth").setProperty("/SMU", true)

// Manually un-restrict SMU
sap.ui.getCore().byId("container-comzmanprodlist---appRootView").getModel("plmAuth").setProperty("/SMU", false)
```

---

## Adding a New Action

To add authorization control for a new action:

1. **Choose an auth code** (e.g., `"NEWCODE"`)

2. **Add the flag to the JSONModel** in `ListManProduct.controller.js`:
   ```javascript
   var oAuthModel = new JSONModel({
     // ... existing flags
     NEWCODE: false
   });
   ```

3. **Add the visibility override** in `manifest.json` under the `"actions"` object:
   ```json
   "DataFieldForAction::com.sap.gateway.srvd.zsd_man_product.v0001.newAction::com.sap.gateway.srvd.zsd_man_product.v0001.zc_cdsv_man_productType": {
       "visible": "{= !${plmAuth>/NEWCODE} }"
   }
   ```

4. **Ensure the backend** returns `{ "ActionAuth": "NEWCODE" }` from `/userValidationSet` when the user should NOT see this action.

---

## Key Takeaways

> **Manifest `visible` binding** works ONLY for actions inside Menu dropdown groups. For standalone toolbar buttons, it does NOT work — use programmatic `setVisible()` instead.

> **Hybrid approach required:** Menu items (lazy-loaded) use manifest binding. Standalone buttons (immediately rendered) use programmatic hiding in `onAfterRendering`.

> Do NOT attempt to hide lazy-loaded menu items using `byId()`, registry search, or DOM manipulation. These fail because Fiori Elements v4 only instantiates menu items when the dropdown is clicked.

> **Adding a new action?** If it's inside a Menu group → add manifest `visible` binding. If it's a standalone toolbar button → add its ID to `_STANDALONE_BUTTONS` in the controller.
