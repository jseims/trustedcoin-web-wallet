var trustedcoin = trustedcoin || {};

trustedcoin.generate_mnemonic = function() {
    var rng = new SecureRandom();
    var pk = new Array();
    pk.length = 32;
    rng.nextBytes(pk);
    
    var seed = Crypto.util.bytesToHex(pk.slice(0,16));
    // nb! electrum doesn't handle trailing zeros very well
    // and we want to stay compatible.
    if (seed.charAt(0) == '0') seed = seed.substr(1);
    return mn_encode(seed);
};

trustedcoin.mnemonic_to_key = function(mnemonic, keyReadyCallback, keyProgressCallback) {
    var seed = mn_decode(mnemonic);
	
	// putting in setTimeout as Electrum needs to clean up state at end of thread execution
	setTimeout(function() {
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
	 }, 0);
};

trustedcoin.encrypt = function(plaintext, password) {
    Crypto.SHA1 = Crypto.SHA256; // hack to workaround bug in bitcoinjs-lib
    return Crypto.AES.encrypt(plaintext, password);
};

trustedcoin.decrypt = function(ciphertext, password) {
    Crypto.SHA1 = Crypto.SHA256; // hack to workaround bug in bitcoinjs-lib
    return Crypto.AES.decrypt(ciphertext, password);
};

trustedcoin.sign_transaction = function(unsigned_transaction, inputs, keyArray) {
	var tx = Bitcoin.Transaction.deserialize(Crypto.util.hexToBytes(unsigned_transaction));
	
	for(var i = 0; i < inputs.length; i++) {
		tx.ins[i].script = new Bitcoin.Script(Crypto.util.hexToBytes(inputs[i].scriptPubKey));
	}
	
	var redeemScript = Crypto.util.hexToBytes(inputs[0].redeemScript);
	tx.signWithMultiSigScript(keyArray, redeemScript)
	return Crypto.util.bytesToHex(tx.serialize())		
};

trustedcoin.construct_transaction = function(address, to_address, amount, fee, unspent, redeemScript, primary_key, backup_key) {
	var sendTx = new Bitcoin.Transaction();
	var inputs = unspent['unspenttxs'];
	for (var hash in inputs) {
		if (!inputs.hasOwnProperty(hash))
			continue;
		for (var index in inputs[hash]) {
			if (!inputs[hash].hasOwnProperty(index))
				continue;
			var script = trustedcoin.parseScript(inputs[hash][index].script);
			var b64hash = Crypto.util.bytesToBase64(Crypto.util.hexToBytes(hash));
			var txin = new Bitcoin.TransactionIn({outpoint: {hash: b64hash, index: index}, script: script, sequence: 4294967295});
			sendTx.addInput(txin);
		}
	}

	// destination output
	var value = new BigInteger('' + Math.round(amount * 1e8), 10);
	sendTx.addOutput(new Bitcoin.Address(to_address), value);
	
	// change output
	var balance = unspent['balance'] / 100000000;
	if (amount + fee < balance) {
		var change = balance - amount - fee;
		value = new BigInteger('' + Math.round(change * 1e8), 10);
		sendTx.addOutput(new Bitcoin.Address(address), value);		
	}
	
	redeemScript = Crypto.util.hexToBytes(redeemScript);
	sendTx.signWithMultiSigScript([primary_key, backup_key], redeemScript)

	return Crypto.util.bytesToHex(sendTx.serialize());
};

trustedcoin.parseScript = function(script) {
    var newScript = new Bitcoin.Script();
    var s = script.split(" ");
    for (var i = 0; i < s.length; i++) {
        if (Bitcoin.Opcode.map.hasOwnProperty(s[i])){
            newScript.writeOp(Bitcoin.Opcode.map[s[i]]);
        } else {
            newScript.writeBytes(Crypto.util.hexToBytes(s[i]));
        }
    }
    return newScript;
}

	
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

trustedcoin.send_start = function(from_address, to_address, amount, sweep, success_callback, error_callback) {
	jQuery.ajax({
			  url: "https://api.trustedcoin.com/1/cosigner/" + from_address + "/send_start",
			  type: "POST",
			  data: JSON.stringify({"output_address": to_address, "amount": amount, "sweep" : sweep}),
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

