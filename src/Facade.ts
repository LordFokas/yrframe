import { ComponentEvents } from "./ComponentEvents.js";
import { ComponentFactory } from "./ComponentFactory.js";
import { Attributes, Source } from "./utils.js";

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
    static readonly AEQ = 'yr:'; // TODO: centralize these
    protected readonly node: FacadeElement;
    protected readonly isCustom: boolean;

    protected events(){
        return this.node[evt];
    }

    constructor(tag: string, props:Partial<A>, defaults?:Partial<A>){
        const node = this.node = document.createElement(tag) as FacadeElement;
        const events = node[evt] = new ComponentEvents(node);
        this.isCustom = tag.includes('-');

        // Attach to existing lifecycle callbacks.
        if(this.isCustom){
            const { connectedCallback, disconnectedCallback } = node;
            node.connectedCallback = () => {
                events.connect();
                return connectedCallback?.call(node);
            }
            node.disconnectedCallback = () => {
                events.disconnect();
                return disconnectedCallback?.call(node);
            }
        }else{ // TODO: rethink this, there's clearly use cases for it.
            throw new Error(`Facade for native element '${tag}' cannot hook to lifecycle calls.`);
        }

        const all:Partial<A> = {};

        // Assign all defaults to object and overwrite with existing values in provided props
		if(defaults) Object.assign(all, defaults);
		if(props   ) Object.assign(all, props   );

        const attrs:Partial<A> = {};
		for(const [k, v] of Object.entries(all)){
			if(!k.startsWith(Facade.AEQ)){
				(attrs as Attributes)[k] = v;
			}
		}

		ComponentFactory.setAttributesAndEvents(node, attrs);
    }

    content(){
        return this.node;
    }
}