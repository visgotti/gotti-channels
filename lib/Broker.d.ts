export declare class Broker {
    private routerSocket;
    /**
     * @param {string} routerURI - URI string for the brokers router
     * @param {int} id - Unique identifier of the broker.
     */
    constructor(routerURI: any, id: any);
    private registerRouterMessages;
    close(): void;
}
