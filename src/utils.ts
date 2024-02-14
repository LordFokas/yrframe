import { Event } from "@lordfokas/event-bus";

export type Class<X> = { new (...$:any[]) : X }
export type EventTarget<T extends Event, K1 extends keyof T> = [Class<T> & typeof Event, []|[K1]|[K1, keyof T[K1]], number];
export type Attributes = { [key:string]: EventTarget<any, any> | string | Function | undefined; }
export type Consumer<T> = (t:T) => void;
export type Source<T> = () => T;

export function has($:any){
	return $ !== undefined;
}