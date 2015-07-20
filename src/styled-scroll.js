(function (window, document, undefined) {
	'use strict';

	StyledScroll.defaultOptions = {
		refreshTriggers: {
			contentChange: true,
			elementResize: true
		}
	};

	var requestAnimationFrame = window.requestAnimationFrame ||
		function (callback) { window.setTimeout(callback, 1000 / 60); };

	var testDiv = document.createElement('div');
	testDiv.style.cssText = "visibility: hidden; width: 200px; height: 200px; overflow-y: scroll; -ms-overflow-style: scrollbar";
	testDiv.className = 'hide-scrollbar';

	var isSupportedBrowser = testDiv.classList !== undefined;
	if (testDiv.addEventListener) {
		var _addEventListener = function (target, type, listener) {
			target.addEventListener(type, listener);
		}
		var _removeEventListener = function (target, type, listener) {
			target.removeEventListener(type, listener);
		}
	} else isSupportedBrowser = false;

	var transformPrefixed;
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
	var supportsPointer = window.onpointerdown !== undefined || window.MSPointerEvent !== undefined;

	var startEvents, moveEvents, endEvents;
	if (supportsPointer) {
		var supportsSetPointerCapture = testDiv.setPointerCapture !== undefined;

		var pointerDown = onlySupportsMSPointer ? 'MSPointerDown' : 'pointerdown';
		var pointerMove = onlySupportsMSPointer ? 'MSPointerMove' : 'pointermove';
		var pointerUp = onlySupportsMSPointer ? 'MSPointerUp' : 'pointerup';
		var pointerCancel = onlySupportsMSPointer ? 'MSPointerCancel' : 'pointercancel';

		startEvents = [pointerDown];
		moveEvents = [pointerMove];
		endEvents = [pointerUp, pointerCancel];
	} else {
		startEvents = ['touchstart', 'mousedown'];
		moveEvents = ['touchmove', 'mousemove'];
		endEvents = ['touchend', 'mouseup', 'touchcancel', 'mousecancel'];
	}

	function addEvents(target, types, listener) {
		for (var i = types.length; i--;) {
			_addEventListener(target, types[i], listener);
		}
	}

	function removeEvents(target, types, listener) {
		for (var i = types.length; i--;) {
			_removeEventListener(target, types[i], listener);
		}
	}

	function addZoomTrigger() {
		if (supportsEventConstructor) {
			var zoomTrigger = document.createElement('iframe');
			zoomTrigger.id = 'zoom-trigger';
			zoomTrigger.style.cssText = 'width: 1;';
			document.body.appendChild(zoomTrigger);
			zoomTrigger.contentWindow.onresize = function () {
				window.dispatchEvent(new Event('zoom'));
			};

			_addEventListener(window, 'zoom', function () {
				// Mark cached scrollbar width as invalid
				scrollbarWidth = undefined;
			});
		}
	}

	function addResizeTrigger(element, callback) {
		//TODO: adding multiple resize triggers to the same element
		
		// Create an element that supports resize events with the same height  and width as the provided element
		// Changes to width need to be listened to because child elements may change height as their width changes
		var resizeTrigger = document.createElement('iframe');
		resizeTrigger.setAttribute('style', 'position:absolute;top:0;left:0;height:100%;width:100%;border:none;pointer-events:none;visibility:hidden;z-index:-2147483648;');

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
			if (element.__resizeTrigger__.parentNode === element) element.removeChild(element.__resizeTrigger__);
			element.__resizeTrigger__ = null;
		}
	}

	var scrollbarWidth;
	function getScrollbarWidth() {
		if (scrollbarWidth === undefined) {
			document.body.appendChild(testDiv);
			scrollbarWidth = testDiv.offsetWidth - testDiv.clientWidth;
			testDiv.parentNode.removeChild(testDiv);
		}

		return scrollbarWidth;
	}
	
	// Whether or not scrollbars are being hidden by modifying element size (for browsers that don't support hiding scrollbars)
	var isUsingWidthHack;

	/* ========================= CLASS STYLED SCROLL ========================= */
	function StyledScroll(scrollElement, options) {
		var self = this;
		self._scrollElement = scrollElement;
		var parent = scrollElement.parentNode;
		self._options = options || {};
		for (var property in StyledScroll.defaultOptions) {
			if (self._options[property] === undefined) self._options[property] = StyledScroll.defaultOptions[property];
		}

		if (scrollElement.clientHeight > parent.clientHeight || getComputedStyle(scrollElement).maxHeight === 'none') {
			scrollElement.style.maxHeight = '100%';
		}
			
		if (self._options.sameDimensions) {
			self._options.sameClientWidth = self._options.sameClientHeight = true;
		}

		if (supportsWebkitOverflowScrolling) {
			// Touch webkitOverflowScrolling enables momentum which is required for a good user experience
			scrollElement.style.webkitOverflowScrolling = 'touch';
			// IOS does not supprt hiding scrollbars with touch overflow scrolling so revert to native 
			self._options.useNative = true;

			// Work around for IOS 8 issue with webkitOverflowScrolling where dynamically adding content does not immediately allow scrolling
			var scrollForcer = document.createElement('div');
			scrollForcer.setAttribute('style', 'position:absolute;height:calc(100% + 1px);width:1px;top:0;left:0;visibility:hidden');
			scrollElement.appendChild(scrollForcer);
		}

		// Fall back to native scrolling if necessary features are not supported
		if (!isSupportedBrowser) self._options.useNative = true;

		if (!self._options.useNative) {
			if (isUsingWidthHack === undefined) {
				isUsingWidthHack = !supportsMsOverflowStyle && getScrollbarWidth() > 0;
				if (isUsingWidthHack) addZoomTrigger();
			}
			// With custom dimensions the width cannot be changed to hide the scrollbar so just default to native scrolling (Firefox)
			if (!self._options.sameClientWidth && isUsingWidthHack) self._options.useNative = true;
		}

		if (self._options.useNative) {
			scrollElement.style.overflowY = 'auto';
		} else {
			// Permanent scrollbars prevents unnecessary repaints when the scrollbar would no longer be needed
			scrollElement.style.overflowY = 'scroll';
			self._initScrollbar();
		}

		// Create storage for events that can be registered
		self._events = {};
	}

	StyledScroll.prototype = {

		_initScrollbar: function () {
			var self = this;
			var scrollElement = self._scrollElement;
			var parent = scrollElement.parentNode;
			
			// Disable native scrollbar
			scrollElement.classList.add('hide-scrollbar');
			if (isUsingWidthHack) {
				// Make the scrolling element larger than the containing element so that the scrollbar is hidden
				scrollElement.style.width = 'calc(100% + ' + getScrollbarWidth() + 'px)';
				// Scrollbar width depends on zoom level
				_addEventListener(window, 'zoom', function () {
					scrollElement.style.width = 'calc(100% + ' + getScrollbarWidth() + 'px)';
				});
				
				// Prevent user from scrolling the scrollbar into view
				parent.style.overflowX = 'hidden';
			} else if (supportsMsOverflowStyle) {
				scrollElement.style.msOverflowStyle = 'none';
			}
			
			// Ensure the parent is positioned so that the scrollbars can be correctly placed
			if (parent !== scrollElement.offsetParent) parent.style.position = 'relative';

			// Create a new scrollbar 
			self._createTrack();
			scrollElement.parentNode.appendChild(self._track);
			var scrollbar = self._scrollbar = new Scrollbar(self);

			self.refresh = function () {
				scrollbar._requestUpdate();
			};

			// Refresh the scrollbar's dimensions automatically based on configurable options
			if (self._options.refreshTriggers.contentChange) {
				if (supportsMutationObserver) {
					self._observer = new MutationObserver(self.refresh);
					self._observer.observe(scrollElement, { attributes: true, childList: true, subtree: true });
				} else {
					_addEventListener(scrollElement, 'DOMSubtreeModified', self.refresh);
					console.log('Mutation observer support not detected, falling back to mutation events. Please verify your browser is up to date.');
				}
			}

			if (self._options.refreshTriggers.elementResize) {
				// Position the scroll element so that the resize trigger can use its dimensions
				if (getComputedStyle(scrollElement).position === 'static') scrollElement.style.position = 'relative';
				addResizeTrigger(scrollElement, self.refresh);
			}

			if (self._options.refreshTriggers.windowResize) {
				_addEventListener(window, 'resize', self.refresh);
			}

			var pollInterval = self._options.refreshTriggers.poll;
			if (pollInterval) {
				if (typeof pollInterval !== 'number') pollInterval = 250;
				else if (pollInterval < 15) pollInterval = 15;
				self._pollIntervalId = setInterval(self.refresh, pollInterval);
			}

			self.refresh();
		},

		_createTrack: function () {
			var track = this._track = document.createElement('div');
			var thumb = this._thumb = document.createElement('div');

			track.className = 'styled-scroll-track';
			track.style.position = 'absolute';

			thumb.className = 'styled-scroll-thumb';
			thumb.style.position = 'relative';
			// Thumb height calculations assume border-box
			thumb.style.boxSizing = 'border-box';
			// Bug fix for IE overscrolling the window instead of allowing scrolling with the thumb
			thumb.style.msTouchAction = 'none';
			thumb.style.touchAction = 'none';
			
			// Prevent invisible track from stealing mouse events.
			track.style.pointerEvents = 'none';
			thumb.style.pointerEvents = 'auto';

			if (supportsEventConstructor) {
				var wheelTarget = this._scrollElement;
				_addEventListener(track, 'wheel', function (event) {
					var clone = new WheelEvent(event.type, event);
					wheelTarget.dispatchEvent(clone);
				});
			}

			track.appendChild(thumb);
		},

        refresh: function () {
			// Stub so that native scrollbar refreshes are a noop  
        },

		destroy: function () {
			var self = this;

			if (self._isDestroyed) {
				console.warn('Attempted to destroy an already destroyed Styled Scroll object, ignoring request.');
				return;
			}
			self._isDestroyed = true;
			
			if (_removeEventListener) {
				_removeEventListener(self._scrollElement, 'scroll', self._onScroll);
			} else self._scrollElement.onscroll = null;

			if (self._options.useNative) return;

			var refreshTriggers = self._options.refreshTriggers;
			if (refreshTriggers.contentChange) {
				if (supportsMutationObserver) self._observer.disconnect();
				else _removeEventListener(self._scrollElement, 'DOMSubtreeModified', self.refresh);
			}

			if (refreshTriggers.elementResize) {
				removeResizeTrigger(self._scrollElement);
			}

			if (refreshTriggers.windowResize) {
				_removeEventListener(window, 'resize', self.refresh);
			}

			if (refreshTriggers.poll) {
				clearInterval(self._pollIntervalId);
			}

			self._track = null;
			self._thumb = null;
			self.refresh = null;

			self._scrollbar._destroy();
			self._scrollbar = null;
			self._scrollElement = null;
		},

		on: function (type, fn) {
			var self = this;
			if (!self._onScroll && (type === 'scrollStart' || type === 'scrollEnd')) {
				self._onScroll = function () {
					self._hasScrolledRecently = true;
					if (!self._isScrolling) {
						self._isScrolling = true;
						self.triggerEvent('scrollStart');

						// Create a timer that marks scrolling as ended if a scroll event has not occured within some timeout
						var intervalId = setInterval(function checkIfScrolled() {
							if (self._hasScrolledRecently) {
								self._hasScrolledRecently = false;
							} else {
								clearInterval(intervalId);
								self._isScrolling = false;
								self.triggerEvent('scrollEnd');
							}
						}, 200);
					}
				};
				if (_addEventListener) {
					_addEventListener(self._scrollElement, 'scroll', self._onScroll);
				} else self._scrollElement.onscroll = self._onScroll;
			}

			if (!self._events[type]) {
				self._events[type] = [];
			}

			self._events[type].push(fn);
		},

		off: function (type, fn) {
			if (!this._events[type]) {
				return;
			}

			var index = this._events[type].indexOf(fn);

			if (index > -1) {
				this._events[type].splice(index, 1);
			}
		},

		triggerEvent: function (type) {
			var eventFunctions = this._events[type];
			var numFunctions = eventFunctions && eventFunctions.length;
			if (!numFunctions) {
				return;
			}

			var functionArgs = new Array(arguments.length - 1);
			for (var argIndex = arguments.length; argIndex-- > 1;) {
				functionArgs[argIndex - 1] = arguments[argIndex];
			}

			for (var funIndex = numFunctions; funIndex--;) {
				eventFunctions[funIndex].apply(this, functionArgs);
			}
		},

		getScrollElement: function () {
			return this._scrollElement;
		}
	};

	/* ========================= CLASS SCROLLBAR ========================= */
	function Scrollbar(styledScroll) {
		var self = this;

		Object.keys(styledScroll).forEach(function (property) {
			self[property] = styledScroll[property]
		});

		self._thumbStyle = self._thumb.style;
		self._shouldDisconnect = self._options.disconnectScrollbar;
		self._isHidden = false;

		_addEventListener(self._scrollElement, 'scroll', self._scrollListener = function () { self._requestThumbUpdate(); });

		self._lastMouseY = 0;
		self._initThumbEvents();
	}

	function getStyleFloat(style) {
		return parseFloat(style) || 0;
	}

	Scrollbar.prototype = {
		_requestUpdate: function () {
			this._isScrollbarInvalidated = true;
			this._requestThumbUpdate();
		},

		_requestThumbUpdate: function () {
			// Do not allow stacked update requests
			if (!this._isUpdateRequested) {
				this._isUpdateRequested = true;
				var self = this;
				requestAnimationFrame(function () { self._update(); });
			}
		},

		_update: function () {
			// If the scrollbar has already been destroyed don't attempt to update
			if (this._track) {
				if (this._isScrollbarInvalidated) {
					this._updateScrollbar();
					this._isScrollbarInvalidated = false;
				} else this._updateThumbPosition();
			}
			this._isUpdateRequested = false;
		},

		_updateScrollbar: function () {
			var self = this;
			var scrollHeight = self._scrollElement.scrollHeight;
			var clientHeight = self._scrollElement.clientHeight;

			// Add a small grace period so that scrollbars don't appear if there are only a few pixels to scroll
			// This is very important because IE <= 11 incorrectly calculates scrollHeight (observed up to 101% of actual value)
			if (clientHeight >= scrollHeight * 0.98) {
				if (!self._isHidden) {
					self._isHidden = true;
					if (self._shouldDisconnect) self._track.parentNode.removeChild(self._track);
					else self._track.style.visibility = 'hidden';
				}
				return;
			} else if (self._isHidden) {
				self._isHidden = false;
				if (self._shouldDisconnect) self._scrollElement.parentNode.appendChild(self._track);
				else self._track.style.visibility = 'visible';
			}

			var availableTrackHeight = self._calculateAvailableTrackHeight(clientHeight);
			if (!self._options.sameDimensions) self._translateTrack();

			var thumbHeight = availableTrackHeight * clientHeight / scrollHeight;
			//A quick benchmark showed Math.max performance to be worse than an if statement on IE11
			if (thumbHeight < 20) {
				thumbHeight = 20;
			}
			self._thumb.style.height = thumbHeight + 'px';

			//Available height for the thumb to scroll divided by available height for the element to scroll
			self._scrollbarToElementRatio = (availableTrackHeight - thumbHeight) / (scrollHeight - clientHeight);

			self._updateThumbPosition();
		},

		// The height the thumb is allowed to occupy
		_calculateAvailableTrackHeight: function (clientHeight) {
			var availableTrackHeight;
			var trackCompStyle = getComputedStyle(this._track);
			var thumbCompStyle = getComputedStyle(this._thumb);
			
			if (this._options.sameClientHeight) {
				availableTrackHeight = this._track.clientHeight;
			} else {
				var trackTop = getStyleFloat(trackCompStyle.top);
				var trackBottom = getStyleFloat(trackCompStyle.bottom);
				var borderTop = getStyleFloat(trackCompStyle.borderTopWidth);
				var borderBottom = getStyleFloat(trackCompStyle.borderBottomWidth);

				this._track.style.height = clientHeight - trackTop - trackBottom + 'px';
				availableTrackHeight = clientHeight - trackTop - borderTop - trackBottom - borderBottom;
			}
			
			availableTrackHeight -= getStyleFloat(thumbCompStyle.top) + getStyleFloat(thumbCompStyle.bottom);
			availableTrackHeight -= getStyleFloat(trackCompStyle.paddingTop) + getStyleFloat(trackCompStyle.paddingBottom);

			return availableTrackHeight;
		},
		
		_translateTrack: function () {
			var scrollCompStyle = getComputedStyle(this._scrollElement);
			var parentCompStyle = getComputedStyle(this._scrollElement.parentNode);
			var translation = '';

			if (!this._options.sameClientWidth) {
				// Translate the scrollbar from the right of the parent div to the right of the scrolled div
				var rightOffset = getStyleFloat(scrollCompStyle.right) + getStyleFloat(scrollCompStyle.borderRightWidth) + getStyleFloat(scrollCompStyle.marginRight) + getStyleFloat(parentCompStyle.paddingRight);

				translation += 'translateX(' + -1 * rightOffset + 'px)';
			}
			
			if (!this._options.sameClientHeight) {
				var topOffset = getStyleFloat(scrollCompStyle.top) + getStyleFloat(scrollCompStyle.borderTopWidth) + getStyleFloat(scrollCompStyle.marginTop) + getStyleFloat(parentCompStyle.paddingTop);
				
				translation += 'translateY(' + topOffset + 'px)';
			}
			
			if (translation) this._track.style[transformPrefixed] = translation;
		},

		// Calculate the percentage that the element is currently scrolled and multiply it by the length the thumb can scroll
		_getCurrentThumbTop: function () {
			return this._scrollElement.scrollTop * this._scrollbarToElementRatio;
		},

		_updateThumbPosition: function () {
			if (this._isDragged) {
				this._scrollElement.scrollTop = (this._lastMouseY - this._dragTopOffset) / this._scrollbarToElementRatio;
				this._isDragged = false;
			}

			this._thumbStyle[transformPrefixed] = 'translateY(' + this._getCurrentThumbTop() + 'px)';
		},

		_initThumbEvents: function () {
			var self = this;

			self._start = function (e) {
				self._lastMouseY = (e.touches ? e.touches[0] : e).pageY;

				self._dragTopOffset = self._lastMouseY - self._getCurrentThumbTop();

				e.preventDefault();
				e.stopPropagation();

				var moveTarget = document;
				if (supportsSetPointerCapture) {
					moveTarget = e.target;
					moveTarget.setPointerCapture(e.pointerId);
				}

				addEvents(moveTarget, moveEvents, self._move);
				addEvents(moveTarget, endEvents, self._end);
			};

			//Consider performance: this function can be called 15+ times per frame
			self._move = function (e) {
				self._lastMouseY = (e.touches ? e.touches[0] : e).pageY;

				self._isDragged = true;
				self._requestThumbUpdate();

				e.preventDefault();
				e.stopPropagation();
			};

			self._end = function (e) {
				var moveTarget = supportsSetPointerCapture ? e.target : document;
				removeEvents(moveTarget, moveEvents, self._move);
				removeEvents(moveTarget, endEvents, self._end);
			};

			addEvents(self._thumb, startEvents, self._start);
		},

		_destroy: function () {
			var self = this;
			if (!supportsSetPointerCapture) {
				removeEvents(document, moveEvents, self._move);
				removeEvents(document, endEvents, self._end);
			}

			var parent = self._track.parentNode;
			if (parent) parent.removeChild(self._track);
			self._track = null;
			self._thumb = null;
			_removeEventListener(self._scrollElement, 'scroll', self._scrollListener);
		}
	};

	if (typeof module != 'undefined' && module.exports) {
		module.exports = StyledScroll;
	} else {
		window.StyledScroll = StyledScroll;
	}
})(window, document);