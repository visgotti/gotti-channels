Just like how I redid my messenger project, I wanted to refactor the old centurm-channels project
to promote custom protocols, now all messaging functions take arrays as parameters and will send them
over the network flatly. It appends its own protocols at the end of your array which works very efficiently
and allows you to design your own protocols starting from index 0.

The back channel now fires off an onClientMessage as well as an onMessage for messages that were
sent without the client flag.

They will look like

        client = new Client('test_client');

        // link to channel first
        await client.linkChannel('test_channel');

        // then set it as processor (not async any channel can start processing any client data, it's really just a ping to let the back channel know)
        client.setProcessorChannel('test_channel');

        // now you can send messages
        client.sendLocal(['protocol', 'data', 'moreData', 'moreMoreData']);


        // over on the back channel you receive them like -
        onClientMessage((clientUid, message) => {
            console.log(clientUid) // 'test_client'
            console.log(message[0]) // 'protocol'
            console.log(message[1]) // 'data'
            console.log(message[2]) // 'moreData'
            console.log(message[3]) // 'moreMoreData'
            console.log(message[4]) // 'test_client'
        });

the string at index 4 was appended by the front channel when sending the message across. This is so the back channel knows to run the onClientMessage
and you can hook into it and run logic on the client with whatever protocols you define.