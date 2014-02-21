var trustedcoin = trustedcoin || {};

trustedcoin.generate_mnemonic = function() {
    var pk = Crypto.util.randomBytes(32);
    var seed = Crypto.util.bytesToHex(pk.slice(0,16));
    // nb! electrum doesn't handle trailing zeros very well
    // and we want to stay compatible.
    if (seed.charAt(0) == '0') seed = seed.substr(1);
    return mn_encode(seed);
};

trustedcoin.mnemonic_to_key = function(mnemonic, keyReadyCallback, keyProgressCallback) {
    var seed = mn_decode(mnemonic);
	
	console.log(mnemonic + " generates " + seed);
    
    Electrum.init(seed, keyProgressCallback, function(key) {
        Electrum.gen(1, function(r) {
            var key = new Bitcoin.ECKey(r[1]);
            key.setCompressed(true);
            keyReadyCallback({
                key: key,
                address: key.getBitcoinAddress().toString(),
                privateKey: key.getWalletImportFormat(),
                publicKey: Crypto.util.bytesToHex(key.getPub())
            });
        });
    });
};

trustedcoin.encrypt = function(plaintext, password) {
    Crypto.SHA1 = Crypto.SHA256; // hack to workaround bug in bitcoinjs-lib
    return Crypto.AES.encrypt(plaintext, password);
};

trustedcoin.decrypt = function(ciphertext, password) {
    Crypto.SHA1 = Crypto.SHA256; // hack to workaround bug in bitcoinjs-lib
    return Crypto.AES.encrypt(ciphertext, password);
};

trustedcoin.sign_transaction = function(private_key, raw_transaction) {
	return "<signed transaction>";
};


	
trustedcoin.dumpScript = function(script) {
	var out = [];
	for (var i = 0; i < script.chunks.length; i++) {
		var chunk = script.chunks[i];
		var op = new Bitcoin.Opcode(chunk);
		typeof chunk == 'number' ?  out.push(op.toString()) :
			out.push(Crypto.util.bytesToHex(chunk));
	}
	return out.join(' ');
}

trustedcoin.tx_parseBCI = function(data) {
	//debugger;
	var r = JSON.parse(data);
	var txs = r.unspent_outputs;

	if (!txs)
		throw 'Not a BCI format';

	delete unspenttxs;
	var unspenttxs = {};
	var balance = BigInteger.ZERO;
	for (var i = 0; i < txs.length; i++) {
		var o = txs[i];
		var lilendHash = o.tx_hash;

		//convert script back to BBE-compatible text
		var script = trustedcoin.dumpScript( new Bitcoin.Script(Crypto.util.hexToBytes(o.script)) );

		var value = new BigInteger('' + o.value, 10);
		if (!(lilendHash in unspenttxs))
			unspenttxs[lilendHash] = {};
		unspenttxs[lilendHash][o.tx_output_n] = {amount: value, script: script};
		balance = balance.add(value);
	}
	return {balance:balance, unspenttxs:unspenttxs};
}

trustedcoin.parse_unspent = function(text) {
	var r = JSON.parse(text);
	txUnspent = JSON.stringify(r, null, 4);
	return trustedcoin.tx_parseBCI(txUnspent);
};


trustedcoin.create_cosigner = function(primary_key, secondary_key, policy, success_callback, error_callback) {
	jQuery.ajax({
			  url: "https://api.trustedcoin.com/1/cosigner",
			  type: "POST",
			  data: JSON.stringify({"primary_key": primary_key, "secondary_key": secondary_key, "policy" : policy}),
			  dataType: "json",
			  contentType : 'application/json',		  
			  beforeSend: function(x) {
				if (x && x.overrideMimeType) {
				  x.overrideMimeType("application/j-son;charset=UTF-8");
				}
			  },
			  success: success_callback,
			  error: function(data) {
				var errorObj = JSON.parse(data.responseText);
				error_callback(errorObj.message);
			  }
	});
};

trustedcoin.get_cosigner = function(address, success_callback, error_callback) {
	jQuery.ajax({
			  url: "https://api.trustedcoin.com/1/cosigner/" + address,
			  type: "GET",
			  dataType: "json",
			  contentType : 'application/json',		  
			  beforeSend: function(x) {
				if (x && x.overrideMimeType) {
				  x.overrideMimeType("application/j-son;charset=UTF-8");
				}
			  },
			  success: success_callback,
			  error: function(data) {
				var errorObj = JSON.parse(data.responseText);
				error_callback(errorObj.message);
			  }
	});
};

trustedcoin.send_start = function(from_address, to_address, amount, success_callback, error_callback) {
	jQuery.ajax({
			  url: "https://api.trustedcoin.com/1/cosigner/" + from_address + "/send_start",
			  type: "POST",
			  data: JSON.stringify({"output_address": to_address, "amount": amount}),
			  dataType: "json",
			  contentType : 'application/json',		  
			  beforeSend: function(x) {
				if (x && x.overrideMimeType) {
				  x.overrideMimeType("application/j-son;charset=UTF-8");
				}
			  },
			  success: success_callback,
			  error: function(data) {
				var errorObj = JSON.parse(data.responseText);
				error_callback(errorObj.message);
			  }
	});
};

trustedcoin.send_finish = function(from_address, partial_transaction, callback_url, success_callback, error_callback) {
	var params = {"partial_transaction": partial_transaction};
	if (callback_url) {
		params["callback_url"] = callback_url;
	}
	jQuery.ajax({
			  url: "https://api.trustedcoin.com/1/cosigner/" + from_address + "/send_finish",
			  type: "POST",
			  data: JSON.stringify(params),
			  dataType: "json",
			  contentType : 'application/json',		  
			  beforeSend: function(x) {
				if (x && x.overrideMimeType) {
				  x.overrideMimeType("application/j-son;charset=UTF-8");
				}
			  },
			  success: success_callback,
			  error: function(data) {
				var errorObj = JSON.parse(data.responseText);
				error_callback(errorObj.message);
			  }
	});
};

