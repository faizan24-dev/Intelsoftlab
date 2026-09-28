// Throwaway SMTP sink for testing the Bulk Mailer. Accepts everything except
// addresses containing "bounce", which get a hard 550.
/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS dev utility, run with plain node */
const net = require("net");
const PORT = 2525;
let count = 0;
net.createServer((sock) => {
  let rejectNext = false;
  sock.setEncoding("utf8");
  sock.write("220 fake-smtp ready\r\n");
  sock.on("data", (chunk) => {
    for (const line of chunk.split(/\r?\n/).filter(Boolean)) {
      const cmd = line.toUpperCase();
      if (cmd.startsWith("EHLO") || cmd.startsWith("HELO")) sock.write("250-fake-smtp\r\n250 OK\r\n");
      else if (cmd.startsWith("AUTH")) sock.write("235 Authentication successful\r\n");
      else if (cmd.startsWith("MAIL FROM")) sock.write("250 OK\r\n");
      else if (cmd.startsWith("RCPT TO")) {
        rejectNext = /bounce/i.test(line);
        sock.write(rejectNext ? "550 5.1.1 No such user here\r\n" : "250 OK\r\n");
      } else if (cmd === "DATA") sock.write("354 End data with <CR><LF>.<CR><LF>\r\n");
      else if (line === ".") { count++; sock.write(`250 2.0.0 Ok: queued as MSG${count}\r\n`); }
      else if (cmd.startsWith("QUIT")) { sock.write("221 Bye\r\n"); sock.end(); }
      else if (cmd.startsWith("RSET")) sock.write("250 OK\r\n");
    }
  });
  sock.on("error", () => {});
}).listen(PORT, "127.0.0.1", () => console.log(`fake SMTP listening on 127.0.0.1:${PORT}`));
