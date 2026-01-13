sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'com/zmanprodlist/test/integration/pages/MainListReport' ,
        'com/zmanprodlist/test/integration/pages/MainObjectPage',
        'com/zmanprodlist/test/integration/OpaJourney'
    ],
    function(JourneyRunner, MainListReport, MainObjectPage, Journey) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('com/zmanprodlist') + '/index.html'
        });

        JourneyRunner.run(
            {
                pages: { onTheMainPage: MainListReport, onTheDetailPage: MainObjectPage }
            },
            Journey.run
        );
    }
);