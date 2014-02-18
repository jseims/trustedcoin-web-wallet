var trustedcoin = trustedcoin || {};

trustedcoin.generate_mnemonic = function() {
    var pk = Crypto.util.randomBytes(32);
    var seed = Crypto.util.bytesToHex(pk.slice(0,16));
    // nb! electrum doesn't handle trailing zeros very well
    // and we want to stay compatible.
    if (seed.charAt(0) == '0') seed = seed.substr(1);
    return mn_encode(seed);
};

trustedcoin.mnemoic_to_key = function(mnemonic, keyReadyCallback, keyProgressCallback) {
    var seed = mn_decode(mnemonic);
    
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

trustedcoin.encrypt = function(clear_text, key) {
	return clear_text;
};

trustedcoin.decrypt = function(cipher_text, key) {
	return cipher_text;
};

trustedcoin.sign_transaction = function(private_key, raw_transaction) {
	return "<signed transaction>";
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

trustedcoin.start_send = function(from_address, to_address, amount, success_callback, error_callback) {
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
