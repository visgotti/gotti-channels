"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zmq = require("zeromq");
const Serializers_1 = require("../Serializers");
var CREATED_OR_ADDED;
(function (CREATED_OR_ADDED) {
    CREATED_OR_ADDED["CREATED"] = "CREATED";
    CREATED_OR_ADDED["ADDED"] = "ADDED";
})(CREATED_OR_ADDED || (CREATED_OR_ADDED = {}));
const Requester_1 = require("./Messengers/Requester");
const Responder_1 = require("./Messengers/Responder");
const Publisher_1 = require("./Messengers/Publisher");
const Subscriber_1 = require("./Messengers/Subscriber");
class Messenger {
    constructor(options) {
        this.serverId = options.id;
        this.dealerSocket = null;
        this.pubSocket = null;
        this.publish = null;
        this.publisher = null;
        this.requests = null;
        this.requester = null;
        this.responses = null;
        this.responder = null;
        this.subscriptions = null;
        this.subscriber = null;
        this.options = options;
        this.initializeMessengers(options);
    }
    /**
     * sets and initializes available public functions based on messenger options passed in.
     * @param options
     */
    initializeMessengers(options) {
        if (options.brokerURI) {
            this.dealerSocket = zmq.socket('dealer');
            this.dealerSocket.identity = this.serverId;
            this.dealerSocket.connect(options.brokerURI);
        }
        if (options.request) {
            if (!this.dealerSocket)
                throw `Please provide a broker URI in your messengerOptions for request server: ${this.serverId}`;
            this.requests = {};
            this.requester = new Requester_1.Requester(this.dealerSocket, options.request);
            this.createRequest = this._createRequest;
            this.removeRequest = this._removeRequest;
        }
        if (options.response) {
            if (!this.dealerSocket)
                throw `Please provide a broker URI in your messengerOptions for response server: ${this.serverId}`;
            this.responses = new Set();
            this.responder = new Responder_1.Responder(this.dealerSocket);
            this.createResponse = this._createResponse;
            this.removeResponse = this._removeResponse;
        }
        if (options.publish) {
            this.publish = {};
            this.pubSocket = zmq.socket('pub');
            this.pubSocket.bindSync(options.publish.pubSocketURI);
            this.publisher = new Publisher_1.Publisher(this.pubSocket);
            this.getOrCreatePublish = this._getOrCreatePublish;
            this.createPublish = this._createPublish;
            this.removePublish = this._removePublish;
            this.removeAllPublish = this._removeAllPublish;
        }
        if (options.subscribe) {
            this.subSocket = zmq.socket('sub');
            for (let i = 0; i < options.subscribe.pubSocketURIs.length; i++) {
                this.subSocket.connect(options.subscribe.pubSocketURIs[i]);
            }
            this.subscriptions = new Set();
            this.subscriber = new Subscriber_1.Subscriber(this.subSocket);
            this.createSubscription = this._createSubscription;
            this.createOrAddSubscription = this._createOrAddSubscription;
            this.removeSubscriptionById = this._removeSubscriptionById;
            this.removeAllSubscriptionsWithId = this._removeAllSubscriptionsWithId;
            this.removeAllSubscriptionsWithName = this._removeAllSubscriptionsWithName;
            this.removeAllSubscriptions = this._removeAllSubscriptions;
            this.getHandlerIdsForSubscriptionName = this._getHandlerIdsForSubscriptionName;
            this.getSubscriptionNamesForHandlerId = this._getSubscriptionNamesForHandlerId;
        }
    }
    close() {
        if (this.pubSocket) {
            this._removeAllPublish();
            this.pubSocket.close();
            this.pubSocket = null;
        }
        if (this.subSocket) {
            this._removeAllSubscriptions();
            this.subSocket.close();
            this.subSocket = null;
        }
        if (this.dealerSocket) {
            this.dealerSocket.close();
            this.dealerSocket = null;
        }
    }
    /**
     * If options.request was passed into constructor, you can use this function to create
     * and send requests. After running this you can make your request by Messenger.requests.name() in which
     * the name() function is the beforeRequestHook passed in.
     * @param name - unique name of request which will be used
     * @param to - id of server you are sending request to.
     * @param beforeHook - Hook that's used if you want to process data before sending it,
     * @returns Function - request function that sends out the request.
     * if left out, by default you can pass in an object when calling request and send that.
     * whatever it returns gets sent.
     */
    createRequest(name, to, beforeHook) { throw new Error('Server is not configured to use requests.'); }
    removeRequest(name) { throw new Error('Server is not configured to use requests.'); }
    /**
     * If options.response was passed into constructor, you can use this function to create
     * an onRequest handler, with a hook that processes the request data and whatever
     * the hook returns gets sent back as the response data.
     * @param name - unique name of request which will be used
     * @param onRequestHook - Hook to process data from request, whatever it returns gets sent back
     */
    createResponse(name, beforeHook) { throw new Error('Server is not configured use responses.'); }
    removeResponse(name) { throw new Error('Server is not configured to use responses.'); }
    /**
     *
     * @param name - name for publish method
     * @param beforeHook - hook that sends return value as message
     * @param afterHandler - hook used for cleanup after publishing a method, gets message sent as param.
     * @param serializer - enum value that tells the publisher how to encode your message, look at SERIALIZER_TYPES for more info
     */
    createPublish(name, beforeHook, serializer = Serializers_1.SERIALIZER_TYPES.JSON) { throw new Error('Server is not configured to publish.'); }
    /**
     * does same thing as createPublish but if the publish name already exists it will return the handler.
     * @param name - name for publish method
     * @param beforeHook - hook that sends return value as message
     * @param afterHandler - hook used for cleanup after publishing a method, gets message sent as param.
     * @param serializer - enum value that tells the publisher how to encode your message, look at SERIALIZER_TYPES for more info
     */
    getOrCreatePublish(name, beforeHook, serializer = Serializers_1.SERIALIZER_TYPES.JSON) { throw new Error('Server is not configured to publish.'); }
    removePublish(name) { throw new Error('Server is not configured to publish.'); }
    removeAllPublish() { throw new Error('Server is not configured to publish.'); }
    /**
     * creates a new subscription and subscription handler to process data when receiving a publication. Throws error if handler already exists.
     * @param name - name of publication to subscribe to.
     * @param id - identifier for handler to run on publication
     * @param handler - method that takes in publication data as parameter when received.
     * @param serializer - enum value that tells the subscriber how to decode incoming message, look at SERIALIZER_TYPES for more info
     * @returns boolean - returns true if it was successful.
     */
    createSubscription(name, id, handler, serializer = Serializers_1.SERIALIZER_TYPES.JSON) { throw new Error('Server is not configured to use subscriptions.'); }
    /**
     * creates a new subscription if it doesnt exist but if it does, instead of throwing an error it will add a new handler to be ran on the publication
     * @param name - name of publication to subscribe to.
     * @param id - identifier for handler to run on publication
     * @param handler - method that takes in publication data as parameter when received.
     * @param serializer - enum value that tells the subscriber how to decode incoming message, look at SERIALIZER_TYPES for more info
     * @returns CREATED_OR_ADDED - enum value to signify if you created new subscription or added new handler to existing subscription.
     */
    createOrAddSubscription(name, id, handler, serializer = Serializers_1.SERIALIZER_TYPES.JSON) { throw new Error('Server is not configured to use subscriptions.'); }
    /**
     * removes specific subscription by id
     * @param id - id of subscription that gets returned on creation.
     * @param name - name of subscription that gets returned on creation.
     * @returns - number of subscriptions removed.
     */
    removeSubscriptionById(id, name) { throw new Error('Server is not configured to use subscriptions.'); }
    /**
     * removes all handlers for all subscriptions that have the given id.
     * @param id - id used to identify handlers for different subscription names.
     * @returns number - ammount of handlers removed.
     */
    removeAllSubscriptionsWithId(id) { throw new Error('Server is not configured to use subscriptions.'); }
    removeAllSubscriptionsWithName(name) { throw new Error('Server is not configured to use subscriptions.'); }
    removeAllSubscriptions() { throw new Error('Server is not configured to use subscriptions.'); }
    /**
     * returns all ids that have a handler registered for name.
     * @param name
     * @returns array
     */
    getHandlerIdsForSubscriptionName(name) { throw new Error('Server is not configured to use subscriptions.'); }
    /**
     * returns all subscription names that a handler id is waiting for.
     * @param id
     * @returns array
     */
    getSubscriptionNamesForHandlerId(id) { throw new Error('Server is not configured to use subscriptions.'); }
    _createSubscription(name, id, handler, serializer = Serializers_1.SERIALIZER_TYPES.JSON) {
        if (this.subscriptions.has(name)) {
            throw new Error(`Subscription already has a handler for name: ${name}. If you want to add multiple handlers use createOrAddSubscription or the addHandler method directly on your subscription object.`);
        }
        const { decode } = Serializers_1.get(serializer);
        this.subscriptions.add(name);
        const subscribed = this.subscriber.addHandler(name, id, handler, decode);
        if (subscribed.error) {
            console.log('the error was', subscribed.error);
            throw new Error(subscribed.error);
        }
        return true;
    }
    _createOrAddSubscription(name, id, handler, serializer = Serializers_1.SERIALIZER_TYPES.JSON) {
        let createdOrAdded = CREATED_OR_ADDED.CREATED;
        const { decode } = Serializers_1.get(serializer);
        if (!(this.subscriptions.has(name))) {
            this.subscriptions.add(name);
            createdOrAdded = CREATED_OR_ADDED.ADDED;
        }
        const subscribed = this.subscriber.addHandler(name, id, handler, decode);
        if (subscribed.error) {
            throw new Error(subscribed.error);
        }
        return createdOrAdded;
    }
    _removeSubscriptionById(id, name) {
        const removed = this.subscriber.removeHandlerById(id, name);
        if (!(removed.success))
            return 0;
        if (removed.handlersLeft === 0) {
            this.subscriptions.delete(removed.name);
        }
        return removed.handlersLeft;
    }
    _removeAllSubscriptionsWithId(id) {
        return this.subscriber.removeAllHandlersWithId(id);
    }
    _removeAllSubscriptionsWithName(name) {
        if (this.subscriptions.has(name)) {
            this.subscriber.removeAllHandlersWithName(name);
            this.subscriptions.delete(name);
            return true;
        }
        else {
            throw new Error(`Subscription does not exist for name: ${name}`);
        }
    }
    _removeAllSubscriptions() {
        for (let subName of this.subscriptions.values()) {
            this._removeAllSubscriptionsWithName(subName);
        }
    }
    _getHandlerIdsForSubscriptionName(name) {
        return this.subscriber.getHandlerIdsForSubscriptionName(name);
    }
    _getSubscriptionNamesForHandlerId(id) {
        return this.subscriber.getSubscriptionNamesForHandlerId(id);
    }
    _createPublish(name, beforeHook, serializer = Serializers_1.SERIALIZER_TYPES.JSON) {
        if (this.publish[name]) {
            throw new Error(`Duplicate publisher name: ${name}`);
        }
        const { encode } = Serializers_1.get(serializer);
        const publish = this.publisher.make(name, encode, beforeHook);
        this.publish[name] = publish;
        return publish;
    }
    _getOrCreatePublish(name, beforeHook, serializer = Serializers_1.SERIALIZER_TYPES.JSON) {
        if (this.publish[name]) {
            return this.publish[name];
        }
        const { encode } = Serializers_1.get(serializer);
        const publish = this.publisher.make(name, encode, beforeHook);
        this.publish[name] = publish;
        return publish;
    }
    _removePublish(name) {
        if (this.publish[name]) {
            delete this.publish[name];
        }
        else {
            throw new Error(`Publisher does not exist for name: ${name}`);
        }
    }
    _removeAllPublish() {
        Object.keys(this.publish).forEach(pubName => {
            this._removePublish(pubName);
        });
    }
    _createRequest(name, to, beforeHook) {
        if (this.requests[name]) {
            throw new Error(`Duplicate request name: ${name}`);
        }
        const request = !beforeHook ? this.requester.makeForData(name, to) : this.requester.makeForHook(name, to, beforeHook);
        this.requests[name] = request;
        return request;
    }
    _removeRequest(name) {
        if (this.requests[name]) {
            delete this.requests[name];
        }
        else {
            throw new Error(`Request does not exist for name: ${name}`);
        }
    }
    _createResponse(name, beforeHook) {
        if (this.responses.has(name)) {
            throw new Error(`Duplicate response name: ${name}`);
        }
        this.responses.add(name);
        this.responder.addOnRequestHook(name, beforeHook);
    }
    _removeResponse(name) {
        if (this.responses.has(name)) {
            this.responses.delete(name);
            this.responder.removeOnRequestHook(name);
        }
        else {
            throw new Error(`Response does not exist for name: ${name}`);
        }
    }
}
exports.Messenger = Messenger;
