/// <reference path="../typings/tsd.d.ts"/>

var driver = browser.driver;
var randomWords = require('random-words');

describe('description', function () {

    beforeEach(function () {
        browser.get('localhost:3000/test/ui-tests/blank.html')
    });

    it('should find page titles', function () {
        var thumb = $('.styled-scroll-thumb')

        thumb.getSize().then(function (size) {
            var height = size.height

            $('#add').click()
            thumb.getSize().then(function (newSize) {
                expect(newSize.height).not.toBe(height)
            })
        })
    })

    afterAll(function (done) {
        // Bug workaround for screenshot reporting, see https://github.com/angular/protractor/issues/1938
        process.nextTick(done);
    });
});