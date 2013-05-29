(function() {
  var hostname = (process.env.VMC_APP_HOST || "deqkalvm272.qkal.sap.corp")
  var port = (process.env.VMC_APP_PORT || "5000")
  var host = hostname+":"+port
  var protocol = 'http:'
  var url = require('url')
  var path = require('path')
  var express = require('express')
  var passport = require('passport')
  var OpenIDStrategy = require('passport-openid').Strategy
  require('./Math.uuid')

/*
  passport.use(new OpenIDStrategy({
      returnURL: protocol+'//'+host+'/auth/openid/return',
      realm: protocol+'//'+host
    },
    function(identifier, done) {
      console.log('passport identifier: '+JSON.stringify(identifier))
      return done(null, {identifier: identifier})
    }
  ))

  passport.serializeUser(function(user, done) {
    done(null, user.identifier);
  })
  
  passport.deserializeUser(function(identifier, done) {
    done(null, { identifier: identifier });
  })

  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/login.html')
  }
*/

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
  app.use(express.cookieParser());
  app.use(express.logger({ format: ':method :url :status :response-time' }))
  app.use(express.favicon(__dirname + '/store/favicon.ico'))
  app.use(express.query())
  app.use(express.bodyParser())  
  app.use(express.session({ secret: 'keyboard cat' }))
  app.use(passport.initialize())
  app.use(passport.session())
  app.use(express.static(__dirname + '/store'))
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }))

  app.get('/extensions', /*ensureAuthenticated,*/ function(req, res) {
     res.send([])
  })

  app.get('*', /*ensureAuthenticated,*/ function(req, res) {
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

  app.put('*', /* ensureAuthenticated,*/ function(req, res) {
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

  app.delete('*', function(req, res) {
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
