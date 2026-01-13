sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var AdditionalCustomListReportDefinition = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.zmanprodlist',
            componentId: 'zc_cdsv_man_productList',
            entitySet: 'zc_cdsv_man_product'
        },
        AdditionalCustomListReportDefinition
    );
});