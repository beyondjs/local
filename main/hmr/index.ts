import {instances as bundles} from '@beyond-js/kernel/bundle';
import {backends} from '@beyond-js/backend/client';
import {Socket} from "socket.io-client";

interface BImport {
    (resource: string, version?: number): Promise<any>,

    mode: string
}

declare const bimport: BImport;

interface HMRMessage {
    vspecifier: string,
    distribution: number,
    language: string,
    extname: string
}

export default class {
    #changes: Map<string, number> = new Map();

    async #js(vspecifier: string, language: string) {
        if (!bundles.has(vspecifier)) return;
        const pkg = bundles.get(vspecifier).package(language !== '.' ? language : '');

        const change = (() => {
            !this.#changes.has(vspecifier) && this.#changes.set(vspecifier, 0);
            const change = this.#changes.get(vspecifier);
            this.#changes.set(vspecifier, change + 1);
            return change;
        })();

        try {
            await bimport(`${pkg.vspecifier}?hmr=${change}`, change);
        } catch (exc) {
            console.log(`Error loading hmr of bundle "${pkg.bundle.id}"`, exc.stack);
        }
    }

    async #css(vspecifier: string) {
        if (typeof location !== 'object') return;

        const {styles} = await bimport('@beyond-js/kernel/styles');
        if (!styles.has(vspecifier)) return;
        (styles.get(vspecifier)).change();
    }

    async #onchange({vspecifier, language, extname}: HMRMessage) {
        if (extname === '.js') return await this.#js(vspecifier, language);
        if (extname === '.css') return await this.#css(vspecifier);
    }

    #subscribe = async () => {
        const backend = await backends.get('@beyond-js/local');
        const socket: Socket = await backend.socket;
        socket.on('bundle/change', message =>
            this.#onchange(message).catch(exc => console.log(exc.stack)));
    }

    constructor() {
        this.#subscribe().catch(exc => console.error(exc.stack));
    }
}
