(function (window, document, Math) {
	var requestAnimationFrame = window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function (callback) { window.setTimeout(callback, 1000 / 60); };

	var onlySupportsMSPointer = window.MSPointerEvent !== undefined && window.onpointerdown === undefined;

	var pointerDown = onlySupportsMSPointer ? 'MSPointerDown' : 'pointerdown';
	var pointerMove = onlySupportsMSPointer ? 'MSPointerMove' : 'pointermove';
	var pointerUp = onlySupportsMSPointer ? 'MSPointerUp' : 'pointerup';
	var pointerCancel = onlySupportsMSPointer ? 'MSPointerCancel' : 'pointercancel';

	var supportsPointer = window.onpointerdown !== undefined || window.MSPointerEvent !== undefined;

	var startEvents = supportsPointer ? [pointerDown] : ['touchstart', 'mousedown'];
	var moveEvents = supportsPointer ? [pointerMove] : ['touchmove', 'mousemove'];
	var endEvents = supportsPointer ? [pointerUp, pointerCancel] : ['touchend', 'mouseup', 'touchcancel', 'mousecancel'];


	var scrollbarWidth = null;
		
	//Source: http://stackoverflow.com/questions/13382516/getting-scroll-bar-width-using-javascript
	function getScrollbarWidth() {
		if (scrollbarWidth) {
			return scrollbarWidth;
		}

		var outer = document.createElement("div");
		outer.style.visibility = "hidden";
		outer.style.width = "100px";
		outer.style.msOverflowStyle = "scrollbar"; // needed for WinJS apps
	    
		document.body.appendChild(outer);

		var widthNoScroll = outer.offsetWidth;
		// force scrollbars
		outer.style.overflow = "scroll";
	    
		// add innerdiv
		var inner = document.createElement("div");
		inner.style.width = "100%";
		outer.appendChild(inner);

		var widthWithScroll = inner.offsetWidth;
	    
		// remove divs
		outer.parentNode.removeChild(outer);

		return scrollbarWidth = widthNoScroll - widthWithScroll;
	};


	function StyledScroll(scrollElement, options) {
		this.scrollElement = scrollElement;
		this.scrollElementStyle = this.scrollElement.style;
		this.parent = scrollElement.parentNode;
		
		this.scrollElementStyle.height = '100%';
		this.scrollElementStyle.maxHeight = 'inherit';
		this.scrollElementStyle.overflow = 'auto';

		this.parent.classList.add('hide-scrollbar');

		if ('-ms-overflow-style' in this.scrollElementStyle) {
			this.scrollElementStyle.msOverflowStyle = 'none';
		} else if (getScrollbarWidth() > 0) {
			//Make this scrolling element larger than the containing element so that the scrollbar is hidden
			this.scrollElementStyle.width = 'calc(100% + ' + getScrollbarWidth() + 'px)';
			//Prevent user from scrolling the scrollbar into view
			this.parent.style.overflow = 'hidden';
		}

		this.init();
	}

	StyledScroll.prototype = {
		
		init: function () {
			var scrollbarDiv = createScrollbarElement('v', true, 'custom');

			this.parent.appendChild(scrollbarDiv);
			
			var indicator = new Scrollbar(this, { el: scrollbarDiv });
			this.scrollbar = indicator;
			
			(function animloop() {
				requestAnimationFrame(animloop);
				indicator.updateScrollbar();
			})();
		},

		scrollToElement: function () { },
		scrollTo: function () { },
		destroy: function () { this.scrollbar.destroy(); },
		refresh: function () { },

	};

	function createScrollbarElement(direction, interactive, type) {
		var scrollbar = document.createElement('div'),
			indicator = document.createElement('div');

		indicator.className = 'styled-scroll-indicator';
		//Prevent users from overriding styles that break functionality
		indicator.style.boxSizing = 'border-box';
		indicator.style.margin = '0px';

		scrollbar.className = 'styled-scroll-vertical-scrollbar';

		scrollbar.appendChild(indicator);

		return scrollbar;
	}

	function Scrollbar(styledScroll, options) {
		this.wrapper = options.el;
		this.wrapperStyle = this.wrapper.style;
		this.indicator = this.wrapper.children[0];
		this.indicatorStyle = this.indicator.style;
		this.scrollElement = styledScroll.scrollElement;

		this.lastPointY = 0;
		this.offset = 0;

		var self = this;
		startEvents.forEach(function (eventName) { 
			self.indicator.addEventListener(eventName, self);
		 });

		endEvents.forEach(function (eventName) {
			window.addEventListener(eventName, self);
		});
	}
	
	Scrollbar.prototype = {
		updateScrollbar: function () {
			if (this.scrollElement.clientHeight === this.scrollElement.scrollHeight) {
				this.wrapperStyle.visibility = 'hidden';
				return;
			} else this.wrapperStyle.visibility = 'visible';
			
			if (this.offset != 0) {
				this.scrollElement.scrollTop += this.offset / this.scrollbarToElementRatio();
				this.offset = 0;
			}

			this.wrapperHeight = this.wrapper.clientHeight;
			this.indicatorHeight = this.wrapperHeight * this.scrollElement.clientHeight / this.scrollElement.scrollHeight;
			//A quick benchmark showed Math.max performance to be worse than an if statement on IE11
			if (this.indicatorHeight < 10) {
				this.indicatorHeight = 10;
			}

			this.indicator.style.height = this.indicatorHeight + 'px';
					 
			// Calculate the percentage that the element is currently scrolled and multiply it by the length the indicator can scroll
			this.indicatorStyle.transform = 'translateY(' + this.scrollElement.scrollTop * this.scrollbarToElementRatio() + 'px)';
		},


		scrollbarToElementRatio: function () {
			//Available height for the indicator to scroll divided by available height for the element to scroll
			return (this.wrapperHeight - this.indicatorHeight) / (this.scrollElement.scrollHeight - this.scrollElement.clientHeight);
		},

		start: function (e) {
			this.lastPointY = (e.touches ? e.touches[0] : e).pageY;
			
			e.preventDefault();
			e.stopPropagation();
			
			var self = this;
			moveEvents.forEach(function (eventName) {
				window.addEventListener(eventName, self);
			});
		},

		//Consider performance: this function can be called 15+ times per frame
		move: function (e) {
			var point = e.touches ? e.touches[0] : e;

			this.offset += point.pageY - this.lastPointY;
			this.lastPointY = point.pageY;

			e.preventDefault();
			e.stopPropagation();
		},
		
		end: function (e) {
			var self = this;
			moveEvents.forEach(function (eventName) {
				window.removeEventListener(eventName, self);
			});
		},
		
		//TODO: Test cleanup
		destroy: function () {
			var self = this;
			startEvents.forEach(function (eventName) {
				self.indicator.removeEventListener(eventName, self);
			});

			moveEvents.concat(endEvents).forEach(function (eventName) {
				window.removeEventListener(eventName, self);
			});

			this.wrapper.parentNode.removeChild(this.wrapper)
		},

		handleEvent: function (e) {
			// Benchmarking showed if statement to have better performance on moves than switch statements or a map
			if (moveEvents.indexOf(e.type) != -1) {
				this.move(e);
			} else if (startEvents.indexOf(e.type) != -1) {
				this.start(e);
			} else if (endEvents.indexOf(e.type) != -1) {
				this.end(e);
			}
		},
	};


	if (typeof module != 'undefined' && module.exports) {
		module.exports = StyledScroll;
	} else {
		window.StyledScroll = StyledScroll;
	}
})(window, document, Math);