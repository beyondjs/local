import type {Bundle} from '../..';
import type {InternalModule} from '../im';
import {Trace} from './trace';
import {resolve} from './resolve';

export class Require {
    readonly #bundle: Bundle;
    get bundle() {
        return this.#bundle;
    }

    constructor(bundle: Bundle) {
        this.#bundle = bundle;
    }

    /**
     * Solve a cjs require function
     *
     * @param {string} specifier The id of the internal module being required
     * @param {Trace} trace {object} The internal trace to find cyclical dependencies of internal modules
     * @param {InternalModule=} im The internal module that is making the call
     * @return {*}
     */
    solve(specifier: string, trace: Trace, im?: InternalModule): any {
        /**
         * Relative require (internal module)
         */
        if (specifier.startsWith('.')) {
            specifier = im ? resolve(im.id, specifier) : specifier;
            return this.#bundle.ims.require(specifier, trace, im);
        }

        const {dependencies} = this.#bundle;
        if (dependencies.has(specifier)) return dependencies.get(specifier);

        const keys = JSON.stringify([...dependencies.keys()]);
        throw new Error(`Bundle "${specifier}" is not registered as a dependency: ${keys}`);
    }
}
