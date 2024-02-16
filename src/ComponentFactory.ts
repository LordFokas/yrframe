import { Component } from "./Component.js";
import { Facade } from "./Facade.js";
import { Attributes, Class } from "./utils.js";

/**
 * JSX / TSX component factory.
 * Should not be invoked manually, is used by TSC when building the project.
 */
export class ComponentFactory {
    static make(tag:string, props:object, ...children:any[]) : HTMLElement;
	static make<A extends Attributes>(tag:Class<Component<A>>, props:A, ...children:any[]) : HTMLElement;
    static make(tag:any, props:any, ...children:HTMLElement[]) : HTMLElement|HTMLElement[] {
		if(tag === Array) return children; // Allow returning multiple elements from render()
		
		// Initialize Element
		let element:HTMLElement;
		if(typeof tag === 'function'){ // Construct class based components
			if(tag.prototype instanceof Facade){
				element = new (tag as Class<Facade<any>>)(props ?? {}).content();
			}else{
				element = new tag(props ?? {});
			}
		}else{ // Construct vanilla HTML tag
			element = document.createElement(tag);
			this.setAttributesAndEvents(element, props);
		}

		// Append children if any
		if(children && children.length > 0){
			this.appendChildren(element, ...children);
		}

		return element;
	}

	/** Apply vanilla HTML attributes and event callback functions. There is no component level logic here. */
	static setAttributesAndEvents(element:HTMLElement, props:any){
		if(props) for(const key in props){
			const value = props[key];
			if(value === undefined) continue; // Skip empty prop
			if(typeof value === "function"){ // Set vanilla HTML event callback function
				(element as any as Record<string, Function>)[key] = value;
			}else{
				element.setAttribute(key, value);
			}
		}
	}

	/** Logic for appending children to a parent element according to the possible returns of render() */
	static appendChildren(element:HTMLElement, ...children:(string|Node)[]){
		for(const child of children){
			// Allow returning null from render() when there is nothing to do
			if(child === null) continue;

			// Disallow returning undefined to prevent mistakes being ignored. No-ops must explicitely return null.
			if(child === undefined) throw new Error("An element's child cannot be undefined");

			if(Array.isArray(child)){  // Allow returning multiple elements from render()
				this.appendChildren(element, child);
			}else{
				element.append(child);
			}
		}
	}
}

/**
 * ## Here be Shenanigans
 * In the event your TSC refuses to find ComponentFactory.make
 * and insists on using React.createElement, fear not:
 * 
 * Just `import { FakeReact as React }` and call it a day.
 * 
 * At least until you can be arsed to figure it out...
 * `¯\_(ツ)_/¯`
 */
export class FakeReact {
	static createElement = ComponentFactory.make;
}