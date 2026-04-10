sap.ui.define(
    ["sap/ui/model/json/JSONModel", "sap/ui/model/Filter", "sap/ui/model/FilterOperator"],
    function (JSONModel, Filter, FilterOperator) {
      "use strict";
  
      return {
          _calculateCompleteness: function(oContext, oView) {
              console.log("=== Profile Completeness Engine Started ===");
              if (!oContext || !oView) {
                  console.error("Missing oContext or oView!");
                  return;
              }
  
              var oCompletenessModel = oView.getModel("CompletenessModel");
              if (!oCompletenessModel) {
                  oCompletenessModel = new JSONModel({
                      overallProgress: 0,
                      sectionsNeedAttention: 9,
                      statusText: "Calculating...",
                      statusColor: "Warning",
                      overallCss: "progressValWarning",
                      overallState: "Critical",
                      sections: []
                  });
                  oView.setModel(oCompletenessModel, "CompletenessModel");
                  console.log("Model initialized with default Loading state.");
              }
  
              var calculateSection = function(fields, oDataObj) {
                  var filled = 0;
                  fields.forEach(function(f) {
                      if (oDataObj[f] !== null && oDataObj[f] !== undefined && oDataObj[f] !== "" && oDataObj[f] !== "00000000-0000-0000-0000-000000000000") {
                          filled++;
                      }
                  });
                  return fields.length > 0 ? Math.round((filled / fields.length) * 100) : 0;
              };
  
              var formatProgress = function(progress) {
                  var cssClass, textClass, valueColor, radialColor;
                  if (progress >= 90) { cssClass = "progressValGood"; textClass = "textValGood"; valueColor = "Success"; radialColor = "Good"; }
                  else if (progress >= 70) { cssClass = "progressValInformation"; textClass = "textValInformation"; valueColor = "Information"; radialColor = "Neutral"; }
                  else if (progress >= 50) { cssClass = "progressValWarning"; textClass = "textValWarning"; valueColor = "Warning"; radialColor = "Critical"; }
                  else { cssClass = "progressValError"; textClass = "textValError"; valueColor = "Error"; radialColor = "Error"; }

                  return { progress: progress, cssClass: cssClass, textClass: textClass, valueColor: valueColor, radialColor: radialColor };
              };
              
              // Dedicated contexts to circumvent UI lazy loading
              var requestProperties = new Promise(function(resolve) {
                  var oTempBinding = oView.getModel().bindContext(oContext.getPath());
                  oTempBinding.requestObject().then(function(oData) {
                      resolve(oData);
                  }).catch(function() { resolve({}); });
              });

              var fetchAttributes = function(oContext) {
                  return new Promise(function(resolve) {
                      // Extract styleuuid and styleid from the OData context path,
                      // matching exactly how Classification.controller.js does it
                      var sPath = oContext ? oContext.getPath() : "";

                      var styleuuid = "";
                      var matchStyleUuid = sPath.match(/styleuuid=([a-f0-9-]+)/i);
                      if (matchStyleUuid && matchStyleUuid[1]) {
                          styleuuid = matchStyleUuid[1];
                      }

                      var styleid = "";
                      var matchStyleId = sPath.match(/styleid='(.*?)'/i);
                      if (matchStyleId && matchStyleId[1]) {
                          styleid = decodeURIComponent(matchStyleId[1]);
                      }

                      if (!styleuuid) {
                          console.warn("fetchAttributes: could not extract styleuuid from path:", sPath);
                          resolve(0);
                          return;
                      }

                      // Productuuid = styleuuid (same convention as Classification controller)
                      var aFilters = [
                          new Filter("Productuuid", FilterOperator.EQ, styleuuid),
                          new Filter("styleuuid", FilterOperator.EQ, styleuuid)
                      ];
                      if (styleid) {
                          aFilters.push(new Filter("styleid", FilterOperator.EQ, styleid));
                      }

                      var oV2Model = new sap.ui.model.odata.v2.ODataModel({
                          serviceUrl: "/sap/opu/odata/sap/ZOD_MM_CLASSIF_CREATE_SRV",
                      });
                      oV2Model.read("/classificationSet", {
                          filters: aFilters,
                          success: function(oData) {
                              var classFilled = 0;
                              var classTotal = 0;
                              if (oData.results && oData.results.length > 0) {
                                  oData.results.forEach(function (item) {
                                      if (item.charecteristics && item.charecteristics.trim() !== "") {
                                          classTotal++;
                                          if (item.charvalues && item.charvalues.trim() !== "") {
                                              classFilled++;
                                          }
                                      }
                                  });
                              }
                              console.log("Attributes progress: " + classFilled + "/" + classTotal);
                              resolve(classTotal > 0 ? Math.round((classFilled / classTotal) * 100) : 0);
                          },
                          error: function(oErr) {
                              console.error("fetchAttributes OData call failed:", oErr);
                              resolve(0);
                          }
                      });
                  });
              };

              var checkAssociation = function(navProperty) {
                  return new Promise(function(resolve) {
                      var oListBinding = oView.getModel().bindList(navProperty, oContext);
                      oListBinding.requestContexts(0, 1).then(function(aCtxs) {
                          resolve(aCtxs && aCtxs.length > 0 ? 100 : 0);
                      }).catch(function() {
                          resolve(0);
                      });
                  });
              };
  
              requestProperties.then(function(oEntity) {
                  oEntity = oEntity || {};
                  Promise.all([
                      checkAssociation("_Attachment"),
                      checkAssociation("_Variant"),
                      checkAssociation("_Unitofmes"),
                      checkAssociation("_Season"),
                      fetchAttributes(oContext)
                  ]).then(function(res) {
                      var aAttachmentsProg = res[0] || 0;
                      var aVariantsProg = res[1] || 0;
                      var aUomProg = res[2] || 0;
                      var aSeasonProg = res[3] || 0;
                      var attrProg = res[4] || 0;
      
                      var sections = [];
      
                      var genInfoProg = calculateSection(["ProductDescription", "ProductGroup", "OldCategory"], oEntity);
                      var merchHierProg = calculateSection(["Hierarchy1", "Hierarchy2", "Hierarchy3", "Hierarchy4", "Hierarchy5", "Hierarchy6", "Hierarchy7"], oEntity);
                      var prodIdProg = calculateSection(["product1", "product2", "product3", "product4", "product5"], oEntity);
      
                      var formatSection = function(name, resultObj) {
                          return {
                              name: name,
                              progress: resultObj.progress,
                              cssClass: resultObj.cssClass,
                              textClass: resultObj.textClass,
                              valueColor: resultObj.valueColor
                          };
                      };
      
                      // Order mapped roughly to design
                      sections.push(formatSection("Merchandise Hierarchy", formatProgress(merchHierProg)));
                      sections.push(formatSection("General Information", formatProgress(genInfoProg)));
                      
                      var washCareProg = calculateSection(["WASH_CARE_TYPE", "WASH_CARE", "ITEM_LIST", "PIECES_IN_SET"], oEntity);
                      sections.push(formatSection("Wash Care", formatProgress(washCareProg)));
                      sections.push(formatSection("Unit of Measurement", formatProgress(aUomProg)));
                      
                      sections.push(formatSection("Picture", formatProgress(aAttachmentsProg)));
                      sections.push(formatSection("Season", formatProgress(aSeasonProg)));
                      
                      sections.push(formatSection("Variants", formatProgress(aVariantsProg)));
                      sections.push(formatSection("Products Identification", formatProgress(prodIdProg)));
                      
                      sections.push(formatSection("Attributes", formatProgress(attrProg)));
  
                  var totalProgress = 0;
                  var needsAttention = 0;
  
                  sections = sections.map(function(s) {
                      totalProgress += s.progress;
                      if (s.progress < 100) {
                          needsAttention++;
                      }
                      var fmt = formatProgress(s.progress);
                      s.cssClass = fmt.cssClass;
                      s.textClass = fmt.textClass;
                      return s;
                  });
  
                  var overallProgress = sections.length > 0 ? Math.round(totalProgress / sections.length) : 0;
                  var overallFmt = formatProgress(overallProgress);

                  console.log("Calculated overall progress: ", overallProgress);
  
                  oCompletenessModel.setData({
                      overallProgress: overallProgress,
                      sectionsNeedAttention: needsAttention,
                      statusText: overallProgress >= 100 ? "Ready" : "Not ready",
                      statusColor: overallProgress >= 100 ? "Success" : "Error",
                      overallState: overallFmt.radialColor,
                      overallCss: overallFmt.cssClass,
                      sections: sections
                  });
                  
                      oCompletenessModel.refresh(true);
                  }.bind(this)).catch(function(e){
                      console.error("Error calculating completeness:", e);
                  });
              });
          }
      };
    }
  );
