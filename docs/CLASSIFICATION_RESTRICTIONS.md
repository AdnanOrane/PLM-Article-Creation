# Classification Section Restrictions & Instance Features

This documentation covers the technical implementation details for integrating RAP instance features and dynamic OData V2 field controls into the custom Fiori Classification section. 

## Table of Contents
1. [Overview](#overview)
2. [Macro Validation: Finding and Utilizing the Feature Instance](#macro-validation-finding-and-utilizing-the-feature-instance)
3. [Micro Validation: Mapping Char Types](#micro-validation-mapping-char-types)
4. [Applying the Logic to the UI](#applying-the-logic-to-the-ui)

---

## Overview

The primary objective is to restrict user inputs across the product classification section. The approach involves two parallel strategies:
1. **Section-wide Locking:** Leverages the RAP (OData V4) instance feature `(feature-update)` applied directly to the `zcdsv_charecteristics` entity. If an individual article implies the user is unauthorized/restricted from updating characteristics based on its condition, the entire Classification subset safely disables.
2. **Individual Field Metadata:** Leverages the OData V2 endpoint `/ReadOnlyCharSetSet` which transmits custom types (`M` for Mandatory, `D` for Disabled), assigning specific attributes directly into the generated properties.

---

## Macro Validation: Finding and Utilizing the Feature Instance

Typically, UI5 standard templates execute instance evaluations automatically. Because Classification is implemented via a custom SubSection fragment backed by custom controller logic inside `ext/controller/Classification.controller.js`, we must request these instance updates natively from the V4 structure.

To handle dynamic transitions, empty drafts, and RAP backend constraints reliably, we implement a **multi-tiered asynchronous validation strategy** executing three concurrent checks using `Promise.all`:

### 1. Parent Draft Context Check
We check feature controls on the active page context (which represents the temporary Draft entity during editing):
```javascript
var oCurrentParentBinding = oModelPG.bindContext(sPath, null, {
  $select: "__EntityControl/Updatable,__CreateByAssociationControl/_charecteristics"
});
var pCurrentParent = oCurrentParentBinding.requestObject().then(function (oData) {
  return {
    updatable: oData && oData.__EntityControl ? oData.__EntityControl.Updatable : true,
    cba: oData && oData.__CreateByAssociationControl ? oData.__CreateByAssociationControl._charecteristics : true
  };
}).catch(function (oErr) {
  return { updatable: true, cba: true };
});
```

### 2. Parent Active Entity Context Check
If the page context is a Draft, querying certain draft features might return uninitialized states. We therefore concurrently resolve the active parent path (`IsActiveEntity=true`) and query its persistent active instance features:
```javascript
var sActiveParentPath = sPath.replace("IsActiveEntity=false", "IsActiveEntity=true");
var oActiveParentBinding = oModelPG.bindContext(sActiveParentPath, null, {
  $select: "__EntityControl/Updatable,__CreateByAssociationControl/_charecteristics"
});
var pActiveParent = oActiveParentBinding.requestObject().then(function (oData) {
  return {
    updatable: oData && oData.__EntityControl ? oData.__EntityControl.Updatable : true,
    cba: oData && oData.__CreateByAssociationControl ? oData.__CreateByAssociationControl._charecteristics : true
  };
}).catch(function (oErr) {
  return { updatable: true, cba: true };
});
```

### 3. Child Characteristics Context Check
Finally, to prevent the recurrent `"Operation is not enabled"` error thrown by OData V4 when list-binding against an uninitialized draft's children, we query the characteristics collection directly using an absolute path to the **Active Entity characteristics**:
```javascript
var sTargetCharListPath = sPath.replace("IsActiveEntity=false", "IsActiveEntity=true") + "/_charecteristics";
var oCharListBinding = oModelPG.bindList(sTargetCharListPath, null, null, null, {
  $select: "__EntityControl",
});
var pChildCharacteristics = oCharListBinding.requestContexts(0, 1)
  .then(function (aCtx) {
    if (aCtx && aCtx.length > 0) {
      return aCtx[0].requestProperty("__EntityControl/Updatable");
    } else {
      return null; // Empty characteristics list
    }
  })
  .catch(function (oErr) {
    return true;
  });
```

### 4. Evaluating the Section Lock Decision
We join all three checks concurrently. The section-wide lock (`bSectionUpdatable = false`) is triggered if:
1. Either parent product (draft or active) is marked as not updatable (`updatable === false`).
2. Any existing characteristic instance is marked as not updatable (`oCharUpdatableResult === false`).
3. The characteristics list is empty, and creation of new characteristics is restricted (`cba === false`).

```javascript
Promise.all([pCurrentParent, pActiveParent, pChildCharacteristics]).then(function (aResults) {
  var oCurrentParentResult = aResults[0];
  var oActiveParentResult = aResults[1];
  var oCharUpdatableResult = aResults[2];
  var bSectionUpdatable = true;

  if (oCurrentParentResult.updatable === false || oActiveParentResult.updatable === false) {
    bSectionUpdatable = false;
  }
  if (oCharUpdatableResult === false) {
    bSectionUpdatable = false;
  }
  if (oCharUpdatableResult === null && (oCurrentParentResult.cba === false || oActiveParentResult.cba === false)) {
    bSectionUpdatable = false;
  }

  _triggerClassificationRead(bSectionUpdatable);
});
```

---

## Micro Validation: Mapping Char Types

Before rendering the characteristics dynamically via V2 model endpoints natively passing characteristics arrays (`/classificationSet`), we fetch all explicit property overrides generated by the custom endpoint `/ReadOnlyCharSetSet`.

### Building the Case-Insensitive Mapping Array
To prevent JavaScript undefined variable crashes (e.g. `field.type` failing) and eliminate casing mismatches, we push the resultant OData queries explicitly into a controlled Array `aReadOnlyProps`.

```javascript
oDataRO.results.forEach(function (item) {
    if (item.Charname) {
        aReadOnlyProps.push({
            charname: item.Charname.toUpperCase(),       // Extracted directly via item.Charname
            type: item.type ? item.type.toUpperCase() : "" // Passed as D or M
        });
    }
});
```

---

## Applying the Logic to the UI

Once mapped and evaluated, `_triggerClassificationRead()` executes iteration rules mapping the exact components natively.

Within the `oCharGroup[item].forEach` structure:
```javascript
var sUpperCharName = field.charname ? field.charname.toUpperCase() : "";

// Secure lookup directly verifying against our Dictionary mapping
var oMatchedProp = aReadOnlyProps.find(function(p) { return p.charname === sUpperCharName; });
var sType = oMatchedProp ? oMatchedProp.type : "";

// Feature M: Asterix (Mandatory Field Toggle)
if (sType === "M") {
    bRequired = true;    
}

// Feature D: UI Hard Freeze
var bIsEditable = "{viewState>/showForm}"; 
if (sType === "D") {
    bIsEditable = false;
} 
// Legacy Backup Condition logic preserving standard disabled items 
else if (aReadOnlyChars.includes(sUpperCharName) && sType !== "M") {
    bIsEditable = false;
}
```

### Result Summary
These features combine simultaneously mapping robust architectural standards:
1. Native UI properties dynamically render dependent on external JSON models.
2. V4 native instance controls operate entirely separated from standard logic avoiding internal Fiori Elements API crashes.
3. Local rendering accurately correlates back directly to customized OData logic.

---

## Input Validation, Data Integrity & Active Drafts

Recent enhancements address several core behaviors revolving around strict F4 matching rules, case sensitivity, resolving missing event sync states, and forcefully synchronizing auto-populated Fiori defaults iteratively to the internal draft schemas. 

> [!NOTE] 
> Because of the architectural complexities involving UI5 native behaviors and OData V4 list mapping mechanics, we have explicitly documented the deep-dive reasoning and implementation blocks. \
> **Read the in-depth technical documentation here:** [Characteristic Input Handling & Draft Sync](./CHARACTERISTIC_INPUT_HANDLING.md)

---



---

## Future Considerations

1. **Mass Upload Validation**: If bulk imports are executed, characteristic validation must strictly mirror the frontend logic implemented here on backend OData validations.
2. **Model Aggregation Sizes**: Standard limits (1000 items) are currently set for `suggestionItems` bindings via `setSizeLimit`. High-volume classification values may require transitioning to OData filtered lists directly to manage memory efficiently.
3. **Draft Cleanup Automation**: Auto-creating missing parameters pushes overhead onto the draft. Unsaved, discarded drafts must be frequently handled by garbage collector batch jobs internally via the S/4 ABAP RAP.

## Debugging Workflow

- **No Characteristics Appear:** Review `bSectionUpdatable` closure inside `ext/controller/Classification.controller.js` and verify if the SAP backend returns `"__EntityControl/Updatable"` as `false` inappropriately for the test entity's layout.
- **Valid Inputs Marked as Invalid:** Use the network tab payload resolving `/valuesInputSet?key=LabelName` to ensure the localized string mapped as the input key successfully relates to the descriptor natively configured on S/4.
- **Draft Fails to Populate:** Confirm whether the view is being processed safely via Display Mode (which deliberately restricts `bSectionUpdatable`). If changes are needed, confirm `_saveCharacteristic` triggers via `create` or `setProperty` specifically targeting Fiori Element's internal V4 `_charecteristics` navigation paths.
