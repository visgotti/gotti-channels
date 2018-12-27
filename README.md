This is a lightweight lib that uses centrum's messengers
to communicate and synchronized data from unique processes between servers.

Each channel has a single back channel that should generally be an isolated process that doesnt need to
communicate with other processes.. Back channels should be able to communicate with other back channels by having their own front channel.. but
this may get a little messy and I haven't tested it, but in theory it should work.

Front channels should always live on seperate servers/processes to their sibling back channel, thered be absolutely no point
having them live on same machine, but it can make sense to have a "Front Channel 1" living on "Back Channel 2" to open messaging
between "Back Channel 1 and "Back Channel 2"

But "Front Channels" are meant to have multiple instances living on different servers/processes all communicating with its sibling "Back Channel"

When I say sibling I'm just describing the topology of a channel in layman's terms.

A "Channel" is simply just made up of many "Front Channels" and a single "Back Channel" where they all share a unique identifier.
All of the "Front Channels" with the ID of "randomChannel123" are sibilings of the SINGLE "Back Channel" "randomChannel123" and vice versa.

Simply put, "Front Channels" to "Back Channel" is a m:1 relationship

It is up to you to decide the shape of the state, how to process received broadcasts, and when to broadcast it.

It is extremely easy to implement channels, I will document API eventually after I'm content with what I've wrote,
but to see how it currently works just look at the Channel tests. The hardest and most confusing part is probably
configuring the Centrum instances which you can learn more about from the Centrum project on my github and if you
just peak at the centrum.config.json file you can probably figure out. It's not the prettiest config file in the world
but I do plan on simplifying it eventually and hoping to even write a loader of some sort.


