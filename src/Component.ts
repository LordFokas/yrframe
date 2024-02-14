import { ComponentEvents } from "./ComponentEvents.js";
import { ComponentFactory } from "./ComponentFactory.js";
import { Attributes } from "./utils.js";

const evt = Symbol('evt');

export class Component<A extends Attributes> extends HTMLElement {
    /** Attribute Event Qualifier chars. Attributes starting with this are special. */
    static readonly AEQ = 'yr:';
    readonly [evt]: ComponentEvents;

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
			if(!k.startsWith(Component.AEQ)){
				(attrs as Attributes)[k] = v;
			}
		}

		ComponentFactory.setAttributesAndEvents(this, attrs);
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
		this[evt].connect();
		this.redraw();
	}

    /** Draw this component's internals. Should return only children nodes. */
	render() : HTMLElement|HTMLElement[]|string|null { return null; }

    /** Redraw this component. Works by deleting all children, calling render() and appending the results. */
	redraw(){
		const child = this.render();
		this.clearChildren();
		if(child){
			if(Array.isArray(child)){
				ComponentFactory.appendChildren(this, child);
			}else{
				ComponentFactory.appendChildren(this, [child] as any[]);
			}
		}
		this.inject();
	}

    /** Called after redraw() to do special manipulation of children nodes. */
	inject(){}

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