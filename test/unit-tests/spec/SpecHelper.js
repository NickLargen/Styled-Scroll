"use strict";

var wrapper, content, track, thumb, scroller;

beforeAll(function () {

	document.body.insertAdjacentHTML('beforeend', "<div id='testArea'></div>")

	var css = '<style>.styled-scroll-track{top: 0;right: 0;bottom: 0;width: 12px;}.styled-scroll-thumb {background: darkolivegreen;}.hide-scrollbar::-webkit-scrollbar {display: none;}</style>'

	document.head.insertAdjacentHTML('beforeend', css);
})

beforeEach(function () {
	var text = randomWords({ min: 300, max: 500, join: ' ' })

	var body = "<div id='wrapper' style='height:400px; width:400px;'><p id='content'>" + text + "</p></div>"



	$('#testArea')[0].innerHTML = body

	wrapper = $('#wrapper')[0]
	content = $('#content')[0]

	generateScroller({ sameDimensions: true })

});

function generateScroller(options) {
	if (scroller) scroller.destroy();
	scroller = new StyledScroll(content, options)

	track = $('.styled-scroll-track')[0]
	thumb = $('.styled-scroll-thumb')[0]
}