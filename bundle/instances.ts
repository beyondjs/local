import type {Bundle} from "./";

export /*bundle*/ const instances = new class extends Map {
    register(bundle: Bundle) {
        this.set(bundle.vspecifier, bundle);
    }
}
