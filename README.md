# Styled Scroll
Styled Scroll provides an overlayed vertical scrollbar for overflowing elements, perfect for creating a stylish scrollbar for all browsers or to simply reduce the amount of space the scrollbar occupies. Unlike other scrolling libraries it does not override default scrolling behavior- it only hides the default scrollbar and places its own. This means that it integrates seamlessly with [any scroll animator](http://julian.com/research/velocity/#scroll) and performs well no matter how complex the scrolled content is.

## Usage
Standard Styled Scroll usage requires the scrollable content to have 100% the width and height of its parent:
```
<div id='viewport'>
    <div id='content'>
        ... content ...
    </div>
</div>
```
Then all you have to do is create a new StyledScroll object:

    var styledScroll = new StyledScroll(document.getElementById('content'));

If you are finished with the object, make sure to clear it from memory:

    styledScroll.destroy();
    styledScroll = null;

    
The scrollbar will automatically update its dimensions and position with any changes to the scrollable region. However, changing a scrollbar's styling at runtime may require you to inform it that its position has changed:

    styledScroll.refresh();

##### Styling
Styled Scroll objects contain references to two divs that represent the scrollbar. The _track_ is the region that the scrollbar overlays and the _thumb_ is the indicator or handle that can be moved along the track in order to scroll. In order for them to appear you must specify their appearance in your css. For example, if you want something similar to Chrome's overlayed scroll bars you would use:
```
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
```
License (MIT)
=====================

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
