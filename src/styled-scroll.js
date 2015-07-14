(function (window, document, Math) {
	'use strict';
	
	var requestAnimationFrame = window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function (callback) { window.setTimeout(callback, 1000 / 60); };
		
	var testDiv = document.createElement('div');
	var transformPrefixed, isSupportedBrowser = testDiv.classList !== undefined;
	// webkitTransform is the only prefix we care about since IE9 is not supported
	if ('transform' in testDiv.style) {
		transformPrefixed = 'transform';
	} else if ('webkitTransform' in testDiv.style) {
		transformPrefixed = 'webkitTransform';
	} else {
		isSupportedBrowser = false;
	}

	var supportsWebkitOverflowScrolling = '-webkit-overflow-scrolling' in testDiv.style;
	var supportsMsOverflowStyle = '-ms-overflow-style' in testDiv.style;
	var supportsMutationObserver = window.MutationObserver !== undefined;
	var supportsEventConstructor = typeof window.Event == "function";

	/** Detect what input events are supported in order to register listeners.
	 * Pointer events include mouse and touch events so listening to everything can cause events to be received twice.
	**/
	var onlySupportsMSPointer = window.MSPointerEvent !== undefined && window.onpointerdown === undefined;

	var pointerDown = onlySupportsMSPointer ? 'MSPointerDown' : 'pointerdown';
	var pointerMove = onlySupportsMSPointer ? 'MSPointerMove' : 'pointermove';
	var pointerUp = onlySupportsMSPointer ? 'MSPointerUp' : 'pointerup';
	var pointerCancel = onlySupportsMSPointer ? 'MSPointerCancel' : 'pointercancel';

	var supportsPointer = window.onpointerdown !== undefined || window.MSPointerEvent !== undefined;

	var startEvents = supportsPointer ? [pointerDown] : ['touchstart', 'mousedown'];
	var moveEvents = supportsPointer ? [pointerMove] : ['touchmove', 'mousemove'];
	var endEvents = supportsPointer ? [pointerUp, pointerCancel] : ['touchend', 'mouseup', 'touchcancel', 'mousecancel'];

	function addResizeTrigger(element, callback) {
		// Create an element that supports resize events with the same height  and width as the provided element
	    // Changes to width need to be listened to because child elements may change height as their width changes
	    var resizeTrigger = document.createElement('iframe');
		resizeTrigger.setAttribute('style', 'position: absolute; top: 0; left: 0; height: 100%; width: 100%; border: none; pointer-events: none; visibility: hidden;');

		resizeTrigger.onload = function () {
			if (resizeTrigger.contentWindow) {
				resizeTrigger.contentWindow.onresize = callback;
			}
			else {
				console.warn('Failed to attach resize trigger onto element. The follow element will not have an accurate scrollbar when its viewport is resized.');
				console.warn(element);
			}
		};
		element.appendChild(resizeTrigger);
		element.__resizeTrigger__ = element;
	}
	
	function removeResizeTrigger(element) {
		if (element.__resizeTrigger__) {
			if(element.__resizeTrigger__.parentNode === element) element.removeChild(element.__resizeTrigger__);
			element.__resizeTrigger__ = null;
		}
	}

	var scrollbarWidth = null;
		
	//Source: http://stackoverflow.com/questions/13382516/getting-scroll-bar-width-using-javascript
	function getScrollbarWidth() {
		// Known issue: scrollbar width changes on zoom on Firefox
		if (scrollbarWidth) {
			return scrollbarWidth;
		}

		var outer = document.createElement("div");
		outer.style.visibility = "hidden";
		outer.style.width = "100px";
		outer.style.msOverflowStyle = "scrollbar"; // needed for WinJS apps
		outer.classList.add('hide-scrollbar');
	    
		// Add hide-scrollbar class to compute width properly if it is used for removing scrollbars via css
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

		scrollbarWidth = widthNoScroll - widthWithScroll;
		return scrollbarWidth;
	}
	
	var styledScrollMutationConfig = { attributes: true, childList: true, subtree: true };
	// Whether or not scrollbars are being hidden by modifying element size (for browsers that don't support hiding scrollbars)
	var isUsingWidthHack; 

	function StyledScroll(scrollElement, options) {
		this.scrollElement = scrollElement;
		this.options = options || {};
		
		if (!this.options.customDimensions) {
			var parentMaxHeight = getComputedStyle(scrollElement.offsetParent).maxHeight;
			this.scrollElement.style.maxHeight = '100%';
		}

		if (supportsWebkitOverflowScrolling) {
            // Touch webkitOverflowScrolling enables momentum which is required for a good user experience
		    this.scrollElement.style.webkitOverflowScrolling = 'touch';
	        // IOS does not supprt hiding scrollbars with touch overflow scrolling so revert to native 
		    this.options.useNative = true;

		    // Work around for IOS 8 issue with webkitOverflowScrolling where dynamically adding content does not immediately allow scrolling
		    var scrollForcer = document.createElement('div');
		    scrollForcer.setAttribute('style', 'position: absolute; height: calc(100% + 1px); width: 1px; top: 0; left: 0; visibility: hidden');
		    this.scrollElement.appendChild(scrollForcer);
		}
		
		// Fall back to native scrolling if necessary features are not supported
		if (!isSupportedBrowser) this.options.useNative = true;
		
		if (!this.options.useNative) {
			if (isUsingWidthHack === undefined) isUsingWidthHack = !supportsMsOverflowStyle && getScrollbarWidth() > 0;
			// With custom dimensions the width cannot be changed to hide the scrollbar so just default to native scrolling (Firefox)
			if (this.options.customDimensions && isUsingWidthHack) this.options.useNative = true;
		}
		
		if (this.options.useNative) {
			this.scrollElement.style.overflowY = 'auto';
		} else {
			// Permanent scrollbars prevents unnecessary repaints when the scrollbar would no longer be needed
			this.scrollElement.style.overflowY = 'scroll';
			this.initScrollbar();
		}
		
		this.initEvents();
	}

	StyledScroll.prototype = {
		
		initScrollbar: function () {
			var self = this;
			// Disable native scrollbar
			this.scrollElement.classList.add('hide-scrollbar');
			if (isUsingWidthHack) {
				// Make the scrolling element larger than the containing element so that the scrollbar is hidden
				this.scrollElement.style.width = 'calc(100% + ' + getScrollbarWidth() + 'px';
				// Prevent user from scrolling the scrollbar into view
				this.scrollElement.offsetParent.style.overflowX = 'hidden';
			} else if (supportsMsOverflowStyle) {
				this.scrollElement.style.msOverflowStyle = 'none';
			}
			
			// Create a new scrollbar and update it whenever the viewport or the content changes
			this.createTrack();
			this.scrollElement.parentNode.appendChild(this.track);
			this.scrollbar = new Scrollbar(this, this.track);

			var requestScrollbarUpdate = function () {
				self.refresh();
			};
		
			if (supportsMutationObserver) {
				this.observer = new MutationObserver(requestScrollbarUpdate);
				this.observer.observe(this.scrollElement, styledScrollMutationConfig);
			} else {
				this.scrollElement.addEventListener('DOMSubtreeModified', requestScrollbarUpdate);
				console.log('Mutation observer support not detected, falling back to mutation events. Please verify your browser is up to date.');
			}

			addResizeTrigger(this.scrollElement, requestScrollbarUpdate);
		},

		createTrack: function () {
			this.track = document.createElement('div');
			this.thumb = document.createElement('div');
	
			this.track.className = 'styled-scroll-track';
			this.track.style.position = 'absolute';
	
			this.thumb.className = 'styled-scroll-thumb';
			this.thumb.style.position = 'relative';
			// Thumb height calculations assume border-box
			this.thumb.style.boxSizing = 'border-box';
			
			// Prevent invisible track from stealing mouse events.
			this.track.style.pointerEvents = 'none';
			this.thumb.style.pointerEvents = 'auto';
	
			if (supportsEventConstructor) {
				var wheelTarget = this.scrollElement;
				this.track.addEventListener('wheel', function (event) {
					var clone = new WheelEvent(event.type, event);
					wheelTarget.dispatchEvent(clone);
				});
			}
			
			this.track.appendChild(this.thumb);
		},
		
		initEvents: function () {
			var self = this;
			// Create storage for events that can be registered
			this.events = {};
	
			var onScrollFunction = function () {
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
			};
	
			if (this.scrollElement.addEventListener) {
				this.scrollElement.addEventListener('scroll', onScrollFunction);
			} else this.scrollElement.onscroll = onScrollFunction;
		},
		
		refresh: function () {
			this.updateScrollbar = true;
			this.requestUpdate(); 
		},
		
		requestUpdate: function () {
			// Do not allow stacked update requests
			if (!this.isUpdateRequested && !this.options.useNative) {
				this.isUpdateRequested = true;
				var self = this;
				requestAnimationFrame(function () { self.update(); });
			}
		},
		
		update: function () {
			if (this.updateScrollbar) {
				this.scrollbar.updateScrollbar();
				this.updateScrollbar = false;
			} else this.scrollbar.updateThumbPosition();
			this.isUpdateRequested = false;
		},

		destroy: function () { 
			if (this.options.useNative) return;
			if (this.isDestroyed) {
				console.warn('Attempted to destroy an already destroyed Styled Scroll object, ignoring request.');
				return;
			}
			this.isDestroyed = true;
			
			this.scrollbar.destroy();
			
			// TODO: Unsure if explicit observer disconnect and resize listener removal are necessary, no observed leaks without them
			if (supportsMutationObserver) this.observer.disconnect();
			else this.scrollElement.removeEventListener('DOMSubtreeModified', this.requestScrollbarUpdate);
			
			removeResizeTrigger(this.scrollElement);
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
			for(var argIndex = 1; argIndex < arguments.length; argIndex++) {
			    functionArgs[argIndex - 1] = arguments[argIndex];
			}
		
			for (var funIndex = 0 ; funIndex < numFunctions; funIndex++ ) {
				eventFunctions[funIndex].apply(this, functionArgs);
			}
		},
	};

	function Scrollbar(styledScroll, track) {
		this.track = track;
		this.thumb = this.track.children[0];
		this.thumbStyle = this.thumb.style;
		this.scrollElement = styledScroll.scrollElement;
		this.styledScroll = styledScroll;

		this.lastMouseY = 0;
		
		var self = this;
		startEvents.forEach(function (eventName) { 
			self.thumb.addEventListener(eventName, self);
		});

		endEvents.forEach(function (eventName) {
			document.addEventListener(eventName, self);
		});
	}
	
	function getStyleValue(style) {
		return parseFloat(style) || 0;
	}
	
	Scrollbar.prototype = {
		updateScrollbar: function () {
			var scrollHeight = this.scrollElement.scrollHeight;
			var clientHeight = this.scrollElement.clientHeight;
			
			// Add a small grace period so that scrollbars don't appear if there are only a few pixels to scroll
			// This is very important because IE <= 11 incorrectly calculates scrollHeight (observed up to 101% of actual value)
			if (clientHeight >= scrollHeight * 0.95) {
				if (this.track.style.visibility !== 'hidden') {
					this.track.style.visibility = 'hidden';
				}
				return;
			} else if (this.track.style.visibility !== 'visible') { 
				this.track.style.visibility = 'visible';
			}
			
			var availableTrackHeight = this.calculateAvailableTrackHeight(clientHeight); 
			
			var thumbHeight = availableTrackHeight * clientHeight / scrollHeight;
			//A quick benchmark showed Math.max performance to be worse than an if statement on IE11
			if (thumbHeight < 20) {
				thumbHeight = 20;
			}
			this.thumb.style.height = thumbHeight + 'px';
			
			//Available height for the thumb to scroll divided by available height for the element to scroll
			this.scrollbarToElementRatio = (availableTrackHeight - thumbHeight) / (scrollHeight - clientHeight);
			
			this.updateThumbPosition();
		},
		
		// The height the thumb is allowed to occupy
		calculateAvailableTrackHeight: function (clientHeight) {
			var availableTrackHeight;
			var trackCompStyle = getComputedStyle(this.track);
			var thumbCompStyle = getComputedStyle(this.thumb);
			
			if (this.styledScroll.options.customDimensions) {
				var trackTop = getStyleValue(trackCompStyle.top),
					trackBottom = getStyleValue(trackCompStyle.bottom),
					borderTop = getStyleValue(trackCompStyle.borderTopWidth),
					borderBottom = getStyleValue(trackCompStyle.borderBottomWidth);

				this.track.style.height = clientHeight - trackTop - trackBottom + 'px';
				availableTrackHeight = clientHeight - trackTop - borderTop - trackBottom - borderBottom;
			
				// Translate the scrollbar from the right of the parent div to the right of the scrolled div
				var scrollCompStyle = getComputedStyle(this.scrollElement);
				var parentCompStyle = getComputedStyle(this.scrollElement.offsetParent);
				var rightOffset = getStyleValue(scrollCompStyle.borderRightWidth) + getStyleValue(scrollCompStyle.marginRight) + getStyleValue(parentCompStyle.paddingRight);
				var topOffset = getStyleValue(scrollCompStyle.borderTopWidth) + getStyleValue(scrollCompStyle.marginTop) + getStyleValue(parentCompStyle.paddingTop);
				this.track.style[transformPrefixed] = 'translate(-' + rightOffset + 'px,' + topOffset + 'px)';
			} else {
				availableTrackHeight = this.track.clientHeight;
			}
			
			availableTrackHeight -= getStyleValue(thumbCompStyle.top) + getStyleValue(thumbCompStyle.bottom);
			availableTrackHeight -= getStyleValue(trackCompStyle.paddingTop) + getStyleValue(trackCompStyle.paddingBottom);
			
			return availableTrackHeight;
		},
		
		// Calculate the percentage that the element is currently scrolled and multiply it by the length the thumb can scroll
		getCurrentThumbTop: function () {
			return this.scrollElement.scrollTop * this.scrollbarToElementRatio;
		},
		
		updateThumbPosition: function () {
			if (this.isDragged) {
				this.scrollElement.scrollTop = (this.lastMouseY - this.dragTopOffset) / this.scrollbarToElementRatio;
				this.isDragged = false;
			}
			
			this.thumbStyle[transformPrefixed] = 'translateY(' + this.getCurrentThumbTop() + 'px)';
		},

		start: function (e) {
			this.lastMouseY = (e.touches ? e.touches[0] : e).pageY;

			this.dragTopOffset = this.lastMouseY - this.getCurrentThumbTop();
			
			e.preventDefault();
			e.stopPropagation();
			
			var self = this;
			moveEvents.forEach(function (eventName) {
				document.addEventListener(eventName, self);
			});
		},

		//Consider performance: this function can be called 15+ times per frame
		move: function (e) {
			this.lastMouseY = (e.touches ? e.touches[0] : e).pageY;

			this.isDragged = true;
			this.styledScroll.requestUpdate();

			e.preventDefault();
			e.stopPropagation();
		},
		
		end: function () {
			var self = this;
			moveEvents.forEach(function (eventName) {
				document.removeEventListener(eventName, self);
			});
		},
		
		destroy: function () {
			var self = this;
			startEvents.forEach(function (eventName) {
				self.thumb.removeEventListener(eventName, self);
			});

			moveEvents.concat(endEvents).forEach(function (eventName) {
				document.removeEventListener(eventName, self);
			});

			this.track.parentNode.removeChild(this.track);
		},

		handleEvent: function (e) {
			// Benchmarking showed if statement to have better performance on moves than switch statements or a map
			if (moveEvents.indexOf(e.type) !== -1) {
				this.move(e);
			} else if (startEvents.indexOf(e.type) !== -1) {
				this.start(e);
			} else if (endEvents.indexOf(e.type) !== -1) {
				this.end(e);
			}
		}
	};

	if (typeof module != 'undefined' && module.exports) {
		module.exports = StyledScroll;
	} else {
		window.StyledScroll = StyledScroll;
	}
})(window, document, Math);