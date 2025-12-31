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
 * @property {number} draggingThreshold Global delta threshold (of the mousedown) to "pretend" a drag event. Default is 10
 * @property {("x" | "y" | "xy") | undefined} drag Draggability of this window.
 * 
 * @property {("x" | "y" | "xy") | undefined} resize Resizability of the window.
 * @property {string | undefined} resizeCursorClass Global class prefix for a `cursor: resize-{dir}` css.
 * @property {number | undefined} resizePointEdgeSize Resize point size in pixels. If this is less than zero and the window is resizable this is error.
 * @property {number | undefined} resizePointCornerSize Resize point size in pixels.
 * 
 * @property {number | undefined} resizeMinWidth If unset, is set to 100
 * @property {number | undefined} resizeMinHeight If unset, is set to 50
 * @property {number | undefined} resizeMaxWidth If unset, is infinite
 * @property {number | undefined} resizeMaxHeight If unset, is infinite
 */

/**
 * @typedef {"n" | "e" | "s" | "w"} TEdges
 */
/**
 * @typedef {"nw" | "ne" | "se" | "sw"} TCorners
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
        draggingThreshold: 10,

        resize: "xy",
        resizeCursorClass: "cursor-resize",
        resizePointEdgeSize: 8,
        resizePointCornerSize: 12,

        resizeMinWidth: 100,
        resizeMinHeight: 50
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
            return point.x >= rect.x && 
                point.x <= rect.x + rect.width && 
                point.y >= rect.y && 
                point.y <= rect.y + rect.height;
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
        },

        /**
         * @template T
         * @param {T} obj
         * @returns {T}
         */
        shallowClone: (obj) => {
            if (!obj) {
                return obj;
            }

            const result = {};
            for (const [k, v] of Object.entries(obj)) {
                result[k] = v;
            }

            return result;
        }
    });

    /**
     * Get window/cursor state depending on the cursor data. 
     * 
     * @param {{ x: number, y: number }} cursor
     * 
     * @returns {{ corner: TCorners | null, edge: TEdges | null, inDragZone: boolean }}
     */
    getWindowCursorState(cursor, checkEdgesX = true, checkEdgesY = true, checkCorners = true) {
        if (!this.window) {
            throw new Error("[FakeWindow::getWindowCursorState] Cannot get cursor state from unavailable or closed window.");
        }

        const _config = this._config;
        const result = {
            corner: null,
            edge: null,
            inDragZone: FakeWindow.util.includes(this.titlebar.getBoundingClientRect(), cursor),
        };

        const windowRect = this.window.getBoundingClientRect();
        /** @type {Record<string, DOMRect> | null} */
        const corners = !!checkCorners ? {
            nw: {
                x: windowRect.x, y: windowRect.y,
                width: _config.resizePointCornerSize, height: _config.resizePointCornerSize
            },
            ne: { 
                x: windowRect.x + windowRect.width - _config.resizePointCornerSize, y: windowRect.y,
                width: _config.resizePointCornerSize, height: _config.resizePointCornerSize
            },
            se: {
                x: windowRect.x + windowRect.width - _config.resizePointCornerSize, y: windowRect.y + windowRect.height - _config.resizePointCornerSize,
                width: _config.resizePointCornerSize, height: _config.resizePointCornerSize
            },
            sw: {
                x: windowRect.x, y: windowRect.y + windowRect.height - _config.resizePointCornerSize,
                width: _config.resizePointCornerSize, height: _config.resizePointCornerSize
            },
        } : null;
        /** @type {Record<string, DOMRect | null>} */
        const edges = !!checkEdgesX || !!checkEdgesY ? { 
            w: !!checkEdgesX ? { // left
                x: windowRect.x, y: windowRect.y + _config.resizePointCornerSize,
                width: _config.resizePointEdgeSize, height: windowRect.height - (_config.resizePointCornerSize * 2)
            } : null,
            n: !!checkEdgesY ? { // top
                x: windowRect.x + _config.resizePointCornerSize, y: windowRect.y,
                width: windowRect.width - (_config.resizePointCornerSize * 2), height: _config.resizePointEdgeSize
            } : null,
            e: !!checkEdgesX ? { // right
                x: windowRect.x + windowRect.width - _config.resizePointEdgeSize,
                y: windowRect.y + _config.resizePointCornerSize,
                width: _config.resizePointEdgeSize,
                height: windowRect.height - (_config.resizePointCornerSize * 2)
            } : null,
            s: !!checkEdgesY ? { // bottom
                x: windowRect.x + _config.resizePointCornerSize,
                y: windowRect.y + windowRect.height - _config.resizePointEdgeSize,
                width: windowRect.width - (_config.resizePointCornerSize * 2),
                height: _config.resizePointEdgeSize
            } : null
        } : null;
        // Corners
        if (corners) {
            for (const [k, rect] of Object.entries(corners)) {
                if (FakeWindow.util.includes(rect, cursor)) {
                    result.corner = k;
                    break;
                }
            }
        }
        // Edge
        if (edges) {
            for (const [k, edge] of Object.entries(edges)) {
                if (!edge) {
                    continue;
                }
                if (FakeWindow.util.includes(edge, cursor)) {
                    result.edge = k;
                    break;
                }
            }
        }

        return result;
    }

    /**
     * Closes this window (removing the primary elem)
     * 
     * After closing a window, it can't be reused.
     */
    close() {
        if (!this.window) {
            throw new Error("[FakeWindow::close] Cannot close unavailable or already closed window.");
        }

        this.window.remove();
        this.window = null;

        document.removeEventListener("mouseup", _onMouseUp);
    }

    /**
     * Clears the mouse state of this window.
     * @param {MouseEvent} e
     */
    _onMouseUp(e) {
        if (this._state) {
            e.preventDefault();
            this._state = null;
        }
    }

    /**
     * Create a fake window.
     * 
     * @param {HTMLElement} windowElem Primary window element.
     * @param {FakeWindowConfig} config
     */
    constructor(windowElem, config = FakeWindow.util.shallowClone(FakeWindow.ConfigDefaults)) {
        this._config = config;

        this._config.resize = this._config.resize?.toLowerCase();
        FakeWindow.util.assert(!this._config.resize || (this._config.resize.length <= 2 && FakeWindow.util.all(this._config.resize, (ch) => /[xy]/i.test(ch)) && !!this._config.resizeCursorClass && this._config.resizePointCornerSize > 0 && this._config.resizePointEdgeSize > 0), "[window::FakeWindow] invalid resize setup, drag string should only contain X and Y, resizePointSize should be >0 and resizeCursorClass should be available if resize is available");
        this._config.drag = this._config.drag?.toLowerCase();
        FakeWindow.util.assert(!this._config.drag || (this._config.drag.length <= 2 && FakeWindow.util.all(this._config.drag, (ch) => /[xy]/i.test(ch))), "[window::FakeWindow] invalid drag setup, drag string should only contain X and Y.");
        if (this._config.draggingThreshold <= 10 || typeof this._config.draggingThreshold !== "number") {
            this._config.draggingThreshold = FakeWindow.ConfigDefaults.draggingThreshold;
        }

        this.window = FakeWindow.util.assert(windowElem, "[window::FakeWindow] No window, a predetermined window div is required.");
        this.titlebar = FakeWindow.util.assert(windowElem.querySelector(`.${config.elementClassPrefix + config.titlebarClass}`), "[window::FakeWindow] No titlebar");
        this.titlebarText = windowElem.querySelector(`.${config.elementClassPrefix + config.titlebarTextClass}`);

        this.titlebarMinimize = windowElem.querySelector(`.${config.elementClassPrefix + config.titlebarMinimizeClass}`);
        this.titlebarMaximize = windowElem.querySelector(`.${config.elementClassPrefix + config.titlebarMaximizeClass}`);
        this.titlebarClose = FakeWindow.util.assert(windowElem.querySelector(`.${config.elementClassPrefix + config.titlebarCloseClass}`), "[window::FakeWindow] No titlebar close (yes close is required)");
    
        this.content = FakeWindow.util.assert(windowElem.querySelector(`.${config.elementClassPrefix + config.contentClass}`), "[window::FakeWindow] No content");

        /** @type {{ name: "move" | "resize", params: TCorners | TEdges | null } | null} */
        this._state = null;
        /** @type {string | null} */
        this._cursorHoverState = null;
        this._cursorState = { mouseDown: false, downCoord: { x:0, y:0 } };
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
            const resizeX = eventConf.resize?.includes("x");
            const resizeY = eventConf.resize?.includes("y");
            const resizeBoth = resizeX && resizeY;

            const cursorState = eventThis.getWindowCursorState(e, resizeX, resizeY, resizeBoth);
            const cursorStateClassPostfix = cursorState.edge || cursorState.corner;
            if (cursorStateClassPostfix) {
                const targetClass = `${eventConf.resizeCursorClass}-${cursorStateClassPostfix}`;

                if (!eventThis.window.classList.contains(targetClass)) {
                    eventThis.window.classList.add(targetClass);
                    if (eventThis._cursorHoverState) {
                        eventThis.window.classList.remove(eventThis._cursorHoverState);
                    }
                    eventThis._cursorHoverState = targetClass;
                }

                return;
            }

            if (eventThis._cursorHoverState) {
                eventThis.window.classList.remove(eventThis._cursorHoverState)
                eventThis._cursorHoverState = null;
            }
        });

        windowElem.addEventListener("mousedown", (e) => {

        });
        windowElem.addEventListener("mouseup", this._onMouseUp);
        document.addEventListener("mouseup", this._onMouseUp);

        // TODO : Same drag but with "mouse" events because HTML bruh
        // windowElem.addEventListener("dragstart", (e) => {
        //     const resizeX = eventConf.resize?.includes("x");
        //     const resizeY = eventConf.resize?.includes("y");
        //     const resizeBoth = resizeX && resizeY;

        //     const cursorState = eventThis.getWindowCursorState(e, resizeX, resizeY, resizeBoth);
        //     // Corner resizing is prioritized, then comes dragging
        //     const resizeState = cursorState.corner || cursorState.edge;
        //     if (resizeState) {
        //         e.preventDefault();
        //         eventThis._state = { name: "resize", params: resizeState };
        //     }
        //     if (cursorState.inDragZone) {
        //         e.preventDefault();
        //         eventThis._state = { name: "move" };
        //     }
        // });
        // windowElem.addEventListener("drag", (e) => {
        //     if (eventThis._state) {
        //         switch (eventThis._state.name) {
        //             case "move": {
        //                 e.preventDefault();
        //                 eventThis.window.style.left = e.x;
        //                 eventThis.window.style.top = e.y;
        //                 break;
        //             }
        //             case "resize": {
        //                 // TODO : This should "accumulatively resize"?
        //                 e.preventDefault();
        //                 break;
        //             }

        //             default: { break; }
        //         }
        //     }
        // });
        // windowElem.addEventListener("dragend", (e) => {
        //     if (eventThis._state) {
        //         e.preventDefault();
        //         eventThis._state = null;
        //     }
        // });
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
