sap.ui.define(
  ["sap/ui/core/mvc/ControllerExtension"],
  function (ControllerExtension) {
    "use strict";

    return ControllerExtension.extend(
      "com.zmanprodlist.ext.controller.ListManProduct",
      {
        // this section allows to extend lifecycle hooks or hooks provided by Fiori elements
        override: {
          /**
           * Called when a controller is instantiated and its View controls (if available) are already created.
           * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
           * @memberOf com.zmanprodlist.ext.controller.ListManProduct
           */
          onInit: function () {
            // you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
            var oModel = this.base.getExtensionAPI().getModel();
          },
          routing: {
            onAfterBinding: function (oContext) {
              debugger;
              const oView = this.getView();
              var oModel = new sap.ui.model.odata.v2.ODataModel({
                serviceUrl: "/sap/opu/odata/sap/ZOD_MM_CLASSIF_CREATE_SRV",
              });
              var oGlobalButModel = new sap.ui.model.json.JSONModel();
              var that = this;
              oModel.read("/userValidationSet", {
                success: function (oData, oResponse) {
                  oData.results.forEach(function (item, index) {
                    switch (item.ActionAuth) {
                      case "CREATE":
                        var oCreate = that
                          .getView()
                          .byId(
                            "com.zmanprodlist::zc_cdsv_man_productList--fe::table::zc_cdsv_man_product::LineItem::StandardAction::Create"
                          );
                        oCreate.setVisible(false);
                        break;
                      // case "UPDATE":
                      //   break;
                      case "DELETE":
                        var oDelete = that
                          .getView()
                          .byId(
                            "com.zmanprodlist::zc_cdsv_man_productList--fe::table::zc_cdsv_man_product::LineItem::StandardAction::Delete"
                          );
                        oDelete.setVisible(false);
                        break;
                      case "SMU":
                        var oSMU = that
                          .getView()
                          .byId(
                            "com.zmanprodlist::zc_cdsv_man_productList--fe::table::zc_cdsv_man_product::LineItem::DataFieldForAction::com.sap.gateway.srvd.zsd_man_product.v0001.setSMUStyle::com.sap.gateway.srvd.zsd_man_product.v0001.zc_cdsv_man_productType"
                          );
                        oSMU.setVisible(false);
                        break;
                      case "ONL":
                        var oONLINE = that
                          .getView()
                          .byId(
                            "com.zmanprodlist::zc_cdsv_man_productList--fe::table::zc_cdsv_man_product::LineItem::DataFieldForAction::com.sap.gateway.srvd.zsd_man_product.v0001.setOnlineStyle::com.sap.gateway.srvd.zsd_man_product.v0001.zc_cdsv_man_productType"
                          );
                        oONLINE.setVisible(false);
                        break;
                      case "COPY":
                        var oCopy = that
                          .getView()
                          .byId(
                            "com.zmanprodlist::zc_cdsv_man_productList--fe::table::zc_cdsv_man_product::LineItem::DataFieldForAction::com.sap.gateway.srvd.zsd_man_product.v0001.setCopyStyle::com.sap.gateway.srvd.zsd_man_product.v0001.zc_cdsv_man_productType"
                          );
                        oCopy.setVisible(false);
                        break;
                      case "REPI":
                        var oRepeatIn = that
                          .getView()
                          .byId(
                            "com.zmanprodlist::zc_cdsv_man_productList--fe::table::zc_cdsv_man_product::LineItem::DataFieldForAction::com.sap.gateway.srvd.zsd_man_product.v0001.setRepeatStyle::com.sap.gateway.srvd.zsd_man_product.v0001.zc_cdsv_man_productType"
                          );
                        oRepeatIn.setVisible(false);
                        break;
                      case "REPA":
                        var oRepeatAn = that
                          .getView()
                          .byId(
                            "com.zmanprodlist::zc_cdsv_man_productList--fe::table::zc_cdsv_man_product::LineItem::DataFieldForAction::com.sap.gateway.srvd.zsd_man_product.v0001.setRepeatInseason::com.sap.gateway.srvd.zsd_man_product.v0001.zc_cdsv_man_productType"
                          );
                        oRepeatAn.setVisible(false);
                        break;
                      case "DSAP":
                        var oApprove = that
                          .getView()
                          .byId(
                            "com.zmanprodlist::zc_cdsv_man_productList--fe::table::zc_cdsv_man_product::LineItem::DataFieldForAction::com.sap.gateway.srvd.zsd_man_product.v0001.SetApprove::com.sap.gateway.srvd.zsd_man_product.v0001.zc_cdsv_man_productType"
                          );
                        var oReject = that
                          .getView()
                          .byId(
                            "com.zmanprodlist::zc_cdsv_man_productList--fe::table::zc_cdsv_man_product::LineItem::DataFieldForAction::com.sap.gateway.srvd.zsd_man_product.v0001.SetReject::com.sap.gateway.srvd.zsd_man_product.v0001.zc_cdsv_man_productType"
                          );
                        oApprove.setVisible(false);
                        oReject.setVisible(false);
                        break;
                      case "HOIN":
                        var oPartialInt = that
                          .getView()
                          .byId(
                            "com.zmanprodlist::zc_cdsv_man_productList--fe::table::zc_cdsv_man_product::LineItem::DataFieldForAction::com.sap.gateway.srvd.zsd_man_product.v0001.PartialInitiation::com.sap.gateway.srvd.zsd_man_product.v0001.zc_cdsv_man_productType"
                          );
                        var oCompleteInt = that
                          .getView()
                          .byId(
                            "com.zmanprodlist::zc_cdsv_man_productList--fe::table::zc_cdsv_man_product::LineItem::DataFieldForAction::com.sap.gateway.srvd.zsd_man_product.v0001.CompleteInitiation::com.sap.gateway.srvd.zsd_man_product.v0001.zc_cdsv_man_productType"
                          );
                        oPartialInt.setVisible(false);
                        oCompleteInt.setVisible(false);
                        break;
                      case "HOAP":
                        var oHandoverAppr = that
                          .getView()
                          .byId(
                            "com.zmanprodlist::zc_cdsv_man_productList--fe::table::zc_cdsv_man_product::LineItem::DataFieldForAction::com.sap.gateway.srvd.zsd_man_product.v0001.HandoverApprove::com.sap.gateway.srvd.zsd_man_product.v0001.zc_cdsv_man_productType"
                          );
                        var oHandoverRej = that
                          .getView()
                          .byId(
                            "com.zmanprodlist::zc_cdsv_man_productList--fe::table::zc_cdsv_man_product::LineItem::DataFieldForAction::com.sap.gateway.srvd.zsd_man_product.v0001.HandoverReject::com.sap.gateway.srvd.zsd_man_product.v0001.zc_cdsv_man_productType"
                          );
                        oHandoverAppr.setVisible(false);
                        oHandoverRej.setVisible(false);
                        break;
                    }
                  });
                },
                error: function (oError) {
                  // Handle error
                  console.error("Error fetching data:", oError);
                },
              });
            },
          },
        },
      }
    );
  }
);
