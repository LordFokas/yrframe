import { ComponentEvents, symbol as evt } from "./ComponentEvents.js";
import { ComponentFactory } from "./ComponentFactory.js";
import { ComponentLogic } from "./ComponentLogic.js";
import { Attributes, specialAttributes } from "./utils.js";

const fcl = Symbol('fcl');

type FacadeElement = HTMLElement & {
    [evt]?: ComponentEvents
    [fcl]: Facade<any>
};

/**
 * Fake component that constructs and returns another component instead.
 * Used for aliasing and adapting components from other libraries.
 */
export class Facade<A extends Attributes> implements ComponentLogic {
    protected readonly node: FacadeElement;
    protected readonly isCustom: boolean;
    protected initialChildren = [] as (Node|string)[];
    protected wasConnected = false;

    protected events(){
        if(!this.node[evt]){ // Lazily instantiate event manager
            this.node[evt] = new ComponentEvents(this.node);
        }
        return this.node[evt];
    }

    constructor(tag: string, props:Partial<A>, defaults?:Partial<A>){
        const node = this.node = document.createElement(tag) as FacadeElement;
        node[fcl] = this;
        this.isCustom = tag.includes('-');

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

		ComponentFactory.setAttributesAndEvents(node, attrs);
    }

    /** Remove all children nodes. */
    clearChildren(){
		this.node.innerHTML = "";
	}

	isDisabled(){
		return this.node.hasAttribute("disabled");
	}

    /** HTML5 Custom Element lifecycle callback (remove from page) */
    disconnectedCallback(){
        this.node[evt]?.disconnect();
    }

    /** HTML5 Custom Element lifecycle callback (add to page) */
    connectedCallback(){
        this.wasConnected = true;
        this.node[evt]?.connect();
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
                ComponentFactory.appendChildren(this.node, ...child);
            }else{
                ComponentFactory.appendChildren(this.node, child);
            }
        }
        this.renderedCallback();
    }

    /** Called after redraw() to do special manipulation of children nodes. */
    renderedCallback(){}

    content(){
        // Dispose of unused event manager
        if(this.node[evt]?.isEmpty()){
            delete this.node[evt];
        }
        return this.node;
    }

    setInitialChildren(children: (Node|string)[]){
        this.initialChildren = children;
    }
}

function traverseHTML(node:any, fn:(node:FacadeElement) => void) {
    if(node instanceof HTMLElement){
        fn(node as FacadeElement);
        for(const child of node.children){
            traverseHTML(child, fn);
        }
    }
}

(function FacadeMutationObserver(){
    new MutationObserver((records) => {
        for(const record of records){
            for(const added of record.addedNodes){
                traverseHTML(added, (node) => node[fcl]?.connectedCallback());
            }
            for(const removed of record.removedNodes){
                traverseHTML(removed, (node) => node[fcl]?.disconnectedCallback());
            }
        }
    }).observe(document.body, {subtree: true, attributes: false, childList: true});
})();