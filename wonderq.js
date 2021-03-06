


const EventEmitter = require("events").EventEmitter;
const RedisInst = require('redis');
const _ = require('lodash')
const crypto = require('crypto')

const bind = function(fn, me){
    return function(){
      return fn.apply(me, arguments);
    };
  }


const extend = function(child, parent) {

  for (var key in parent) {

    if (hasProp.call(parent, key)) child[key] = parent[key];

  }

  function ctor() {
    this.constructor = child;
  }

  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
  child.__super__ = parent.prototype;
  return child;

}


const hasProp = {}.hasOwnProperty



/*


Requirements for WonderQ

1) Create Queue
2) send message
3) receive message
4)

*/



const WonderQ = (function(superClass) {

  extend(WonderQ, superClass);

  function WonderQ(options) {
    var opts, ref, ref1;
    if (options == null) {
      options = {};
    }
    this._initErrors = bind(this._initErrors, this);
    this._handleError = bind(this._handleError, this);
    this.setQueueAttributes = bind(this.setQueueAttributes, this);
    this.sendMessage = bind(this.sendMessage, this);
    this._receiveMessage = bind(this._receiveMessage, this);
    this._popMessage = bind(this._popMessage, this);
    this.receiveMessage = bind(this.receiveMessage, this);
    this.popMessage = bind(this.popMessage, this);
    this.listQueues = bind(this.listQueues, this);
    this.getQueueAttributes = bind(this.getQueueAttributes, this);
    this.deleteQueue = bind(this.deleteQueue, this);
    this.deleteMessage = bind(this.deleteMessage, this);
    this.createQueue = bind(this.createQueue, this);
    this._changeMessageVisibility = bind(this._changeMessageVisibility, this);
    this.changeMessageVisibility = bind(this.changeMessageVisibility, this);
    this._getQueue = bind(this._getQueue, this);
    this.quit = bind(this.quit, this);
    opts = _.extend({
      host: "127.0.0.1",
      port: 6379,
      options: {},
      client: null,
      ns: "rsmq"
    }, options);
    this.redisns = opts.ns + ":";
    if (((ref = opts.client) != null ? (ref1 = ref.constructor) != null ? ref1.name : void 0 : void 0) === "RedisClient") {
      this.redis = opts.client;
    } else {
      this.redis = RedisInst.createClient(opts.port, opts.host, opts.options);
    }
    this.connected = this.redis.connected || false;
    if (this.connected) {
      this.emit("connect");
      this.initScript();
    }

    this.redis.on("connect", (function(_this) {
      return function() {
        _this.connected = true;
        _this.emit("connect");
        _this.initScript();
      };
    })(this));


    this.redis.on("error", (function(_this) {
      return function(err) {
        if (err.message.indexOf("ECONNREFUSED")) {
          _this.connected = false;
          _this.emit("disconnect");
        } else {
          console.error("Redis ERROR", err);
          _this.emit("error");
        }
      };
    })(this));


    this._initErrors();
    return;
  }

  WonderQ.prototype.quit = function() {
    this.redis.quit();
  };

  WonderQ.prototype._getQueue = function(qname, uid, cb) {
    var mc;
    mc = [["hmget", "" + this.redisns + qname + ":Q", "vt", "delay", "maxsize"], ["time"]];
    this.redis.multi(mc).exec((function(_this) {
      return function(err, resp) {
        var ms, q, ts;
        if (err) {
          _this._handleError(cb, err);
          return;
        }
        if (resp[0][0] === null || resp[0][1] === null || resp[0][2] === null) {
          _this._handleError(cb, "queueNotFound");
          return;
        }
        ms = _this._formatZeroPad(Number(resp[1][1]), 6);
        ts = Number(resp[1][0] + ms.toString(10).slice(0, 3));
        q = {
          vt: parseInt(resp[0][0], 10),
          delay: parseInt(resp[0][1], 10),
          maxsize: parseInt(resp[0][2], 10),
          ts: ts
        };
        if (uid) {
          uid = _this._makeid(22);
          q.uid = Number(resp[1][0] + ms).toString(36) + uid;
        }
        cb(null, q);
      };
    })(this));
  };

  WonderQ.prototype.changeMessageVisibility = function(options, cb) {
    if (this._validate(options, ["qname", "id", "vt"], cb) === false) {
      return;
    }
    this._getQueue(options.qname, false, (function(_this) {
      return function(err, q) {
        if (err) {
          _this._handleError(cb, err);
          return;
        }
        if (_this.changeMessageVisibility_sha1) {
          _this._changeMessageVisibility(options, q, cb);
          return;
        }
        _this.on('scriptload:changeMessageVisibility', function() {
          _this._changeMessageVisibility(options, q, cb);
        });
      };
    })(this));
  };

  WonderQ.prototype._changeMessageVisibility = function(options, q, cb) {
    this.redis.evalsha(this.changeMessageVisibility_sha1, 3, "" + this.redisns + options.qname, options.id, q.ts + options.vt * 1000, (function(_this) {
      return function(err, resp) {
        if (err) {
          _this._handleError(cb, err);
          return;
        }
        cb(null, resp);
      };
    })(this));
  };

  WonderQ.prototype.createQueue = function(options, cb) {
    var ref, ref1, ref2;
    options.vt = (ref = options.vt) != null ? ref : 30;
    options.delay = (ref1 = options.delay) != null ? ref1 : 0;
    options.maxsize = (ref2 = options.maxsize) != null ? ref2 : 65536;
    if (this._validate(options, ["qname", "vt", "delay", "maxsize"], cb) === false) {
      return;
    }
    this.redis.time((function(_this) {
      return function(err, resp) {
        var mc;
        if (err) {
          _this._handleError(cb, err);
          return;
        }
        mc = [["hsetnx", "" + _this.redisns + options.qname + ":Q", "vt", options.vt], ["hsetnx", "" + _this.redisns + options.qname + ":Q", "delay", options.delay], ["hsetnx", "" + _this.redisns + options.qname + ":Q", "maxsize", options.maxsize], ["hsetnx", "" + _this.redisns + options.qname + ":Q", "created", resp[0]], ["hsetnx", "" + _this.redisns + options.qname + ":Q", "modified", resp[0]]];
        _this.redis.multi(mc).exec(function(err, resp) {
          if (err) {
            _this._handleError(cb, err);
            return;
          }
          if (resp[0] === 0) {
            _this._handleError(cb, "queueExists");
            return;
          }
          _this.redis.sadd(_this.redisns + "QUEUES", options.qname, function(err, resp) {
            if (err) {
              _this._handleError(cb, err);
              return;
            }
            cb(null, 1);
          });
        });
      };
    })(this));
  };

  WonderQ.prototype.deleteMessage = function(options, cb) {
    var key, mc;
    if (this._validate(options, ["qname", "id"], cb) === false) {
      return;
    }
    key = "" + this.redisns + options.qname;
    mc = [["zrem", key, options.id], ["hdel", key + ":Q", "" + options.id, options.id + ":rc", options.id + ":fr"]];
    this.redis.multi(mc).exec((function(_this) {
      return function(err, resp) {
        if (err) {
          _this._handleError(cb, err);
          return;
        }
        if (resp[0] === 1 && resp[1] > 0) {
          cb(null, 1);
        } else {
          cb(null, 0);
        }
      };
    })(this));
  };

  WonderQ.prototype.deleteQueue = function(options, cb) {
    var key, mc;
    if (this._validate(options, ["qname"], cb) === false) {
      return;
    }
    key = "" + this.redisns + options.qname;
    mc = [["del", key + ":Q"], ["del", key], ["srem", this.redisns + "QUEUES", options.qname]];
    this.redis.multi(mc).exec((function(_this) {
      return function(err, resp) {
        if (err) {
          _this._handleError(cb, err);
          return;
        }
        if (resp[0] === 0) {
          _this._handleError(cb, "queueNotFound");
          return;
        }
        cb(null, 1);
      };
    })(this));
  };

  WonderQ.prototype.getQueueAttributes = function(options, cb) {
    var key;
    if (this._validate(options, ["qname"], cb) === false) {
      return;
    }
    key = "" + this.redisns + options.qname;
    this.redis.time((function(_this) {
      return function(err, resp) {
        var mc;
        if (err) {
          _this._handleError(cb, err);
          return;
        }
        mc = [["hmget", key + ":Q", "vt", "delay", "maxsize", "totalrecv", "totalsent", "created", "modified"], ["zcard", key], ["zcount", key, resp[0] + "000", "+inf"]];
        _this.redis.multi(mc).exec(function(err, resp) {
          var o;
          if (err) {
            _this._handleError(cb, err);
            return;
          }
          if (resp[0][0] === null) {
            _this._handleError(cb, "queueNotFound");
            return;
          }
          o = {
            vt: parseInt(resp[0][0], 10),
            delay: parseInt(resp[0][1], 10),
            maxsize: parseInt(resp[0][2], 10),
            totalrecv: parseInt(resp[0][3], 10) || 0,
            totalsent: parseInt(resp[0][4], 10) || 0,
            created: parseInt(resp[0][5], 10),
            modified: parseInt(resp[0][6], 10),
            msgs: resp[1],
            hiddenmsgs: resp[2]
          };
          cb(null, o);
        });
      };
    })(this));
  };

  WonderQ.prototype._handleReceivedMessage = function(cb) {
    return (function(_this) {
      return function(err, resp) {
        var o;
        if (err) {
          _this._handleError(cb, err);
          return;
        }
        if (!resp.length) {
          cb(null, {});
          return;
        }
        o = {
          id: resp[0],
          message: resp[1],
          rc: resp[2],
          fr: Number(resp[3]),
          sent: parseInt(parseInt(resp[0].slice(0, 10), 36) / 1000)
        };
        cb(null, o);
      };
    })(this);
  };

  WonderQ.prototype.initScript = function(cb) {
    var script_changeMessageVisibility, script_popMessage, script_receiveMessage;
    script_popMessage = 'local msg = redis.call("ZRANGEBYSCORE", KEYS[1], "-inf", KEYS[2], "LIMIT", "0", "1") if #msg == 0 then return {} end redis.call("HINCRBY", KEYS[1] .. ":Q", "totalrecv", 1) local mbody = redis.call("HGET", KEYS[1] .. ":Q", msg[1]) local rc = redis.call("HINCRBY", KEYS[1] .. ":Q", msg[1] .. ":rc", 1) local o = {msg[1], mbody, rc} if rc==1 then table.insert(o, KEYS[2]) else local fr = redis.call("HGET", KEYS[1] .. ":Q", msg[1] .. ":fr") table.insert(o, fr) end redis.call("ZREM", KEYS[1], msg[1]) redis.call("HDEL", KEYS[1] .. ":Q", msg[1], msg[1] .. ":rc", msg[1] .. ":fr") return o';
    script_receiveMessage = 'local msg = redis.call("ZRANGEBYSCORE", KEYS[1], "-inf", KEYS[2], "LIMIT", "0", "1") if #msg == 0 then return {} end redis.call("ZADD", KEYS[1], KEYS[3], msg[1]) redis.call("HINCRBY", KEYS[1] .. ":Q", "totalrecv", 1) local mbody = redis.call("HGET", KEYS[1] .. ":Q", msg[1]) local rc = redis.call("HINCRBY", KEYS[1] .. ":Q", msg[1] .. ":rc", 1) local o = {msg[1], mbody, rc} if rc==1 then redis.call("HSET", KEYS[1] .. ":Q", msg[1] .. ":fr", KEYS[2]) table.insert(o, KEYS[2]) else local fr = redis.call("HGET", KEYS[1] .. ":Q", msg[1] .. ":fr") table.insert(o, fr) end return o';
    script_changeMessageVisibility = 'local msg = redis.call("ZSCORE", KEYS[1], KEYS[2]) if not msg then return 0 end redis.call("ZADD", KEYS[1], KEYS[3], KEYS[2]) return 1';
    this.redis.script("load", script_popMessage, (function(_this) {
      return function(err, resp) {
        if (err) {
          console.log(err);
          return;
        }
        _this.popMessage_sha1 = resp;
        _this.emit('scriptload:popMessage');
      };
    })(this));
    this.redis.script("load", script_receiveMessage, (function(_this) {
      return function(err, resp) {
        if (err) {
          console.log(err);
          return;
        }
        _this.receiveMessage_sha1 = resp;
        _this.emit('scriptload:receiveMessage');
      };
    })(this));
    this.redis.script("load", script_changeMessageVisibility, (function(_this) {
      return function(err, resp) {
        _this.changeMessageVisibility_sha1 = resp;
        _this.emit('scriptload:changeMessageVisibility');
      };
    })(this));
  };

  WonderQ.prototype.listQueues = function(cb) {
    this.redis.smembers(this.redisns + "QUEUES", (function(_this) {
      return function(err, resp) {
        if (err) {
          _this._handleError(cb, err);
          return;
        }
        cb(null, resp);
      };
    })(this));
  };

  WonderQ.prototype.popMessage = function(options, cb) {
    if (this._validate(options, ["qname"], cb) === false) {
      return;
    }
    this._getQueue(options.qname, false, (function(_this) {
      return function(err, q) {
        if (err) {
          _this._handleError(cb, err);
          return;
        }
        if (_this.popMessage_sha1) {
          _this._popMessage(options, q, cb);
          return;
        }
        _this.on('scriptload:popMessage', function() {
          _this._popMessage(options, q, cb);
        });
      };
    })(this));
  };

  WonderQ.prototype.receiveMessage = function(options, cb) {
    if (this._validate(options, ["qname"], cb) === false) {
      return;
    }
    this._getQueue(options.qname, false, (function(_this) {
      return function(err, q) {
        var ref;
        if (err) {
          _this._handleError(cb, err);
          return;
        }
        options.vt = (ref = options.vt) != null ? ref : q.vt;
        if (_this._validate(options, ["vt"], cb) === false) {
          return;
        }
        if (_this.receiveMessage_sha1) {
          _this._receiveMessage(options, q, cb);
          return;
        }
        _this.on('scriptload:receiveMessage', function() {
          _this._receiveMessage(options, q, cb);
        });
      };
    })(this));
  };

  WonderQ.prototype._popMessage = function(options, q, cb) {
    this.redis.evalsha(this.popMessage_sha1, 2, "" + this.redisns + options.qname, q.ts, this._handleReceivedMessage(cb));
  };

  WonderQ.prototype._receiveMessage = function(options, q, cb) {
    this.redis.evalsha(this.receiveMessage_sha1, 3, "" + this.redisns + options.qname, q.ts, q.ts + options.vt * 1000, this._handleReceivedMessage(cb));
  };

  WonderQ.prototype.sendMessage = function(options, cb) {
    if (this._validate(options, ["qname"], cb) === false) {
      return;
    }
    this._getQueue(options.qname, true, (function(_this) {
      return function(err, q) {
        var mc, ref;
        if (err) {
          _this._handleError(cb, err);
          return;
        }
        options.delay = (ref = options.delay) != null ? ref : q.delay;
        if (_this._validate(options, ["delay"], cb) === false) {
          return;
        }
        if (typeof options.message !== "string") {
          _this._handleError(cb, "messageNotString");
          return;
        }
        if (q.maxsize !== -1 && options.message.length > q.maxsize) {
          _this._handleError(cb, "messageTooLong");
          return;
        }
        mc = [["zadd", "" + _this.redisns + options.qname, q.ts + options.delay * 1000, q.uid], ["hset", "" + _this.redisns + options.qname + ":Q", q.uid, options.message], ["hincrby", "" + _this.redisns + options.qname + ":Q", "totalsent", 1]];
        _this.redis.multi(mc).exec(function(err, resp) {
          if (err) {
            _this._handleError(cb, err);
            return;
          }
          cb(null, q.uid);
        });
      };
    })(this));
  };

  WonderQ.prototype.setQueueAttributes = function(options, cb) {
    var item, j, k, key, len1, props;
    props = ["vt", "maxsize", "delay"];
    k = [];
    for (j = 0, len1 = props.length; j < len1; j++) {
      item = props[j];
      if (options[item] != null) {
        k.push(item);
      }
    }
    if (!k.length) {
      this._handleError(cb, "noAttributeSupplied");
      return;
    }
    if (this._validate(options, ["qname"].concat(k), cb) === false) {
      return;
    }
    key = "" + this.redisns + options.qname;
    this._getQueue(options.qname, false, (function(_this) {
      return function(err, q) {
        if (err) {
          _this._handleError(cb, err);
          return;
        }
        _this.redis.time(function(err, resp) {
          var l, len2, mc;
          if (err) {
            _this._handleError(cb, err);
            return;
          }
          mc = [["hset", "" + _this.redisns + options.qname + ":Q", "modified", resp[0]]];
          for (l = 0, len2 = k.length; l < len2; l++) {
            item = k[l];
            mc.push(["hset", "" + _this.redisns + options.qname + ":Q", item, options[item]]);
          }
          _this.redis.multi(mc).exec(function(err, resp) {
            if (err) {
              _this._handleError(cb, err);
              return;
            }
            _this.getQueueAttributes(options, cb);
          });
        });
      };
    })(this));
  };

  WonderQ.prototype._formatZeroPad = function(num, count) {
    return ((Math.pow(10, count) + num) + "").substr(1);
  };

  WonderQ.prototype._handleError = function(cb, err, data) {
    var _err, ref;
    if (data == null) {
      data = {};
    }
    if (_.isString(err)) {
      _err = new Error();
      _err.name = err;
      _err.message = ((ref = this._ERRORS) != null ? typeof ref[err] === "function" ? ref[err](data) : void 0 : void 0) || "unkown";
    } else {
      _err = err;
    }
    cb(_err);
  };

  WonderQ.prototype._initErrors = function() {
    var key, msg, ref;
    this._ERRORS = {};
    ref = this.ERRORS;
    for (key in ref) {
      msg = ref[key];
      this._ERRORS[key] = _.template(msg);
    }
  };

  WonderQ.prototype._makeid = function(len) {
    var i, j, possible, ref, text;
    text = "";
    possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (i = j = 0, ref = len; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };

  WonderQ.prototype._VALID = {
    qname: /^([a-zA-Z0-9_-]){1,160}$/,
    id: /^([a-zA-Z0-9:]){32}$/
  };

  WonderQ.prototype._validate = function(o, items, cb) {
    var item, j, len1;
    for (j = 0, len1 = items.length; j < len1; j++) {
      item = items[j];
      switch (item) {
        case "qname":
        case "id":
          if (!o[item]) {
            this._handleError(cb, "missingParameter", {
              item: item
            });
            return false;
          }
          o[item] = o[item].toString();
          if (!this._VALID[item].test(o[item])) {
            this._handleError(cb, "invalidFormat", {
              item: item
            });
            return false;
          }
          break;
        case "vt":
        case "delay":
          o[item] = parseInt(o[item], 10);
          if (_.isNaN(o[item]) || !_.isNumber(o[item]) || o[item] < 0 || o[item] > 9999999) {
            this._handleError(cb, "invalidValue", {
              item: item,
              min: 0,
              max: 9999999
            });
            return false;
          }
          break;
        case "maxsize":
          o[item] = parseInt(o[item], 10);
          if (_.isNaN(o[item]) || !_.isNumber(o[item]) || o[item] < 1024 || o[item] > 65536) {
            if (o[item] !== -1) {
              this._handleError(cb, "invalidValue", {
                item: item,
                min: 1024,
                max: 65536
              });
              return false;
            }
          }
      }
    }
    return o;
  };

  WonderQ.prototype.ERRORS = {
    "noAttributeSupplied": "No attribute was supplied",
    "missingParameter": "No <%= item %> supplied",
    "invalidFormat": "Invalid <%= item %> format",
    "invalidValue": "<%= item %> must be between <%= min %> and <%= max %>",
    "messageNotString": "Message must be a string",
    "messageTooLong": "Message too long",
    "queueNotFound": "Queue not found",
    "queueExists": "Queue exists"
  };

  return WonderQ;

})(EventEmitter);

module.exports = WonderQ;
