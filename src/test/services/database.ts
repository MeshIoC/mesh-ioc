import { Logger } from './logger';

export class Database {
    @dep() logger!: Logger;

    connect() {
        this.logger.log('Connected to database');
    }

    disconnect() {
        this.logger.log('Disconnected from database');
    }
}
