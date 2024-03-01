const { app, getPseudoFromId, log } = require("./app");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const Request = require("./models/request.model");

const normalizePort = (val) => {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val;
  if (port >= 0) return port;
  return false;
};
const port = normalizePort(process.env.PORT || "3000");
app.set("port", port);

const errorHandler = (error) => {
  if (error.syscall !== "listen") throw error;

  const address = server.address();
  const bind =
    typeof address === "string" ? "pipe " + address : "port: " + port;
  switch (error.code) {
    case "EACCES":
      error(bind + " requires elevated privileges.");
      process.exit(1);
      break;
    case "EADDRINUSE":
      error(bind + " is already in use.");
      process.exit(1);
      break;
    default:
      throw error;
  }
};

const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e8
});

const databaseChanged = async (event) => {
  try {
    const documentKey = event.documentKey._id.toString();
    if (!event.updateDescription) return;
    const updatedFields = event.updateDescription.updatedFields;
    if (!Object.keys(updatedFields).includes("status")) return;
    const status = updatedFields.status;

    if (status === "VALIDATED") return;

    const socket = findSocketById(documentKey)?.socket;
    if (!socket) return;

    socket.emit("status_updated", status);
    log("database status changed for " + documentKey + ", " + socket.pseudo)
  } catch (e) {
    log("failed to process database event " + event)
  }
};

const requestEventEmitter = Request.watch();
requestEventEmitter.on("change", databaseChanged);

server.on("error", errorHandler);
server.on("listening", () => {
  const address = server.address();
  const bind = typeof address === "string" ? "pipe " + address : "port " + port;
  log("Listening on " + bind);
});

let sockets = [];

function findSocketById(id) {
  return sockets.find((sock) => sock.id === id);
}

function findSocketBySocket(socket) {
  return sockets.find((sock) => sock.socket == socket);
}

io.on("connection", async (socket) => {
  socket.on("update_logs", async (logs) => {
    const { id } = findSocketBySocket(socket);
    const file = new Date(Date.now()).toISOString().replaceAll(":", "-") + ".txt";
    try {
      await fs.promises.writeFile("./logs/" + id + "/" + file, logs);
    } catch (e) {
      log("unable to write log from " + socket)
    }
  });

  socket.on("auth", async (ids) => {
    let newSocket = {
      id: ids.id,
      remote_id: ids.remote_id,
      socket: socket,
      pseudo: await getPseudoFromId(ids.id)
    };
    fs.promises
      .mkdir("./logs/" + ids.id + "/", { recursive: true })
      .catch(console.error);
    sockets.push(newSocket);
    log(newSocket.pseudo + " connected. Socket count: " + sockets.length);

    let pretented_remote = findSocketById(ids.remote_id);
    if (pretented_remote == undefined) return;
    if (pretented_remote.remote_id == ids.id) {
      log(
        pretented_remote.pseudo + " and " + newSocket.pseudo + " handchecked"
      );
      pretented_remote.socket.emit("connexion_successful", newSocket.pseudo);
      socket.emit("connexion_successful", pretented_remote.pseudo);
    }
  });

  socket.on("update_remote_id", async (ids) => {
    let sock = findSocketById(ids.id);
    if (sock == undefined) return;
    let old_remote_sock = findSocketById(sock.remote_id);

    if (old_remote_sock != undefined && old_remote_sock.remote_id == sock.id)
      old_remote_sock.socket.emit("remote_disconnected");

    sock.remote_id = ids.remote_id;
    log(sock.pseudo + " remote_id updated to: " + ids.remote_id);

    let remote_sock = findSocketById(ids.remote_id);
    if (remote_sock == undefined) {
      sock.socket.emit("remote_disconnected");
      return;
    }

    if (remote_sock.remote_id == sock.id) {
      remote_sock.socket.emit("connexion_successful", sock.pseudo);
      sock.socket.emit("connexion_successful", remote_sock.pseudo);
    }
  });

  socket.on("notify", (params) => {
    let sock = findSocketById(params.id);
    if (sock == undefined) return;
    log("notify received from " + sock.pseudo);
    let remote_sock = findSocketById(sock.remote_id);

    if (remote_sock == undefined)
      socket.emit("wrong_remote_id", {
        remote_id: sock.remote_id,
        request: "notify"
      });
    else if (sock.id == remote_sock.remote_id) {
      remote_sock.socket.emit("notify", {
        title: params.title,
        message: params.message
      });
      log("emit notify to " + remote_sock.pseudo);
    }
  });

  socket.on("notify_drop", (params) => {
    let sock = findSocketById(params.id);
    if (sock === undefined) return;
    log("notify_drop received from " + sock.pseudo);
    let remote_sock = findSocketById(sock.remote_id);

    if (remote_sock == undefined) {
      socket.emit("wrong_remote_id", {
        remote_id: sock.remote_id,
        request: "notify_drop"
      });
    } else if (sock.id == remote_sock.remote_id) {
      remote_sock.socket.emit("notify_drop", {
        title: params.title,
        message: params.message
      });
      log("emit notify_drop to " + remote_sock.pseudo);
    }
  });

  socket.on("ask_tp", (id) => {
    let sock = findSocketById(id);
    if (sock == undefined) return;
    log("ask_tp received from " + sock.pseudo);
    let remote_sock = findSocketById(sock.remote_id);

    if (remote_sock == undefined)
      socket.emit("wrong_remote_id", {
        remote_id: sock.remote_id,
        request: "ask_tp"
      });
    else if (sock.id == remote_sock.remote_id) {
      remote_sock.socket.emit("tp");
      log("emit tp to " + remote_sock.pseudo);
    }
  });

  socket.on("ask_anti_afk", (id) => {
    let sock = findSocketById(id);
    if (sock == undefined) return;
    log("ask_anti_afk received from " + sock.pseudo);
    let remote_sock = findSocketById(sock.remote_id);

    if (remote_sock == undefined)
      socket.emit("wrong_remote_id", {
        remote_id: sock.remote_id,
        request: "ask_anti_afk"
      });
    else if (sock.id == remote_sock.remote_id) {
      remote_sock.socket.emit("anti_afk");
      log("emit anti_afk to " + remote_sock.pseudo);
    }
  });

  socket.on("ask_switch", (id) => {
    let sock = findSocketById(id);
    if (sock == undefined) return;
    log("ask_switch received from " + sock.pseudo);
    let remote_sock = findSocketById(sock.remote_id);

    if (remote_sock == undefined)
      socket.emit("wrong_remote_id", {
        remote_id: sock.remote_id,
        request: "ask_switch"
      });
    else if (sock.id == remote_sock.remote_id) {
      remote_sock.socket.emit("switch");
      log("emit switch to " + remote_sock.pseudo);
    }
  });

  socket.on("ask_screen", (id) => {
    let sock = findSocketById(id);
    if (sock == undefined) return;
    log("ask_screen received from " + sock.pseudo);
    let remote_sock = findSocketById(sock.remote_id);

    if (remote_sock == undefined)
      socket.emit("wrong_remote_id", {
        remote_id: sock.remote_id,
        request: "ask_screen"
      });
    else if (sock.id == remote_sock.remote_id) {
      remote_sock.socket.emit("screen");
      log("emit screen to " + remote_sock.pseudo);
    }
  });

  socket.on("ask_spec", (id) => {
    let sock = findSocketById(id);
    if (sock == undefined) return;
    log("ask_spec received from " + sock.pseudo);
    let remote_sock = findSocketById(sock.remote_id);

    if (remote_sock == undefined)
      socket.emit("wrong_remote_id", {
        remote_id: sock.remote_id,
        request: "ask_spec"
      });
    else if (sock.id == remote_sock.remote_id) {
      remote_sock.socket.emit("spec");
      log("emit spec to " + remote_sock.pseudo);
    }
  });

  socket.on("ask_close_fight", (id) => {
    let sock = findSocketById(id);
    if (sock == undefined) return;
    log("ask_close_fight received from " + sock.pseudo);
    let remote_sock = findSocketById(sock.remote_id);

    if (remote_sock == undefined)
      socket.emit("wrong_remote_id", {
        remote_id: sock.remote_id,
        request: "ask_close_fight"
      });
    else if (sock.id == remote_sock.remote_id) {
      remote_sock.socket.emit("close_fight");
      log("emit close_fight to " + remote_sock.pseudo);
    }
  });

  socket.on("ask_show_invi", (id) => {
    let sock = findSocketById(id);
    if (sock === undefined) return;
    log("ask_show_invi received from " + sock.pseudo);
    let remote_sock = findSocketById(sock.remote_id);

    if (remote_sock == undefined)
      socket.emit("wrong_remote_id", {
        remote_id: sock.remote_id,
        request: "ask_show_invi"
      });
    else if (sock.id == remote_sock.remote_id) {
      remote_sock.socket.emit("reveal_invi");
      log("emit reveal_invi to " + remote_sock.pseudo);
    }
  });

  socket.on("disconnect", function (e) {
    let sock = findSocketBySocket(socket);
    if (sock == undefined) return;
    let remote_sock = findSocketById(sock.remote_id);
    log(sock.pseudo + " disconnected. Socket count: " + (sockets.length - 1));
    let i = sockets.indexOf(sock);
    sockets.splice(i, 1);

    if (remote_sock != undefined && remote_sock.remote_id == sock.id)
      remote_sock.socket.emit("remote_disconnected");
  });

  socket.on("log", async (params) => {
    let sock = findSocketById(params.id);
    if (sock == undefined) return;
    await fs.promises.appendFile("./logs/" + sock.id + "/log.txt", params.log);
  });
});

function error(text) {
  console.error(new Date().toJSON() + "\t" + text);
}

server.listen(port);
