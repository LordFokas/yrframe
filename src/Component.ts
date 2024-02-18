import { ComponentEvents } from "./ComponentEvents.js";
import { ComponentFactory } from "./ComponentFactory.js";
import { Attributes, specialAttributes } from "./utils.js";

const evt = Symbol('evt');

export class Component<A extends Attributes> extends HTMLElement {
    readonly [evt]: ComponentEvents;
	protected initialChildren = [] as (Node|string)[];
	private wasConnected = false;

    protected events(){
        return this[evt];
    }

    constructor(props:Partial<A>, defaults?:Partial<A>){
		super();
        this[evt] = new ComponentEvents(this);

        const all:Partial<A> = {};

        // Assign all defaults to object and overwrite with existing values in provided props
		if(defaults) Object.assign(all, defaults);
		if(props   ) Object.assign(all, props   );

        const attrs:Partial<A> = {};
		for(const [k, v] of Object.entries(all)){
			if(!specialAttributes.test(k)){
				(attrs as Attributes)[k] = v;
			}
		}

		ComponentFactory.setAttributesAndEvents(this, attrs);
    }

	/** Override HTMLElement */
	append(...nodes: (string | Node)[]): void {
		if(!this.wasConnected){
			this.initialChildren.push(...nodes);
		}
		super.append(...nodes);
	}

    /** Remove all children nodes. */
    clearChildren(){
		this.innerHTML = "";
	}

	isDisabled(){
		return this.hasAttribute("disabled");
	}

    /** HTML5 Custom Element lifecycle callback (remove from page) */
	disconnectedCallback(){
		this[evt].disconnect();
	}

    /** HTML5 Custom Element lifecycle callback (add to page) */
	connectedCallback(){
		this.wasConnected = true;
		this[evt].connect();
		this.redraw();
	}

    /** Draw this component's internals. Should return only children nodes. */
	render() : Node|string|(Node|string)[]|null {
		return this.initialChildren;
	}

    /** Redraw this component. Works by deleting all children, calling render() and appending the results. */
	redraw(){
		const child = this.render();
		this.clearChildren();
		if(child){
			if(Array.isArray(child)){
				ComponentFactory.appendChildren(this, ...child);
			}else{
				ComponentFactory.appendChildren(this, child);
			}
		}
		this.renderedCallback();
	}

    /** Called after redraw() to do special manipulation of children nodes. */
	renderedCallback(){}

    /** Get this component's real width in pixels. */
	width(){
		return parseFloat(getComputedStyle(this, null).width.replace("px", ""));
	}

    /** Get this component's real height in pixels. */
	height(){
		return parseFloat(getComputedStyle(this, null).height.replace("px", ""));
	}

	/** Shortcut to register this component with a given tag name */
    static register(tag: string){
		window.customElements.define(tag, this);
	}
}