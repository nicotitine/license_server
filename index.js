const { app, getPseudoFromId, log } = require('./app');
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

io.on('connection', async (socket) => {

	socket.on('auth', async (ids) => {
		let newSocket = {
			'id': ids.id,
			'remote_id': ids.remote_id,
			'socket': socket,
			'pseudo': await getPseudoFromId(ids.id)
		}
		sockets.push(newSocket)
		log(newSocket.pseudo + ' connected. Socket count: ' + sockets.length);

		let pretented_remote = findSocketById(ids.remote_id)
		if (pretented_remote == undefined) return
		if (pretented_remote.remote_id == ids.id) {
			log(pretented_remote.pseudo + ' and ' + ids.pseudo + ' handchecked')
			pretented_remote.socket.emit('connexion_successful', newSocket.pseudo)
			socket.emit('connexion_successful', pretented_remote.pseudo)
		}
	})

	socket.on('update_remote_id', async (ids) => {
		let sock = findSocketById(ids.id)
		sock.remote_id = ids.remote_id
		log(sock.pseudo + ' remote_id updated to: ' + ids.remote_id)

		let remote_sock = findSocketById(ids.remote_id)
		if (remote_sock == undefined) return

		if (remote_sock.remote_id == sock.id) {
			remote_sock.socket.emit('connexion_successful', sock.pseudo)
			sock.socket.emit('connexion_successful', remote_sock.pseudo)
		}

	})

	socket.on('notify', (params) => {
		let sock = findSocketById(params.id)
		log('notify received from ' + sock.pseudo);
		let remote_sock = findSocketById(sock.remote_id)

		if (remote_sock == undefined) socket.emit('wrong_remote_id', { 'remote_id': sock.remote_id, 'request': 'notify' })
		else if (sock.id == remote_sock.remote_id) {
			remote_sock.socket.emit('notify', { 'title': params.title, 'message': params.message })
			log('emit notify to ' + remote_sock.pseudo)
		}
	})

	socket.on('ask_tp', (id) => {
		let sock = findSocketById(id)
		log('ask_tp received from ' + sock.pseudo)
		let remote_sock = findSocketById(sock.remote_id)

		if (remote_sock == undefined) socket.emit('wrong_remote_id', { 'remote_id': sock.remote_id, 'request': 'ask_tp' })
		else if (sock.id == remote_sock.remote_id) {
			remote_sock.socket.emit('tp')
			log('emit tp to ' + remote_sock.pseudo)
		}
	})

	socket.on('ask_anti_afk', (id) => {
		let sock = findSocketById(id)
		log('ask_anti_afk received from ' + sock.pseudo)
		let remote_sock = findSocketById(sock.remote_id)

		if (remote_sock == undefined) socket.emit('wrong_remote_id', { 'remote_id': sock.remote_id, 'request': 'ask_anti_afk' })
		else if (sock.id == remote_sock.remote_id) {
			remote_sock.socket.emit('anti_afk')
			log('emit anti_afk to ' + remote_sock.pseudo)
		}
	})

	socket.on('ask_switch', (id) => {
		let sock = findSocketById(id)
		log('ask_switch received from ' + sock.pseudo)
		let remote_sock = findSocketById(sock.remote_id)

		if (remote_sock == undefined) socket.emit('wrong_remote_id', { 'remote_id': sock.remote_id, 'request': 'ask_switch' })
		else if (sock.id == remote_sock.remote_id) {
			remote_sock.socket.emit('switch')
			log('emit switch to ' + remote_sock.pseudo)
		}
	})

	socket.on('ask_screen', (id) => {
		let sock = findSocketById(id)
		log('ask_screen received from ' + sock.pseudo)
		let remote_sock = findSocketById(sock.remote_id)

		if (remote_sock == undefined) socket.emit('wrong_remote_id', { 'remote_id': sock.remote_id, 'request': 'ask_screen' })
		else if (sock.id == remote_sock.remote_id) {
			remote_sock.socket.emit('screen')
			log('emit screen to ' + remote_sock.pseudo)
		}
	})

	socket.on('ask_spec', (id) => {
		let sock = findSocketById(id)
		log('ask_spec received from ' + sock.pseudo)
		let remote_sock = findSocketById(sock.remote_id)

		if (remote_sock == undefined) socket.emit('wrong_remote_id', { 'remote_id': sock.remote_id, 'request': 'ask_spec' })
		else if (sock.id == remote_sock.remote_id) {
			remote_sock.socket.emit('spec')
			log('emit spec to ' + remote_sock.pseudo)
		}
	})

	socket.on('disconnect', function () {
		let sock = findSocketBySocket(socket)
		log(sock.pseudo + ' disconnected. Socket count: ' + (sockets.length - 1));
		let i = sockets.indexOf(sock);
		sockets.splice(i, 1);
	});

});

function error(text) {
	console.error(new Date().toJSON() + '\t' + text)
}

server.listen(port);