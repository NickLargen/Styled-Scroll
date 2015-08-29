/// <reference path="../typings/tsd.d.ts"/>

var driver = browser.driver;


var randomWords = require('random-words');

var fs = require('fs');
var http = require('http');

http.createServer(function (req, res) {
    var html = buildHtml(req);

    res.writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Length': html.length,
        'Expires': new Date().toUTCString()
    });
    res.end(html);
}).listen(8080);

function buildHtml(req) {

    return `<!DOCTYPE html>
<html>

    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Styled Scroll Demo</title>
        <script type="text/javascript">
            ${fs.readFileSync('src/styled-scroll.js') }
        </script>
    </head>

    <body></body>

</html>`;
};


describe('description', function () {

    beforeEach(function () {
        browser.get('localhost:8080')

        var text = randomWords({ exactly: 500, join: ' ' })

        var body = `
            <div id='wrapper' style='height:400px; width:400px;'>
                <div id='content'>
                    ${text}
                </div>
            </div>`.replace(/\n/g, '')

        var css = `
            .styled-scroll-track {
                top: 0;
                right: 0;
                height: 100%;
                width: 12px;
            }
            
            .styled-scroll-thumb {
                background: darkolivegreen;
            }`.replace(/\n/g, '')

        driver.executeScript(`document.head.insertAdjacentHTML('beforeend', '<style>${css}</style>');`)
        driver.executeScript(`document.body.innerHTML = "${body}"`)
        driver.executeScript(`new StyledScroll(document.getElementById('content'), { sameDimensions: true })`)
        // driver.sleep(1000000)
    });

    it('should find page titles', function () {
        browser.get('https://duckduckgo.com/')
        $('#search_form_input_homepage').sendKeys('WebdriverIO')
        $('#search_button_homepage').click()
        browser.driver.sleep(300)
        expect(browser.getTitle()).toBe('WebdriverIO at DuckDuckGo')

        browser.get('http://bing.com')
        $('#sb_form_q').sendKeys('WebdriverIO')
        $('#sb_form_go').click()
        driver.sleep(300)
        expect(browser.getTitle()).toBe('WebdriverIO - Bing')
    })

    afterAll(function (done) {
        // Bug workaround for screenshot reporting, see https://github.com/angular/protractor/issues/1938
        process.nextTick(done);
    });
});