/** @summary Registers a "class/constructor" that allows for creation of a dynamically moveable window with status bar buttons. */

/**
 * @typedef {Object} FakeWindowConfig
 * @property {string} windowClass Class "full name" for the primary window.
 * @property {string} elementClassPrefix Prefix for the element class.
 * 
 * @property {string} titlebarClass Postfix for the "elementClassPrefix" for the given target element.
 * @property {string} titlebarTextClass Postfix for the "elementClassPrefix" for the given target element.
 * @property {string} titlebarMinimizeClass Postfix for the "elementClassPrefix" for the given target element.
 * @property {string} titlebarMaximizeClass Postfix for the "elementClassPrefix" for the given target element.
 * @property {string} titlebarCloseClass Postfix for the "elementClassPrefix" for the given target element.
 * @property {string} contentClass Postfix for the "elementClassPrefix" for the given target element.
 * 
 * @property {("x" | "y" | "xy") | undefined} drag Draggability of this window.
 * 
 * @property {("x" | "y" | "xy") | undefined} resize Resizability of the window.
 * @property {string | undefined} resizeCursorClass Global class prefix for a `cursor: resize-{dir}` css.
 * @property {number | undefined} resizePointEdgeSize Resize point size in pixels. If this is less than zero and the window is resizable this is error.
 * @property {number | undefined} resizePointCornerSize Resize point size in pixels.
 */

class FakeWindow {
    /** @type {Readonly<FakeWindowConfig>} */
    static ConfigDefaults = Object.freeze({
        windowClass: "blurred window",
        elementClassPrefix: "window",

        titlebarClass: "-titlebar",
        titlebarTextClass: "-title",
        titlebarMinimizeClass: "-minimize",
        titlebarMaximizeClass: "-maximize",
        titlebarCloseClass: "-close",
        contentClass: "-content",

        drag: "xy",

        resize: "xy",
        resizeCursorClass: "cursor-resize",
        resizePointEdgeSize: 8,
        resizePointCornerSize: 12,
    });

    static util = Object.freeze({
        /**
         * Passthrough assertion of not being falsy.
         * 
         * @template T
         * @param {T} obj 
         * @param {string | null} msg
         * @returns {T}
         */
        assert: (obj, msg = null) => {
            if (!obj) {
                throw new Error(msg ?? "[FakeWindow::util::assert] No message given.");
            }
    
            return obj;
        },
        /**
         * Assert all of the elements of the array like validates.
         * 
         * @template T
         * @param {ArrayLike<T>} arrayLike 
         * @param {(val: T) => boolean} pred 
         */
        all: (arrayLike, pred) => {
            for (let i = 0; i < arrayLike.length; i++) {
                if (!pred(arrayLike[i])) {
                    return false;
                }
            }
    
            return true;
        },

        /**
         * Check if rect includes point.
         *
         * @param {DOMRect} rect
         * @param {{ x:number, y:number }} point 
         * 
         * @returns {boolean}
         */
        includes: (rect, point) => {
            return (point.x >= rect.x && point.x <= (rect.x + rect.width) && point.y <= rect.y && point.y >= (rect.y + rect.height));
        },
        /**
         * Check if 2 rects collide.
         * 
         * @param {DOMRect} rect1 
         * @param {DOMRect} rect2 
         * 
         * @returns {boolean}
         */
        collides: (rect1, rect2) => {
            return rect1.x < rect2.x + rect2.width &&
                rect1.x + rect1.width > rect2.x &&
                rect1.y < rect2.y + rect2.height &&
                rect1.y + rect1.height > rect2.y;
        }
    });

    /**
     * Create a fake window.
     * 
     * @param {HTMLElement} windowElem Primary window element.
     * @param {FakeWindowConfig} config
     */
    constructor(windowElem, config = FakeWindow.ConfigDefaults) {
        this._config = config;

        this._config.resize = this._config.resize?.toLowerCase();
        FakeWindow.util.assert(!this._config.resize || (this._config.resize.length <= 2 && FakeWindow.util.all(this._config.resize, (ch) => /[xy]/i.test(ch)) && !!this._config.resizeCursorClass && this._config.resizePointCornerSize > 0 && this._config.resizePointEdgeSize > 0), "[window::FakeWindow] invalid resize setup, drag string should only contain X and Y, resizePointSize should be >0 and resizeCursorClass should be available if resize is available");
        this._config.drag = this._config.drag?.toLowerCase();
        FakeWindow.util.assert(!this._config.drag || (this._config.drag.length <= 2 && FakeWindow.util.all(this._config.drag, (ch) => /[xy]/i.test(ch))), "[window::FakeWindow] invalid drag setup, drag string should only contain X and Y.");

        this.window = FakeWindow.util.assert(windowElem, "[window::FakeWindow] No window, a predetermined window div is required.");
        this.titlebar = FakeWindow.util.assert(windowElem.querySelector(config.elementClassPrefix + config.titlebarClass), "[window::FakeWindow] No titlebar");
        this.titlebarText = windowElem.querySelector(config.elementClassPrefix + config.titlebarTextClass);

        this.titlebarMinimize = windowElem.querySelector(config.elementClassPrefix + config.titlebarMinimizeClass);
        this.titlebarMaximize = windowElem.querySelector(config.elementClassPrefix + config.titlebarMaximizeClass);
        this.titlebarClose = FakeWindow.util.assert(windowElem.querySelector(config.elementClassPrefix + config.titlebarCloseClass), "[window::FakeWindow] No titlebar close");
    
        this.content = FakeWindow.util.assert(windowElem.querySelector(config.elementClassPrefix + config.contentClass), "[window::FakeWindow] No content");

        /** @type {"drag" | "resize" | null} */
        this._state = null;
        /** @type {string | null} */
        this._cursorState = null;
        const eventThis = this;
        const eventConf = this._config;
        
        // Add event listeners for resizing/general window crap.
        windowElem.addEventListener("mousemove", (e) => {
            // what if WndProc but 100000x slower?
            // Set cursor state depending on what the user do

            // Check if within a limit button
            if (e.target === this.titlebarMinimize || e.target === this.titlebarMaximize || e.target === this.titlebarClose) {
                return;
            }
            
            // Check if within an edge or corner
            const windowRect = windowElem.getBoundingClientRect();
            /** @type {Record<string, DOMRect>} */
            const corners = {
                nw: {
                    x: windowRect.x, y: windowRect.y,
                    width: eventConf.resizePointCornerSize, height: eventConf.resizePointCornerSize
                },
                ne: { 
                    x: windowRect.x + windowRect.width - eventConf.resizePointCornerSize, y: windowRect.y,
                    width: eventConf.resizePointCornerSize, height: eventConf.resizePointCornerSize
                },
                se: {
                    x: windowRect.x, y: windowRect.y + windowRect.height - eventConf.resizePointCornerSize,
                    width: eventConf.resizePointCornerSize, height: eventConf.resizePointCornerSize
                },
                sw: {
                    x: windowRect.x + windowRect.width - eventConf.resizePointCornerSize, y: windowRect.y + windowRect.height - eventConf.resizePointCornerSize,
                    width: eventConf.resizePointCornerSize, height: eventConf.resizePointCornerSize
                },
            };
            /** @type {Record<string, DOMRect>} */
            const edges = { 
                w: {
                    x: windowRect.x, y: windowRect.y + eventConf.resizePointCornerSize,
                    width: eventConf.resizePointEdgeSize, height: windowRect.height - (eventConf.resizePointCornerSize * 2)
                },
                n: {
                    x: windowRect.x + eventConf.resizePointCornerSize, y: windowRect.y,
                    width: windowRect.width - (eventConf.resizePointCornerSize * 2), height: eventConf.resizePointEdgeSize
                },
                e: {
                    x: windowRect.x + windowRect.width, y: windowRect.y + eventConf.resizePointCornerSize,
                    width: eventConf.resizePointEdgeSize, height: windowRect.height - (eventConf.resizePointCornerSize * 2)
                },
                s: {
                    x: windowRect.x + eventConf.resizePointCornerSize, y: windowRect.y + windowRect.height,
                    width: windowRect.width - (eventConf.resizePointCornerSize * 2), height: eventConf.resizePointEdgeSize
                }
            };
            // Corners
            for (const [k, rect] of Object.entries(corners)) {
                if (FakeWindow.util.includes(rect, e)) {
                    const targetClass = `${resizeCursorClass}-${k}`;
                    if (!windowElem.classList.contains(targetClass)) {
                        windowElem.classList.add(targetClass);
                    }
                    return;
                }
            }
            // Edge
            for (const [k, edge] of Object.entries(edges)) {
                if (FakeWindow.util.includes(edge, e)) {
                    const targetClass = `${resizeCursorClass}-${k}`;
                    if (!windowElem.classList.contains(targetClass)) {
                        windowElem.classList.add(targetClass);
                    }
                    return;
                }
            }
        });
        windowElem.addEventListener("dragstart", (e) => {
            // dragging core
            const draggableX = eventConf.drag?.includes("x");
            const draggableY = eventConf.drag?.includes("y");
            if (draggableX || draggableY) {
                const clientRect = this.titlebar.getBoundingClientRect();
                if (FakeWindow.util.includes(clientRect, e)) {
                    // Begin dragging, if this isn't a button.
                    return;
                }
            }
            
            // resizing core
            const resizableX = eventConf.resize?.includes("x");
            const resizableY = eventConf.resize?.includes("y");
            if (e.x) {

            }
        });
        windowElem.addEventListener("drag", (e) => {

        });
        windowElem.addEventListener("dragend", (e) => {
            if (eventThis._state) {
                e.preventDefault();
                eventThis._state = null;
            }
        });
    }

    /**
     * Create a fake window (without an HTMLElement to piggyback from)
     * 
     * @param {FakeWindowConfig} config
     * @param {HTMLElement} parentElem
     */
    static Create(config = FakeWindow.ConfigDefaults, parentElem = null) {
        if (!(parentElem instanceof Element)) {
            parentElem = document.body;
        }

        const windowNode = document.createElement("div");
        windowNode.classList.add(config.windowClass.split(/\s+/g));
        parentElem.appendChild(windowNode);

        return new FakeWindow(windowNode, config);
    }
}
