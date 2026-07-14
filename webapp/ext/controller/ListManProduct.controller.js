sap.ui.define(
  ["sap/ui/core/mvc/ControllerExtension", "sap/ui/model/json/JSONModel"],
  function (ControllerExtension, JSONModel) {
    "use strict";

    // ID prefix for this List Report's table toolbar buttons
    var TABLE_PREFIX = "com.zmanprodlist::zc_cdsv_man_productList--fe::table::zc_cdsv_man_product::LineItem::";
    var ACTION_NS = "DataFieldForAction::com.sap.gateway.srvd.zsd_man_product.v0001.";
    var TYPE_NS = "::com.sap.gateway.srvd.zsd_man_product.v0001.zc_cdsv_man_productType";


    return ControllerExtension.extend(
      "com.zmanprodlist.ext.controller.ListManProduct",
      {
        override: {
          onInit: function () {
            try {
              var that = this;

              // 1. Create JSONModel for menu-group item bindings (manifest expression binding).
              //    false = NOT restricted = visible. true = restricted = hidden.
              this._oAuthModel = new JSONModel({
                CREATE: false,
                DELETE: false,
                SMU: false,
                ONL: false,
                COPY: false,
                REPI: false,
                REPA: false,
                SDAP: false,
                DSAP: false,
                HOIN: false,
                HOAP: false,
                CHSN: false,
                REOPEN: false
              });

              // Set model on view for manifest expression bindings (works for Menu group items)
              this.base.getView().setModel(this._oAuthModel, "plmAuth");
              try {
                this.base.getView().getContent()[0].setModel(this._oAuthModel, "plmAuth");
              } catch (e) { /* content may not exist yet */ }

              console.log("PLM Auth: plmAuth model initialized.");

              // 2. Fetch restrictions from backend
              var oValidationModel = new sap.ui.model.odata.v2.ODataModel({
                serviceUrl: "/sap/opu/odata/sap/ZOD_MM_CLASSIF_CREATE_SRV",
              });

              oValidationModel.read("/userValidationSet", {
                success: function (oData) {
                  if (oData && oData.results) {
                    console.log("PLM Auth: Received " + oData.results.length + " restriction(s).");
                    oData.results.forEach(function (item) {
                      if (that._oAuthModel.getProperty("/" + item.ActionAuth) !== undefined) {
                        that._oAuthModel.setProperty("/" + item.ActionAuth, true);
                      }
                    });
                    // Apply programmatic hiding for standalone toolbar buttons
                    that._hideStandaloneButtons();
                  }
                },
                error: function (oError) {
                  console.error("PLM Auth: Error fetching userValidationSet:", oError);
                },
              });
            } catch (oError) {
              console.error("PLM Auth: Error during onInit:", oError);
            }
          },

          onAfterRendering: function () {
            // Apply standalone button hiding after rendering (buttons exist in toolbar by now)
            this._hideStandaloneButtons();
          }
        },

        /**
         * Mapping of auth codes to standalone button IDs.
         * These are buttons rendered DIRECTLY in the toolbar (not inside a Menu dropdown),
         * so manifest expression binding does NOT work for them.
         * We hide them programmatically using setVisible().
         */
        _STANDALONE_BUTTONS: {
          "CREATE": [
            TABLE_PREFIX + "StandardAction::Create"
          ],
          "DELETE": [
            TABLE_PREFIX + "StandardAction::Delete"
          ],
          "DSAP": [
            TABLE_PREFIX + ACTION_NS + "SetApprove" + TYPE_NS,
            TABLE_PREFIX + ACTION_NS + "SetReject" + TYPE_NS
          ],
          "SDAP": [
            TABLE_PREFIX + ACTION_NS + "ApprovalInit" + TYPE_NS
          ],
          "CHSN": [
            TABLE_PREFIX + ACTION_NS + "ChangeSeason" + TYPE_NS
          ]
        },

        /**
         * Programmatically hides standalone toolbar buttons that cannot be controlled
         * via manifest expression bindings. Uses byId + Element registry fallback.
         * Called from onAfterRendering and after OData response.
         */
        _hideStandaloneButtons: function () {
          var oAuthData = this._oAuthModel.getData();
          var that = this;

          Object.keys(this._STANDALONE_BUTTONS).forEach(function (sAuthCode) {
            if (oAuthData[sAuthCode]) {
              var aIds = that._STANDALONE_BUTTONS[sAuthCode];
              aIds.forEach(function (sId) {
                var oControl = sap.ui.core.Element.getElementById(sId);
                if (oControl && typeof oControl.setVisible === "function") {
                  oControl.setVisible(false);
                  console.log("PLM Auth: Hidden standalone button: " + sAuthCode + " -> " + sId.split("::").pop());
                }
              });
            }
          });
        }
      }
    );
  }
);
