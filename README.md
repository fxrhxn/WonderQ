# WonderQ: A simple queueing system.

WonderQ is a broker that allows multiple producers to write to it, and multiple consumers to read from it. It runs on a single server. Whenever a producer writes to WonderQ, a message ID is generated and returned as confirmation. Whenever a consumer polls WonderQ for new messages, it gets those messages which are NOT processed by any other consumer that may be concurrently accessing WonderQ.

NOTE that, when a consumer gets a set of messages, it must notify WonderQ that it has processed each message (individually). This deletes that message from the WonderQ database. If a message is received by a consumer, but NOT marked as processed within a configurable amount of time, the message then becomes available to any consumer requesting again.


## Tasks:

  * Design a module that represents WonderQ. You can abstract the logic around database storage.
  * Setup a test app that will generate messages and demonstrate how WonderQ works.
  * Setup a quick and dirty developer tool that can be used to show the current state of WonderQ at any time.
  * Write documentation for potential API endpoints. Talk about their inputs/ outputs, formats, methods, responses, etc.
  * Discuss how would you go about scaling this system to meet high-volume requests? What infrastructure / stack would you use and why?
  * We'd prefer if you use Node.js and ES6/ES7 as that is what we use.
