project status

I've gone to implement a Master Front and Back channel, this can kind of be thought of
as a hub that lives in front of all the front and back channels, and those front and back
channels have links together that basically streams messages back and forth to eachother
at a defined interval.

Back channels only have 1 instance of themselves and store state of an application and run application processes.
Front channels are hubs that live on a separate machine or process. That are meant to be load balanced and those
front servers will be the ones communicating and forwarding client data to the mirrored back server of said front server.
The back channel collects and queues these data forwards from all linked front channels and processes them at a defined interval.
Rinse and repeat, as long as it has linked channels, it will do this processes. It's trivial to add a new link, all it is.

    frontChannel.link();

    should call it asynchronously to retrieve state data

    await encodedState = frontChannel.link();


This state is sent back encoded by default because although you may want to process it and do something with it, the idea
of the Front Channel is really not supposed to do stuff like that if it doesn't have to. If it's doing its job right if it's
efficiently sending messages back and forth fast from client to the back channel. So any state data may it be patches or
the state itself, will be encoded upon retrieval.


Obviously it's not that simple and there needs to be some setup and config. But I'm trying my best to make that process simple and pain
free as possible. Channel links are rock solid but connection states are still a little iffy since I'm still not quite sure how I want to handle
channel/server disconnects. I envision a system where you can add/remove channels to a cluster dynamically if needed, but for now we're going
to have to settle for statically defined clusters. Which may sound bad, but if you know what you're building for it's very trivial to set it up
efficiently.
