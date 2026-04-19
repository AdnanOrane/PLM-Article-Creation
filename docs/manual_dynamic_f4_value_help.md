# Manual Handling of Dynamic OData V4 F4 Value Help

When using standard SAP Fiori Elements or Smart Controls (like `SmartField` or `sap.ui.mdc.Field`), the SAP UI5 framework automatically handles fetching metadata, creating F4 dialogs, and reading `additionalBinding` elements mapping to push as OData filters.

However, when you build **custom logic** (such as our programmatic `sap.m.TableSelectDialog` for assigning Variants), you bypass this framework "magic." If you want your F4 help filtered dynamically (e.g., Filtering sizes by `OldCategory`), you must actively parse the backend metadata and build the filters yourself. 

Here is exactly how you can find, investigate, and extract OData V4 Value Help properties (`ValueListParameterIn`, `ValueListParameterOut`, etc.) programmatically.

## Step 1: Understanding to the Backend Annotations

In your ABAP CDS View, you added the following annotation:
```abap
@Consumption.valueHelpDefinition: [{
  entity: { name: 'zcdsv_stl_size', element: 'ArticleSize'},
  additionalBinding: [{ localElement: 'OldCategory', element: 'Category', usage: #FILTER_AND_RESULT }]
}]
```
When this serves via OData V4 in Fiori, SAP Gateway transforms it into a `ValueList` annotation. Any `#FILTER` or `#FILTER_AND_RESULT` `additionalBinding` gets parsed into a **`ValueListParameterIn`** or **`ValueListParameterInOut`**.

## Step 2: Retrieving Metadata programmatically in JavaScript

You can ask the `ODataMetaModel` to retrieve the resolved annotations for *any* field. 

```javascript
// 1. Get the V4 MetaModel
var oMetaModel = oContext.getModel().getMetaModel();
var sMetaPath = "/ZC_CDSV_VARIANT/articlesize";

// 2. Request the Value Help Definition (F4)
oMetaModel.requestValueListInfo(sMetaPath, true).then(function (mValueListInfo) {
    // The default ValueList returns in the empty string key ""
    var oValueList = mValueListInfo[""]; 
    
    // --> BEST DEBUGGING STRATEGY <---
    // Pause execution here using the debugger or log to console:
    console.log(oValueList); 
});
```

## Step 3: Finding and Extracting properties (Using the Browser Console)

If you log `oValueList` and open your Chrome Developer Tools, you will find an object similar to this:

```json
{
  "$model": <sap.ui.model.odata.v4.ODataModel instance>,
  "CollectionPath": "zcdsv_stl_size",
  "Parameters": [
    {
      "$Type": "com.sap.vocabularies.Common.v1.ValueListParameterInOut",
      "LocalDataProperty": { "$PropertyPath": "ArticleSize" },
      "ValueListProperty": "ArticleSize"
    },
    {
      "$Type": "com.sap.vocabularies.Common.v1.ValueListParameterIn",
      "LocalDataProperty": { "$PropertyPath": "OldCategory" },
      "ValueListProperty": "Category"
    }
  ]
}
```

### The OData V4 Parameter Types
Within the `Parameters` array, you will see elements flagged with specific `$Type` classifications:
* **`ValueListParameterIn`**: An incoming filter. The user's screen has a value it wants to pass to the value help (e.g., Pass my screen's `OldCategory` into the Value Help's `Category` filter).
* **`ValueListParameterOut`**: An outgoing map. When the user picks a row from the F4 help, take the ValueHelp row's property and copy it back to the screen. 
* **`ValueListParameterInOut`**: Both bounds apply! (Usually the main key of the F4, like `ArticleSize`).
* **`ValueListParameterDisplayOnly`**: An extra column strictly shown in the table for visual purposes (like a Description field) but not returned back or filtered on.

## Step 4: Dynamically Formatting the Map into UI5 Filters

Since we want to emulate the backend filter (`ValueListParameterIn`), we loop through the `Parameters`. If the type dictates it is an `IN` parameter, we grab its value from our current context (`oContext`) and format it into a UI5 `Filter`.

```javascript
var aFilters = [];

// Iterate through raw OData V4 annotations
if (oValueList.Parameters) {
    oValueList.Parameters.forEach(function(oParam) {
        
        // 1. Identify if backend marked this as an IN parameter (Meaning we must pass it as a filter!)
        if (oParam.$Type && oParam.$Type.indexOf("ValueListParameterIn") > -1) {
            
            // "LocalDataProperty" is the name of the Variable on YOUR SCREEN (e.g., OldCategory)
            var sLocalPath = oParam.LocalDataProperty && oParam.LocalDataProperty.$PropertyPath;
            
            // "ValueListProperty" is the name of the target OData F4 Filter parameter (e.g., Category)
            var sValueListProp = oParam.ValueListProperty;
            
            if (sLocalPath && sValueListProp) {
                // 2. Extract screen's current value by reading the bound Context!
                var sPropValue = oAddVariantController._oProductContext.getProperty(sLocalPath);
                
                if (sPropValue) {
                    // 3. Create the UI5 Binding Filter:  Category eq 'CURRENT_ONSCREEN_VALUE'
                    aFilters.push(new sap.ui.model.Filter(
                        sValueListProp, 
                        sap.ui.model.FilterOperator.EQ, 
                        sPropValue
                    ));
                }
            }
        }
    });
}

// 4. Finally apply it during dynamic Table creation
oDialog.bindAggregation("items", {
    path: "/" + oValueList.CollectionPath,
    filters: aFilters,  // The Filters apply explicitly here!
    template: new sap.m.ColumnListItem(...)
});
```

### Why this is a powerful approach:
If you were to rely purely on UI5's implicit behavior (as you found out), you'd have to physically print `OldCategory` out into your `AddVariantDialog.fragment.xml` DOM tree, or the layout logic engine wouldn't recognize it. By evaluating the meta model parameters explicitly in javascript, we can bypass the visual DOM layout engine entirely and extract background metadata freely.
