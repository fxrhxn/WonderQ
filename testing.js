

const WonderQ = require('./wonderq')
const wonder_q = new WonderQ( {host: "127.0.0.1", port: 6379, ns: "rsmq"} );



wonder_q.sendMessage({qname:"myqueue", message:"Hello World"}, function (err, resp) {
  if (resp) {
    console.log("Message sent. ID:", resp);
  }
});
