// View available options at https://github.com/angular/protractor/blob/master/docs/referenceConf.js

exports.config = {
    specs: ['ui-tests/**.js'],

    allScriptsTimeout: 30000,
    
    framework: 'jasmine2',
    
    restartBrowserBetweenTests: false,
    
    baseUrl: 'localhost:3000',

    multiCapabilities: [
        // {
        //     browserName: 'firefox'
        // },
        {
            browserName: 'chrome'
        },
        // {
        //     browserName: 'phantomjs',
        //     'phantomjs.binary.path': require('phantomjs').path
        // }
    ],

    onPrepare: function () {
        // Do not wait for angular to be ready
        browser.ignoreSynchronization = true;

        GLOBAL.driver = browser.driver;

        driver.manage().timeouts().implicitlyWait(20000);
        

        //https://github.com/bcaudan/jasmine-spec-reporter
        var SpecReporter = require('jasmine-spec-reporter');
        // add jasmine spec reporter
        jasmine.getEnv().addReporter(new SpecReporter({
            displayStacktrace: 'specs',
            displaySpecDuration: true,
        }));

        // returning the promise makes protractor wait for the reporter config before executing tests 
        return browser.getProcessedConfig().then(function (config) {
            // you could use other properties here if you want, such as platform and version 
            var browserName = config.capabilities.browserName;

            var launchTime = new Date().toISOString()
            // launchTime = launchTime.substr(0, launchTime.indexOf('.'))
            launchTime = launchTime.replace(/:/g, '`').replace('T', '_')
            
            // https://github.com/mlison/protractor-jasmine2-screenshot-reporter
            var HtmlScreenshotReporter = require('protractor-jasmine2-screenshot-reporter');
            jasmine.getEnv().addReporter(new HtmlScreenshotReporter({
                dest: `test/ui-results/${browserName}/${launchTime}`,
                // captureOnlyFailedSpecs: true,
                // reportOnlyFailedSpecs: false,
                pathBuilder: function (currentSpec, suites, browserCapabilities) {
                    // will return chrome/your-spec-name.png
                    return `screenshots/${currentSpec.fullName}`;
                },
            }));

            // https://github.com/larrymyers/jasmine-reporters
            var jasmineReporters = require('jasmine-reporters');
            var junitReporter = new jasmineReporters.JUnitXmlReporter({
                consolidateAll: true,
                savePath: `test/ui-results/${browserName}/${launchTime}/`,
                // this will produce distinct xml files for each capability 
                filePrefix: 'junit',
                modifySuiteName: function (generatedSuiteName, suite) {
                    // this will produce distinct suite names for each capability, 
                    // e.g. ‘firefox.login tests’ and ‘chrome.login tests’ 
                    return browserName + '.' + generatedSuiteName;
                }
            });
            jasmine.getEnv().addReporter(junitReporter);
        });
    },

    jasmineNodeOpts: {
        // Disable the default reporter
        print: function () { },

        defaultTimeoutInterval: 3000000,
    },

    // plugins: [{
    //     path: 'node_modules/protractor/plugins/timeline/index.js',

    //     // Output json and html will go in this folder.
    //     outdir: `results/timeline`,
    // }],
    
    
    // TODO: image diffs https://www.npmjs.com/package/pix-diff
}