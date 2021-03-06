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


## Examples
  * [Amazon SQS](http://goo.gl/Bn8qaD)
  * [Celery](http://www.celeryproject.org/)
  * [Kue](https://github.com/Automattic/kue)

## Tools to Use
  1. Node.js / JS (ES6)
  2. Redis

## Problem Broken Down
  1. [x] Learn the terminology.
      * [Learning About Message Queues](https://github.com/fxrhxn/queue-example)
  2. [x] Build a simple queue.
      * [Simple Queue](https://github.com/fxrhxn/message-queue/blob/master/testing.js)
  3. [x] Build a quick Redis / Node.js Message Queue
      * [Quick Redis Implementation](https://github.com/fxrhxn/WonderQ/blob/master/testing.js)
      The way this was built was by looking at code from the [RSMQ](https://www.npmjs.com/package/rsmq) package.

  4. [x] How would you scale this?
      * [Scaling Slack's Job Queue](https://slack.engineering/scaling-slacks-job-queue-687222e9d100)
      * [Redis Scalability](https://www.quora.com/How-scalable-is-Redis)
      * [Twitter Using Redis](http://highscalability.com/blog/2014/9/8/how-twitter-uses-redis-to-scale-105tb-ram-39mm-qps-10000-ins.html)

  5. Fit requirements of WonderQ task
  6. Setup a test application, and a way to check if queue is alive.
  7. Write documentation for endpoints
