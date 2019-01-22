export interface BackRequest {
    backMastersNeeded: number,
    channelsPerMaster: number,
    type: string,
}

export interface FrontRequest {
    frontMastersNeeded: number,
}

export interface ServerRequest {
    backRequests: Array<BackRequest>,
    frontRequest: FrontRequest
}

export interface BackResponse {
    type: string,
    URIs: Array<string>
}

export interface FrontResponse {
    URIs: Array<string>
}

export interface ServerResponse {
    backURIs: Array<BackRequest>,
    frontRequest: FrontRequest
}

export class Master {

    private _availableBackURIs: Set<string>;
    private _availableFrontURIs: Set<string>;

    private _backURIsInUse: Set<string> = new Set();
    private _frontURIsInUse: Set<string> = new Set();

    constructor(URI, backURIs: Array<string>, frontURIs: Array <string> ) {
        this._availableBackURIs = new Set(backURIs);
        this._availableFrontURIs = new Set(frontURIs);

        this._backURIsInUse = new Set();
        this._frontURIsInUse = new Set();
  //      this.broker = new Broker(URI, 'master');
    //    this.responder = new Messenger();
    }

    get availableBackURIs () {
        return Array.from(this._availableBackURIs);
    }

    get availableFrontURIs () {
        return Array.from(this._availableFrontURIs);
    }

    get backURIsInUse () {
        return Array.from(this._backURIsInUse);
    }

    get frontURIsInUse () {
        return Array.from(this._backURIsInUse);
    }


    public getMasters(request: ServerRequest) {
        const valid = this.validateRequest(request);
        if(!(valid.success)) {
            throw new Error(valid.error);
        }

        let frontURIs = [];
        let backURIsByType = {};

        for(let i = 0; i < request.backRequests.length; i++) {
            let { backMastersNeeded, type, channelsPerMaster }  = request.backRequests[i];
            backURIsByType[type] = [];

            const backsArray = Array.from(this._availableBackURIs.values());
            for(let i = 0; i < backsArray.length; i++) {
                const uri = backsArray[i];
                this._availableBackURIs.delete(uri);
                this._backURIsInUse.add(uri);
                backURIsByType[type].push(uri);
                backMastersNeeded--;
                if(backMastersNeeded === 0) {
                    break;
                }
            }
        }

        let { frontMastersNeeded }  = request.frontRequest;

        for(let i = 0; i < request.frontRequest.frontMastersNeeded; i++) {
            const frontsArray = Array.from(this._availableFrontURIs.values());
            for(let i = 0; i < frontsArray.length; i++) {
                const uri = frontsArray[i];
                this._availableFrontURIs.delete(uri);
                this._frontURIsInUse.add(uri);
                frontURIs.push(uri);
                frontMastersNeeded--;
                if(frontMastersNeeded === 0) {
                    break;
                }
            }
        }

        return {
            frontURIs,
            backURIsByType
        }
    }

    private registerRequestHandlers() {
     //   responder.createResponse('REQUEST_SERVER_START', (request: ServerRequest) => {


     //   })
    }


    private validateRequest(serverRequest: ServerRequest) {
        let needed = 0;

        for(let i = 0; i < serverRequest.backRequests.length; i++) {
            needed += serverRequest.backRequests[i].backMastersNeeded;
            if(needed > this._availableBackURIs.size) {
                return {
                    success: false,
                    error: 'Not enough back uris are available.'
                }
            }
        }

        if(this._availableFrontURIs.size < serverRequest.frontRequest.frontMastersNeeded) {
            return {
                success: false,
                error: 'Not enough front uris are available.'
            }
        }

        return {
            success: true,
        }
    }

}