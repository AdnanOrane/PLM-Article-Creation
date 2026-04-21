# Characteristic Input Handling & Draft Synchronization

This document covers the deep technical details and lifecycle behaviors executed within the Classification section (`ext/controller/Classification.controller.js`) to handle dynamic user inputs, F4 Value Help validations, and forced synchronization of auto-populated default data into the active Fiori Elements V4 Draft session.

## Table of Contents
1. [The "Mixed Case" Problem (F4 Match Validation)](#1-the-mixed-case-problem-f4-match-validation)
2. [SAP UI5 Event Queue Hierarchy (The Unfired Change Bug)](#2-sap-ui5-event-queue-hierarchy-the-unfired-change-bug)
3. [Auto-Populated Values (Draft Injection Framework)](#3-auto-populated-values-draft-injection-framework)

---

## 1. The "Mixed Case" Problem (F4 Match Validation)

### Problem Definition
For characteristics that demand restrictively fixed values, `sap.m.Input` features a combined input and suggestion list aggregation. When `autocomplete: true` is configured, typing partial strings leverages UI5's casing fallback. 
For example, typing `w` brings up the `WOVEN` suggestion, converting the active input string to `wOVEN`. Without explicit validation, hitting `"Enter"` sends the mixed-case `wOVEN` payload straight to the backend OData service, subsequently compromising backend reporting or integrity rules.

### Our Solution (`onCharacteristicChange`)
Instead of disabling `autocomplete` or forcing the use of restricted dropdowns (`sap.m.ComboBox`), we actively intersect the `change` event payload immediately after focus is dropped.

```javascript
var performValidation = function (aValues) {
    var bValid = false;
    var sCorrectValue = sValue;
    
    // Scan iterating across the active suggestionModel payload iteratively
    for (var i = 0; i < aValues.length; i++) {
        if (aValues[i].desc && aValues[i].desc.toUpperCase() === sValue.toUpperCase()) {
            bValid = true;
            sCorrectValue = aValues[i].desc; // Correct the exact spelling/casing match
            break;
        }
    }

    if (bValid) {
        if (sValue !== sCorrectValue) {
            oInput.setValue(sCorrectValue); // Sync the UI layout aggressively 
        }
        that._saveCharacteristic(oInput, oContext, oModel, sCharName, sCorrectValue);
        oInput.setValueState("None");
        oInput.setValueStateText("");
    } else {
        sap.m.MessageToast.show("Please select a valid value. '" + sValue + "' is not allowed.");
        oInput.setValueState("Error");
    }
};
```

1. **Local Access First:** We bypass heavy API calls by attempting to parse `oInput.getModel("suggestionModel")` localized bound values. 
2. **Fallback Fetch:** If the model doesn't exist (e.g. user copy-pasted a value instantly), we synchronously dispatch a filtered fetch against `/valuesInputSet`.
3. **Execution Logic:** Only exact, case-insensitive string matches survive. The UI replaces the input dynamically and transmits the valid case via `create` / `setProperty`. Failures trigger standard UI5 error states ensuring backend cleanliness.

---

## 2. SAP UI5 Event Queue Hierarchy (The Unfired Change Bug)

### Problem Definition
When building F4 suggestion popups, a common mistake is programmatically overriding the `suggestionItemSelected` native event to forcefully set the matched input using: `oEvent.getSource().setValue(oItem.getText());`.
While visually accurate, doing this instructs the internal UI5 handler to interpret the input as modified strictly via an isolated Application Script, suppressing standard user-interaction flags (`_lastValue` parameter sync). Consequently, the native `change` event required to fire `onCharacteristicChange` and trigger our `_saveCharacteristic` network payload is effectively killed entirely.

### Our Solution
We removed the explicit `suggestionItemSelected` handler directly from the loop generation entirely.
Because `sap.m.Input` fundamentally maintains the selection binding internally, natively picking a suggestion executes this reliable sequence safely:
1. Replaces DOM target string securely.
2. Adjusts framework `_lastValue` string securely. 
3. Issues `change` successfully pushing directly to `onCharacteristicChange`.

This guarantees inputs consistently register for submission directly avoiding "ghost clicks" saving out of cycle.

---

## 3. Auto-Populated Values (Draft Injection Framework)

### Problem Definition
Fiori Elements Draft orchestration operates on physical modification constraints. Inside `/classificationSet` mapping parameters (`_triggerClassificationRead`), backend schemas commonly return predefined parameter defaults defined out-of-the-box (e.g. `field.charvalues` = "Standard"). 
Because `onCharacteristicChange` relies entirely on physical user clicks, untouchable layout defaults are displayed graphically but never serialized iteratively back against the underlying proxy draft context (`_charecteristics` bindings).

### Our Solution (`_syncAutoPopulatedValues`)
To counteract this, immediately after resolving the UI arrays, we automatically check for active layout default representations against internal context tables specifically while the page occupies `Edit` mode explicitly.

```javascript
_syncAutoPopulatedValues: function (aClassificationResults, oContext, oModel) {
    var sPath = oContext.getPath() + "/_charecteristics";
    var oCharBinding = oModel.bindList(sPath);
    
    // Explicitly targeting up to 500 records actively currently residing inside Draft wrapper natively.
    oCharBinding.requestContexts(0, 500).then(function (aContexts) {
        aClassificationResults.forEach(function (item) {
            var sCharName = item.charname;
            var sValue = item.charvalues;
            
            if (sCharName && sValue) { // Ensure field possesses pre-set criteria structurally
                var oExistingContext = null;
                for (var i = 0; i < aContexts.length; i++) {
                    var sCtxCharName = aContexts[i].getProperty("Charname");
                    if (sCtxCharName && sCtxCharName.toUpperCase() === sCharName.toUpperCase()) {
                        oExistingContext = aContexts[i];
                        break;
                    }
                }
                // Verify discrepancies to mitigate redundant OData POST streams
                if (oExistingContext) {
                    if (oExistingContext.getProperty("Charvalue") !== sValue) {
                        oExistingContext.setProperty("Charvalue", sValue);
                    }
                } else {
                    oCharBinding.create({
                        Charname: sCharName,
                        Charvalue: sValue,
                    });
                }
            }
        });
    });
}
```
**Protection Boundaries:** By evaluating `bSectionUpdatable` prior to executing the function, we guarantee `aCtx[0].requestProperty("__EntityControl/Updatable")` successfully governs the injection, fully protecting Display mode attributes from crashing against read-only backend parameters mapping.
