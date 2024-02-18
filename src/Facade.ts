import { ComponentEvents } from "./ComponentEvents.js";
import { ComponentFactory } from "./ComponentFactory.js";
import { Attributes, Source, specialAttributes } from "./utils.js";

const evt = Symbol('evt');

interface EventHost{ [evt]: ComponentEvents }
type FacadeElement = HTMLElement & EventHost & {
    connectedCallback: Source<void>,
    disconnectedCallback: Source<void>
};

/**
 * Fake component that constructs and returns another component instead.
 * Used for aliasing and adapting components from other libraries.
 */
export class Facade<A extends Attributes>{
    protected readonly node: FacadeElement;
    protected readonly isCustom: boolean;

    protected events(){
        if(!this.node[evt]){ // Lazily instantiate event manager
            this.node[evt] = new ComponentEvents(this.node);
        }
        return this.node[evt];
    }

    constructor(tag: string, props:Partial<A>, defaults?:Partial<A>){
        const node = this.node = document.createElement(tag) as FacadeElement;
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

    content(){
        // Dispose of unused event manager
        if(this.node[evt]?.isEmpty()){
            delete this.node[evt];
        }
        return this.node;
    }
}

(function FacadeMutationObserver(){
    new MutationObserver((records) => {
        for(const record of records){
            for(const added of record.addedNodes){
                if(added instanceof HTMLElement){
                    (added as any)[evt]?.connect();
                }
            }
            for(const removed of record.removedNodes){
                if(removed instanceof HTMLElement){
                    (removed as any)[evt]?.disconnect();
                }
            }
        }
    }).observe(document.body, {subtree: true, childList: true});
})();