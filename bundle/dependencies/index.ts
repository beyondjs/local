import type {Bundle} from "../";

export default class extends Map<string, any> {
    #bundle: Bundle;

    constructor(bundle: Bundle) {
        super();
        this.#bundle = bundle;
    }

    update(deps?: [string, any][]) {
        this.clear();

        deps?.forEach(([specifier, dependency]) => {
            if (!dependency) {
                throw new Error(`Dependency "${specifier}" not found on package "${this.#bundle.vspecifier}"`);
            }

            const {__beyond_transversal: transversal} = dependency;
            dependency = transversal ? transversal.bundles.get(specifier) : dependency;
            this.set(specifier, dependency);
        });
    }
}
