
export interface ComponentLogic {
    /** Remove all children nodes. */
    clearChildren() : void

	isDisabled(): boolean

    /** HTML5 Custom Element lifecycle callback (remove from page) */
    disconnectedCallback() : void;

    /** HTML5 Custom Element lifecycle callback (add to page) */
    connectedCallback() : void

    /** Draw this component's internals. Should return only children nodes. */
    render() : Node|string|(Node|string)[]|null

    /** Redraw this component. Works by deleting all children, calling render() and appending the results. */
    redraw() : void

    /** Called after redraw() to do special manipulation of children nodes. */
    renderedCallback() : void
}