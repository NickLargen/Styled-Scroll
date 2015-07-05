(function (window, document, Math) {
	'use strict';
	
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

	//Source: http://www.backalleycoder.com/2013/03/18/cross-browser-event-based-element-resize-detection/
	var attachEvent = document.attachEvent;
	var isIE = navigator.userAgent.match(/Trident/);
	
	var requestFrame = (function () {
		var raf = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame ||
			function (fn) { return window.setTimeout(fn, 20); };
		return function (fn) { return raf(fn); };
	})();

	var cancelFrame = (function () {
		var cancel = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame ||
			window.clearTimeout;
		return function (id) { return cancel(id); };
	})();

	function resizeListener(e) {
		var win = e.target || e.srcElement;
		if (win.__resizeRAF__) cancelFrame(win.__resizeRAF__);
		win.__resizeRAF__ = requestFrame(function () {
			var trigger = win.__resizeTrigger__;
			trigger.__resizeListeners__.forEach(function (fn) {
				fn.call(trigger, e);
			});
		});
	}

	function objectLoad(e) {
		this.contentDocument.defaultView.__resizeTrigger__ = this.__resizeElement__;
		this.contentDocument.defaultView.addEventListener('resize', resizeListener);
	}

	window.addResizeListener = function (element, fn) {
		if (!element.__resizeListeners__) {
			element.__resizeListeners__ = [];
			if (attachEvent) {
				element.__resizeTrigger__ = element;
				element.attachEvent('onresize', resizeListener);
			}
			else {
				if (getComputedStyle(element).position == 'static') element.style.position = 'relative';
				var obj = element.__resizeTrigger__ = document.createElement('object');
				obj.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; pointer-events: none; z-index: -1;');
				obj.__resizeElement__ = element;
				obj.onload = objectLoad;
				obj.type = 'text/html';
				if (isIE) element.appendChild(obj);
				obj.data = 'about:blank';
				if (!isIE) element.appendChild(obj);
			}
		}
		element.__resizeListeners__.push(fn);
	};

	window.removeResizeListener = function (element, fn) {
		element.__resizeListeners__.splice(element.__resizeListeners__.indexOf(fn), 1);
		if (!element.__resizeListeners__.length) {
			if (attachEvent) element.detachEvent('onresize', resizeListener);
			else {
				element.__resizeTrigger__.contentDocument.defaultView.removeEventListener('resize', resizeListener);
				element.__resizeTrigger__ = !element.removeChild(element.__resizeTrigger__);
			}
		}
	};







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
	
	var styledScrollMutationConfig = { attributes: true, childList: true, subtree: true };

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
		
		// Create storage for events that can be registered
		this.events = {};
		
		// ----- SCROLLBAR HANDLING -----
		this.initScrollbar();

		var self = this;
		this.requestScrollbarUpdate = function () { 
			self.requestUpdate(); 
			self.updateScrollbar = true;
		};
		
		this.scrollElement.addEventListener('scroll', function () { 
			self.hasScrolledRecently = true;
			self.requestUpdate();
			if (!self.isScrolling) {
				self.isScrolling = true;
				self.triggerEvent('scrollStart');
				
				// Create a timer marks scrolling as ended if a scroll event has not occured within some timeout
				var intervalId = setInterval(function checkIfScrolled() {
					if (self.hasScrolledRecently) {
						self.hasScrolledRecently = false;
					} else {
						clearInterval(intervalId);
						self.isScrolling = false;
						self.triggerEvent('scrollEnd');
					}
				}, 200);
			}
		});
		
		// TODO: IE < 11 does not support mutation observer
		this.observer = new MutationObserver(this.requestScrollbarUpdate);
		this.observer.observe(this.scrollElement, styledScrollMutationConfig);

		addResizeListener(this.scrollElement, this.requestScrollbarUpdate);
		
		this.requestScrollbarUpdate();
		
		return this;
	}

	StyledScroll.prototype = {
		
		initScrollbar: function () {
			var scrollbarDiv = createScrollbarElement('v', true, 'custom');
			this.parent.appendChild(scrollbarDiv);
			
			this.scrollbar = new Scrollbar(this, { el: scrollbarDiv });
		},
		
		requestUpdate: function () {
			// Do not allow stacked update requests
			if (!this.isUpdateRequested) {
				this.isUpdateRequested = true;
				var self = this;
				requestAnimationFrame(function () { self.update(); });
			}
		},
		
		update: function () {
			if (this.updateScrollbar) {
				this.scrollbar.updateScrollbar();
				this.updateScrollbar = false;
			} else this.scrollbar.updateIndicatorPosition();
			this.isUpdateRequested = false;
		},

		scrollToElement: function () { },
		scrollTo: function () { },
		refresh: function () { },
		destroy: function () { 
			this.scrollbar.destroy();
			// TODO: Unsure if explicit observer disconnect and resize listener removal are necessary, no observed leaks without them
			this.observer.disconnect();
			removeResizeListener(this.scrollElement, this.requestScrollbarUpdate);
		},
		
		on: function (type, fn) {
			if (!this.events[type]) {
				this.events[type] = [];
			}

			this.events[type].push(fn);
		},

		off: function (type, fn) {
			if (!this.events[type]) {
				return;
			}

			var index = this.events[type].indexOf(fn);

			if (index > -1) {
				this.events[type].splice(index, 1);
			}
		},
	
		triggerEvent: function (type) {
			var eventFunctions = this.events[type];
			var numFunctions = eventFunctions && eventFunctions.length;
			if ( !numFunctions ) {
				return;
			}
	
			var functionArgs = new Array(arguments.length - 1);
			for(var i = 1; i < arguments.length; i++) {
			    functionArgs[i - 1] = arguments[i];
			}
		
			for (i = 0 ; i < numFunctions; i++ ) {
				eventFunctions[i].apply(this, functionArgs);
			}
		},
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
		this.styledScroll = styledScroll;

		this.lastPointY = 0;
		this.indicatorDeltaY = 0;

		var self = this;
		startEvents.forEach(function (eventName) { 
			self.indicator.addEventListener(eventName, self);
		 });

		endEvents.forEach(function (eventName) {
			document.addEventListener(eventName, self);
		});
	}
	
	Scrollbar.prototype = {
		updateScrollbar: function () {
			var scrollHeight = this.scrollElement.scrollHeight;
			var clientHeight = this.scrollElement.clientHeight;
			
			if (clientHeight === scrollHeight) {
				this.wrapperStyle.visibility = 'hidden';
				return;
			} else this.wrapperStyle.visibility = 'visible';
			
			var wrapperHeight = this.wrapper.clientHeight;
			
			var indicatorHeight = wrapperHeight * clientHeight / scrollHeight;
			//A quick benchmark showed Math.max performance to be worse than an if statement on IE11
			if (indicatorHeight < 10) {
				indicatorHeight = 10;
			}
			this.indicator.style.height = indicatorHeight + 'px';
			
			//Available height for the indicator to scroll divided by available height for the element to scroll
			this.scrollbarToElementRatio = (wrapperHeight - indicatorHeight) / (scrollHeight - clientHeight);
			
			this.updateIndicatorPosition();
		},
		
		updateIndicatorPosition: function () {
			var scrollTop = this.scrollElement.scrollTop;
			if (this.indicatorDeltaY != 0) {
				this.scrollElement.scrollTop = scrollTop += this.indicatorDeltaY / this.scrollbarToElementRatio;
				this.indicatorDeltaY = 0;
			}
					 
			// Calculate the percentage that the element is currently scrolled and multiply it by the length the indicator can scroll
			this.indicatorStyle.transform = 'translateY(' + scrollTop * this.scrollbarToElementRatio + 'px)';
		},

		start: function (e) {
			this.lastPointY = (e.touches ? e.touches[0] : e).pageY;
			
			e.preventDefault();
			e.stopPropagation();
			
			var self = this;
			moveEvents.forEach(function (eventName) {
				document.addEventListener(eventName, self);
			});
		},

		//Consider performance: this function can be called 15+ times per frame
		move: function (e) {
			var point = e.touches ? e.touches[0] : e;

			this.indicatorDeltaY += point.pageY - this.lastPointY;
			this.lastPointY = point.pageY;
			
			this.styledScroll.requestUpdate();

			e.preventDefault();
			e.stopPropagation();
		},
		
		end: function (e) {
			var self = this;
			moveEvents.forEach(function (eventName) {
				document.removeEventListener(eventName, self);
			});
		},
		
		//TODO: Test cleanup
		destroy: function () {
			var self = this;
			startEvents.forEach(function (eventName) {
				self.indicator.removeEventListener(eventName, self);
			});

			moveEvents.concat(endEvents).forEach(function (eventName) {
				document.removeEventListener(eventName, self);
			});

			this.wrapper.parentNode.removeChild(this.wrapper);
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