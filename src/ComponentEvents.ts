import { Event, EventBus, EventConsumer, EventListener } from '@lordfokas/event-bus'
import { Component } from './Component.js';
import { Class, Consumer, EventTarget, Source } from './utils.js';


type Value = object|string|number|boolean;
type Callback<T extends Event> = (this:Component<any>, value:T|Value|Value[], evt:T) => void;
type Optional = "optional";

class PersistentListener<T extends Event> extends EventListener<T>{
    readonly type: Class<T> & typeof Event;

    constructor(type: Class<T> & typeof Event, callback: EventConsumer<T>, nice?: number){
        super(callback, nice);
        this.type = type;
    }
}

/**
 * Event manager for component special functions.
 * A developer isn't meant to directly interface with this class,
 * except by calling Component.events()
 */
export class ComponentEvents {
    private listeners = [] as PersistentListener<any>[];
    private sources = {} as Record<string, Consumer<Callback<any>>>;
    private triggers = {} as Record<string, Callback<any>>;
    private readonly component: HTMLElement;
    private readonly owner: string;

    constructor(component: HTMLElement){
        this.component = component;
        this.owner = component.constructor.name;
    }

    /** Called by the component when entering DOM */
    connect(){
        this.listeners.forEach(l => EventBus.GLOBAL.subscribe(l.type, l));
    }

    /** Called by the component when leaving DOM */
    disconnect(){
        this.listeners.forEach(l => EventBus.GLOBAL.unsubscribe(l));
    }

    /** Set up and attach a listener, given a configuration  */
    private createListener <T extends Event, K1 extends keyof T>
    (target: EventTarget<T, K1>, name: string, handler:Callback<T>){
        const [type, path, nice] = target;
        this.listeners.push(
            new PersistentListener(type, event => {
                handler.call(this.component, event.traverse(...path as string[]), event);
            }, nice).named(name, this.owner)
        );
    }

    /** Enforce mandatory targets and skip missing optional ones. */
    private skip (target: EventTarget<any, any>, name: string, kind: string, optional?:Optional){
        if(!target){
            if(optional) return true;
            else throw new Error(`Missing config for mandatory ${kind} '${name}' at '${this.owner}'`);
        }
        return false;
    }

    /** Attach a generic listener for an event. */
    private attachListener <T extends Event, K1 extends keyof T>
    (target: EventTarget<T, K1>|undefined, handler:Callback<T>, name: string, kind: string, optional?:Optional){
        if(this.skip(target, name, kind, optional)) return;
        this.createListener(target, name, handler);
    }

    attachGeneric <T extends Event, K1 extends keyof T>
    (target: EventTarget<T, K1>|undefined, handler:Callback<T>, name: string, optional?:Optional){
        this.attachListener(target, handler, "generic listener", optional);
    }

    attachConsumer <T extends Event, K1 extends keyof T>
    (target: EventTarget<T, K1>|undefined, handler:Callback<T>, name: string, optional?:Optional){
        this.attachListener(target, handler, "consumer", optional);
    }

    /** Attach a listener that enriches the target event with data from this component. */
    attachSupplier <T extends Event, K1 extends keyof T>
    (target: EventTarget<T, K1>|undefined, source:Source<any>, name: string, optional?:Optional){
        if(this.skip(target, name, "supplier", optional)) return;
        const [type, path, nice] = target;
        this.listeners.push(
            new PersistentListener(type, event => {
                const path = target[1];
                const data = source.call(this);
                if(path.length == 0) event.with(data);
                else if(path.length == 1) event.with({ [path[0]] : data } as T);
                else if(path.length > 1) throw new Error("Unsupported path length > 1 for suppliers");
            }, nice).named(name, this.owner)
        );
    }

    /**
     * Attach a listener that removes data from an event if a predicate passes.
     * If the target configuration has no path, the whole event is stopped instead.
     */
    attachRemover <T extends Event, K1 extends keyof T>
    (target: EventTarget<T, K1>|undefined, predicate:Source<boolean>, name: string, optional?:Optional){
        if(this.skip(target, name, "remover", optional)) return;
        const [type, path, nice] = target;
        this.listeners.push(
            new PersistentListener(type, event => {
                const path = target[1];
                if(!predicate.call(this)) return;
                if(path.length == 0) event.stop(`Halted by '${name}' at '${this.owner}'`);
                else if(path.length == 1) delete event[path[0]];
                else if(path.length > 1) throw new Error("Unsupported path length > 1 for removers");
            }, nice).named(name, this.owner)
        );
    }

    /** Attach a listener that disables a component based on a boolean event field. */
    attachDisabler <T extends Event, K1 extends keyof T>
    (target: EventTarget<T, K1>|undefined, source:Source<HTMLElement>, name: string, optional?:Optional){
        if(this.skip(target, name, "disabler", optional)) return;
        this.createListener(target, name, (value, _) => {
            if(typeof value !== "boolean") return;
			const element = source.call(this);
			if(value){
				element.setAttribute("disabled", "");
			}else{
				element.removeAttribute("disabled");
			}
        });
    }

    /** Create a function that will fire an event and process data from it. */
    attachSource <T extends Event, K1 extends keyof T>
    (target: EventTarget<T, K1>|undefined, name: string, optional?:Optional){
        if(this.skip(target, name, "source", optional)) return;
        const [type, path] = target;
        this.sources[name] = (callback: Callback<T>) => {
            new type().publish().then(event => {
                callback.call(this.component, event.traverse(...path as string[]), event);
            });
        }
    }

    /** Create a fake source function that supplies a static or local value. */
    attachStatic(value: any, source: Source<any>, name: string, optional?:Optional){
        if(value === undefined){
            if(optional) return;
            else throw new Error(`Missing config for mandatory static '${name}' at '${this.owner}'`);
        }
        this.sources[name] = (callback: Callback<any>) => {
            callback.call(this.component, source.call(this.component), undefined);
        };
    }

    /** Fire a source function and process the returned data. */
    seek<T extends Event>(name: string, callback: Callback<T>){
        if(!this.sources[name]) callback.call(this.component, undefined, undefined);
        else this.sources[name].call(undefined, callback);
    }

    /** Create a function that will fire an event to export data. */
    attachTrigger <T extends Event, K1 extends keyof T>
    (target: EventTarget<T, K1>|undefined, name: string, optional?:Optional){
        if(this.skip(target, name, "trigger", optional)) return;
        const [type, path] = target;
        this.triggers[name] = (data: any, parent?: Event) => {
            const event = new type();
            if(parent) event.parent(parent);
            if(path.length == 0) event.with(data);
			if(path.length == 1) event.with({ [path[0]] : data } as T);
			if(path.length > 1) throw new Error("Unsupported path length > 1 for triggers");
			event.publish();
        };
    }

    /** Fire a trigger function with the given data. */
    fire(name: string, data: any = {}, parent?:Event){
        this.triggers[name].call(this.component, data, parent);
    }
}