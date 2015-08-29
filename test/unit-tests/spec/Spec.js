/// <reference path="../../typings/tsd.d.ts"/>


function assertChanges(valueGenerator, changer, done) {
    var startValue = valueGenerator();
    changer();

    setTimeout(function () {
        expect(valueGenerator()).not.toBe(startValue);
        done()
    }, 1000);

}
//32232


// TODO: can use ctrlKey option on wheelevent for zooming

describe('Styled-Scroll', function () {
    it('creates a track and thumb', function () {
        expect(thumb).toBeTruthy()
        expect(track).toBeTruthy()
    })

    it('correctly exposes track, thumb, and scroll element publicly', function () {
        expect(scroller.getScrollElement()).toBe(content)
        expect(scroller.getTrack()).toBe(track)
        expect(scroller.getThumb()).toBe(thumb)
    })

    describe('does not error when', function () {
        it('getting thumb or track on a destroyed scroller', function () {
            expect(scroller.getTrack()).toBeTruthy()
            expect(scroller.getThumb()).toBeTruthy()
            expect(scroller.getScrollElement()).toBeTruthy()
            scroller.destroy();
            expect(scroller.getTrack()).toBeFalsy()
            expect(scroller.getThumb()).toBeFalsy()
            expect(scroller.getScrollElement()).toBeFalsy()
        })

        it('calling destroy multiple times', function () {
            var scrollbar = scroller._scrollbar
            scroller.destroy();
            scroller.destroy();
            scroller.refresh();

            [scroller, scrollbar].forEach(function (obj) {
                var keys = Object.keys(obj)
                for (var i = keys.length; i--;) {
                    var type = typeof obj[keys[i]]
                    expect(type === 'number' || type === 'boolean').toBeTruthy()
                }
            })
        })
    })


    describe('with only elementResize changes on', function () {
        beforeEach(function (done) {
            generateScroller({ sameDimensions: true, refreshTriggers: { elementResize: true } })

            setTimeout(function () {
                done()
            }, 0)
        })

        it('removes resize listener on destroy', function () {
            expect($('iframe')[0]).toBeTruthy()
            scroller.destroy();
            expect($('iframe')[0]).toBeFalsy()
        })
    })

    describe('with only windowResize', function () {
        beforeEach(function (done) {
            generateScroller({ sameDimensions: true, refreshTriggers: { windowResize: true } })

            setTimeout(function () {
                done()
            }, 0)
        })
    })

    describe('with only contentChange', function () {
        beforeEach(function (done) {
            generateScroller({ refreshTriggers: { contentChange: true } })
            scroller.refresh()

            setTimeout(function () {
                done()
            }, 1000)
        })

        it('content addition', assertChangesWithContentAddition)
    })

    describe('with only poll', function () {
        beforeEach(function (done) {
            generateScroller({ sameDimensions: true, refreshTriggers: { poll: true } })

            setTimeout(function () {
                done()
            }, 0)
        })

        it('content addition', assertChangesWithContentAddition)
    })

    function assertChangesWithContentAddition(done) {
        assertChanges(function () { console.log(thumb.clientHeight); return thumb.clientHeight }, function () {
            content.innerText += randomWords({ min: 500, max: 800, join: ' ' })
        }, done)
    }















    describe('changes thumb position on', function () {
        var startTop;

        beforeEach(function () {
            startTop = thumb.getBoundingClientRect().top;
        })

        function assertThumbPositionChanged(done) {
            setTimeout(function () {
                expect(thumb.getBoundingClientRect().top).not.toBeCloseTo(startTop, 0)
                done()
            }, 10);
        }

        // only works on Chrome
        describe('wheel event targeting', function () {

            var event, data = { content: content, thumb: thumb };
            beforeEach(function () {
                data = { content: content, thumb: thumb }
            })

            for (var prop in data) {
                (function (varName) {
                    it(varName, function (done) {
                        data[varName].dispatchEvent(new WheelEvent('wheel', { deltaY: 100, cancelable: true, bubbles: true }))
                        assertThumbPositionChanged(done);
                    })
                })(prop)
            }
        });
    });
});