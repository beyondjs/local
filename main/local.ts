import './hmr';
import {bees} from './bees';
import {backends} from '@beyond-js/backend/client';

export /*bundle*/ const local = new class BeyondLocal {
    register(host: number) {
        backends.register('@beyond-js/inspect', `http://localhost:${host}`);
    }

    get bees() {
        return bees;
    }
}
