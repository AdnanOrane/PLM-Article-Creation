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
              // Execute Completeness Profile early in a separate controller to separate concerns
              var oCurrentView = this.getView() || this.base.getView();
              var oCurrentContext =
                oCurrentView.getBindingContext() || oContext;
              sap.ui.require(
                ["com/zmanprodlist/ext/controller/ObjectPageExt.controller"],
                function (ObjExt) {
                  ObjExt._calculateCompleteness(oCurrentContext, oCurrentView);
                },
              );

              // Rename attachment create button to "Add" for better clarity in the UI
              var oAttachCreate = this.base
                .getView()
                .byId(
                  "com.zmanprodlist::zc_cdsv_man_productObjectPage--fe::table::_Attachment::LineItem::StandardAction::Create",
                );
              if (oAttachCreate) {
                oAttachCreate.setText("Add");
              }
              // Reanme "Create" button to "Add UOM" in classification section for better clarity
              var oUOMCreate = this.base
                .getView()
                .byId(
                  "com.zmanprodlist::zc_cdsv_man_productObjectPage--fe::table::_Unitofmes::LineItem::StandardAction::Create",
                );
              if (oUOMCreate) {
                oUOMCreate.setText("Add");
              }

              var oButton = this.base
                .getView()
                .byId(
                  "com.zmanprodlist::zc_cdsv_man_productObjectPage--fe::CustomSubSection::Classification--AddClassnew",
                );

              var oForm = this.base
                .getView()
                .byId(
                  "com.zmanprodlist::zc_cdsv_man_productObjectPage--fe::CustomSubSection::Classification--idCharecter",
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

              var styleuuid = "";
              const matchStyleUuid = sPath.match(/styleuuid=([a-f0-9-]+)/i);
              if (matchStyleUuid && matchStyleUuid[1]) {
                styleuuid = matchStyleUuid[1];
              }

              var styleid = "";
              const matchStyleId = sPath.match(/styleid='(.*?)'/i);
              if (matchStyleId && matchStyleId[1]) {
                styleid = decodeURIComponent(matchStyleId[1]);
              }

              // Keeping Productuuid assigned to styleuuid for existing logical compatibility
              var Productuuid = styleuuid;

              const oView = this.getView();
              var oModel = new sap.ui.model.odata.v2.ODataModel({
                serviceUrl: "/sap/opu/odata/sap/ZOD_MM_CLASSIF_CREATE_SRV",
              });
              var oResultModel = new sap.ui.model.json.JSONModel();
              var that = this;

              // Fetch ReadOnly Attributes first
              var aReadOnlyChars = [];
              var aReadOnlyProps = [];

              function _checkInstanceFeatureAndRead() {
                var sPathCh = sPath + "/_charecteristics";
                var oCharListBinding = oModelPG.bindList(
                  sPathCh,
                  null,
                  null,
                  null,
                  {
                    $select: "__EntityControl",
                  },
                );
                oCharListBinding
                  .requestContexts(0, 1)
                  .then(function (aCtx) {
                    if (aCtx && aCtx.length > 0) {
                      aCtx[0]
                        .requestProperty("__EntityControl/Updatable")
                        .then(function (bUpdatable) {
                          var bSectionUpdatable = true;
                          if (bUpdatable === false) {
                            bSectionUpdatable = false;
                          }
                          _triggerClassificationRead(bSectionUpdatable);
                        })
                        .catch(function () {
                          _triggerClassificationRead(true);
                        });
                    } else {
                      _triggerClassificationRead(true);
                    }
                  })
                  .catch(function () {
                    _triggerClassificationRead(true);
                  });
              }

              oModel.read("/ReadOnlyCharSetSet", {
                success: function (oDataRO) {
                  if (oDataRO && oDataRO.results) {
                    aReadOnlyChars = oDataRO.results.map(function (item) {
                      return item.Charname ? item.Charname.toUpperCase() : "";
                    });
                    oDataRO.results.forEach(function (item) {
                      if (item.Charname) {
                        aReadOnlyProps.push({
                          charname: item.Charname.toUpperCase(),
                          type: item.Type ? item.Type.toUpperCase() : "",
                        });
                      }
                    });
                  }
                  _checkInstanceFeatureAndRead();
                },
                error: function () {
                  console.error("Failed to fetch ReadOnlyCharSet");
                  _checkInstanceFeatureAndRead();
                },
              });

              function _triggerClassificationRead(bSectionUpdatable) {
                var aFilters = [
                  new sap.ui.model.Filter(
                    "Productuuid",
                    sap.ui.model.FilterOperator.EQ,
                    Productuuid,
                  ),
                ];

                if (styleuuid) {
                  aFilters.push(
                    new sap.ui.model.Filter(
                      "styleuuid",
                      sap.ui.model.FilterOperator.EQ,
                      styleuuid,
                    ),
                  );
                }

                if (styleid) {
                  aFilters.push(
                    new sap.ui.model.Filter(
                      "styleid",
                      sap.ui.model.FilterOperator.EQ,
                      styleid,
                    ),
                  );
                }

                oModel.read("/classificationSet", {
                  filters: aFilters,
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
                        oCharval.charname = item.charname;
                        oCharGroup[item.classname].push(oCharval);
                      }
                    });

                    var oHBox1 = that
                      .getView()
                      .byId(
                        "com.zmanprodlist::zc_cdsv_man_productObjectPage--fe::CustomSubSection::Classification--HBox1",
                      );
                    var oFlexBox = that
                      .getView()
                      .byId(
                        "com.zmanprodlist::zc_cdsv_man_productObjectPage--fe::CustomSubSection::Classification--FlexBox1",
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
                    } else if (
                      oEditBut.visible === true &&
                      oRole == "APPROVER"
                    ) {
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

                    if (bSectionUpdatable === false) {
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
                        columnsXL: 6,
                      });

                      oSimpleForm.addContent(
                        new sap.ui.core.Title({
                          text: item,
                        }),
                      );
                      oCharGroup[item].forEach((field, index) => {
                        // console.log("FieldIndex", field);

                        var bRequired = false;

                        var sUpperCharName = field.charname
                          ? field.charname.toUpperCase()
                          : "";
                        var oMatchedProp = aReadOnlyProps.find(function (p) {
                          return p.charname === sUpperCharName;
                        });
                        var sType = oMatchedProp ? oMatchedProp.type : "";

                        if (sType === "M") {
                          bRequired = true;
                        }

                        var oLabel = new sap.m.Label({
                          text: field.charecteristics,
                          required: bRequired,
                        });

                        var bIsEditable = "{viewState>/showForm}";
                        if (sType === "D") {
                          bIsEditable = false;
                        } else if (
                          aReadOnlyChars.includes(sUpperCharName) &&
                          sType !== "M"
                        ) {
                          bIsEditable = false;
                        }

                        var oInput = new sap.m.Input({
                          value: field.charvalues,
                          showValueHelp: true,
                          autocomplete: true,
                          showSuggestion: true,
                          filterSuggests: false,
                          width: "10rem",
                          name: field.charname,
                          editable: bIsEditable,
                          valueHelpRequest: that.onValueHelpRequest.bind(that),
                          change: that.onCharacteristicChange.bind(that),
                          suggest: that.onCharacteristicSuggest.bind(that)
                        });
                        oInput.data("label", field.charecteristics);
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
                    // console.log(
                    //   "classification Data fetched successfully:",
                    //   oData,
                    // );
                    if (bSectionUpdatable) {
                        that._syncAutoPopulatedValues(oData.results, oContextPG, oModelPG);
                    }
                    //   }
                  },
                  error: function (oError) {
                    // Handle error
                    console.error(
                      "Error fetching classification data:",
                      oError,
                    );
                  },
                });
              }
            },
            onBeforeNavigation: function (oEvent) {},
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
          var strLabel = oInput.data("label");
          if (
            !strLabel &&
            oInput.oParent &&
            oInput.oParent.mAggregations &&
            oInput.oParent.mAggregations.label
          ) {
            strLabel = oInput.oParent.mAggregations.label.getText();
          }
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
                strLabel,
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
                      sValue,
                    );
                    var oBinding = oEvent.getSource().getBinding("items");
                    oBinding.filter([oFilter]);
                  },
                  confirm: function (oEvent) {
                    var oSelectedItem = oEvent.getParameter("selectedItem");
                    if (oSelectedItem) {
                      oInput.setValue(oSelectedItem.getTitle());
                      oInput.fireChange({ value: oSelectedItem.getTitle() });
                    }
                    that._oValueHelpDialog = null;
                  },
                  cancel: function () {
                    // console.log("Value help dialog was cancelled.");
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

        onCharacteristicSuggest: function (oEvent) {
          var oInput = oEvent.getSource();
          var sTerm = oEvent.getParameter("suggestValue");

          var strLabel = oInput.data("label");
          if (
            !strLabel &&
            oInput.oParent &&
            oInput.oParent.mAggregations &&
            oInput.oParent.mAggregations.label
          ) {
            strLabel = oInput.oParent.mAggregations.label.getText();
          }

          if (
            !oInput.getModel("suggestionModel") &&
            !oInput.data("fetchingSuggestions")
          ) {
            oInput.data("fetchingSuggestions", true);
            var oModel = new sap.ui.model.odata.v2.ODataModel({
              serviceUrl: "/sap/opu/odata/sap/ZOD_MM_CLASSIF_CREATE_SRV",
            });

            oModel.read("/valuesInputSet", {
              filters: [
                new sap.ui.model.Filter(
                  "key",
                  sap.ui.model.FilterOperator.EQ,
                  strLabel,
                ),
              ],
              success: function (oData) {
                var oVHModel = new sap.ui.model.json.JSONModel({
                  ValueList: oData.results,
                });
                oVHModel.setSizeLimit(1000);
                oInput.setModel(oVHModel, "suggestionModel");

                oInput.bindAggregation("suggestionItems", {
                  path: "suggestionModel>/ValueList",
                  template: new sap.ui.core.Item({
                    text: "{suggestionModel>desc}",
                    key: "{suggestionModel>desc}",
                  }),
                });

                var oBinding = oInput.getBinding("suggestionItems");
                if (oBinding) {
                  var sCurrentValue = oInput.getValue();
                  var oFilter = new sap.ui.model.Filter(
                    "desc",
                    sap.ui.model.FilterOperator.Contains,
                    sCurrentValue,
                  );
                  oBinding.filter([oFilter]);
                }
              },
              error: function () {
                oInput.data("fetchingSuggestions", false);
              },
            });
          } else if (oInput.getModel("suggestionModel")) {
            var oBinding = oInput.getBinding("suggestionItems");
            if (oBinding) {
              var oFilter = new sap.ui.model.Filter(
                "desc",
                sap.ui.model.FilterOperator.Contains,
                sTerm,
              );
              oBinding.filter([oFilter]);
            }
          }
        },

        _syncAutoPopulatedValues: function (aClassificationResults, oContext, oModel) {
            var sPath = oContext.getPath() + "/_charecteristics";
            var oCharBinding = oModel.bindList(sPath);
            
            oCharBinding.requestContexts(0, 500).then(function (aContexts) {
                aClassificationResults.forEach(function (item) {
                    var sCharName = item.charname;
                    var sValue = item.charvalues;
                    
                    if (sCharName && sValue) { // If there is an autopopulated value
                        var oExistingContext = null;
                        for (var i = 0; i < aContexts.length; i++) {
                            var sCtxCharName = aContexts[i].getProperty("Charname");
                            if (sCtxCharName && sCtxCharName.toUpperCase() === sCharName.toUpperCase()) {
                                oExistingContext = aContexts[i];
                                break;
                            }
                        }
                        
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
        },

        _saveCharacteristic: function(oInput, oContext, oModel, sCharName, sValue) {
          var sPath = oContext.getPath() + "/_charecteristics";
          var oCharBinding = oModel.bindList(sPath);

          oCharBinding.requestContexts(0, 500).then(function (aContexts) {
            var oExistingContext = null;

            aContexts.forEach(function (oCtx) {
              var sCtxCharName = oCtx.getProperty("Charname");
              if (
                sCtxCharName &&
                sCtxCharName.toUpperCase() === sCharName.toUpperCase()
              ) {
                oExistingContext = oCtx;
              }
            });

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
          });
        },

        onCharacteristicChange: function (oEvent) {
          var oInput = oEvent.getSource();
          var oView = this.base.getView();
          var oModel = oView.getModel();
          var oContext = oView.getBindingContext();

          var sCharName = oInput.getName();
          var sValue = oInput.getValue() || "";

          if (!sValue) {
             this._saveCharacteristic(oInput, oContext, oModel, sCharName, sValue);
             oInput.setValueState("None");
             return;
          }

          var that = this;
          var performValidation = function (aValues) {
              var bValid = false;
              var sCorrectValue = sValue;
              for (var i = 0; i < aValues.length; i++) {
                  if (aValues[i].desc && aValues[i].desc.toUpperCase() === sValue.toUpperCase()) {
                      bValid = true;
                      sCorrectValue = aValues[i].desc;
                      break;
                  }
              }

              if (bValid) {
                  if (sValue !== sCorrectValue) {
                      oInput.setValue(sCorrectValue);
                  }
                  that._saveCharacteristic(oInput, oContext, oModel, sCharName, sCorrectValue);
                  oInput.setValueState("None");
                  oInput.setValueStateText("");
              } else {
                  sap.m.MessageToast.show("Please select a valid value. '" + sValue + "' is not allowed.");
                  oInput.setValueState("Error");
                  oInput.setValueStateText("Invalid value");
              }
          };

          var oSuggestionModel = oInput.getModel("suggestionModel");
          if (oSuggestionModel && oSuggestionModel.getProperty("/ValueList")) {
              performValidation(oSuggestionModel.getProperty("/ValueList"));
          } else {
              var strLabel = oInput.data("label");
              if (!strLabel && oInput.oParent && oInput.oParent.mAggregations && oInput.oParent.mAggregations.label) {
                  strLabel = oInput.oParent.mAggregations.label.getText();
              }

              var oV2Model = new sap.ui.model.odata.v2.ODataModel({
                  serviceUrl: "/sap/opu/odata/sap/ZOD_MM_CLASSIF_CREATE_SRV",
              });
              
              sap.ui.core.BusyIndicator.show(0);
              oV2Model.read("/valuesInputSet", {
                  filters: [
                      new sap.ui.model.Filter("key", sap.ui.model.FilterOperator.EQ, strLabel)
                  ],
                  success: function (oData) {
                      sap.ui.core.BusyIndicator.hide();
                      performValidation(oData.results || []);
                  },
                  error: function () {
                      sap.ui.core.BusyIndicator.hide();
                      sap.m.MessageToast.show("Error validating value.");
                  }
              });
          }
        },
      },
    );
  },
);
