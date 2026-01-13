sap.ui.define(
  ["sap/ui/core/mvc/ControllerExtension", "sap/m/MessageToast"],

  function (ControllerExtension, MessageToast) {
    "use strict";

    return ControllerExtension.extend(
      "com.zmanprodlist.ext.controller.Classification",
      {
        // this section allows to extend lifecycle hooks or hooks provided by Fiori elements
        override: {
          /**
           * Called when a controller is instantiated and its View controls (if available) are already created.
           * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
           * @memberOf com.zmanprodlist.ext.controller.Classification
           */
          onInit: function () {
            debugger;
          },

          routing: {
            onAfterBinding: function (oContext) {
              var oButton = this.base
                .getView()
                .byId(
                  "com.zmanprodlist::zc_cdsv_man_productObjectPage--fe::CustomSubSection::Classification--AddClassnew"
                );

              var oForm = this.base
                .getView()
                .byId(
                  "com.zmanprodlist::zc_cdsv_man_productObjectPage--fe::CustomSubSection::Classification--idCharecter"
                );
              // var bHasInputs = oForm.getContent().some(function (oControl) {
              //     return oControl instanceof sap.m.Input;
              // });;
              var oViewModel = new sap.ui.model.json.JSONModel({
                showForm: true,
              });
              this.getView().setModel(oViewModel, "viewState");
              var oViewPG = this.base.getView();
              var oModelPG = oViewPG.getModel();
              var oContextPG = oViewPG.getBindingContext();
              var sPath = oContextPG.getPath();
              const match = sPath.match(/styleuuid=([a-f0-9-]+)/i);
              // var ProductId = decodeURIComponent(sPath.match(/product='(.*?)'/)[1]);
              if (match && match[1]) {
                var Productuuid = match[1];
              }

              const oView = this.getView();
              var oModel = new sap.ui.model.odata.v2.ODataModel({
                serviceUrl: "/sap/opu/odata/sap/ZOD_MM_CLASSIF_CREATE_SRV",
              });
              var oResultModel = new sap.ui.model.json.JSONModel();
              var that = this;

              oModel.read("/classificationSet", {
                filters: [
                  new sap.ui.model.Filter(
                    "Productuuid",
                    sap.ui.model.FilterOperator.EQ,
                    Productuuid
                  ),
                  // new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.EQ, ProductId)
                ],
                success: function (oData, oResponse) {
                  oResultModel.setData(oData.results);
                  // var oForm = that.base.getView().byId("com.zmanprodlist::zc_cdsv_man_productObjectPage--fe::CustomSubSection::Classification--idCharecter");
                  // var bHasInputs = oForm.getContent().some(function (oControl) {
                  //     return oControl instanceof sap.m.Input;
                  // });;

                  that.getView().setModel(oResultModel, "classSet");
                  const oCharGroup = {};
                  var oRole;
                  oData.results.forEach((item) => {
                    oRole = item.Role;
                    if (!oCharGroup[item.classname]) {
                      oCharGroup[item.classname] = [];
                    }
                    var oCharval = {};
                    if (item.charecteristics != "") {
                      oCharval.charecteristics = item.charecteristics;
                      oCharval.charvalues = item.charvalues;
                      oCharGroup[item.classname].push(oCharval);
                    }
                  });

                  var oHBox1 = that
                    .getView()
                    .byId(
                      "com.zmanprodlist::zc_cdsv_man_productObjectPage--fe::CustomSubSection::Classification--HBox1"
                    );
                  var oFlexBox = that
                    .getView()
                    .byId(
                      "com.zmanprodlist::zc_cdsv_man_productObjectPage--fe::CustomSubSection::Classification--FlexBox1"
                    );
                  // var oSimpleForm = that.base.getView().byId("com.zmanprodlist::zc_cdsv_man_productObjectPage--fe::CustomSubSection::Classification--idCharecter");

                  //    oSimpleForm.destroyContent( );

                  oHBox1.destroyItems();
                  oFlexBox.destroyItems();
                  var oEdit = that.getView().byId("fe::StandardAction::Edit");
                  var oDelete = that
                    .getView()
                    .byId("fe::StandardAction::Delete");
                  var oEditBut = oEdit.mProperties;
                  if (oEditBut.visible === false && oRole != "APPROVER") {
                    that
                      .getView()
                      .getModel("viewState")
                      .setProperty("/showForm", true);
                    var oButton = new sap.m.Button({
                      text: "Add Attributes",
                      press: that.onAddCharacteristic.bind(that),
                    });
                    oButton.setLayoutData(
                      new sap.ui.layout.GridData({
                        span: "XL2 L2 M3 S12",
                      })
                    );

                    // oSimpleForm.addContent(oButton);
                  } else if (oEditBut.visible === true && oRole == "APPROVER") {
                    oEdit.setVisible(false);
                    oEdit.setEnabled(false);
                    oDelete.setVisible(false);
                    oDelete.setEnabled(false);
                    that
                      .getView()
                      .getModel("viewState")
                      .setProperty("/showForm", false);
                  } else if (oEditBut.visible === true) {
                    that
                      .getView()
                      .getModel("viewState")
                      .setProperty("/showForm", false);
                  }

                  Object.keys(oCharGroup).forEach((item) => {
                    var oSimpleForm = new sap.ui.layout.form.SimpleForm({
                      layout: "ColumnLayout",
                      columnsM: 2,
                      columnsL: 3,
                      columnsXL: 4,
                    });

                    oSimpleForm.addContent(
                      new sap.ui.core.Title({
                        text: item,
                      })
                    );
                    oCharGroup[item].forEach((field, index) => {
                      console.log("FieldIndex", field);

                      var oLabel = new sap.m.Label({
                        text: field.charecteristics,
                      });

                      var oInput = new sap.m.Input({
                        value: field.charvalues,
                        showValueHelp: true,
                        width: "10rem",
                        name: "input_" + index,
                        editable: "{viewState>/showForm}",
                        valueHelpRequest: that.onValueHelpRequest.bind(that),
                      });
                      // oLabel.setLayoutData(new sap.ui.layout.GridData({ span: "L4 M4 S12" }));
                      // oInput.setLayoutData(new sap.ui.layout.GridData({ span: "L8 M8 S12" }));
                      // oLabel.setLayoutData(new sap.ui.layout.GridData({
                      //     // span: "L3 M3 S12"
                      //     span: "XL4 L2 M4 S6"
                      // }));
                      // oInput.setLayoutData(new sap.ui.layout.GridData({
                      //     // span: "L9 M9 S12"
                      //     span: "XL4 L2 M4 S6"
                      // }));

                      oSimpleForm.addContent(oLabel);
                      oSimpleForm.addContent(oInput);
                    });
                    oHBox1.addItem(oSimpleForm);
                  });
                  // oVBox1.addItem(oSimpleForm);
                  // oSimpleForm.addContent(oHBox1);
                  oFlexBox.addItem(oButton);
                  console.log("Data fetched successfully:", oData);
                  //   }
                },
                error: function (oError) {
                  // Handle error
                  console.error("Error fetching data:", oError);
                },
              });
            },
            onBeforeNavigation: function (oEvent) {
              debugger;
            },
          },
        },

        onValueHelpRequest: function (oEvent) {
          var oInput = oEvent.getSource();
          var oInp = oEvent.getSource();
          // var oSimpleForm = this.base.getView().byId("com.zmanprodlist::zc_cdsv_man_productObjectPage--fe::CustomSubSection::Classification--idCharecter");
          // var aInputs = oSimpleForm.findAggregatedObjects(true, function (oControl) {
          //     return oControl.isA("sap.m.Input");
          // });

          // aInputs.forEach(function (oItem) {

          //     var sName = oItem.sId;
          //     console.log(sName);
          // });
          // for (var i = 0; i < aInputs.length; i++) {
          //     if (oInput.sId === oEvent.mParameters.id) {
          //         console.log(aInputs[i]);
          //     }
          // }
          var strLabel = oInput.oParent.mAggregations.label.getText();
          //strLabel = strLabel.replace(/\s+/g, "");
          var oModel = new sap.ui.model.odata.v2.ODataModel({
            serviceUrl: "/sap/opu/odata/sap/ZOD_MM_CLASSIF_CREATE_SRV",
          });
          var oResultModel = new sap.ui.model.json.JSONModel();
          var that = this;
          oModel.read("/valuesInputSet", {
            filters: [
              new sap.ui.model.Filter(
                "key",
                sap.ui.model.FilterOperator.EQ,
                strLabel
              ),
            ],
            success: function (oData) {
              var oVHModel = new sap.ui.model.json.JSONModel({
                ValueList: oData.results,
              });
              that.getView().setModel(oVHModel, "valueHelpModel");

              if (!that._oValueHelpDialog) {
                that._oValueHelpDialog = new sap.m.SelectDialog({
                  title: "Select Value",
                  items: {
                    path: "valueHelpModel>/ValueList",
                    template: new sap.m.StandardListItem({
                      title: "{valueHelpModel>desc}",
                      // description: "{valueHelpModel>desc}"
                    }),
                  },
                  // NEW: Add search event handler
                  search: function (oEvent) {
                    var sValue = oEvent.getParameter("value");
                    var oFilter = new sap.ui.model.Filter(
                      "desc",
                      sap.ui.model.FilterOperator.Contains,
                      sValue
                    );
                    var oBinding = oEvent.getSource().getBinding("items");
                    oBinding.filter([oFilter]);
                  },
                  confirm: function (oEvent) {
                    var oSelectedItem = oEvent.getParameter("selectedItem");
                    if (oSelectedItem) {
                      oInput.setValue(oSelectedItem.getTitle());
                    }
                    that._oValueHelpDialog = null;
                  },
                  cancel: function () {
                    console.log("Value help dialog was cancelled.");
                    that._oValueHelpDialog = null;
                  },
                });
                that.getView().addDependent(that._oValueHelpDialog);
              }

              that._oValueHelpDialog.open();
            },
            error: function () {
              MessageBox.error("Failed to load value help data.");
            },
          });
        },

        onAddCharacteristic: function (oEvent) {
          var oView = this.base.getView();
          var oModel = oView.getModel();
          var oContext = oView.getBindingContext();
          //var oVBox = oView.byId("com.zmanprodlist::zc_cdsv_man_productObjectPage--fe::CustomSubSection::Classification--vBox1");
          var oPanel = this.getView().byId(
            "com.zmanprodlist::zc_cdsv_man_productObjectPage--fe::CustomSubSection::Classification--HBox1"
          );
          var aInputs = oPanel.findAggregatedObjects(true, function (oControl) {
            return oControl.isA("sap.m.Input");
          });

          var oPayload = {};
          //    var aCharValues = [];
          //    aInputs.forEach(function (oInput) {
          //        var sCharVal = oInput.getValue();
          //       var  sCharName =oInput.oParent.mAggregations.label.getText( );
          //         aCharValues.push({CharName : sCharName,CharValue : sCharVal});
          //     });
          var sPath = oContext.getPath() + "/_charecteristics";
          const match = sPath.match(/styleuuid=([a-f0-9-]+)/i);
          // var ProductId = decodeURIComponent(sPath.match(/product='(.*?)'/)[1]);
          if (match && match[1]) {
            var Productuuid = match[1];
          }
          var aCharValues = aInputs.map(function (oInput) {
            var sLabel = oInput.oParent.mAggregations.label.getText(); // assumes label is sibling
            return {
              Charname: sLabel,
              Charvalue: oInput.getValue(),
            };
          });
          // var oCharBinding = oModel.bindList(oContext.getPath() + "/_charecteristics", oContext, {
          //     $$groupId: "updateGroup"
          // });

          var oCharBinding = oModel.bindList(sPath, {
            sorters: [
              {
                path: "charname",
              },
            ],
          });
          var oEnableChar = this.getView()
            .getModel("viewState")
            .getProperty("/showForm");
          if (oEnableChar === false) {
            this.getView().getModel("viewState").setProperty("/showForm", true);
            MessageToast.show("Charecteristics is Enabled");
          } else {
            this.getView()
              .getModel("viewState")
              .setProperty("/showForm", false);
            MessageToast.show("Charecteristics is saved");
            oCharBinding.requestContexts(0, 100).then(function (aContexts) {
              aCharValues.forEach(function (oNewChar, index) {
                if (aContexts.length === 0) {
                  oCharBinding.create(oNewChar);
                } else {
                  var oCntx = aContexts[index];
                  var oChar = oCntx.getObject();

                  if (oChar.Charname === oNewChar.Charname) {
                    // Update existing
                    oCntx.setProperty("Charvalue", oNewChar.Charvalue);
                    oCntx.setProperty("Charname", oNewChar.Charname);
                  }
                }
              });
            });
          }

          //             this.getView().getModel("viewState").setProperty("/showForm", false);
        },
      }
    );
  }
);
