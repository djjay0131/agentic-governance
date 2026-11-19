'use strict';

function blocked(what) {
  throw new Error(`network access blocked: ${what}`);
}

try {
  globalThis.fetch = () => blocked('fetch');
} catch {
}

for (const name of ['http', 'https']) {
  try {
    const mod = require(name);
    mod.request = () => blocked(`${name}.request`);
    mod.get = () => blocked(`${name}.get`);
  } catch {
    }
}

try {
  const net = require('net');
  net.connect = () => blocked('net.connect');
  net.createConnection = () => blocked('net.createConnection');
} catch {
}

try {
  const tls = require('tls');
  tls.connect = () => blocked('tls.connect');
} catch {
}

try {
  const dns = require('dns');
  dns.lookup = () => blocked('dns.lookup');
} catch {
}
