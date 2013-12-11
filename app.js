(function() {
  var hostname = (process.env.VMC_APP_HOST || "deqkalvm272.qkal.sap.corp")
  var port = (process.env.VMC_APP_PORT || "443")
  var host = hostname+":"+port
  var fs = require('fs')
  var protocol = 'http:'
  var url = require('url')
  var https = require('https')
  var path = require('path')
  var express = require('express')
  var passport = require('passport')
  require('./Math.uuid')

  var BearerStrategy = require('passport-http-bearer').Strategy

  function findByToken(token, fn) {
     console.log('findByToken')
     var url = 'https://account.lab.fi-ware.eu/user?access_token='
             + token
     https.get(url, function (res) {
                 console.log('token validation request callback')
                 res.on('data', function (d) {
                   console.log('token validation request data')
                   fn(null, 'authenticated') 
                 })
               }).on('error', function (e) {
                console.error(e)
                fn(null, null)
               })
  }

// Use the BearerStrategy within Passport.
//   Strategies in Passport require a `validate` function, which accept
//   credentials (in this case, a token), and invoke a callback with a user
//   object.
passport.use(new BearerStrategy({ },
  function(token, done) {
    console.log(token)
    // asynchronous validation, for effect...
    process.nextTick(function () {
      
      // Find the user by token.  If there is no user with the given token, set
      // the user to `false` to indicate failure.  Otherwise, return the
      // authenticated `user`.  Note that in a production-ready application, one
      // would want to validate the token for authenticity.
      console.log('try findByToken')
      findByToken(token, function(err, user) {
        console.log(user)
        if (err) { return done(err) }
        if (!user) { return done(null, false) }
        return done(null, user)
      })
    })
  }
))


  var mongodb = require('mongodb')
  var mongo

  if (process.env.VCAP_SERVICES){
    var env = JSON.parse(process.env.VCAP_SERVICES);
    mongo = env['mongodb-1.8'][0]['credentials'];
  } else {
    mongo = {
      "hostname":"127.0.0.1",
      "port":27017,
      "username":"",
      "password":"",
      "name":"",
      "db":"registry"
    }
  }
  console.log("mongo is: "+JSON.stringify(mongo))
  if (mongo.username && mongo.password){
    mongo.url = "mongodb://" + mongo.username + ":" + mongo.password + "@" + mongo.hostname + ":" + mongo.port + "/" + mongo.db;
  }
  else{
    mongo.url = "mongodb://" + mongo.hostname + ":" + mongo.port + "/" + mongo.db;
  }

//  var server = new mongodb.Server(mongo.hostname, mongo.port, {})
//  var db = new mongodb.Db('repository', server, {strict: true})
//  db.open(function (error, client) {
//                  if (error) throw error;
//                })
  var db
  mongodb.connect(mongo.url, function(err, conn) {
                              if (err)
                                 console.warn(err)
                              else
                                 db = conn
                             })

  app = express()

  var options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt'),
    ca: fs.readFileSync('ca.crt')
  }

  server = https.createServer(options, app)

app.configure(function() {
  app.use(express.logger({ format: ':method :url :status :response-time' }))
  app.use(express.query())
  app.use(express.bodyParser())  
//  app.use(express.session({ secret: 'keyboard cat' }))
  app.use(passport.initialize())
//  app.use(passport.session())
  app.use(app.router)
  app.use(express.static(__dirname + '/store'))
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }))
})

  app.get('/extensions',
   passport.authenticate('bearer', { session: false }),
   function(req, res) {
             res.send([])
   })

  app.get('*',
   passport.authenticate('bearer', { session: false }),
   function(req, res) {
      host = req.headers.host
      var parsed = url.parse(req.url,true)
      var p = parsed.pathname
      p = path.normalize(p)
      var sp = p.split('/')
      var basename = sp[sp.length-1]
      sp.pop()
      var collname = sp.join('/') 
      var query = parsed.query
      console.log("parsed: "+JSON.stringify(parsed))
      console.log("query: "+JSON.stringify(query))
      var incl = query.attributes
      var rv = {}
      if (incl) {
         var inames = incl.split(',')
         delete(query.attributes)
         for (var i = 0; i < inames.length; ++i)
            rv[inames[i]] = 1
      }
      console.log("rv: "+JSON.stringify(rv)) 
//      console.log("basename: "+basename)
//      console.log("collname: "+collname)
      var ifnonmatch = req.header("If-None-Match")

// fetch resource from db
      db.collection(collname, function (err, collection) {
          if (err) { 
             console.warn(err.message)
             res.send(err.message, 500)
             return
          }

      if (basename == '') {
         var cursor = collection.find(query, rv)
         res.header('Content-Type', "application/json; charset=utf-8")
         res.write('[')
         var comma = false
         cursor.each(function(err, entry) {
                           if (err)  {
                              console.warn(err.message)
                              res.send('Error', 500)
                           } else {
                              console.log("next entry")
                              if (entry) {
                                 if (comma) res.write(",")
                                 comma = true
                                 var id = entry._id
                                 delete entry._id
                                 entry.DEN = id
                                 res.write(JSON.stringify(entry))
                              } else {
                                 res.write(']')
                                 res.end()
                              }   
                           }
                          })
      } else {
             var id = collname+'/'+basename
             console.log("id is: "+id)
             query._id = id
             var cursor = collection.find(query,rv)
             cursor.nextObject(function(err, entry) {
                           if (err)  {
                              console.warn(err.message)
                              res.send('Error', 500)
                           } else {
                              if (entry) {
                                 delete entry._id
                                 entry.DEN = id
                                 res.header('Last-Modified', new Date(entry.mtime).toUTCString())
                                 res.send(entry)
                              } else {
                                 res.send('not found', 404)
                              }   
                           }
                          })
      }

      })
  })

  app.put('*',
   passport.authenticate('bearer', { session: false }),
   function(req, res) {
      console.log("PUT on "+req.url)
      host = req.headers.host
      var contentType = req.header('Content-Type').split(';')[0]
      console.log("Content-Type: "+contentType)
      var parsed = url.parse(req.url)
      var p = parsed.pathname
      p = path.normalize(p)
      var collname = path.dirname(p)
      var basename = path.basename(p)
      var id = collname+'/'+basename
      console.log("id is "+id)
      if (req.is('application/json')) {
        var entry = req.body
        var insert = function(collection) {
              console.log("insert collection")
              console.log(entry)
             // var entry = JSON.parse(body)
              entry._id = id
              collection.find({_id: id}, {etag: true})
                        .nextObject(function(err, doc) {
                          if (doc) { // update the resource 
                            console.log("found resource, try updating")
                             collection.save(entry,
                               function(err, rec) {
                                   if (err) {
                                      console.warn(err.message)
                                      res.send('Error', 500)
                                   } else {
                                      res.send('updated', 200)
                                   }
                               })
                          } else { // create the resource
                             console.log("create new resource")
                             collection.save(entry, {safe:true},
                                 function(err, rec) {
                                     if (err) {
                                        console.warn(err.message)
                                        res.send('Error', 500)
                                     } else {
                                        res.send('created', 201)
                                     }
                                 })
                          }
                         })
          }
          db.collection(collname, function (err, collection) {
              if (err) {
                 if (err.message.indexOf("does not exist")>-1) {
                    console.log("collection "+ collname + " does not exist, create one.")
                    // we shall create it and continue
                    db.createCollection(collname, function(err, collection){
                       if (err) {
                          console.log(err.message)
                          res.send('Error', 500)
                       } else {
                          insert(collection)
                       }
                    })
                    return
                 } else { 
                    console.log(err.stack)
                    console.warn(err.message)
                    res.send('Error', 500)
                    return
                 }
              }
              insert(collection)
          })
      } else {
         res.send('content type not supported', 404)
         return
      }
  })

  app.delete('*',
   passport.authenticate('bearer', { session: false }),
   function(req, res) {
      var parsed = url.parse(req.url)
      var p = parsed.pathname
      p = path.normalize(p)
      var collname = path.dirname(p)
      var basename = path.basename(p)
      var id = protocol+'//'+host+collname+'/'+basename
      db.collection(collname, function (err, collection) {
          if (err) {
             console.warn(err.message)
             stat = 500
             return
          }
          collection.remove({'_id': id}, {safe: true},
                            function(err, entry) {
                              if (err) {
                                 console.warn(err.message)
                                 res.send('server error', 500)
                              } else
                                 res.send('deleted', 204)
                            })
      })
  })

  app.listen(port)
  console.log('Registry server started on port %s', port)
}).call(this)
