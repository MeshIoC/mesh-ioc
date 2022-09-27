import { dep } from '../../main/index.js';
import { Logger } from './logger.js';

export class Database {
    @dep() logger!: Logger;

    connect() {
        this.logger.log('Connected to database');
    }

    disconnect() {
        this.logger.log('Disconnected from database');
    }
}
