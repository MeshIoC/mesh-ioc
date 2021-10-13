export abstract class Logger {
    abstract log(message: string): void;
}

export class StandardLogger extends Logger {
    log(message: string) {
        console.info(message);
    }
}

export class TestLogger extends Logger {
    messages: string[] = [];

    log(message: string) {
        this.messages.push(message);
    }
}
