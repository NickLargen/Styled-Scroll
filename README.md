# Styled Scroll
Styled Scroll provides an overlaid vertical scrollbar for overflowing elements, perfect for creating a stylish scrollbar for all browsers or to simply reduce the amount of space the scrollbar occupies. Unlike other scrolling libraries it does not override default scrolling behavior- it only hides the default scrollbar and places its own. This means that it integrates seamlessly with [any scroll animator](http://julian.com/research/velocity/#scroll) and performs well no matter how complex the scrolled content is.

## Usage
Standard Styled Scroll usage requires the scrollable content to have 100% the width and height of its parent:
 
    <div id='viewport'>
        <div id='content'>
            ... content ...
        </div>
    </div>
    
Then all you have to do is create a new StyledScroll object:

    var styledScroll = new StyledScroll(document.getElementById('content'));

If you are finished with the object, make sure to clear it from memory:

    styledScroll.destroy();
    styledScroll = null;

    
The scrollbar will automatically update its dimensions and position with any changes to the scrollable region (see [options](#options) to configure this behavior). However, changing a scrollbar's styling at runtime may require you to inform it that its position has changed:

    styledScroll.refresh();

#### CSS
When Styled Scroll is applied to an element it adds the 'hide-scrollbar' class. Include  the following css in order to properly hide the default scrollbar on webkit based browsers (Chrome and Safari).

    .hide-scrollbar::-webkit-scrollbar {
        display: none;
    }
    
Styled Scroll objects contain references to two divs that represent the scrollbar. The _track_ is the region that the scrollbar overlays and the _thumb_ is the indicator or handle that can be moved along the track in order to scroll. In order for them to appear you must specify their appearance. The minimal css must specify the position and dimensions of the track and an appearance for the thumb:
  
    .styled-scroll-track {
        top: 0;
        right: 0;
        height: 100%;
        width: 12px; 
    }
    
    .styled-scroll-thumb {
        background: darkolivegreen;
    }  
    
###### Styling
You can apply any styles that you want to customize the appearance. For example Chrome's overlaid scrollbar can be approximated by:

    .styled-scroll-track {
        top: 0;
        right: 0;
        bottom: 0;
        
        width: 10px; 
        box-sizing: border-box;
    }
    
    .styled-scroll-thumb {
        background: rgba(0,0,0,0.5);
        border:1px solid rgba(0,0,0,0.42);
        background-clip: padding-box;
        border-radius: .5px;
    }
    
    .styled-scroll-thumb:hover { 
        background: rgba(0,0,0,0.64);
    }
    
Important note: avoid padding on the thumb or margins on either the thumb or track. Use top/right/bottom/left to change their location.

## Browser Compatability
Styled Scroll is tested to work on the latest versions of Chrome, Firefox, and IE 10+ on both desktop and mobile devices. If a browser lacks necessary features for customization the appearance will simply revert to the native scrollbar.

<h2 id='options'>Options</h2>
Styled Scroll accepts an options parameter for customized behavior. _For brevity falsey default values will not be listed._

##### refreshTriggers
An object that defines when the scrollbar will automatically be refreshed in response to an event.

* **contentChange:** Boolean. Content additions, modifications, and deletions can affect the scrollheight. On most platforms this uses a Mutation Observer.
* **elementResize:** Boolean. The scrollable element has changed in width or height. Since dom elements don't natively fire resize events this is implemented by inserting a child iframe with 100% width and height. This is computationally intensive (particularly with a large number of scrollable elements) and should be disabled if unnecessary.
* **windowResize:** Boolean. The scrollbar will be updated whenever the window is. This is very useful for any element whose dimensions are determined by window size.
* **poll:** Number. An interval in milliseconds to constantly send refreshes. This a brute force approach that will guarantee scrollbar accuracy but consumes resources on static elements. Avoid creating a large number of polling objects on the same page. Non-positive numbers will cause refreshes to be requested at 60fps and a boolean true will use a default poll interval.

Default: `{ contentChange: true, elementResize: true }`
    
Omitted properties will not be used. To handle all refreshes yourself use `refreshTriggers: {}`.

##### useNative
Boolean. Creates a standard StyledScroll object but does not replace the native scrollbar with a styled one. This can be useful for using native scrollbars on specific platforms and still offers event callbacks for scrollStart and scrollEnd. This will be set to true if used on an unsupported platform.

##### useNativeIfOverlay
Boolean. Uses the native scrollbar if it does not use any layout space. Many mobile platforms implement their own attractive overlaid scrollbars that users are already accustomed to.

##### disconnectScrollbar
Boolean. The track will be removed from the dom when it does not need to be displayed instead of changing that track's `visible` css. The same track will be reinserted if the scrollbar should reappear.

<h2 id='events'>Events</h2>
StyledScroll triggers `scrollStart` and `scrollEnd` events at the appropriate time. Events can be registered and removed using the `on(event, function)` and `off(event, function)` methods that take a single event name and the function to be executed as parameters. Example usage: `scroller.on('scrollStart', function () { console.log('Scrolling started!'); });`.

## Versioning
Styled Scroll is maintained under [the Semantic Versioning guidelines](http://semver.org/).

## License (MIT)
Copyright (c) 2015 Nick Largen

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
