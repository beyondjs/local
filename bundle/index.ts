import {IMCreators, InternalModules} from './ims';
import {Require} from './ims/require';
import Exports from './exports';
import Dependencies from './dependencies';
import {instances} from "./instances";
import {Events} from "./events";

export /*bundle*/
interface IBundleSpecs {
    vspecifier: string
}

export /*bundle*/
class Bundle {
    readonly #vspecifier: string;
    get vspecifier() {
        return this.#vspecifier;
    }

    readonly #require: Require;

    readonly #ims: InternalModules;
    get ims() {
        return this.#ims;
    }

    readonly #exports: Exports;
    get exports() {
        return this.#exports;
    }

    readonly #dependencies = new Dependencies(this);
    get dependencies() {
        return this.#dependencies;
    }

    readonly #hmr = new Events();
    get hmr() {
        return this.#hmr;
    }

    #initialised = false;
    get initialised() {
        return this.#initialised;
    }

    constructor(specs: IBundleSpecs) {
        if (typeof specs !== 'object') throw new Error('Bundle creation specification is not defined');

        const {vspecifier} = specs;
        if (!vspecifier) throw new Error('Invalid bundle creation specification');

        this.#vspecifier = vspecifier;
        this.#ims = new InternalModules(this);
        this.#require = new Require(this);
        this.#ims._require = this.#require;
        this.#exports = new Exports(this.#require);

        instances.register(this);
    }

    initialise(ims?: IMCreators) {
        if (this.#initialised) throw new Error('Package already initialised');
        this.#initialised = true;
        ims && this.#ims.register(ims);
        this.exports.update();
        this.#ims.initialise();
    }

    update(ims: IMCreators) {
        this.#ims.update(ims);
        this.exports.update();
        this.#ims.initialise();
        this.#hmr.trigger('change');
    }
}
