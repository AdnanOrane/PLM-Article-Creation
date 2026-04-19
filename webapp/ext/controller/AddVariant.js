sap.ui.define(["sap/m/MessageToast", "sap/ui/model/Filter", "sap/ui/model/FilterOperator"], function (MessageToast, Filter, FilterOperator) {
  "use strict";

  var oAddVariantController = {
    _oAddVariantDialog: null,
    _oProductContext: null,

    /**
     * Generated event handler.
     *
     * @param oContext the context of the page on which the event was fired. `undefined` for list report page.
     * @param aSelectedContexts the selected contexts of the table rows.
     */
    AddVariant: function (oContext, aSelectedContexts) {
      oAddVariantController._oProductContext = oContext;

      var oModel = oContext.getModel();
      var oMetaModel = oModel.getMetaModel();
      var sMetaPath = "/ZC_CDSV_VARIANT/articlesize";

      oMetaModel.requestValueListInfo(sMetaPath, true).then(function (mValueListInfo) {
          var oValueList = mValueListInfo[""];
          if (!oValueList) {
              sap.m.MessageToast.show("No F4 Value Help found for Article Size in backend metadata.");
              return;
          }

          var sTargetCollectionPath = "/" + oValueList.CollectionPath;
          var sKeyProperty = oValueList.Parameters[0].ValueListProperty; 
          oAddVariantController._sValueListKeyProperty = sKeyProperty; // Save for confirm handler

          if (!oAddVariantController._oAddVariantDialog) {
              sap.ui.core.Fragment.load({
                  id: "fragAddVariant",
                  name: "com.zmanprodlist.ext.fragment.AddVariantDialog",
                  controller: oAddVariantController,
              }).then(
                  function (oDialog) {
                      oAddVariantController._oAddVariantDialog = oDialog;

                      // Dynamically bind to the V4 F4 Value Help model!
                      oAddVariantController._oAddVariantDialog.setModel(oValueList.$model);

                      // Array to hold any dynamic filters from ValueHelp bindings
                      var aFilters = [];
                      if (oValueList.Parameters) {
                          oValueList.Parameters.forEach(function (oParam) {
                              // We only care about mapped IN parameters (which the backend provides via additionalBinding #FILTER_AND_RESULT or #FILTER)
                              if (oParam.$Type && (oParam.$Type.indexOf("ValueListParameterIn") > -1)) {
                                  var sLocalPath = oParam.LocalDataProperty && oParam.LocalDataProperty.$PropertyPath;
                                  var sValueListProp = oParam.ValueListProperty;
                                  if (sLocalPath && sValueListProp) {
                                      // Get the value from the main entity context
                                      var sPropValue = oAddVariantController._oProductContext.getProperty(sLocalPath);
                                      if (sPropValue) {
                                          aFilters.push(new sap.ui.model.Filter(sValueListProp, sap.ui.model.FilterOperator.EQ, sPropValue));
                                          console.log("Applying dynamic F4 filter: " + sValueListProp + " = " + sPropValue);
                                      }
                                  }
                              }
                          });
                      }

                      // Dynamically create rows for the multi-select table
                      oAddVariantController._oAddVariantDialog.bindAggregation("items", {
                          path: sTargetCollectionPath,
                          filters: aFilters,
                          template: new sap.m.ColumnListItem({
                              cells: [
                                  new sap.m.Text({ text: "{" + sKeyProperty + "}" })
                              ]
                          })
                      });

                      oAddVariantController._oAddVariantDialog.open();
                  }
              );
          } else {
              oAddVariantController._oAddVariantDialog.open();
          }
      }).catch(function(oErr) {
          console.error("Error fetching Value List Info:", oErr);
          sap.m.MessageToast.show("Error resolving Value Help data.");
      });
    },

    onAddVariantConfirm: function (oEvent) {
      var aSelectedContexts = oEvent.getParameter("selectedContexts");
      var that = oAddVariantController;

      if (!aSelectedContexts || aSelectedContexts.length === 0) {
        sap.ui.require(["sap/m/MessageToast"], function (MessageToast) {
          MessageToast.show("Please select at least one variant size.");
        });
        return;
      }

      // 1. Create a dynamic backend binding specifically for explicitly pushing Draft Variants
      var sGroupId = "PushVariantDraftGroup";
      var oModel = that._oProductContext.getModel();
      var sPath = that._oProductContext.getPath() + "/_Variant";
      
      // The disconnected binding ensures the UI doesn't accidentally interfere with the raw POST 
      // request, and we define our own $$updateGroupId to manually force submission!
      var oVariantListBinding = oModel.bindList(sPath, null, [], [], {
          $$updateGroupId: sGroupId
      });

      // 2. Queue up the backend create requests into our new explicit batch group
      var aPromises = [];

      // Extract styleuuid from the parent context
      var sPathParent = that._oProductContext.getPath();
      var sStyleuuid = "";
      var matchStyleUuid = sPathParent.match(/styleuuid=([a-f0-9-]+)/i);
      if (matchStyleUuid && matchStyleUuid[1]) {
          sStyleuuid = matchStyleUuid[1];
      } else if (that._oProductContext.getProperty("styleuuid")) {
          sStyleuuid = that._oProductContext.getProperty("styleuuid");
      } else if (that._oProductContext.getProperty("Styleuuid")) {
          sStyleuuid = that._oProductContext.getProperty("Styleuuid");
      } else if (that._oProductContext.getProperty("ProductUUID")) {
          sStyleuuid = that._oProductContext.getProperty("ProductUUID");
      }

      aSelectedContexts.forEach(function (oContext) {
        var sArticleSize = oContext.getProperty("Articlesize") || oContext.getProperty("ArticleSize") || oContext.getProperty(that._sValueListKeyProperty);
        console.log("Preparing to push empty variant draft, then PATCHing with size:", sArticleSize);

        // CREATE AN EMPTY DRAFT FIRST - Bypasses backend readonly/key payload restrictions during POST
        var oNewContext = oVariantListBinding.create({
          IsActiveEntity: false
        });

        if (oNewContext && typeof oNewContext.created === "function") {
          aPromises.push(
            oNewContext
              .created()
              .then(function () {
                console.log("Empty Draft variant created. Proceeding to PATCH articlesize:", sArticleSize);
                // Once draft is generated successfully (POST is done), we PATCH the articlesize.
                oNewContext.setProperty("articlesize", sArticleSize);
              })
              .catch(function (oError) {
                console.error("Backend systematically rejected empty draft creation for size:", sArticleSize);
                console.error(oError);
              })
          );
        }
      });

      // 3. EXPLICITLY force the OData model to send the empty HTTP POST request batch to the ABAP layer
      oModel.submitBatch(sGroupId);

      // 4. Once ALL the backend POST requests finish saving the empty drafts, submit the PATCHes and refresh!
      Promise.all(aPromises)
        .then(function () {
          console.log("Empty drafts created. Now submitting PATCHes to save the ArticleSize values.");
          var pBatch = oModel.submitBatch(sGroupId); // Ensure the pending setProperty changes are pushed
          
          if (pBatch && typeof pBatch.then === "function") {
              pBatch.then(function() {
                  console.log("Backend push completely resolved. Requesting side effects to sync and redraw the variants table on screen.");
                  if (that._oProductContext && typeof that._oProductContext.requestSideEffects === "function") {
                      that._oProductContext.requestSideEffects([{ $NavigationPropertyPath: "_Variant" }]);
                  }
              }).catch(function(err) {
                  console.error("Error submitting PATCHes:", err);
              });
          } else {
              // Fallback for older UI5 versions where submitBatch doesn't return a promise
              setTimeout(function() {
                  console.log("Backend push completely resolved (timeout). Requesting side effects to sync and redraw the variants table on screen.");
                  if (that._oProductContext && typeof that._oProductContext.requestSideEffects === "function") {
                      that._oProductContext.requestSideEffects([{ $NavigationPropertyPath: "_Variant" }]);
                  }
              }, 1500);
          }
        })
        .catch(function (err) {
          console.error("Critical error in promise chain:", err);
        });

      // Note: TableSelectDialog closes automatically after Confirm is clicked.
    },

    onAddVariantCancel: function () {
      // Note: TableSelectDialog closes automatically when Cancel or the outside overlay is clicked!
    },
  };

  return oAddVariantController;
});
