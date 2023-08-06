const {app, getPseudoFromId} = require('./app');
const http = require('http');
const { Server } = require("socket.io");

const normalizePort = val => {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val;
  if (port >= 0) return port;
  return false;
};
const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

const errorHandler = error => {
  if (error.syscall !== 'listen') throw error;

  const address = server.address();
  const bind = typeof address === 'string' ? 'pipe ' + address : 'port: ' + port;
  switch (error.code) {
    case 'EACCES':
      error(bind + ' requires elevated privileges.');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      error(bind + ' is already in use.');
      process.exit(1);
      break;
    default:
      throw error;
  }
};

const server = http.createServer(app);
const io = new Server(server);

server.on('error', errorHandler);
server.on('listening', () => {
  const address = server.address();
  const bind = typeof address === 'string' ? 'pipe ' + address : 'port ' + port;
  log('Listening on ' + bind);
});


let sockets = []

function findSocketById(id) {
  return sockets.find(sock => sock.id === id);
}

function findSocketBySocket(socket) {
  return sockets.find(sock => sock.socket == socket)
}

io.on('connection', (socket) => {
  
  socket.on('auth', async (ids) => {
    log(ids.id + ' connected');
    sockets.push({
      'id': ids.id,
      'remote_id': ids.remote_id,
      'socket': socket
    })

    let pretented_remote = findSocketById(ids.remote_id)
    if (pretented_remote == undefined) return
    if (pretented_remote.remote_id == ids.id) {
      log(pretented_remote.id + ' and ' + ids.id + ' handchecked')
      let remote_pseudo = await getPseudoFromId(pretented_remote.id)
      let pseudo = await getPseudoFromId(ids.id)
      pretented_remote.socket.emit('connexion_successful', pseudo)
      socket.emit('connexion_successful', remote_pseudo)
    }
  })

  socket.on('update_remote_id', async (ids) => {
    let sock = findSocketById(ids.id)
    sock.remote_id = ids.remote_id
    log(ids.id + ' remote_id updated to: ' + ids.remote_id)

    let remote_sock = findSocketById(ids.remote_id)

    if(remote_sock == undefined) return

    if (remote_sock.remote_id == sock.id) {
      let remote_pseudo = await getPseudoFromId(remote_sock.id)
      let pseudo = await getPseudoFromId(sock.id)
      remote_sock.socket.emit('connexion_successful', pseudo)
      sock.socket.emit('connexion_successful', remote_pseudo)
    }

  })

  socket.on('notify', (params) => {
    log('notify received from ' + params.id);
    let sock = findSocketById(params.id)
    let remote_sock = findSocketById(sock.remote_id)

    if (remote_sock == undefined) socket.emit('wrong_remote_id', {'remote_id': sock.remote_id, 'request': 'notify'})
    else if (sock.id == remote_sock.remote_id) {
      log('emit notify to ' + remote_sock.id)
      remote_sock.socket.emit('notify', {'title': params.title, 'message': params.message})
    }
  }) 

  socket.on('ask_tp', (id) => {
    log('ask_tp received from ' + id)
    let sock = findSocketById(id)
    let remote_sock = findSocketById(sock.remote_id)

    if (remote_sock == undefined) socket.emit('wrong_remote_id', { 'remote_id': sock.remote_id, 'request': 'ask_tp' })
    else if (sock.id == remote_sock.remote_id) {
      log('emit tp to ' + remote_sock.id)
      remote_sock.socket.emit('tp')
    }
  })

  socket.on('ask_anti_afk', (id) => {
    log('ask_anti_afk received from ' + id)
    let sock = findSocketById(id)
    let remote_sock = findSocketById(sock.remote_id)

    if (remote_sock == undefined) socket.emit('wrong_remote_id', { 'remote_id': sock.remote_id, 'request': 'ask_anti_afk' })
    else if (sock.id == remote_sock.remote_id) {
      log('emit anti_afk to ' + remote_sock.id)
      remote_sock.socket.emit('anti_afk')
    }
  })

  socket.on('ask_switch', (id) => {
    log('ask_switch received from ' + id)
    let sock = findSocketById(id)
    let remote_sock = findSocketById(sock.remote_id)

    if (remote_sock == undefined) socket.emit('wrong_remote_id', { 'remote_id': sock.remote_id, 'request': 'ask_switch' })
    else if (sock.id == remote_sock.remote_id) {
      log('emit switch to ' + remote_sock.id)
      remote_sock.socket.emit('switch')
    }
  })

  socket.on('ask_screen', (id) => {
    log('ask_screen received from ' + id)
    sock = findSocketById(id)
    remote_sock = findSocketById(sock.remote_id)

    if (remote_sock == undefined) socket.emit('wrong_remote_id', {'remote_id': sock.remote_id, 'request': 'ask_screen'})
    else if (sock.id == remote_sock.remote_id) {
      log('emit screen to ' + remote_sock.id)
      remote_sock.socket.emit('screen')
    }
  })

  socket.on('disconnect', function () {
    let sock = findSocketBySocket(socket)
    log(sock.id + ' disconnected. Socket count: ' + sockets.length);
    let i = sockets.indexOf(sock);
    sockets.splice(i, 1);
  });

});

function log(text) {
  console.log(new Date().toJSON() + '\t' + text)
}

function error(text) {
  console.error(new Date().toJSON() + '\t' + text)
}

server.listen(port);